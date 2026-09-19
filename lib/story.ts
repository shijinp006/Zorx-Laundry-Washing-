/**
 * Single source of truth for the cinematic scroll experience.
 *
 * Everything — the canvas frame, the text beats and the navigation state — is
 * derived from one number: `progress` (0 → 1 across the scroll runway).
 *
 * The frame sequence is extracted from the Wash Zone commercial
 * (`public/video/new video .MOV`, v3 — a re-render of the same shots and cuts
 * as the earlier `IMG_2305.MOV` source, minus its burned-in captions): 900
 * source frames at 1920x1080 and 30fps, decimated to every second frame and
 * scaled to 1280x720, giving 450 frames at an effective 15fps. See
 * `scripts/extract-frames.ps1` for why the rate comes down before the quality
 * does.
 *
 * Because v3 matches the old source frame-for-frame in timing, every cut point
 * and chapter/section boundary tuned against v2 still lands correctly — only
 * the picture changed, not the numbering.
 *
 * Frame `k` here is source frame `2k - 1`. That matters when reading a cut list
 * off the source with FFmpeg scene detection: halve and round up.
 *
 * The clip opens straight on the booking shot, so nothing is trimmed and frame 1
 * is the first real frame (the previous clip opened on a storyboard contact
 * sheet and needed `-TrimStart 1`).
 */

export const TOTAL_FRAMES = 450;

/** Path + naming of the extracted frame sequence in /public. */
/**
 * Cache-busting version for the frame sequence. **Bump this on every
 * re-extraction.**
 *
 * `next.config.mjs` serves `/frames/` with `max-age=31536000, immutable`, which
 * is what lets a returning visitor scrub the whole film with no network at all.
 * The cost is that a frame URL can never change meaning: `immutable` tells the
 * browser not even to revalidate, so re-extracting over the same filenames
 * leaves everyone who has already visited watching the old footage for a year,
 * with no way to notice and nothing to do about it short of clearing site data.
 *
 * That is not hypothetical — it happened here. The 30-second film was extracted
 * over the 10-second one's filenames and the page carried on playing the old
 * commercial from cache. Making the version part of the path means new frames
 * get new URLs and the superseded ones simply expire unused.
 */
export const FRAME_VERSION = "v3";

export const FRAME_PATH = `/frames/${FRAME_VERSION}/frame-`;
export const FRAME_EXT = ".webp";
export const FRAME_PAD = 5;

/** Native size of a frame, used for the canvas cover-fit maths. */
export const FRAME_WIDTH = 1280;
export const FRAME_HEIGHT = 720;

export type SectionId =
  | "home"
  | "about"
  | "pickup"
  | "process"
  | "product"
  | "contact";

export interface Chapter {
  id: SectionId;
  label: string;
  /** First frame of the chapter (1-based, inclusive). */
  from: number;
  /** Frame the chapter runs up to — the next chapter's `from`, so playback is continuous. */
  to: number;
  /**
   * The frame a nav click should land on.
   *
   * Set per chapter rather than derived from a fraction of its length. A single
   * "land 28% in" rule cannot hit the right shot in every chapter, because the
   * chapters contain different numbers of cuts — 28% into `process` lands on
   * the drum, when the shot that introduces the plant is the operator loading
   * it. Naming the frame makes each nav item land on a chosen image.
   */
  landingFrame: number;
  /** Share of the scroll runway this chapter occupies (0-1, derived below). */
  weight: number;
  /** Start of the chapter in progress space (0-1). Filled in below. */
  start: number;
  /** End of the chapter in progress space (0-1). Filled in below. */
  end: number;
}

/**
 * Chapters sit on the film's real cuts, found with FFmpeg scene detection over
 * the source and converted to this sequence's numbering:
 *
 *   ffmpeg -i "public/video/IMG_2305.MOV" \
 *     -vf "select='gt(scene,0.12)',metadata=print" -f null -
 *
 * which found cuts at source frames 42, 91, 96, 166, 241, 301, 316, 387, 436,
 * 451, 481, 511, 526, 584, 601, 736, 781, 809 and 839 — here 22, 46, 49, 84,
 * 121, 151, 159, 194, 219, 226, 241, 256, 264, 293, 301, 369, 391, 405 and 420.
 *
 * Every boundary below is one of those, so a chapter change always lands on a
 * real edit rather than mid-shot:
 *
 *   1-45     she books the pickup on her phone
 *   46-120   the van heads out, along the road, and pulls up
 *   121-195  the bag is handed over, received and driven away
 *   196-300  sorting, the wash drum, the tunnel, the press
 *   301-390  folded, packed and bagged
 *   391-450  delivered at her door at night
 *
 * The 239-frame ranges these replaced belong to a completely different, shorter
 * edit of the commercial and described shots that no longer exist.
 */
const RAW_CHAPTERS: Omit<Chapter, "start" | "end" | "weight">[] = [
  { id: "home", label: "Home", from: 1, to: 46, landingFrame: 20 },
  { id: "about", label: "About", from: 46, to: 121, landingFrame: 75 },
  { id: "pickup", label: "Pickup", from: 121, to: 196, landingFrame: 140 },
  { id: "process", label: "Process", from: 196, to: 301, landingFrame: 240 },
  { id: "product", label: "Product", from: 301, to: 391, landingFrame: 375 },
  {
    id: "contact",
    label: "Contact",
    from: 391,
    to: TOTAL_FRAMES,
    landingFrame: 428,
  },
];

/**
 * How closely scroll distance tracks frame count — the knob that decides how
 * evenly the film plays.
 *
 * Each chapter's share of the runway is blended between its true length and an
 * equal fifth:
 *
 *   1  perfectly linear. Scrolling 10% of the runway always advances 10% of the
 *      sequence, so the film runs at one constant speed. It also hands the
 *      16-frame opening act only 6.7% of the page, which is not enough scroll
 *      to read a headline in.
 *   0  every act gets an equal fifth. The copy gets even room, but the film
 *      then speeds up and slows down by 2.7x between acts.
 *
 * The weights this replaced were hand-typed (13.5 / 17.3 / 24 / 29.8 / 15.4)
 * and sat near 0, so the picture ran at 0.50x through the opening and 1.34x
 * through `product` — the longest act, and the one that reads as running away
 * from you. At 0.75 the spread is 0.67x-1.14x, close enough to constant that
 * the eye does not catch the change at a boundary, while the opening and
 * closing acts still get room to breathe.
 *
 * Deriving the weights rather than typing them also means they always sum to 1
 * and always follow the frame ranges above, so editing a chapter boundary
 * cannot silently leave the pacing describing the old cut.
 */
const PACING = 0.75;

export const CHAPTERS: Chapter[] = (() => {
  // `to` is the next chapter's `from`, so the span is the frame count.
  const spans = RAW_CHAPTERS.map((c) => Math.max(c.to - c.from, 1));
  const totalSpan = spans.reduce((sum, s) => sum + s, 0);
  const equalShare = 1 / RAW_CHAPTERS.length;

  const weights = spans.map(
    (span) => PACING * (span / totalSpan) + (1 - PACING) * equalShare
  );
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  let acc = 0;
  const built = RAW_CHAPTERS.map((c, i) => {
    const weight = weights[i] / totalWeight;
    const start = acc;
    acc += weight;
    return { ...c, weight, start, end: acc };
  });
  // Guard against float drift so the last frame lands exactly at progress 1.
  built[built.length - 1].end = 1;
  return built;
})();

export const clamp = (v: number, min = 0, max = 1) =>
  v < min ? min : v > max ? max : v;

/**
 * Piecewise-linear interpolation, clamped at the ends — the same mapping
 * `useTransform` did when a `MotionValue` drove these styles. Kept as a plain
 * function so a scroll-linked style can be written straight to the DOM inside
 * the same Lenis tick that computed `progress`, instead of handing the number
 * to a second, independent scheduler.
 */
export function mapRange(
  value: number,
  input: number[],
  output: number[]
): number {
  const last = input.length - 1;
  if (value <= input[0]) return output[0];
  if (value >= input[last]) return output[last];
  for (let i = 0; i < last; i++) {
    if (value >= input[i] && value <= input[i + 1]) {
      const span = input[i + 1] - input[i] || 1;
      const t = (value - input[i]) / span;
      return output[i] + t * (output[i + 1] - output[i]);
    }
  }
  return output[last];
}

/**
 * Progress (0-1) → continuous frame position (1 → TOTAL_FRAMES).
 * Piecewise-linear across chapters: monotonic and continuous, so the sequence
 * never jumps or runs backwards, it just breathes at a different rate per act.
 */
export function frameFromProgress(progress: number): number {
  const p = clamp(progress);
  for (let i = 0; i < CHAPTERS.length; i++) {
    const c = CHAPTERS[i];
    if (p <= c.end || i === CHAPTERS.length - 1) {
      const span = c.end - c.start || 1;
      const t = clamp((p - c.start) / span);
      return c.from + t * (c.to - c.from);
    }
  }
  return TOTAL_FRAMES;
}

/** Frame position → progress. The exact inverse of `frameFromProgress`. */
export function progressFromFrame(frame: number): number {
  const f = clamp(frame, 1, TOTAL_FRAMES);
  for (let i = 0; i < CHAPTERS.length; i++) {
    const c = CHAPTERS[i];
    if (f <= c.to || i === CHAPTERS.length - 1) {
      const span = c.to - c.from || 1;
      const t = clamp((f - c.from) / span);
      return c.start + t * (c.end - c.start);
    }
  }
  return 1;
}

export function chapterFromProgress(progress: number): Chapter {
  const p = clamp(progress);
  for (const c of CHAPTERS) {
    if (p < c.end) return c;
  }
  return CHAPTERS[CHAPTERS.length - 1];
}

/** Builds the zero-padded src for a 1-based frame index. */
export function frameSrc(index: number): string {
  return `${FRAME_PATH}${String(index).padStart(FRAME_PAD, "0")}${FRAME_EXT}`;
}
