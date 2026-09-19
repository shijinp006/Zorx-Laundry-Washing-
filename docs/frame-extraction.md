# Video → WebP frame extraction

The cinematic scroll on the landing page is not a `<video>` element. It is a
`<canvas>` that draws one still image per scroll position:

```
public/video/IMG_2305.MOV
        │
        ▼  FFmpeg  (every 2nd frame, 1280x720, watermark repair, WebP)
public/frames/frame-00001.webp … frame-00450.webp
        │
        ▼  lib/frameLoader.ts  (fetch + decode to ImageBitmap, priority order)
        │
        ▼  lib/story.ts        (scroll progress → frame index)
        │
        ▼  components/FrameCanvas.tsx  (drawImage, cover-fit)
     cinematic scroll animation
```

Scrubbing needs random access to any frame at any moment, which a compressed
video cannot give you — seeking in H.264 means decoding from the nearest
keyframe. Individual images trade bandwidth for instant, jitter-free access.

## The source

Measured with `ffprobe` (see [Inspecting the source](#inspecting-the-source)):

| Property | Source | Shipped sequence |
|---|---|---|
| Resolution | 1920×1080 | 1280×720 |
| Frame rate | 30 fps, constant | 15 fps (every 2nd frame) |
| Frames | 900 | 450 |
| Duration | 30.0 s | — |
| Codec | HEVC, yuv420p | WebP q95 |
| Bitrate | 10.5 Mb/s | 40.0 MB total, 91 KB/frame |

Frame `k` of the sequence is source frame `2k − 1`. Halve and round up when
converting a cut list measured on the source.

### Why the rate comes down

900 frames at 1280×720 is 71 MB, which is not a payload a page can start
animating inside. The frame rate is the first thing to give, not the quality:
this film is scrubbed, one frame per scroll position, so the rate only decides
how finely the scroll can land — nobody ever sees it play at 30 fps. Measured on
a spread sample of this clip:

| Stride | Frames | Rate | Size |
|---|---|---|---|
| 1 | 900 | 30 fps | 71 MB |
| **2** | **450** | **15 fps** | **40 MB** ← default |
| 3 | 300 | 10 fps | 28 MB |

Resolution is the second lever, and it buys memory as well as bytes: the loader
holds decoded bitmaps, and one 1280×720 frame is 3.7 MB against 8.3 MB at 1080p.

These numbers are the contract. `TOTAL_FRAMES`, `FRAME_WIDTH`, `FRAME_HEIGHT`
and `FRAME_PAD` in [`lib/story.ts`](../lib/story.ts) must agree with them, and
the extraction never changes the resolution or the frame rate.

### The captions are in the picture

The commercial carries its own captions, composited in post: `BOOKING / Book
Your Pickup`, `PICKUP / We Pick Up From Your Doorstep`, and six more, in the
lower-left of the frame. **They are part of the footage and cannot be extracted
out of it.** Measured with `scripts/detect-captions.mjs`, the block occupies
roughly **860 × 320 px at x=40, y=725** on a 1920×1080 frame — the whole
lower-left quadrant — and is present on about 78% of frames.

That rules out removing them here. The area sits over hands, a moving van, a
machine drum and white shirts, so `delogo`, a blur or a fill would read as a
patch parked in the corner of every shot, and cropping the band away would take
a third of the frame height with it.

So the site does not try. `components/SceneText.tsx`, which used to draw a second
near-identical set of captions over the canvas, has been removed, and
[`config/scenes.ts`](../config/scenes.ts) is now a transcript of the filmed
captions for screen readers rather than a source of overlay copy. If the film is
ever re-cut without its caption layer, that decision is the one to revisit.

### Trimming a new source

The current clip opens straight on the booking shot, so `-TrimStart 0` (the
default) is correct. The previous one opened on a storyboard contact sheet and
needed `-TrimStart 1`. Check before changing it:

```bash
ffmpeg -i "public/video/IMG_2305.MOV" -frames:v 1 first.png
```

If you change the trim or the stride, `TOTAL_FRAMES` and every chapter boundary
in [`lib/story.ts`](../lib/story.ts), every range in
[`config/strips.ts`](../config/strips.ts), the step frames in
`app/process/page.tsx` and the portal still in `app/page.tsx` all shift with it,
and `verify-frames.ps1 -TrimStart <same value>` must be told the same number or
its count and PSNR checks compare the wrong things.

## Running it

```powershell
.\scripts\extract-frames.ps1          # default: WebP q95, native size and fps
.\scripts\extract-frames.ps1 -Lossless
.\scripts\extract-frames.ps1 -Quality 100
.\scripts\verify-frames.ps1 -Psnr     # check the result
```

Or through npm:

```powershell
npm run frames:extract
npm run frames:verify
```

The script probes the source and derives resolution, frame rate and frame count
from it rather than hard-coding them, so replacing the video does not silently
rescale or re-time the sequence.

## The FFmpeg command

What the script runs, in its simplest form — straight from video to WebP:

```bash
ffmpeg -i "public/video/IMG_2305.MOV" \
  -vf trim=start_frame=1 \
  -fps_mode passthrough \
  -c:v libwebp -lossless 0 -quality 95 -compression_level 6 -preset picture \
  public/frames/frame-%05d.webp
```

The lossless variant — note it drops `-preset` entirely, which is not optional
(see [below](#never-combine--preset-with--lossless-1)):

```bash
ffmpeg -i "public/video/IMG_2305.MOV" \
  -vf trim=start_frame=1 \
  -fps_mode passthrough \
  -c:v libwebp -lossless 1 -quality 100 -compression_level 6 \
  public/frames/frame-%05d.webp
```

Add `trim=start_frame=N` to the front of the chain for a source that opens on
footage you do not want. Nothing else in either command should change.

### Every option, and why it is there

| Option | Meaning |
|---|---|
| `-i "…MOV"` | Input. |
| `-fps_mode passthrough` | Hand every decoded frame to the encoder exactly once. This is the option that guarantees no dropped and no duplicated frames. Without it FFmpeg may resample to a target rate, which silently shifts frame↔scroll alignment. Replaces the old `-vsync 0`. |
| `-c:v libwebp` | The WebP encoder. `-c:v webp` selects FFmpeg's built-in encoder instead, which has no lossless mode and ignores `-preset`. |
| `-lossless 1` | Exact pixels — the decoded frame is reproduced bit for bit. With this on, `-quality` no longer means fidelity; it steers how hard the encoder searches for a smaller file. |
| `-lossless 0 -quality 95` | Lossy mode at quality 95 of 100. See the trade-off below. |
| `-compression_level 6` | Encoder *effort*, 0–6, not quality. 6 spends the most CPU looking for a more compact encoding of the same picture. Free file-size win, slower to run. |
| `-preset picture` | Tunes the encoder's heuristics for detailed, non-photographic footage. Other values: `default`, `photo`, `drawing`, `icon`, `text`, `none`. **Lossy mode only — never pass it with `-lossless 1`**, see below. |
| `-vf select=…,scale=…` | Keeps every 2nd frame and resizes to 1280×720. `select` is exact decimation — the frames that survive are untouched source frames, never blended or duplicated, which is why this and not `-r`. In the real script the scale runs *after* the watermark repair, not here; see below. |
| `frame-%05d.webp` | `%05d` is the zero-padded counter: `frame-00001.webp`. Padding keeps lexicographic order equal to numeric order, so the sequence never reorders in a file listing, a glob, a CDN listing or a build step. |

`-q:v` is the same option as `-quality` for libwebp — `-q:v 100` and
`-quality 100` are interchangeable. (`-q:v` is the generic per-stream quality
flag; libwebp maps it onto its own 0–100 scale, so unlike the MJPEG and MPEG
encoders, higher is better and 100 is the maximum.)

### Never combine `-preset` with `-lossless 1`

This is the one real trap in the whole pipeline, and it is silent.

FFmpeg passes `-preset` to libwebp's `WebPConfigPreset()`, which **resets
`config.lossless` back to 0**. So asking for lossless and a preset together
gets you a lossy file, with no warning and no error. Measured on one frame of
this clip:

| Command | Bytes | RIFF chunk | PSNR |
|---|---|---|---|
| `-lossless 1 -quality 100` | 386,838 | `VP8L` | ∞ |
| `-lossless 1 -quality 100 -preset picture` | 193,906 | `VP8 ` | 45.84 dB |
| `-lossless 1 -quality 100 -preset default` | 193,896 | `VP8 ` | 45.83 dB |
| `-lossless 1 -quality 100 -preset none` | 386,838 | `VP8L` | ∞ |

Argument order does not rescue it — putting `-preset picture` *before*
`-lossless 1` gives the same lossy 193,906-byte result. Only `-preset none`
(the default when the flag is absent) leaves lossless intact.

The widely-copied "maximum quality WebP" recipe,
`-c:v libwebp -lossless 1 -compression_level 6 -q:v 100 -preset picture`,
therefore does **not** produce lossless output. It produces roughly 45.8 dB
lossy frames at half the size, which is a perfectly reasonable thing to ship —
but it is not what the command appears to ask for.

Check which you actually got, rather than trusting the flags. The 4 bytes at
offset 12 are the bitstream type:

```bash
head -c16 public/frames/frame-00001.webp | tail -c4   # VP8L = lossless, "VP8 " = lossy
```

```powershell
.\scripts\verify-frames.ps1 -ExpectLossless           # fails unless every frame is VP8L
```

In lossy mode `-preset` does matter and is worth setting: on this footage
`picture` gave 137,354 bytes against `photo`'s 140,250 for the same frame.

Note there is **no `-vf scale`, no `-s`, no `-aspect` and no crop**. Adding any
of them would break the promise that the frames are the source pixels. There is
also no `-r`, which would force a frame rate and resample the sequence.

### Windows

The commands above work unchanged in PowerShell **except for the line
continuations** — the backslash is not a PowerShell continuation character. Use
a backtick, or put it all on one line:

```powershell
ffmpeg -i "public/video/IMG_2305.MOV" `
  -fps_mode passthrough `
  -c:v libwebp -lossless 0 -quality 95 -compression_level 6 -preset picture `
  public/frames/frame-%05d.webp
```

```cmd
:: cmd.exe - continuation is ^, and %05d must be doubled to %%05d in a .bat file
ffmpeg -i "public/video/IMG_2305.MOV" -fps_mode passthrough -c:v libwebp -lossless 0 -quality 95 -compression_level 6 -preset picture public/frames/frame-%%05d.webp
```

Typed directly at a `cmd.exe` prompt, `%05d` is correct; only inside a `.bat`
or `.cmd` file does it need to be `%%05d`.

## Lossless or lossy?

Measured on this clip. Every 10th frame was sampled across the whole 10 seconds
and encoded each way, with PSNR taken against a lossless PNG decode of those
same frames; the totals are that sample × 10.

Sampling matters here: an initial attempt measured only frames 1–24, which are
less detailed than the clip average, and under-estimated the shipped sequence
by 20% (14.5 MB predicted against 18 MB actual). Use a spread sample, or the
whole clip.

| Mode | ~240 frames | Per frame | PSNR | Worst frame |
|---|---|---|---|---|
| PNG (reference) | 119 MB | 508 KB | ∞ | — |
| **WebP lossless** | **66.3 MB** | 283 KB | ∞ (bit-exact) | ∞ |
| WebP q100 | 28.4 MB | 121 KB | 45.13 dB | 44.49 dB |
| **WebP q95** ← default | **18.6 MB** | 79 KB | 44.10 dB | 43.44 dB |
| WebP q92 | 14.2 MB | 60 KB | 43.30 dB | 42.39 dB |
| WebP q90 | 12.0 MB | 51 KB | 42.75 dB | 41.75 dB |

The shipped 239-frame q95 sequence came out at **17.95 MB, 76.9 KB average,
115 KB worst frame** — within 4% of what the sample predicted.

**The default is q95.** Lossless is bit-exact and 66 MB. That is not a sensible
payload for a page that has to start animating while it loads — it is 3.6× the
q95 sequence for a difference no one can see on a moving canvas. Above ~40 dB
PSNR the error is below the visible threshold for photographic content; q95 sits
at 44.1 dB with a worst frame of 43.4 dB, so every frame clears it, not just
the average.

Note also what lossless is actually preserving. The source is a 3.86 Mb/s H.264
file in yuv420p: its own encoder already discarded detail and half the chroma
resolution before we ever saw it. Lossless WebP faithfully reproduces that
decoded result — including its compression artefacts — at 221 KB a frame. It
cannot restore detail the video never contained.

Going the other way, q95 → q100 costs 58% more bytes for 0.94 dB. The curve is
flat up there; q95 is where quality is already protected and the remaining
spend buys nothing you can see.

Use `-Lossless` when the frames are an archival master or an input to further
pixel work (the watermark repair, colour grading, re-encoding). Ship q95.

## Watermark repair

The source carries the generator's sparkle mark in the bottom-right corner, so
`extract-frames.ps1` routes frames through
[`scripts/remove-watermark.mjs`](../scripts/remove-watermark.mjs) on the way out.

This is why the default path decodes to **PNG first**, repairs, then encodes
WebP: inverting the mark's alpha compositing needs lossless pixels, and editing
an already-lossy frame would bake its artefacts into the result. PNG is
lossless, so the extra stage costs disk and time — not quality.

`-SkipWatermark` encodes straight from the video with no intermediate, which is
faster and the right choice for a clean source. The repair script auto-detects
whether a mark is present and leaves frames alone if it is not.

## Inspecting the source

Before extracting, confirm what you are working with:

```bash
ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,r_frame_rate,avg_frame_rate,nb_frames,pix_fmt,duration,bit_rate \
  -of default "public/video/IMG_2305.MOV"
```

- `r_frame_rate` is the native rate as an exact fraction (`24/1`; NTSC footage
  shows `30000/1001`). Use this, never a rounded decimal.
- `r_frame_rate` equal to `avg_frame_rate` means constant frame rate. If they
  differ the source is variable-rate, and frame index no longer maps linearly to
  time — extract with `-fps_mode passthrough` (which still takes every frame)
  and be aware the animation's pacing will follow frame order, not wall-clock.
- `nb_frames` is the frame count. Some containers omit it; count packets
  instead:

```bash
ffprobe -v error -select_streams v:0 -count_packets \
  -show_entries stream=nb_read_packets -of csv=p=0 "public/video/IMG_2305.MOV"
```

## Verifying the output

```powershell
.\scripts\verify-frames.ps1
.\scripts\verify-frames.ps1 -Psnr             # also measure fidelity vs the source
.\scripts\verify-frames.ps1 -ExpectLossless   # require a VP8L bitstream
```

It asserts the things that actually break the scrubber: the frame count matches
the source minus the trim, numbering is sequential from 1 with no gaps and
uniform padding, every file decodes as real WebP, and every frame carries the
source resolution. It reports the bitstream type and the size distribution,
including the largest single frame — the worst case for a mid-scroll stall.

Current output:

```
PASS  frame count: 239 files vs 239 expected (240 source - 1 trimmed)
PASS  filenames all match frame-%05d.webp
PASS  numbering is sequential 1..239 with no gaps
PASS  all 239 frames decode cleanly
PASS  uniform resolution: 1280x720
PASS  matches source resolution 1280x720
INFO  bitstream: VP8  x239
      total 17.95 MB   average 76.9 KB   largest 115 KB (frame-00120.webp)
      PSNR: frames 239  average 40.31 dB  worst 38.64 dB
```

### Reading the PSNR figure

40.31 dB looks worse than the 44.10 dB in the encoder table above, and the gap
is entirely the watermark repair — a deliberate edit the source has no
counterpart for. Splitting the frame proves it:

| Region | PSNR vs source | Worst |
|---|---|---|
| Excluding the watermark corner (`crop=1280:533:0:0`) | **44.11 dB** | 43.40 dB |
| The watermark corner only (`crop=166:115:1050:533`) | 26.12 dB | 23.25 dB |
| Whole frame | 40.31 dB | 38.64 dB |

44.11 dB matches the q95 benchmark almost exactly, so the encoder is doing what
the table says. The whole-frame number is measuring the repair, not compression
loss, and a *higher* whole-frame PSNR would mean the watermark had survived.
Measure a crop that excludes the corner if you want to judge the encoder.

The equivalent one-liners:

```bash
# Count, and compare against the source's frame count
ls public/frames/frame-*.webp | wc -l
ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of csv=p=0 "public/video/IMG_2305.MOV"

# Decode every frame; silence means all of them are valid and consistently sized
ffmpeg -v error -i public/frames/frame-%05d.webp -f null -

# Confirm one frame's real dimensions
ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 public/frames/frame-00001.webp

# Fidelity against the source video, per frame
ffmpeg -i "public/video/IMG_2305.MOV" -i public/frames/frame-%05d.webp \
  -lavfi "[0:v]format=rgb24[a];[1:v]format=rgb24[b];[a][b]psnr=stats_file=-" -f null -
```

`ffprobe`'s `nb_frames` on the WebP sequence reports `1` per file, not the
sequence length — each frame is its own still image. Count files instead.

## Browser and Canvas notes

What makes these frames fast to scrub, beyond the encoder settings:

- **WebP over PNG** — 18 MB against 119 MB for the same 239 frames, universally
  supported in current browsers, and decodable off the main thread via
  `createImageBitmap`.
- **One frame per file** — any frame is one cheap fetch. An animated WebP or a
  sprite atlas would force decoding of frames nobody is looking at, and atlases
  run into per-texture dimension limits fast.
- **`createImageBitmap` off the main thread** — `frameLoader.ts` decodes to
  `ImageBitmap` rather than `HTMLImageElement`, so `drawImage` during a scroll
  never triggers a synchronous decode and drops a frame.
- **Priority loading** — the loader fetches the opening frames and a strided
  skeleton across the whole sequence first, then fills in the gaps. The animation
  is scrubbable end to end before all 18 MB has arrived.
- **Long-lived caching** — frames are immutable and identified by name. Serve
  `public/frames/` with `Cache-Control: public, max-age=31536000, immutable`;
  see [`next.config.mjs`](../next.config.mjs).
- **Frame budget** — at 76.9 KB average, this 239-frame sequence is 17.95 MB.
  That is the number to watch if the clip gets longer: cost scales with frame
  count, so a 30-second clip at 24 fps would be ~54 MB. Trim the clip or drop to
  12–15 fps for the scroll before reaching for a lower quality setting; a
  scrubbed animation tolerates a lower frame rate far better than it tolerates
  artefacts. The worst single frame (115 KB) matters more than the average — it
  is the one that can stall a scrub mid-scroll.

## Project layout

```
Laundry Shope/
├── public/
│   ├── video/
│   │   └── IMG_2305.MOV         source, kept in the repo for re-extraction
│   └── frames/
│       ├── frame-00001.webp     generated - do not hand-edit
│       └── … frame-00450.webp
├── scripts/
│   ├── extract-frames.ps1       video → frames
│   ├── verify-frames.ps1        frames → pass/fail
│   ├── remove-watermark.mjs     corner repair, runs mid-pipeline
│   └── detect-captions.mjs      locates the burned-in caption block
├── lib/
│   ├── story.ts                 TOTAL_FRAMES, FRAME_PAD, progress → frame
│   └── frameLoader.ts           fetch + decode to ImageBitmap
├── components/
│   ├── FrameCanvas.tsx          the canvas that draws frames
│   ├── ScrollEngine.tsx         scroll position → progress
│   └── CinematicStage.tsx       composes canvas, rail and cue
├── docs/
│   └── frame-extraction.md      this file
└── next.config.mjs              cache headers for /frames
```

`public/frames/` is build output from `public/video/`. If you are considering
committing it, weigh 18 MB of binaries against needing FFmpeg on every
machine and in CI; whichever you pick, the source video stays in the repo so
the sequence can always be rebuilt.

## Changing the source video

1. Drop the file in `public/video/`.
2. `.\scripts\extract-frames.ps1 -InputVideo "public/video/<name>.mp4"`
3. Update `TOTAL_FRAMES`, and `FRAME_WIDTH`/`FRAME_HEIGHT` if the size changed,
   in [`lib/story.ts`](../lib/story.ts).
4. Re-check the chapter `from`/`to` frame ranges in that same file. They are
   tied to what happens on screen, not to the frame count, so a new clip
   invalidates them even if it has exactly 239 frames.
5. `.\scripts\verify-frames.ps1`
