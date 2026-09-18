/**
 * Regenerates config/vanTrack.ts — the van's position in every frame of the two
 * van sequences.
 *
 * The van is white against blue sky and road (measured ~150 luma on the van,
 * ~70-110 on the background), so a single brightness threshold isolates it.
 * Each frame is reduced to a 64x36 luma map, every pixel at or above the
 * threshold is treated as van, and the centroid plus bounding box are recorded.
 *
 * Values are normalised 0-1 against the FRAME. SceneText maps them into
 * viewport pixels through the same cover-fit maths the canvas draws with, which
 * is what keeps tracked text on the van at any aspect ratio.
 *
 * Usage:  node scripts/track-van.mjs
 * Requires FFmpeg on PATH.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const W = 64;
const H = 36;
const N = W * H;
const THRESH = 130;

/** The two tracked sequences, as [name, firstFrame, frameCount]. */
const RANGES = [
  ["VAN_APPROACH", 29, 31, "Frames 29-59: the van heads out and comes at camera."],
  ["VAN_DEPART", 90, 29, "Frames 90-118: the van pulls away toward the facility."],
];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vantrack-"));

function dump(start, count) {
  const out = path.join(tmp, `${start}.gray`);
  execFileSync("ffmpeg", [
    "-v", "error",
    "-start_number", String(start),
    "-i", "public/frames/frame-%05d.webp",
    "-frames:v", String(count),
    "-vf", `format=gray,scale=${W}:${H}`,
    "-f", "rawvideo", out, "-y",
  ]);
  return fs.readFileSync(out);
}

function measure(buf, start) {
  const rows = [];
  for (let f = 0; f < buf.length / N; f++) {
    const o = f * N;
    let n = 0, sx = 0, sy = 0, minX = W, maxX = 0, minY = H, maxY = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (buf[o + y * W + x] >= THRESH) {
          n++; sx += x; sy += y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (n < 8) throw new Error(`no van found in frame ${start + f}`);
    rows.push({
      frame: start + f,
      cx: sx / n / W, cy: sy / n / H,
      x0: minX / W, x1: (maxX + 1) / W,
      y0: minY / H, y1: (maxY + 1) / H,
      area: n / N,
    });
  }
  return rows;
}

/** 3-frame moving average: the raw threshold flickers a pixel between frames,
 *  invisible in the picture but enough to make pinned text jitter. */
function smooth(rows) {
  const keys = ["cx", "cy", "x0", "x1", "y0", "y1", "area"];
  return rows.map((v, i) => {
    const s = { ...v };
    for (const k of keys) {
      const lo = Math.max(0, i - 1);
      const hi = Math.min(rows.length - 1, i + 1);
      let t = 0, c = 0;
      for (let j = lo; j <= hi; j++) { t += rows[j][k]; c++; }
      s[k] = Number((t / c).toFixed(4));
    }
    return s;
  });
}

const blocks = RANGES.map(([name, start, count, doc]) => {
  const rows = smooth(measure(dump(start, count), start));
  console.log(`${name}: ${rows.length} frames tracked`);
  const body = rows
    .map((v) => `  { frame: ${v.frame}, cx: ${v.cx}, cy: ${v.cy}, x0: ${v.x0}, x1: ${v.x1}, y0: ${v.y0}, y1: ${v.y1}, area: ${v.area} },`)
    .join("\n");
  return { name, doc, body, count: rows.length };
});

fs.rmSync(tmp, { recursive: true, force: true });

const total = blocks.reduce((a, b) => a + b.count, 0);

fs.writeFileSync(
  "config/vanTrack.ts",
  `/**
 * Van position per frame, measured from the frames themselves.
 *
 * GENERATED DATA — do not hand-edit. Regenerate with:
 *   node scripts/track-van.mjs
 *
 * Each frame was reduced to a ${W}x${H} luma map and every pixel at or above luma
 * ${THRESH} treated as van. The van is white against blue sky and road, so one
 * threshold isolates it; it was found in all ${total} frames of the two ranges.
 * Values are normalised 0-1 against the FRAME, not the viewport — SceneText
 * maps them through the same cover-fit maths the canvas draws with.
 *
 * Each value is a 3-frame moving average, which removes threshold flicker that
 * would otherwise make text pinned to the van jitter.
 *
 *   cx, cy   centroid of the van
 *   x0, x1   left and right edge of its bounding box
 *   y0, y1   top and bottom edge
 *   area     share of the frame it covers (it grows as it comes at camera)
 */

export interface VanSample {
  frame: number;
  cx: number;
  cy: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  area: number;
}

${blocks.map((b) => `/** ${b.doc} */\nexport const ${b.name}: VanSample[] = [\n${b.body}\n];`).join("\n\n")}

/** Nearest sample for a frame, or null outside the tracked range. */
export function sampleVan(
  track: VanSample[],
  frame: number
): VanSample | null {
  if (!track.length) return null;
  const i = Math.round(frame) - track[0].frame;
  if (i < 0 || i >= track.length) return null;
  return track[i];
}
`
);
console.log("wrote config/vanTrack.ts");
