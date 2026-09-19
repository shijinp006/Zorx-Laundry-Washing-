import { FrameRange } from "@/lib/frameLoader";

/**
 * The homepage, as a sequence of scroll chapters.
 *
 * Each chapter owns one stretch of scroll and plays out in three beats:
 *
 *   1. ARRIVE   the film holds on its first frame while the chapter's label
 *               settles. A moment of stillness is what makes the next beat read
 *               as starting rather than continuing.
 *   2. PLAY     the frames scrub. This is the "video" — it only moves while you
 *               move, and it covers exactly this chapter's slice of the film.
 *   3. READ     the film holds on its last frame and the copy arrives. Nothing
 *               is moving behind the words by the time you are asked to read
 *               them.
 *
 * The ranges run in film order and cover all 450 frames end to end, so scrolling
 * the page from top to bottom plays the whole commercial once, in sequence, with
 * a pause to read between each stage.
 *
 * `runway` is the chapter's scroll height in vh, including the 100vh the stage
 * stays pinned for. It is derived from the frame count rather than picked by
 * eye — `160 + frames * 2.6` — so every chapter scrubs at about the same speed
 * (~1.4vh per frame through the PLAY beat) and a chapter with more film in it
 * gets proportionally more scroll. Change the multiplier to retime the whole
 * page at once.
 */
export interface Chapter {
  id: string;
  /** Anchor id, so the nav and any deep link can reach the chapter. */
  eyebrow: string;
  title: string;
  lede: string;
  points: string[];
  cta: { label: string; href: string };
  range: FrameRange;
  /** Scroll height in vh. */
  runway: number;
}

const runwayFor = (range: FrameRange) =>
  Math.round(160 + (range.to - range.from + 1) * 2.6);

const chapter = (
  c: Omit<Chapter, "runway"> & { runway?: number }
): Chapter => ({ ...c, runway: c.runway ?? runwayFor(c.range) });

export const CHAPTERS: Chapter[] = [
  chapter({
    id: "booking",
    eyebrow: "01 — Home",
    title: "Two taps, and it is booked.",
    lede: "Choose a two-hour window and tell us where the bag will be. No account, no card kept on file, no minimum order — you pay once it has been weighed at your door.",
    points: [
      "Collection windows from 7am to 9pm, seven days",
      "Same-day pickup when you book before 7pm",
      "A named driver, with a photo and a live arrival time",
    ],
    cta: { label: "Book a pickup", href: "/contact" },
    range: { from: 1, to: 39 },
  }),
  chapter({
    id: "collection",
    eyebrow: "02 — Services",
    title: "We come to your door.",
    lede: "A uniformed driver, a sealed bag and a numbered tag you keep. It is weighed in front of you and scanned into your order before the van pulls away.",
    points: [
      "Weighed at the door, not later at the plant",
      "Sealed with a numbered tag you keep",
      "Contact-free collection on request",
    ],
    cta: { label: "See what we wash", href: "/services" },
    range: { from: 199, to: 218 },
  }),
  chapter({
    id: "plant",
    eyebrow: "03 — Process",
    title: "Sorted, logged, washed alone.",
    lede: "Every piece is photographed on arrival and separated by colour, fabric weight and care label. Your order then runs as its own load — it is never combined with anyone else's.",
    points: [
      "Photographed and logged the moment it arrives",
      "One order, one drum",
      "Hypoallergenic detergent whenever you ask for it",
    ],
    cta: { label: "See the full process", href: "/process" },
    range: { from: 219, to: 369 },
  }),
  chapter({
    id: "finishing",
    eyebrow: "04 — Pricing",
    title: "Pressed, folded, sealed.",
    lede: "Steam-pressed on professional boards with collars and cuffs worked separately, then folded flat or returned on hangers and wrapped in a cover you can send back to us.",
    points: [
      "Collars, cuffs and plackets pressed separately",
      "Folded flat or returned on hangers",
      "Reusable, recyclable packaging",
    ],
    cta: { label: "See pricing", href: "/pricing" },
    range: { from: 372, to: 410 },
  }),
  chapter({
    id: "delivery",
    eyebrow: "05 — Contact",
    title: "Back at your door within 24 hours.",
    lede: "Returned in the slot you chose, to the same door, with the weight and the full photo log on the receipt. If anything is not right, we collect it again at our cost.",
    points: [
      "A return slot chosen by you",
      "The full photo log on your receipt",
      "Re-cleans collected free, next day",
    ],
    cta: { label: "Book a pickup", href: "/contact" },
    range: { from: 411, to: 450 },
  }),
];

/**
 * Where the scrub sits inside each chapter's scroll.
 *
 * ARRIVE is deliberately short. It exists to break the film's motion, not to
 * make anyone wait — a fifth of a screen is enough for the eye to register that
 * something has changed. READ gets the largest share because it is the only beat
 * where the viewer has something to do other than keep scrolling.
 */
export const PHASE = { start: 0.18, end: 0.62 } as const;

/** The opening chapter plays immediately: no one should have to scroll to start. */
export const FIRST_PHASE = { start: 0, end: 0.52 } as const;
