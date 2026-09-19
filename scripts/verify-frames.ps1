# verify-frames.ps1
#
# Checks that public/frames is a sequence the Canvas scrubber can actually use.
#
# What it asserts:
#   1. Frame count matches the source video.
#   2. Numbering is sequential from 1 with no gaps and consistent zero-padding.
#   3. Every file decodes as a real WebP (catches truncated writes).
#   4. Every frame is the source resolution -- nothing was scaled or cropped.
#   5. Bitstream type: reported always, asserted under -ExpectLossless.
#   6. Reports size distribution, and the worst-case frame for load budgeting.
#   7. Optionally (-Psnr) measures drift from the source pixels.
#
# Usage:
#   .\scripts\verify-frames.ps1
#   .\scripts\verify-frames.ps1 -Pad 5 -Psnr
#   .\scripts\verify-frames.ps1 -ExpectLossless

param(
    [string]$InputVideo = "public/video/IMG_2305.MOV",
    [string]$FramesDir = "public/frames/v2",
    [ValidateRange(3, 8)]
    [int]$Pad = 5,
    # Frames dropped from the front of the video at extraction. Must match
    # -TrimStart in extract-frames.ps1, or the count and PSNR checks below
    # compare the wrong things.
    [ValidateRange(0, 10000)]
    [int]$TrimStart = 1,
    # Also decode every frame and compare against the source video.
    [switch]$Psnr,
    # Assert the frames are a true lossless (VP8L) bitstream. Use this after
    # extract-frames.ps1 -Lossless: FFmpeg will silently emit lossy frames if
    # -preset ever gets combined with -lossless, and the only visible symptom
    # is the bitstream type.
    [switch]$ExpectLossless
)

$ErrorActionPreference = "Stop"
$fail = 0

function Check($ok, $msg) {
    if ($ok) { Write-Host "  PASS  $msg" -ForegroundColor Green }
    else { Write-Host "  FAIL  $msg" -ForegroundColor Red; $script:fail++ }
}

if (-not (Test-Path $FramesDir)) { Write-Error "No frames directory: $FramesDir"; exit 1 }

$pattern = Join-Path $FramesDir ("frame-%0{0}d.webp" -f $Pad)
$frames = @(Get-ChildItem "$FramesDir/frame-*.webp" | Sort-Object Name)

Write-Host "Verifying $FramesDir" -ForegroundColor Cyan
Write-Host ""

# --- 1. Count against the source -------------------------------------------
$expected = $null
if (Test-Path $InputVideo) {
    $nb = & ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of csv=p=0 $InputVideo
    if ($nb -and $nb -ne "N/A") { $expected = [int]$nb }
    else {
        $expected = [int](& ffprobe -v error -select_streams v:0 -count_packets `
            -show_entries stream=nb_read_packets -of csv=p=0 $InputVideo)
    }
    $sourceFrames = $expected
    $expected = $sourceFrames - $TrimStart
    $trimNote = if ($TrimStart -gt 0) { " ($sourceFrames source - $TrimStart trimmed)" } else { "" }
    Check ($frames.Count -eq $expected) "frame count: $($frames.Count) files vs $expected expected$trimNote"
} else {
    Write-Host "  SKIP  source video not found, cannot check count" -ForegroundColor DarkGray
}

# --- 2. Sequential numbering, uniform padding ------------------------------
$gaps = @()
$badName = @()
for ($i = 0; $i -lt $frames.Count; $i++) {
    $name = $frames[$i].Name
    if ($name -notmatch ("^frame-(\d{{{0}}})\.webp$" -f $Pad)) { $badName += $name; continue }
    if ([int]$Matches[1] -ne ($i + 1)) { $gaps += $name }
}
$nameMsg = "filenames all match frame-%0${Pad}d.webp"
if ($badName.Count) { $nameMsg += " -- offenders: " + (($badName | Select-Object -First 5) -join ", ") }
Check ($badName.Count -eq 0) $nameMsg
Check ($gaps.Count -eq 0) "numbering is sequential 1..$($frames.Count) with no gaps$(if ($gaps.Count) { " -- first break at $($gaps[0])" })"

# --- 3. Every file decodes --------------------------------------------------
# One decode pass over the whole sequence: image2 reads them in order and errors
# on anything truncated or not actually WebP.
$decoded = & ffmpeg -v error -i $pattern -f null - 2>&1
if ($LASTEXITCODE -eq 0 -and -not $decoded) {
    Check $true "all $($frames.Count) frames decode cleanly"
} else {
    Check $false "decode errors: $($decoded | Select-Object -First 3)"
}

# --- 4. Resolution preserved -----------------------------------------------
# Checked per file rather than sampled -- a single odd frame would tear the
# Canvas draw, and it is the exact thing we promised not to change.
#
# Read straight from the RIFF header instead of shelling out to ffprobe per
# file: 240 process spawns took minutes, and this is the check most likely to
# be run on a longer sequence.
function Get-WebPChunk([string]$path) {
    $b = [byte[]]::new(16)
    $fs = [System.IO.File]::OpenRead($path)
    try { $read = $fs.Read($b, 0, 16) } finally { $fs.Dispose() }
    if ($read -lt 16) { return "short-file" }
    return [System.Text.Encoding]::ASCII.GetString($b, 12, 4)
}

function Get-WebPSize([string]$path) {
    $b = [byte[]]::new(32)
    $fs = [System.IO.File]::OpenRead($path)
    try { $read = $fs.Read($b, 0, 32) } finally { $fs.Dispose() }
    if ($read -lt 30) { return "short-file" }
    if ([System.Text.Encoding]::ASCII.GetString($b, 0, 4) -ne "RIFF" -or
        [System.Text.Encoding]::ASCII.GetString($b, 8, 4) -ne "WEBP") { return "not-webp" }

    # Every byte is cast to [int] before shifting. PowerShell keeps the result of
    # `-shl` in the left operand's type, so [byte]5 -shl 8 truncates to 0 rather
    # than widening to 1280.
    switch ([System.Text.Encoding]::ASCII.GetString($b, 12, 4)) {
        # Simple lossy: 14-bit dimensions after the 0x9d012a start code.
        "VP8 " {
            $w = ((([int]$b[27]) -shl 8) -bor [int]$b[26]) -band 0x3FFF
            $h = ((([int]$b[29]) -shl 8) -bor [int]$b[28]) -band 0x3FFF
            return "${w}x${h}"
        }
        # Lossless: two 14-bit fields, stored minus one.
        "VP8L" {
            $bits = ([int]$b[21]) -bor (([int]$b[22]) -shl 8) -bor `
                    (([int]$b[23]) -shl 16) -bor (([int]$b[24]) -shl 24)
            $w = ($bits -band 0x3FFF) + 1
            $h = (($bits -shr 14) -band 0x3FFF) + 1
            return "${w}x${h}"
        }
        # Extended (alpha/animation): 24-bit canvas size, stored minus one.
        "VP8X" {
            $w = (([int]$b[24]) -bor (([int]$b[25]) -shl 8) -bor (([int]$b[26]) -shl 16)) + 1
            $h = (([int]$b[27]) -bor (([int]$b[28]) -shl 8) -bor (([int]$b[29]) -shl 16)) + 1
            return "${w}x${h}"
        }
        default { return "unknown-chunk" }
    }
}

$sizes = @{}
foreach ($f in $frames) {
    $dim = Get-WebPSize $f.FullName
    if ($sizes.ContainsKey($dim)) { $sizes[$dim] += 1 } else { $sizes[$dim] = 1 }
}
Check ($sizes.Keys.Count -eq 1) "uniform resolution: $(($sizes.Keys | Sort-Object) -join ', ')"

if (Test-Path $InputVideo) {
    $srcDim = (& ffprobe -v error -select_streams v:0 -show_entries stream=width,height `
        -of csv=s=x:p=0 $InputVideo)
    Check ($sizes.Keys -contains $srcDim) "matches source resolution $srcDim"
}

# --- 5. Bitstream type ------------------------------------------------------
# "VP8L" is a true lossless bitstream, "VP8 " is lossy, "VP8X" is the extended
# container. Reported always, asserted only under -ExpectLossless, because a
# stray -preset turns a lossless request into a lossy file with no warning.
$chunks = @{}
foreach ($f in $frames) {
    $c = Get-WebPChunk $f.FullName
    if ($chunks.ContainsKey($c)) { $chunks[$c] += 1 } else { $chunks[$c] = 1 }
}
$chunkList = ($chunks.GetEnumerator() | Sort-Object Name |
    ForEach-Object { "$($_.Key) x$($_.Value)" }) -join ', '

if ($ExpectLossless) {
    Check ($chunks.Keys.Count -eq 1 -and $chunks.ContainsKey("VP8L")) `
        "lossless bitstream: $chunkList"
} else {
    Write-Host "  INFO  bitstream: $chunkList" -ForegroundColor DarkGray
}

# --- 6. Size distribution ---------------------------------------------------
$sum = ($frames | Measure-Object -Property Length -Sum).Sum
$max = $frames | Sort-Object Length -Descending | Select-Object -First 1
Write-Host ""
Write-Host "Size" -ForegroundColor Cyan
Write-Host ("  total    {0} MB" -f [math]::Round($sum / 1MB, 2))
Write-Host ("  average  {0} KB" -f [math]::Round($sum / $frames.Count / 1KB, 1))
Write-Host ("  largest  {0} KB  ({1})" -f [math]::Round($max.Length / 1KB, 1), $max.Name)

# --- 7. Optional fidelity measurement ------------------------------------
if ($Psnr) {
    Write-Host ""
    Write-Host "Measuring PSNR against the source video..." -ForegroundColor Cyan

    # Two alignment hazards, both of which quietly produce nonsense rather than
    # an error:
    #
    #  1. The video must be trimmed exactly as the frames were, or frame N gets
    #     compared against source frame N and every pair is off by $TrimStart.
    #  2. The image2 input carries its own frame rate (25 fps by default) while
    #     the video has its own, and psnr pairs frames by timestamp. Mismatched
    #     timebases made it emit 477 comparisons for 239 frames. Forcing
    #     settb=1/1 then setpts=N on BOTH legs makes the timestamp simply the
    #     frame index, so the pairing is 1:1 regardless of either rate.
    $srcChain = "[0:v]format=rgb24"
    if ($TrimStart -gt 0) { $srcChain += ",trim=start_frame=$TrimStart" }
    $srcChain += ",settb=1/1,setpts=N[a]"

    # stats_file=- writes one line per frame to STDOUT (the summary line is
    # logged at info level and would be swallowed by -v error). Captured as
    # stdout deliberately: merging stderr with 2>&1 makes PowerShell wrap any
    # ffmpeg warning in a NativeCommandError and fail the script.
    $out = & ffmpeg -hide_banner -v error -i $InputVideo -i $pattern `
        -lavfi "$srcChain;[1:v]format=rgb24,settb=1/1,setpts=N[b];[a][b]psnr=stats_file=-" `
        -f null -

    $vals = $out |
        Select-String -Pattern "psnr_avg:([0-9.]+|inf)" -AllMatches |
        ForEach-Object { $_.Matches } |
        ForEach-Object { $_.Groups[1].Value }

    if (-not $vals) {
        Write-Host "  could not parse PSNR output:" -ForegroundColor Red
        Write-Host "  $($out | Select-Object -First 3)"
    } elseif ($vals.Count -ne $frames.Count) {
        # One comparison per frame, or the two legs are misaligned and every
        # number below is meaningless.
        Write-Host "  MISALIGNED: $($vals.Count) comparisons for $($frames.Count) frames" -ForegroundColor Red
        $script:fail++
    } elseif ($vals -contains "inf" -and ($vals | Where-Object { $_ -ne "inf" }).Count -eq 0) {
        Write-Host "  bit-exact on all $($vals.Count) frames (PSNR inf)" -ForegroundColor Green
    } else {
        $nums = @($vals | Where-Object { $_ -ne "inf" } | ForEach-Object { [double]$_ })
        $stats = $nums | Measure-Object -Average -Minimum
        Write-Host ("  frames {0}  average {1:N2} dB  worst {2:N2} dB" -f `
            $vals.Count, $stats.Average, $stats.Minimum)
        Write-Host "  (>=40 dB is below the visible threshold; 'inf' means bit-exact)" -ForegroundColor DarkGray
    }
}

Write-Host ""
if ($fail -eq 0) {
    Write-Host "All checks passed." -ForegroundColor Green
    exit 0
} else {
    Write-Host "$fail check(s) failed." -ForegroundColor Red
    exit 1
}
