import { TOTAL_FRAMES, progressFromFrame } from "@/lib/story";

/**
 * Scene configuration for the cinematic text layer.
 *
 * Edit the copy, the frame ranges and the placement here. Nothing in this file
 * knows how the animation works, and `components/SceneText.tsx` holds no copy —
 * so the words and the motion can be changed independently.
 *
 *
 * WHERE THE BOUNDARIES COME FROM
 *
 * Every cut was located with FFmpeg scene detection over the real frames:
 *
 *   ffmpeg -framerate 24 -i public/frames/frame-%05d.webp \
 *     -vf "select='gt(scene,0.06)',metadata=print" -f null -
 *
 * which found hard cuts at frames 29, 48, 60, 90, 119, 134, 151, 167, 190, 211
 * and 227. Every range below starts on one of those, so a text change always
 * lands on a real edit rather than mid-shot.
 *
 *
 * WHERE THE PLACEMENT COMES FROM
 *
 * Each frame was reduced to a 96x54 luma map split into a 3x3 grid; per cell,
 * the standard deviation says how busy it is and the mean says how bright.
 * Text goes in the flattest cell clear of the subject, checked at two or more
 * frames per scene so the choice holds across the shot. The `note` on each
 * scene records that measurement.
 *
 * `stage__scrim` in globals.css darkens the left and right thirds by 68% and
 * the top by 45%, which is why every scene is `theme: "light"` — text at the
 * edges always sits on darkened blue, including on the brighter end cards. The
 * field exists for a frame that genuinely needs dark type.
 *
 *
 * THE SUPPLIED COPY, AND WHAT IT MAPPED ONTO
 *
 * The eleven supplied lines were written against a generic laundry process.
 * This film does not have that shot list, so eight are used on the shots that
 * genuinely show them, one scene carries new copy, and three are held back:
 *
 *   used  01 Booking            -> frames 1-28     phone booking
 *   used  02 Pickup             -> frames 29-59    van heads out and pulls up
 *   NEW   "We Take It From Here"-> frames 60-89    the bag handed to the courier
 *   used  03 Sorting            -> frames 119-133  operator loading the washer
 *   used  04 Washing            -> frames 134-150  drum
 *   used  06 Ironing            -> frames 167-189  steam press
 *   used  07 Folding & Packing  -> frames 190-210  folded stacks in the van
 *   used  10 Delivery           -> frames 211-226  customer at her door
 *   used  11 Fresh Clothes      -> frames 227-239  closing brand lockup
 *
 * The hand-over was split out of the pickup scene once the nav gained a Pickup
 * item pointing at it: a nav destination needs its own headline, and one line
 * cannot introduce both the van arriving and the bag changing hands.
 *
 *   held  05 Drying             no drying shot exists. Frames 134-150 are a
 *                               single drum sequence, and 151-166 is a sealed
 *                               crate moving through the plant. Putting
 *                               "Thorough drying for clean and hygienic
 *                               results" on either would describe something
 *                               not on screen.
 *   held  08 Quality Check      no inspection shot exists. The nearest is the
 *                               tail of the pressing sequence (184-189), which
 *                               is six frames — shorter than a reveal, so a
 *                               headline could not even finish arriving.
 *   held  09 Ready for Delivery no shot left. Frames 190-210 already carry 07
 *                               (it is the same folded-stacks sequence), and
 *                               "ready for its journey home" cannot go on
 *                               90-118 or 151-166 because both are outbound,
 *                               mid-process journeys.
 *
 * Two shots are deliberately left clean as a result: 90-118 (the van carrying
 * the bag to the plant) and 151-166 (the crate in the tunnel). Both are transit
 * beats, and a silent shot between the pickup and the process section is good
 * rhythm rather than a gap to be filled.
 *
 * If 05 and 08 matter, they need footage. If 09 should appear, it would replace
 * 07 on frames 190-210 — that range fits either line.
 */

export type TextPosition = "left" | "center" | "right";
export type TextAnchor = "top" | "middle" | "bottom";
export type TextAlignment = "start" | "center";
export type TextTheme = "light" | "dark";

/**
 * How a scene's copy arrives. Each is implemented in `SceneText.tsx`; the
 * choice belongs to the shot, which is why it lives here.
 *
 *   wave    Words rise 40px and sharpen, staggered. The default.
 *   liquid  Words fall into place with a droplet stretch that settles, as if
 *           surface tension pulled them down. For water — the opening and the
 *           wash drum.
 *   fly3d   Words fly in from behind the screen and rotate flat, timed to the
 *           iron coming at camera. Needs `perspective`, set in CSS.
 *   track   The block is pinned to the van and moves with it, using the
 *           measured positions in `vanTrack.ts`. Short copy only — it has to
 *           fit in the headroom above the vehicle.
 *   mask    The copy is uncovered from behind the van as it pulls away, the
 *           reveal edge driven by the van's own bounding box.
 *   glass   A frosted panel fades in and scales up from 88%, with a cyan glow.
 *           For the bright end cards, where the film has no dark area left.
 */
export type RevealStyle = "wave" | "liquid" | "fly3d" | "track" | "mask" | "glass";

export interface Scene {
  id: string;
  /** First frame of the scene, 1-based inclusive. */
  startFrame: number;
  /** Last frame of the scene, inclusive. */
  endFrame: number;
  /** Small kicker above the headline. */
  label?: string;
  /** The headline. `\n` is a deliberate line break, kept as written. */
  headline: string;
  /** One supporting line. Keep it to a single sentence. */
  description?: string;
  /** Which third of the frame the text sits in. */
  textPosition: TextPosition;
  /** Where in that column it sits vertically. */
  anchor: TextAnchor;
  /** Ragged-right (`start`) or centred text. */
  textAlignment: TextAlignment;
  /** Light type for dark frames, dark type for bright ones. */
  theme: TextTheme;
  /** How the copy arrives. Defaults to `wave` when omitted. */
  reveal?: RevealStyle;
  /**
   * Extra hold before the wave starts, as a share of the reveal window (0-1).
   * Use it to let a shot establish before the words arrive.
   */
  animationDelay?: number;
  /** Why the text sits where it does, from the measured luma grid. */
  note: string;
}

const RAW_SCENES: Scene[] = [
  {
    id: "booking",
    startFrame: 1,
    endFrame: 28,
    label: "01 — Booking",
    headline: "Laundry Day,\nSimplified.",
    description: "Book your pickup in just a few taps.",
    textPosition: "left",
    anchor: "middle",
    textAlignment: "start",
    theme: "light",
    reveal: "liquid",
    animationDelay: 0.08,
    note: "She is centred and the camera pushes in. Left stays flat across the shot (midL sd 6 at f12, flattest cell at f24); the right closes up from sd 4 to sd 33 as her hair enters it.",
  },
  {
    id: "onway",
    startFrame: 48,
    endFrame: 59,
    label: "02 — On the way",
    headline: "We Come\nto You.",
    description: "Your laundry, collected right from your doorstep.",
    textPosition: "right",
    anchor: "middle",
    textAlignment: "start",
    theme: "light",
    note: "The van now fills the frame from the left. midR is the flattest cell at f54, so the copy crosses to the right rather than sitting on the bodywork.",
  },
  {
    id: "collection",
    startFrame: 60,
    endFrame: 89,
    label: "03 — Collection",
    headline: "We Take It\nFrom Here.",
    description: "Handed to a uniformed courier in seconds. Nothing to sign.",
    textPosition: "left",
    anchor: "top",
    textAlignment: "start",
    theme: "light",
    note: "Own scene now that the nav has a Pickup item pointing at this shot. Customer left, courier right, bag centre; topL measures sd 21 at f74 and sd 22 at f84, and the block sits above her head rather than across her.",
  },
  {
    id: "depart",
    startFrame: 90,
    endFrame: 118,
    label: "04 — In transit",
    headline: "In Safe\nHands.",
    description: "Sealed and tracked, from your door to our facility.",
    textPosition: "left",
    anchor: "middle",
    textAlignment: "start",
    theme: "light",
    reveal: "mask",
    note: "Uncovered from behind the van as it pulls away. Its left edge (x0) travels 0.00 to 0.43 across the shot and is monotonic, which is what drives the reveal — the copy is wiped in by the vehicle's own trailing edge rather than by a timer.",
  },
  {
    id: "sorting",
    startFrame: 119,
    endFrame: 133,
    label: "05 — Sorting",
    headline: "Sorted\nWith Care.",
    description: "Every fabric and colour gets the attention it deserves.",
    textPosition: "left",
    anchor: "top",
    textAlignment: "start",
    theme: "light",
    note: "Operator centre-left, machines either side. topL holds up best (sd 14 at f126, sd 13 at f130).",
  },
  {
    id: "washing",
    startFrame: 134,
    endFrame: 150,
    label: "06 — Washing",
    headline: "A Deeper\nClean.",
    description: "Premium care for fresh, spotless clothes.",
    textPosition: "left",
    anchor: "bottom",
    textAlignment: "start",
    theme: "light",
    reveal: "liquid",
    note: "Drum close-up: no cell is genuinely flat (best is sd 37). botL is the calmest, and this scene leans on the side scrim and its text shadow.",
  },
  {
    id: "ironing",
    startFrame: 167,
    endFrame: 189,
    label: "07 — Ironing",
    headline: "Crisp. Clean.\nReady.",
    description: "Expert ironing for a polished finish.",
    textPosition: "right",
    anchor: "top",
    textAlignment: "start",
    theme: "light",
    reveal: "fly3d",
    note: "Iron and board occupy the centre and lower left. topR is the steadiest cell across the shot (sd 34 at f178, flattest at f184). The iron travels toward camera here, which is what the fly-in is timed against.",
  },
  {
    id: "folding",
    startFrame: 190,
    endFrame: 210,
    label: "08 — Folding & Packing",
    headline: "Folded to\nPerfection.",
    description: "Neatly prepared and packed with care.",
    textPosition: "left",
    anchor: "bottom",
    textAlignment: "start",
    theme: "light",
    note: "Van interior is busy throughout (best sd 46). botL is the calmest and sits below the shelf line, clear of the stacks.",
  },
  {
    id: "delivery",
    startFrame: 211,
    endFrame: 226,
    label: "09 — Delivery",
    headline: "Back to\nYour Doorstep.",
    description: "Clean clothes delivered right where you need them.",
    textPosition: "left",
    anchor: "bottom",
    textAlignment: "start",
    theme: "light",
    reveal: "glass",
    note: "Brand end card: logo upper-left, customer in a circular vignette right. botL is flat and stable (sd 9 at both f216 and f222) and sits below the logo's tagline. The glass panel does double duty here — this is the brightest part of the film (luma 123) and the only place where type needs its own surface to sit on.",
  },
  {
    id: "fresh",
    startFrame: 227,
    endFrame: TOTAL_FRAMES,
    label: "10 — Fresh",
    headline: "Fresh. Clean.\nYours.",
    description: "Ready to wear, right when you need them.",
    textPosition: "right",
    anchor: "top",
    textAlignment: "start",
    theme: "light",
    reveal: "glass",
    note: "Closing lockup: van left, logo centre-right. topR is flat and stable (sd 10 at f234 and f239) and sits above the logo. Frames 227-231 are a motion-blur transition, so the panel scales in as the lockup settles.",
  },
];

/**
 * All text is fully shown immediately when a section starts (REVEAL_FRAMES = 1),
 * keeping all text visible across the full duration of the section until it ends.
 */
const REVEAL_FRAMES = 1;
const EXIT_FRAMES = 6;
/** Never spend more than this share of a short scene animating. */
const MAX_SHARE = 0.34;

/** A scene with its progress-space landmarks resolved. */
export interface TimedScene extends Scene {
  /** Progress at the scene's first frame. */
  start: number;
  /** Progress just past the scene's last frame. */
  end: number;
  /** Progress at which the wave has fully landed. */
  revealEnd: number;
  /** Progress at which the copy begins to leave. */
  exitStart: number;
}

export const SCENES: TimedScene[] = RAW_SCENES.map((scene) => {
  // `end` is the frame after the scene's last, so a scene's window is closed by
  // the cut that ends it rather than by its own last frame.
  const endBoundary = Math.min(scene.endFrame + 1, TOTAL_FRAMES);
  const span = Math.max(endBoundary - scene.startFrame, 1);

  const reveal = 1;
  const exit = Math.max(1, Math.min(EXIT_FRAMES, Math.floor(span * MAX_SHARE)));

  return {
    ...scene,
    animationDelay: 0,
    start: progressFromFrame(scene.startFrame),
    end: progressFromFrame(endBoundary),
    revealEnd: progressFromFrame(scene.startFrame + reveal),
    exitStart: progressFromFrame(endBoundary - exit),
  };
});

/** Splits a headline into lines, and each line into words, for the wave. */
export function headlineLines(headline: string): string[][] {
  return headline.split("\n").map((line) => line.trim().split(/\s+/));
}
