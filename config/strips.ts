import { FrameRange } from "@/lib/frameLoader";

/**
 * The slice of the film each inner page scrubs in its hero.
 *
 * The homepage plays all 239 frames. Every other view opens on one shot from the
 * same sequence, scrubbed by its own scroll — so the film is not a homepage
 * gimmick that the rest of the site drops. Wherever you are, scrolling moves the
 * picture.
 *
 * Two rules picked these ranges:
 *
 *   - Each one sits inside a single shot of the film, against the cut list in
 *     `lib/story.ts`. A strip that crosses a cut would jump mid-scrub.
 *   - Each one is at most 24 frames, which is the point below which
 *     `FrameLoader` pins the whole slice instead of decoding a window of it
 *     (`PIN_EVERYTHING_BELOW`). A strip that holds all of its frames cannot
 *     stutter, and 23 frames is ~2 MB over the wire against the film's 40 MB.
 *
 * The shot is chosen to match what the page is about, because the strip is the
 * page's headline image, not decoration:
 */
export const STRIPS: Record<string, FrameRange> = {
  /** The steam press. Services is about the finish, so it opens on the finish. */
  services: { from: 276, to: 298 },
  /** The bag changing hands — the first step of the process the page explains. */
  process: { from: 106, to: 128 },
  /** Folded and bagged: what a plan actually buys. */
  pricing: { from: 361, to: 383 },
  /** Back at her door. The page that asks for the booking shows the return. */
  contact: { from: 420, to: 442 },
};
