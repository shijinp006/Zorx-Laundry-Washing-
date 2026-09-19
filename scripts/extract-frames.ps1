# extract-frames.ps1
#
# Rebuilds public/frames from the source video: one WebP per source frame, at
# the video's native resolution and native frame rate.
#
# Nothing here scales, crops, pads or re-times the picture. The only pixel edit
# is the optional watermark removal below, which is a corner repair, not a
# geometry change.
#
#   Video -> FFmpeg -> frame-00001.webp ... -> Next.js -> Canvas -> scroll
#
# Quality
# -------
# -Lossless gives bit-exact frames but very large files (see the note in
# docs/frame-extraction.md). The default is WebP q95, which measured visually
# indistinguishable from the lossless frames on this clip while staying small
# enough to stream a 240-frame sequence over the wire.
#
# Usage:
#   .\scripts\extract-frames.ps1
#   .\scripts\extract-frames.ps1 -Lossless
#   .\scripts\extract-frames.ps1 -InputVideo "public/video/other.mp4" -Quality 100
#
# After running, set TOTAL_FRAMES (and FRAME_WIDTH/FRAME_HEIGHT if the source
# size changed) in lib/story.ts, and re-check the chapter frame ranges there --
# they are tied to what happens on screen, not to the frame count.
#
# Requires FFmpeg on PATH:  winget install FFmpeg

param(
    [string]$InputVideo = "public/video/IMG_2305.MOV",
    [string]$OutputDir = "public/frames/v2",

    # Keep every Nth frame. This is exact decimation, not resampling: the frames
    # that survive are untouched source frames, and nothing is blended or
    # duplicated. Use it, never -r, to lower the rate.
    #
    # The source is 30fps/900 frames. At full rate the sequence is 71 MB at
    # 1280x720, which is not a payload a page can start animating inside. A
    # scrubbed film tolerates a lower frame rate far better than it tolerates
    # artefacts, so the rate comes down before the quality does:
    #
    #   Stride 1  900 frames  30fps  71 MB
    #   Stride 2  450 frames  15fps  35 MB   <- default
    #   Stride 3  300 frames  10fps  24 MB
    #
    # Nobody sees this film at 30fps. It is scrubbed, one frame per scroll
    # position, so the rate only decides how finely the scroll can land.
    [ValidateRange(1, 10)]
    [int]$Stride = 2,

    # Output size. 0 keeps the source resolution.
    #
    # 1280x720 from a 1920x1080 source is a deliberate halving of the pixel
    # budget: it is both the file size and, more importantly, the decoded bitmap
    # size the loader holds in memory (3.7 MB a frame against 8.3 MB at 1080p).
    [int]$OutWidth = 1280,
    [int]$OutHeight = 720,

    # WebP quality, 0-100. Ignored when -Lossless is set.
    [ValidateRange(0, 100)]
    [int]$Quality = 95,

    # Bit-exact frames. Much larger files; see the trade-off in the docs.
    [switch]$Lossless,

    # Digits in the frame number: frame-00001.webp. Must match FRAME_PAD in lib/story.ts.
    [ValidateRange(3, 8)]
    [int]$Pad = 5,

    # Drop this many frames from the start of the video before numbering.
    #
    # 0 for the current source: IMG_2305.MOV opens straight on the booking shot.
    # The previous clip opened on a storyboard contact sheet -- a grid of all the
    # shots with numbered captions -- and needed 1. Dropping frames here rather
    # than deleting files afterwards keeps the output contiguous from frame 1, so
    # re-running this script cannot quietly put them back.
    #
    # Check a new source before changing this:
    #   ffmpeg -i "<video>" -frames:v 1 first.png
    [ValidateRange(0, 10000)]
    [int]$TrimStart = 0,

    # Skip the generator watermark repair and encode straight from the video.
    [switch]$SkipWatermark
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $InputVideo)) {
    Write-Error "Video file not found: $InputVideo"
    exit 1
}
foreach ($tool in @("ffmpeg", "ffprobe")) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        Write-Error "$tool is not installed. Install it with: winget install FFmpeg"
        exit 1
    }
}

# --- Probe the source -------------------------------------------------------
# Everything downstream is derived from these numbers rather than hard-coded,
# so swapping the source video does not silently resize or re-time the frames.

$probe = & ffprobe -v error -select_streams v:0 `
    -show_entries stream=width,height,r_frame_rate,nb_frames,pix_fmt `
    -of default=noprint_wrappers=1 $InputVideo

$meta = @{}
foreach ($line in $probe) {
    if ($line -match '^([^=]+)=(.*)$') { $meta[$Matches[1]] = $Matches[2] }
}

$width  = [int]$meta["width"]
$height = [int]$meta["height"]
$rate   = $meta["r_frame_rate"]          # e.g. "24/1"
$parts  = $rate.Split("/")
$fps    = [math]::Round([double]$parts[0] / [double]$parts[1], 3)

# nb_frames is absent on some containers; fall back to counting packets.
$expected = 0
if ($meta["nb_frames"] -and $meta["nb_frames"] -ne "N/A") {
    $expected = [int]$meta["nb_frames"]
} else {
    $expected = [int](& ffprobe -v error -select_streams v:0 -count_packets `
        -show_entries stream=nb_read_packets -of csv=p=0 $InputVideo)
}

$sourceFrames = $expected
# select keeps frame 0 of what reaches it and every Stride-th after, so the count
# rounds up, not down.
$expected = [math]::Ceiling(($sourceFrames - $TrimStart) / $Stride)
$outFps = [math]::Round($fps / $Stride, 3)

$mode = if ($Lossless) { "lossless" } else { "lossy q$Quality" }

Write-Host "Extracting frames" -ForegroundColor Cyan
Write-Host "  Source:     $InputVideo"
if ($OutWidth -gt 0 -and $OutHeight -gt 0 -and ($OutWidth -ne $width -or $OutHeight -ne $height)) {
    Write-Host "  Resolution: ${width}x${height} -> ${OutWidth}x${OutHeight}" -ForegroundColor Yellow
} else {
    Write-Host "  Resolution: ${width}x${height} (preserved -- no scaling)"
}
if ($Stride -gt 1) {
    Write-Host "  Frame rate: $fps fps -> $outFps fps (every ${Stride}nd/rd frame kept, unaltered)" -ForegroundColor Yellow
} else {
    Write-Host "  Frame rate: $fps fps (native, every frame taken once)"
}
if ($TrimStart -gt 0) {
    Write-Host "  Trim:       dropping first $TrimStart frame(s) of $sourceFrames" -ForegroundColor Yellow
}
Write-Host "  Frames:     $expected expected"
Write-Host "  Pixel fmt:  $($meta['pix_fmt'])"
Write-Host "  WebP mode:  $mode"
Write-Host ("  Output:     {0}/frame-%0{1}d.webp" -f $OutputDir, $Pad)
Write-Host ""

# The one filter chain, in the order the stages have to happen:
#
#   trim    drops leading frames before anything is numbered, so the output is
#           contiguous from 1. `trim` takes its bound as a named option, which
#           avoids escaping a comma the way select=gte(n\,N) would.
#   select  keeps every Nth of what is left. `n` counts frames entering select,
#           so the stride is applied after the trim, not to the raw source.
#   scale   resizes what survived. Last, so it only ever runs on kept frames.
#
# Paired with -fps_mode passthrough, every frame that reaches the encoder is an
# untouched source frame written exactly once: no duplicates, no drops beyond the
# stride, and no resampling that would shift frame-to-scroll alignment.
#
# The scale is deliberately NOT part of the chain that feeds the watermark
# repair. The mark was composited onto the picture at the source resolution, and
# the repair inverts that compositing exactly:
#
#     background = (observed - 255a) / (1 - a)
#
# Downscaling first resamples the mark's alpha against its neighbours, so the
# per-pixel `a` the repair solves for no longer describes any single pixel and
# the inversion leaves a faintly darkened rectangle where the mark used to be.
# Repairing at native size and scaling afterwards keeps the model exact, and the
# downscale then softens whatever residue is left rather than baking it in.
$frameFilters = @()
if ($TrimStart -gt 0) { $frameFilters += "trim=start_frame=$TrimStart" }
if ($Stride -gt 1)    { $frameFilters += "select='not(mod(n\,$Stride))'" }

$scaleFilter = @()
if ($OutWidth -gt 0 -and $OutHeight -gt 0 -and ($OutWidth -ne $width -or $OutHeight -ne $height)) {
    $scaleFilter = @("scale=${OutWidth}:${OutHeight}")
}

# Straight-to-WebP path does everything in one chain; there is no repair to protect.
$directArgs = @()
$direct = $frameFilters + $scaleFilter
if ($direct.Count) { $directArgs = @("-vf", ($direct -join ",")) }

# PNG staging path: frames only, at native size.
$stageArgs = @()
if ($frameFilters.Count) { $stageArgs = @("-vf", ($frameFilters -join ",")) }

# …and the scale is applied on the way out of the repaired PNGs.
$encodeArgs = @()
if ($scaleFilter.Count) { $encodeArgs = @("-vf", ($scaleFilter -join ",")) }

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}
Get-ChildItem "$OutputDir/frame-*.webp" -ErrorAction SilentlyContinue | Remove-Item -Force

$pattern = Join-Path $OutputDir ("frame-%0{0}d.webp" -f $Pad)

# --- WebP encoder settings --------------------------------------------------
# -c:v libwebp        the WebP encoder
# -compression_level 6  maximum analysis effort: same quality, smaller file, slower
# -preset picture     tuning profile for detailed non-photographic footage
# -lossless 1         exact pixels; -quality then only steers encoder effort
# -quality N          lossy quality target, 0-100
#
# DO NOT add -preset to the lossless branch. FFmpeg hands the preset to
# libwebp's WebPConfigPreset(), which resets config.lossless back to 0, so
# `-lossless 1 -preset picture` silently encodes a LOSSY file -- measured at
# 45.8 dB with a "VP8 " bitstream instead of an exact "VP8L" one. Argument
# order does not help, and only `-preset none` leaves lossless intact.
# Verify with:  head -c16 frame-00001.webp | tail -c4   ->  VP8L, not "VP8 "
$encode = @("-c:v", "libwebp", "-compression_level", "6")
if ($Lossless) {
    $encode += @("-lossless", "1", "-quality", "100")
} else {
    $encode += @("-lossless", "0", "-quality", "$Quality", "-preset", "picture")
}

if ($SkipWatermark) {
    # Straight from the video: no intermediate file, nothing to re-encode.
    # -fps_mode passthrough keeps every decoded frame exactly once, so the
    # sequence maps 1:1 onto scroll position with no dupes and no drops.
    Write-Host "Encoding to WebP..." -ForegroundColor Cyan
    & ffmpeg -v error -stats -i $InputVideo @directArgs -fps_mode passthrough `
        @encode $pattern -y
    if ($LASTEXITCODE -ne 0) { Write-Error "FFmpeg failed."; exit 1 }
} else {
    # Stage as PNG first: the watermark repair needs lossless pixels to invert
    # the compositing, and editing an already-lossy frame would bake its
    # artefacts in. PNG is lossless, so this costs disk and time, not quality.
    $stageDir = Join-Path $env:TEMP "washzone-frames"
    if (Test-Path $stageDir) { Remove-Item "$stageDir/*" -Force -ErrorAction SilentlyContinue }
    else { New-Item -ItemType Directory -Path $stageDir -Force | Out-Null }

    $stagePattern = Join-Path $stageDir ("frame-%0{0}d.png" -f $Pad)

    Write-Host "Decoding to lossless PNG..." -ForegroundColor Cyan
    & ffmpeg -v error -stats -i $InputVideo @stageArgs -fps_mode passthrough $stagePattern -y
    if ($LASTEXITCODE -ne 0) { Write-Error "FFmpeg failed decoding frames."; exit 1 }

    Write-Host "Removing the generator watermark..." -ForegroundColor Cyan
    & node "scripts/remove-watermark.mjs" $stageDir
    if ($LASTEXITCODE -ne 0) { Write-Error "Watermark removal failed."; exit 1 }

    Write-Host "Encoding to WebP..." -ForegroundColor Cyan
    & ffmpeg -v error -stats -framerate $outFps -i $stagePattern @encodeArgs @encode $pattern -y
    if ($LASTEXITCODE -ne 0) { Write-Error "FFmpeg failed encoding WebP."; exit 1 }

    Remove-Item "$stageDir/*" -Force -ErrorAction SilentlyContinue
}

# --- Report -----------------------------------------------------------------
$frames = @(Get-ChildItem "$OutputDir/frame-*.webp" | Sort-Object Name)
$sum    = ($frames | Measure-Object -Property Length -Sum).Sum
$sizeMb = [math]::Round($sum / 1MB, 2)
$avgKb  = if ($frames.Count) { [math]::Round($sum / $frames.Count / 1KB, 1) } else { 0 }

Write-Host ""
Write-Host "Done. $($frames.Count) frames, $sizeMb MB total, $avgKb KB average." -ForegroundColor Green

if ($frames.Count -ne $expected) {
    Write-Host "WARNING: expected $expected frames, got $($frames.Count)." -ForegroundColor Red
}
Write-Host "lib/story.ts must agree: TOTAL_FRAMES = $($frames.Count), FRAME_PAD = $Pad, FRAME_WIDTH/HEIGHT = $(if ($OutWidth -gt 0) { "$OutWidth/$OutHeight" } else { "$width/$height" })." -ForegroundColor Yellow
Write-Host "Chapter and scene frame ranges are tied to what is on screen, so a new source invalidates them even at the same count." -ForegroundColor Yellow
Write-Host "Verify with: .\scripts\verify-frames.ps1" -ForegroundColor Yellow
