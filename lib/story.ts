/**
 * Single source of truth for the cinematic scroll experience.
 *
 * Everything — the canvas frame, the text beats and the navigation state — is
 * derived from one number: `progress` (0 → 1 across the scroll runway).
 *
 * The frame sequence was extracted from the Wash Zone commercial (239 frames,
 * 1280x720, 24fps). The chapter/beat boundaries below map to what is actually
 * happening on screen in those frames.
 *
 * The source video opens on a storyboard contact sheet — a grid of all the
 * shots with numbered captions — which is not part of the footage. It is
 * dropped at extraction (`extract-frames.ps1 -TrimStart 1`), so frame 1 here is
 * the first real shot and the sequence is 239 frames, not the video's 240.
 */

export const TOTAL_FRAMES = 239;

/** Path + naming of the extracted frame sequence in /public. */
export const FRAME_PATH = "/frames/frame-";
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
 * Chapters sit on the film's real cuts, found with FFmpeg scene detection
 * (frames 29, 48, 60, 90, 119, 134, 151, 167, 190, 211, 227):
 *
 *   1-28     she books the pickup on her phone
 *   29-59    the van heads out and pulls up
 *   60-118   the bag is handed over, then carried to the plant
 *   119-189  sorting, the wash drum, the crate, the press
 *   190-210  folded stacks loaded into the van
 *   211-239  delivered at her door, closing brand lockup
 *
 * These replaced ranges inherited from a different edit of the film (1-17,
 * 17-52, 52-119, 119-214, 214-239), which is why the nav used to highlight
 * `process` while the doorstep hand-over was on screen: the labels no longer
 * described the frames underneath them.
 */
const RAW_CHAPTERS: Omit<Chapter, "start" | "end" | "weight">[] = [
  { id: "home", label: "Home", from: 1, to: 29, landingFrame: 12 },
  { id: "about", label: "About", from: 29, to: 60, landingFrame: 48 },
  { id: "pickup", label: "Pickup", from: 60, to: 119, landingFrame: 74 },
  { id: "process", label: "Process", from: 119, to: 190, landingFrame: 126 },
  { id: "product", label: "Product", from: 190, to: 211, landingFrame: 200 },
  {
    id: "contact",
    label: "Contact",
    from: 211,
    to: TOTAL_FRAMES,
    landingFrame: 220,
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
