import { TOTAL_FRAMES } from "@/lib/story";

/**
 * The film's narrative, in words, for screen readers and crawlers.
 *
 * NOT an overlay. The commercial carries its own captions, composited into the
 * picture in post — BOOKING / Book Your Pickup, PICKUP / We Pick Up From Your
 * Doorstep, and so on, in the lower-left of the frame. Those are the film's
 * words and the only words on it.
 *
 * The site used to draw a second, near-identical set of captions over the canvas
 * from this file (`components/SceneText.tsx`, now removed). Two sets of the same
 * sentence on one frame is worse than either alone, so the drawn layer went and
 * the filmed one stayed.
 *
 * What is left here is a transcript. `components/StoryLayer.tsx` renders it as
 * ordinary flowing text inside an `sr-only` block, because a canvas is opaque to
 * anything that is not a pair of eyes: without this, a screen reader finds a
 * 1500vh scroll region containing one unlabelled `<canvas>`, and a crawler finds
 * the same. The copy below is transcribed from what is actually burned into the
 * frames, so the two cannot drift apart — if the film is re-cut with different
 * captions, retype them here.
 *
 * The frame ranges are documentation rather than timing. Nothing animates off
 * them any more; they record which stretch of the film each caption belongs to,
 * against the cut list in `lib/story.ts`.
 */

export interface Scene {
  id: string;
  /** First frame the caption is on screen, 1-based inclusive. */
  startFrame: number;
  /** Last frame it is on screen, inclusive. */
  endFrame: number;
  /** The caption's heading, exactly as it appears in the picture. */
  headline: string;
  /** The caption's supporting line, exactly as it appears in the picture. */
  description?: string;
  /** What is on screen, for anyone who cannot see it. */
  note: string;
}

export const SCENES: Scene[] = [
  {
    id: "booking",
    startFrame: 1,
    endFrame: 45,
    headline: "Booking",
    description: "Book Your Pickup",
    note: "A phone in her hands, the booking screen, then her face as the call connects.",
  },
  {
    id: "pickup",
    startFrame: 46,
    endFrame: 120,
    headline: "Pickup",
    description: "We Pick Up From Your Doorstep",
    note: "The van leaves, travels the road and pulls up outside the building.",
  },
  {
    id: "receiving",
    startFrame: 121,
    endFrame: 195,
    headline: "Receiving",
    description: "Your Laundry, Safely Received",
    note: "The bag is handed to a uniformed courier at the door, gathered up, and the van drives away.",
  },
  {
    id: "sorting",
    startFrame: 196,
    endFrame: 225,
    headline: "Sorting",
    description: "Sorted With Care",
    note: "An operator at the sorting table in the plant, separating the order into stacks.",
  },
  {
    id: "washing",
    startFrame: 226,
    endFrame: 270,
    headline: "Washing",
    description: "Deep Clean Washing",
    note: "Close on the machine drum turning, then the tunnel of light between stages.",
  },
  {
    id: "ironing",
    startFrame: 271,
    endFrame: 300,
    headline: "Ironing",
    description: "Pressed To Perfection",
    note: "A steam iron worked across a shirt on the board, steam rising.",
  },
  {
    id: "folding",
    startFrame: 301,
    endFrame: 390,
    headline: "Folding & Packing",
    description: "Neatly prepared and packed with care.",
    note: "Shirts folded by hand, stacked, and sealed into a branded Wash Zone bag.",
  },
  {
    id: "delivery",
    startFrame: 391,
    endFrame: TOTAL_FRAMES,
    headline: "Delivery",
    description: "Delivered Back To Your Door",
    note: "The van at night, and the finished order handed back at her door.",
  },
];
