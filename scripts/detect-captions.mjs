/**
 * Find the burned-in caption overlay in the source video.
 *
 * The commercial ships with its own lower-left captions — BOOKING, PICKUP,
 * RECEIVING and so on — which are the same words `config/scenes.ts` draws over
 * the canvas. Two sets of the same text on one frame is the problem this script
 * measures: where the burned-in block sits, which frames carry it, and therefore
 * what any removal has to cover.
 *
 * Detection is a colour gate, not OCR. The film is graded hard blue, so every
 * pixel in it keeps a blue cast; the caption glyphs are blown-out neutral white.
 * A tight "bright and colourless" test separates them from everything except a
 * genuinely white object, which is why the report gives you per-frame counts to
 * sanity-check rather than a single number to trust.
 *
 *   node scripts/detect-captions.mjs [path/to/video]
 *
 * Frames are read as raw rgb24 straight from FFmpeg's stdout at probe size. No
 * intermediate files, no image decoder, one pass over the clip.
 */
import { spawn } from "node:child_process";

const VIDEO = process.argv[2] ?? "public/video/IMG_2305.MOV";
/** Probe size. 1920x1080 / 4 — every reported coordinate scales back by 4. */
const W = 480, H = 270, SCALE = 4;
/** A pixel is "caption white" when it is this bright and this colourless. */
const MIN_LUMA = 205, MAX_CHROMA = 22;
/** Below this many white pixels a frame is treated as having no caption. */
const MIN_PIXELS = 140;

const ff = spawn("ffmpeg", [
  "-v", "error",
  "-i", VIDEO,
  "-vf", `scale=${W}:${H}`,
  "-fps_mode", "passthrough",
  "-f", "rawvideo",
  "-pix_fmt", "rgb24",
  "-",
]);

const FRAME_BYTES = W * H * 3;
let buffer = Buffer.alloc(0);
const rows = [];

ff.stderr.on("data", (d) => process.stderr.write(d));

ff.stdout.on("data", (chunk) => {
  buffer = buffer.length ? Buffer.concat([buffer, chunk]) : chunk;
  while (buffer.length >= FRAME_BYTES) {
    rows.push(analyse(buffer.subarray(0, FRAME_BYTES), rows.length + 1));
    buffer = buffer.subarray(FRAME_BYTES);
  }
});

function analyse(frame, n) {
  let count = 0, x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      const r = frame[i], g = frame[i + 1], b = frame[i + 2];
      const min = r < g ? (r < b ? r : b) : g < b ? g : b;
      const max = r > g ? (r > b ? r : b) : g > b ? g : b;
      if (min > MIN_LUMA && max - min < MAX_CHROMA) {
        count++;
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  return { n, count, x0, y0, x1, y1 };
}

ff.on("close", (code) => {
  if (code !== 0) {
    console.error(`ffmpeg exited ${code}`);
    process.exit(code ?? 1);
  }

  const withText = rows.filter((r) => r.count > MIN_PIXELS);
  if (!withText.length) {
    console.log(`${rows.length} frames scanned. No caption-like white found.`);
    return;
  }

  const box = withText.reduce(
    (a, r) => ({
      x0: Math.min(a.x0, r.x0), y0: Math.min(a.y0, r.y0),
      x1: Math.max(a.x1, r.x1), y1: Math.max(a.y1, r.y1),
    }),
    { x0: W, y0: H, x1: -1, y1: -1 }
  );

  const px = (v) => v * SCALE;
  console.log(`source                : ${VIDEO}`);
  console.log(`frames scanned        : ${rows.length}`);
  console.log(`frames with captions  : ${withText.length} (${Math.round((withText.length / rows.length) * 100)}%)`);
  console.log(`union box @${W}x${H}  : x ${box.x0}-${box.x1}  y ${box.y0}-${box.y1}`);
  console.log(`union box @full size  : x=${px(box.x0)} y=${px(box.y0)} w=${px(box.x1 - box.x0 + 1)} h=${px(box.y1 - box.y0 + 1)}`);
  console.log(`bottom band           : ${1080 - px(box.y0)}px tall = ${(((1080 - px(box.y0)) / 1080) * 100).toFixed(1)}% of the frame height`);
  console.log(`right edge            : ${(((px(box.x1) + SCALE) / 1920) * 100).toFixed(1)}% across the frame`);

  let start = null, prev = null;
  const runs = [];
  for (const r of rows) {
    const on = r.count > MIN_PIXELS;
    if (on && start === null) start = r.n;
    if (!on && start !== null) { runs.push([start, prev]); start = null; }
    prev = r.n;
  }
  if (start !== null) runs.push([start, prev]);

  console.log(`\ncaption runs (1-based frame numbers, runs under 4 frames omitted):`);
  for (const [a, b] of runs) {
    if (b - a < 3) continue;
    console.log(`  ${String(a).padStart(3)}-${String(b).padEnd(3)}  ${String(b - a + 1).padStart(3)} frames  ${((b - a + 1) / 30).toFixed(1)}s`);
  }
});
