/**
 * Van position per frame, measured from the frames themselves.
 *
 * GENERATED DATA — do not hand-edit. Regenerate with:
 *   node scripts/track-van.mjs
 *
 * Each frame was reduced to a 64x36 luma map and every pixel at or above luma
 * 130 treated as van. The van is white against blue sky and road, so one
 * threshold isolates it; it was found in all 60 frames of the two ranges.
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

/** Frames 29-59: the van heads out and comes at camera. */
export const VAN_APPROACH: VanSample[] = [
  { frame: 29, cx: 0.5594, cy: 0.5072, x0: 0.2109, x1: 0.8125, y0: 0.1667, y1: 0.875, area: 0.1484 },
  { frame: 30, cx: 0.5581, cy: 0.5067, x0: 0.2448, x1: 0.776, y0: 0.2222, y1: 0.8333, area: 0.125 },
  { frame: 31, cx: 0.5567, cy: 0.5058, x0: 0.3125, x1: 0.7083, y0: 0.3333, y1: 0.75, area: 0.079 },
  { frame: 32, cx: 0.5566, cy: 0.5065, x0: 0.3073, x1: 0.7135, y0: 0.3333, y1: 0.75, area: 0.0797 },
  { frame: 33, cx: 0.5578, cy: 0.5073, x0: 0.3021, x1: 0.7188, y0: 0.3333, y1: 0.75, area: 0.08 },
  { frame: 34, cx: 0.558, cy: 0.5066, x0: 0.2969, x1: 0.7188, y0: 0.3333, y1: 0.75, area: 0.0804 },
  { frame: 35, cx: 0.5583, cy: 0.5052, x0: 0.2969, x1: 0.7188, y0: 0.3241, y1: 0.75, area: 0.0822 },
  { frame: 36, cx: 0.5575, cy: 0.5023, x0: 0.2917, x1: 0.7188, y0: 0.3148, y1: 0.7593, area: 0.0868 },
  { frame: 37, cx: 0.5566, cy: 0.5006, x0: 0.2865, x1: 0.724, y0: 0.3056, y1: 0.7685, area: 0.0933 },
  { frame: 38, cx: 0.5575, cy: 0.4993, x0: 0.276, x1: 0.7344, y0: 0.3056, y1: 0.7778, area: 0.1013 },
  { frame: 39, cx: 0.5586, cy: 0.498, x0: 0.2656, x1: 0.7448, y0: 0.2963, y1: 0.787, area: 0.1111 },
  { frame: 40, cx: 0.5597, cy: 0.4968, x0: 0.25, x1: 0.7552, y0: 0.2778, y1: 0.7963, area: 0.1234 },
  { frame: 41, cx: 0.5631, cy: 0.4937, x0: 0.2344, x1: 0.7656, y0: 0.2593, y1: 0.8056, area: 0.137 },
  { frame: 42, cx: 0.5666, cy: 0.4914, x0: 0.2188, x1: 0.7813, y0: 0.2407, y1: 0.8148, area: 0.1539 },
  { frame: 43, cx: 0.5714, cy: 0.4874, x0: 0.1979, x1: 0.8021, y0: 0.2222, y1: 0.8333, area: 0.1723 },
  { frame: 44, cx: 0.5742, cy: 0.486, x0: 0.1771, x1: 0.8229, y0: 0.2037, y1: 0.8796, area: 0.1963 },
  { frame: 45, cx: 0.5767, cy: 0.4831, x0: 0.151, x1: 0.8438, y0: 0.1852, y1: 0.9259, area: 0.2231 },
  { frame: 46, cx: 0.581, cy: 0.4809, x0: 0.1302, x1: 0.8646, y0: 0.1667, y1: 0.9722, area: 0.2536 },
  { frame: 47, cx: 0.5851, cy: 0.4744, x0: 0.0938, x1: 0.8958, y0: 0.1296, y1: 0.9815, area: 0.3011 },
  { frame: 48, cx: 0.5912, cy: 0.4699, x0: 0.0573, x1: 0.9271, y0: 0.0926, y1: 0.9815, area: 0.3519 },
  { frame: 49, cx: 0.594, cy: 0.4644, x0: 0.0208, x1: 0.9583, y0: 0.0556, y1: 0.9815, area: 0.4076 },
  { frame: 50, cx: 0.5976, cy: 0.4607, x0: 0.0052, x1: 0.9792, y0: 0.0278, y1: 0.9907, area: 0.452 },
  { frame: 51, cx: 0.5986, cy: 0.4557, x0: 0, x1: 0.9948, y0: 0.0093, y1: 1, area: 0.4935 },
  { frame: 52, cx: 0.5994, cy: 0.4527, x0: 0, x1: 1, y0: 0, y1: 1, area: 0.5266 },
  { frame: 53, cx: 0.5949, cy: 0.4509, x0: 0, x1: 1, y0: 0, y1: 1, area: 0.5535 },
  { frame: 54, cx: 0.5896, cy: 0.4511, x0: 0, x1: 1, y0: 0, y1: 1, area: 0.5738 },
  { frame: 55, cx: 0.5829, cy: 0.452, x0: 0, x1: 1, y0: 0, y1: 1, area: 0.592 },
  { frame: 56, cx: 0.5776, cy: 0.4537, x0: 0, x1: 1, y0: 0, y1: 1, area: 0.6055 },
  { frame: 57, cx: 0.573, cy: 0.4558, x0: 0, x1: 1, y0: 0, y1: 1, area: 0.6169 },
  { frame: 58, cx: 0.5686, cy: 0.4571, x0: 0, x1: 1, y0: 0, y1: 1, area: 0.6257 },
  { frame: 59, cx: 0.5673, cy: 0.4577, x0: 0, x1: 1, y0: 0, y1: 1, area: 0.6291 },
];

/** Frames 90-118: the van pulls away toward the facility. */
export const VAN_DEPART: VanSample[] = [
  { frame: 90, cx: 0.4125, cy: 0.4224, x0: 0, x1: 0.9297, y0: 0, y1: 1, area: 0.6441 },
  { frame: 91, cx: 0.4077, cy: 0.4207, x0: 0, x1: 0.9219, y0: 0, y1: 0.9907, area: 0.636 },
  { frame: 92, cx: 0.3993, cy: 0.4172, x0: 0, x1: 0.9063, y0: 0, y1: 0.9815, area: 0.6165 },
  { frame: 93, cx: 0.3962, cy: 0.4153, x0: 0.0052, x1: 0.8906, y0: 0, y1: 0.963, area: 0.59 },
  { frame: 94, cx: 0.4002, cy: 0.4151, x0: 0.0208, x1: 0.875, y0: 0, y1: 0.9444, area: 0.5502 },
  { frame: 95, cx: 0.4099, cy: 0.4173, x0: 0.0521, x1: 0.8594, y0: 0, y1: 0.9167, area: 0.4999 },
  { frame: 96, cx: 0.422, cy: 0.4209, x0: 0.0885, x1: 0.8438, y0: 0.0185, y1: 0.8889, area: 0.4433 },
  { frame: 97, cx: 0.4335, cy: 0.4268, x0: 0.125, x1: 0.8229, y0: 0.0463, y1: 0.8704, area: 0.3908 },
  { frame: 98, cx: 0.4437, cy: 0.4344, x0: 0.1563, x1: 0.8021, y0: 0.0833, y1: 0.8519, area: 0.3442 },
  { frame: 99, cx: 0.454, cy: 0.4408, x0: 0.1875, x1: 0.8594, y0: 0.1111, y1: 0.8333, area: 0.3018 },
  { frame: 100, cx: 0.4655, cy: 0.447, x0: 0.2135, x1: 0.9271, y0: 0.1389, y1: 0.8148, area: 0.2643 },
  { frame: 101, cx: 0.4784, cy: 0.4519, x0: 0.2396, x1: 0.9948, y0: 0.1667, y1: 0.7963, area: 0.2316 },
  { frame: 102, cx: 0.489, cy: 0.4577, x0: 0.2604, x1: 0.9792, y0: 0.1944, y1: 0.787, area: 0.2053 },
  { frame: 103, cx: 0.4957, cy: 0.4634, x0: 0.2865, x1: 0.9531, y0: 0.213, y1: 0.7685, area: 0.1823 },
  { frame: 104, cx: 0.5006, cy: 0.4676, x0: 0.3073, x1: 0.9375, y0: 0.213, y1: 0.7593, area: 0.1615 },
  { frame: 105, cx: 0.504, cy: 0.472, x0: 0.3229, x1: 0.9115, y0: 0.2315, y1: 0.75, area: 0.1429 },
  { frame: 106, cx: 0.508, cy: 0.4737, x0: 0.3333, x1: 0.901, y0: 0.2222, y1: 0.7407, area: 0.1263 },
  { frame: 107, cx: 0.5097, cy: 0.4779, x0: 0.3438, x1: 0.8646, y0: 0.2593, y1: 0.7315, area: 0.1127 },
  { frame: 108, cx: 0.5131, cy: 0.4804, x0: 0.3594, x1: 0.8438, y0: 0.2685, y1: 0.7222, area: 0.102 },
  { frame: 109, cx: 0.5151, cy: 0.4834, x0: 0.3698, x1: 0.8125, y0: 0.3148, y1: 0.713, area: 0.0916 },
  { frame: 110, cx: 0.5174, cy: 0.4847, x0: 0.3802, x1: 0.7969, y0: 0.3241, y1: 0.7037, area: 0.0828 },
  { frame: 111, cx: 0.5193, cy: 0.4874, x0: 0.3854, x1: 0.7813, y0: 0.3333, y1: 0.6944, area: 0.0738 },
  { frame: 112, cx: 0.5206, cy: 0.4909, x0: 0.3958, x1: 0.7656, y0: 0.3426, y1: 0.6944, area: 0.0679 },
  { frame: 113, cx: 0.5218, cy: 0.4947, x0: 0.401, x1: 0.7552, y0: 0.3519, y1: 0.6944, area: 0.0622 },
  { frame: 114, cx: 0.5235, cy: 0.4963, x0: 0.4115, x1: 0.8333, y0: 0.3426, y1: 0.6944, area: 0.058 },
  { frame: 115, cx: 0.5257, cy: 0.4961, x0: 0.4167, x1: 0.8229, y0: 0.3519, y1: 0.6852, area: 0.0527 },
  { frame: 116, cx: 0.5292, cy: 0.4942, x0: 0.4219, x1: 0.8958, y0: 0.3333, y1: 0.6759, area: 0.0482 },
  { frame: 117, cx: 0.5302, cy: 0.4931, x0: 0.4271, x1: 0.8854, y0: 0.3333, y1: 0.6667, area: 0.0446 },
  { frame: 118, cx: 0.5313, cy: 0.4928, x0: 0.4297, x1: 0.9688, y0: 0.3056, y1: 0.6667, area: 0.0436 },
];

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
