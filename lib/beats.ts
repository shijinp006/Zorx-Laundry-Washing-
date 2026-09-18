import { SectionId, progressFromFrame } from "./story";

/**
 * A story beat: one pair of left/right text blocks tied to a range of frames.
 * The copy describes what is literally on screen for those frames.
 */
export interface Beat {
  id: string;
  section: SectionId;
  /** Frame range this beat is written for (1-based, inclusive-ish). */
  from: number;
  to: number;
  left: {
    eyebrow: string;
    heading: string;
    body: string;
  };
  right: {
    label: string;
    text: string;
    /** Big number / short figure. Omitted on the final CTA beat. */
    statValue?: string;
    statCaption?: string;
  };
  /** AOS animation names used for the left and right blocks. */
  aosLeft: string;
  aosRight: string;
  /** Set on the closing beat to swap the right block for the call to action. */
  cta?: boolean;
}

const RAW_BEATS: Beat[] = [
  {
    id: "book",
    section: "home",
    from: 1,
    to: 16,
    left: {
      eyebrow: "Wash Zone",
      heading: "Laundry,\noff your hands.",
      body: "One tap books the pickup. No queues, no carrying, no weekend lost to the machine.",
    },
    right: {
      label: "Book in the app",
      text: "Pick a two-hour window and your courier is confirmed before you put the phone down.",
      statValue: "58s",
      statCaption: "Average time to book",
    },
    aosLeft: "fade-right",
    aosRight: "fade-left",
  },
  {
    id: "pickup",
    section: "about",
    from: 17,
    to: 51,
    left: {
      eyebrow: "Collection",
      heading: "We come\nto your door.",
      body: "Hand over the bag — that is your part done. Every order is tagged and logged on the doorstep, in front of you.",
    },
    right: {
      label: "White-glove pickup",
      text: "Uniformed couriers, barcoded bags and a live link that follows your order from the moment it leaves.",
      statValue: "7 days",
      statCaption: "8am – 9pm, Sundays included",
    },
    aosLeft: "fade-right",
    aosRight: "fade-left",
  },
  {
    id: "sort",
    section: "process",
    from: 52,
    to: 63,
    left: {
      eyebrow: "Sorting",
      heading: "Separated\nby hand.",
      body: "Whites, colours and delicates are split by hand, and every care label is read before anything touches water.",
    },
    right: {
      label: "Fabric triage",
      text: "Wool, silk and technical fabrics are pulled aside for their own specialist cycles.",
      statValue: "12-point",
      statCaption: "Sort on every order",
    },
    aosLeft: "fade-up-right",
    aosRight: "fade-left",
  },
  {
    id: "wash",
    section: "process",
    from: 64,
    to: 84,
    left: {
      eyebrow: "The wash",
      heading: "Deep clean,\ngentle cycle.",
      body: "Temperature-matched drums and pH-balanced detergent lift the stain without wearing the fibre down.",
    },
    right: {
      label: "Pure wash",
      text: "Hypoallergenic and fragrance-free as standard. Scented, softened or starched on request.",
      statValue: "30°C",
      statCaption: "Eco cycle, filtered water",
    },
    aosLeft: "fade-right",
    aosRight: "zoom-in-left",
  },
  {
    id: "rinse",
    section: "process",
    from: 85,
    to: 106,
    left: {
      eyebrow: "Rinse & spin",
      heading: "Rinsed until\nit runs clear.",
      body: "A triple rinse clears the last trace of detergent, then a balanced spin draws the water out without setting a crease.",
    },
    right: {
      label: "Zero residue",
      text: "Softness you can feel, with nothing left sitting on the fibre afterwards.",
      statValue: "3×",
      statCaption: "Rinse on every load",
    },
    aosLeft: "fade-up-right",
    aosRight: "fade-left",
  },
  {
    id: "dry",
    section: "process",
    from: 107,
    to: 118,
    left: {
      eyebrow: "Drying",
      heading: "Warm air,\nnever scorched.",
      body: "Low-heat drums with moisture sensors stop the moment your clothes are dry — not a minute after.",
    },
    right: {
      label: "Sensor dry",
      text: "No shrinking, no stiffness and no static cling when the door opens.",
      statValue: "3%",
      statCaption: "Residual moisture target",
    },
    aosLeft: "fade-right",
    aosRight: "fade-left",
  },
  {
    id: "fold",
    section: "product",
    from: 119,
    to: 142,
    left: {
      eyebrow: "The finish",
      heading: "Folded\nlike new.",
      body: "Shirts squared, towels rolled, the whole order stacked the way it deserves to arrive.",
    },
    right: {
      label: "Presentation",
      text: "Hotel-standard folding, done by hand on every single order that leaves the floor.",
      statValue: "24 hr",
      statCaption: "Standard turnaround",
    },
    aosLeft: "zoom-in-right",
    aosRight: "fade-left",
  },
  {
    id: "press",
    section: "product",
    from: 143,
    to: 189,
    left: {
      eyebrow: "Press & inspect",
      heading: "Checked,\npiece by piece.",
      body: "Every garment is steamed, hung and held up to the light before it is allowed to leave us.",
    },
    right: {
      label: "Quality check",
      text: "Collars, cuffs, buttons and seams reviewed by hand. Anything short of perfect goes back.",
      statValue: "99.4%",
      statCaption: "Pass on first inspection",
    },
    aosLeft: "fade-right",
    aosRight: "fade-up-left",
  },
  {
    id: "pack",
    section: "product",
    from: 190,
    to: 213,
    left: {
      eyebrow: "Packed",
      heading: "Sealed,\nand protected.",
      body: "Your order goes into a water-tight, fully recyclable pack, so it reaches you exactly as it left us.",
    },
    right: {
      label: "Packaging",
      text: "Recyclable, resealable and flat-packed to hold every fold intact in transit.",
      statValue: "100%",
      statCaption: "Recyclable packaging",
    },
    aosLeft: "fade-right",
    aosRight: "fade-left",
  },
  {
    id: "delivered",
    section: "contact",
    from: 214,
    to: 239,
    left: {
      eyebrow: "Delivered",
      heading: "Back in your\narms, fresh.",
      body: "Washed, pressed and folded — returned to the same doorstep, on the day you chose.",
    },
    right: {
      label: "Start with one bag",
      text: "First pickup is free within the city. Cancel or reschedule any time, no subscription.",
    },
    aosLeft: "fade-right",
    aosRight: "fade-up-left",
    cta: true,
  },
];

/**
 * How long a beat takes to fade, measured in FRAMES of film rather than as a
 * share of its own window.
 *
 * As a share it was 18% either end, which meant the 47-frame `inspect` beat
 * spent 8 frames fading while the 12-frame `sort` beat spent 2. The copy
 * therefore changed at a different rate depending on which act you were in,
 * and it was never fully opaque for more than 64% of the frames it describes.
 *
 * Pinning the fade to a frame count makes every text change take the same
 * amount of film, which is what keeps the words feeling attached to the
 * picture they are describing.
 */
const FADE_FRAMES = 4;

/**
 * Cap for short beats, as a share of the beat's own length.
 *
 * Most beats here are short — 12 to 47 frames — so the fade constant has to be
 * small or it eats the hold it was meant to protect. At 7 frames the 21-frame
 * `wash` beat spent 12 of them fading and held for only 43%, worse than the
 * 18%-per-end share this replaced. At 4 frames capped to 22%, the fade is a
 * uniform 4 frames (2 on the two 12-frame beats) and every beat holds fully
 * opaque for 62-84% of the frames it describes.
 */
const MAX_FADE_SHARE = 0.22;

/**
 * Beat with its progress window pre-computed from the frame range.
 *
 * All four landmarks come from `progressFromFrame`, the same mapping the canvas
 * uses, so a beat's copy is tied to its frames under any pacing — change
 * `PACING` in story.ts and the text follows the picture automatically.
 */
export interface TimedBeat extends Beat {
  /** Progress at the beat's first frame. */
  start: number;
  /** Progress at the next beat's first frame, so windows tile with no gaps. */
  end: number;
  /** Progress at which the copy reaches full opacity. */
  fadeInEnd: number;
  /** Progress at which the copy starts fading out. */
  fadeOutStart: number;
}

export const BEATS: TimedBeat[] = RAW_BEATS.map((b, i) => {
  // Run each beat's window up to the next beat's first frame so the windows
  // tile the runway with no dead gaps between them.
  const nextFrom = i < RAW_BEATS.length - 1 ? RAW_BEATS[i + 1].from : b.to;
  const span = Math.max(nextFrom - b.from, 1);
  const fade = Math.max(
    1,
    Math.min(FADE_FRAMES, Math.floor(span * MAX_FADE_SHARE))
  );

  return {
    ...b,
    start: progressFromFrame(b.from),
    end: progressFromFrame(nextFrom),
    fadeInEnd: progressFromFrame(b.from + fade),
    fadeOutStart: progressFromFrame(nextFrom - fade),
  };
});
