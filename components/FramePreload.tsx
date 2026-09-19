import ReactDOM from "react-dom";
import type { FrameRange } from "@/lib/frameLoader";
import { frameSrc } from "@/lib/story";

/**
 * Starts the opening frames downloading while the HTML is still parsing.
 *
 * Nothing in `public/frames` was requested until the JS bundle had downloaded,
 * parsed and mounted `FrameCanvas` — a long wait, on a slow connection, for the
 * one asset the page cannot show anything without. Because the href comes from
 * the same `frameSrc` the loader calls, the warmed response is the one
 * `FrameLoader` gets back rather than a second copy under a different URL.
 *
 * `ReactDOM.preload` rather than rendering `<link>` elements: React hoists
 * those to `<head>` but emits its own copy alongside, so the markup ends up
 * carrying every hint twice. This API is the one built for it, and it
 * deduplicates by href.
 *
 * Deliberately only the first few frames. `rel="preload"` is a high-priority
 * request: queueing the loader's whole 20-frame opening set (~1.7 MB) ahead of
 * the bundle would win the race for the film and lose it for everything else.
 */
export default function FramePreload({
  range,
  count = 6,
}: {
  range: FrameRange;
  /** How many frames from the start of the range to warm. */
  count?: number;
}) {
  const last = Math.min(range.from + count - 1, range.to);

  for (let frame = range.from; frame <= last; frame++) {
    ReactDOM.preload(frameSrc(frame), { as: "image", type: "image/webp" });
  }

  return null;
}
