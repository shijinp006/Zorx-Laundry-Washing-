/**
 * Removes the generator's sparkle watermark from a directory of PNG frames.
 *
 * The mark is a fixed-position, constant-opacity white shape composited over
 * the picture, so it can be undone exactly rather than blurred over:
 *
 *     observed = background * (1 - a) + 255 * a
 *     background = (observed - 255 * a) / (1 - a)
 *
 * The per-pixel alpha map `a` is measured from the frames themselves, using the
 * flattest ones (where the area behind the mark is smooth) so the estimate is
 * not polluted by scene content. That makes this work unchanged if the clip is
 * ever regenerated, as long as the mark keeps the same style.
 *
 * Usage:
 *   node scripts/remove-watermark.mjs <framesDir>
 *
 * Operates in place on frame-*.png. Requires the `canvas` package.
 */

import fs from "node:fs";
import path from "node:path";
import { createCanvas, loadImage } from "canvas";

const framesDir = path.resolve(process.argv[2] ?? "frames-tmp");

/** Where to look for the mark. It sits in the bottom-right corner. */
const REGION = { xFrac: 0.82, yFrac: 0.74, wFrac: 0.13, hFrac: 0.16 };
/** Columns at each edge of the region assumed to be clean background. */
const PAD = 16;
/** Frames used to measure the alpha map — the ones with the flattest backdrop. */
const SAMPLE_FRAMES = 90;
/** Alpha below this is treated as measurement noise. */
const NOISE_FLOOR = 0.004;
/** If the strongest pixel is weaker than this, assume there is no watermark. */
const MIN_PEAK = 0.05;

const files = fs
  .readdirSync(framesDir)
  .filter((f) => /^frame-\d+\.png$/.test(f))
  .sort();

if (!files.length) {
  console.error(`No frame-*.png found in ${framesDir}`);
  process.exit(1);
}

const probe = await loadImage(path.join(framesDir, files[0]));
const X0 = Math.round(probe.width * REGION.xFrac);
const Y0 = Math.round(probe.height * REGION.yFrac);
const W = Math.round(probe.width * REGION.wFrac);
const H = Math.round(probe.height * REGION.hFrac);

const region = createCanvas(W, H);
const rctx = region.getContext("2d");

/** Pull the search region out of a frame as raw pixels. */
async function readRegion(file) {
  const img = await loadImage(path.join(framesDir, file));
  rctx.clearRect(0, 0, W, H);
  rctx.drawImage(img, X0, Y0, W, H, 0, 0, W, H);
  return { img, data: rctx.getImageData(0, 0, W, H).data };
}

/** Background estimate for row `y`: a linear ramp between the clean edges. */
function edges(data, y) {
  let left = 0;
  let right = 0;
  for (let k = 0; k < PAD; k++) {
    const li = (y * W + k) * 4;
    left += (data[li] + data[li + 1] + data[li + 2]) / 3;
    const ri = (y * W + (W - 1 - k)) * 4;
    right += (data[ri] + data[ri + 1] + data[ri + 2]) / 3;
  }
  return [left / PAD, right / PAD];
}

console.log(`Scanning ${files.length} frames for the watermark…`);

// Pass 1 — rank frames by how flat the region is, so the alpha map is measured
// against smooth backdrop rather than furniture or a person.
const flatness = [];
for (const file of files) {
  const { data } = await readRegion(file);
  let resid = 0;
  let n = 0;
  for (let y = 0; y < H; y++) {
    const [L] = edges(data, y);
    for (let k = 0; k < PAD; k++) {
      const i = (y * W + k) * 4;
      resid += Math.abs((data[i] + data[i + 1] + data[i + 2]) / 3 - L);
      n++;
    }
  }
  flatness.push({ file, resid: resid / n });
}
flatness.sort((a, b) => a.resid - b.resid);

// Pass 2 — average the implied alpha across the flattest frames.
const sample = flatness.slice(0, Math.min(SAMPLE_FRAMES, flatness.length));
const alpha = new Float64Array(W * H);

// Cache the sample regions; they get re-read once per refinement round.
const sampleData = [];
for (const { file } of sample) sampleData.push((await readRegion(file)).data);

for (const data of sampleData) {
  for (let y = 0; y < H; y++) {
    const [L, R] = edges(data, y);
    for (let x = 0; x < W; x++) {
      const bg = L + (R - L) * (x / (W - 1));
      const i = (y * W + x) * 4;
      const obs = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (255 - bg > 1) alpha[y * W + x] += (obs - bg) / (255 - bg);
    }
  }
}
for (let i = 0; i < alpha.length; i++) alpha[i] /= sample.length;

/**
 * Refine the alpha map against its own residual.
 *
 * A single pass slightly misjudges the anti-aliased rim of the mark, which
 * leaves a faint outline once the centre is gone. Undoing the composite with
 * the current estimate and folding whatever is left back into the map converges
 * on the true per-pixel opacity in a couple of rounds.
 */
const REFINE_ROUNDS = 3;
for (let round = 0; round < REFINE_ROUNDS; round++) {
  const delta = new Float64Array(W * H);
  for (const data of sampleData) {
    // Undo the composite with the current estimate.
    const restored = new Float64Array(W * H);
    for (let p = 0; p < W * H; p++) {
      const a = alpha[p];
      const i = p * 4;
      const obs = (data[i] + data[i + 1] + data[i + 2]) / 3;
      restored[p] = a > 0 ? (obs - 255 * a) / (1 - a) : obs;
    }
    for (let y = 0; y < H; y++) {
      // The edges are outside the mark, so they are already clean.
      let L = 0;
      let R = 0;
      for (let k = 0; k < PAD; k++) {
        L += restored[y * W + k];
        R += restored[y * W + (W - 1 - k)];
      }
      L /= PAD;
      R /= PAD;
      for (let x = 0; x < W; x++) {
        const bg = L + (R - L) * (x / (W - 1));
        if (255 - bg > 1) delta[y * W + x] += (restored[y * W + x] - bg) / (255 - bg);
      }
    }
  }
  let moved = 0;
  for (let p = 0; p < W * H; p++) {
    const step = delta[p] / sampleData.length;
    alpha[p] = Math.min(Math.max(alpha[p] + step, 0), 0.95);
    moved = Math.max(moved, Math.abs(step));
  }
  console.log(`  refine round ${round + 1}: largest alpha correction ${moved.toFixed(4)}`);
}

let peak = 0;
for (const v of alpha) if (v > peak) peak = v;
if (peak < MIN_PEAK) {
  console.log(`No watermark detected (peak alpha ${peak.toFixed(3)}). Nothing to do.`);
  process.exit(0);
}
for (let i = 0; i < alpha.length; i++) if (alpha[i] < NOISE_FLOOR) alpha[i] = 0;

let bx0 = W, bx1 = -1, by0 = H, by1 = -1, marked = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (alpha[y * W + x] > 0) {
      marked++;
      if (x < bx0) bx0 = x;
      if (x > bx1) bx1 = x;
      if (y < by0) by0 = y;
      if (y > by1) by1 = y;
    }
  }
}
console.log(
  `Found it: ${bx1 - bx0 + 1}x${by1 - by0 + 1}px at (${X0 + bx0}, ${Y0 + by0}), ` +
    `peak opacity ${peak.toFixed(3)}, ${marked} affected pixels.`
);

// Pass 3 — invert the compositing on every frame.
const full = createCanvas(probe.width, probe.height);
const fctx = full.getContext("2d");

let done = 0;
for (const file of files) {
  const img = await loadImage(path.join(framesDir, file));
  fctx.clearRect(0, 0, probe.width, probe.height);
  fctx.drawImage(img, 0, 0);

  const patch = fctx.getImageData(X0, Y0, W, H);
  const d = patch.data;
  for (let p = 0; p < W * H; p++) {
    const a = alpha[p];
    if (a <= 0) continue;
    const i = p * 4;
    for (let ch = 0; ch < 3; ch++) {
      const restored = (d[i + ch] - 255 * a) / (1 - a);
      d[i + ch] = restored < 0 ? 0 : restored > 255 ? 255 : Math.round(restored);
    }
  }
  fctx.putImageData(patch, X0, Y0);

  fs.writeFileSync(path.join(framesDir, file), full.toBuffer("image/png"));
  if (++done % 40 === 0) console.log(`  ${done}/${files.length}`);
}

console.log(`Done. Cleaned ${done} frames.`);
