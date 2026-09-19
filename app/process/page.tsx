import type { Metadata } from "next";
import { STRIPS } from "@/config/strips";
import FilmStrip from "@/components/FilmStrip";
import PageLink from "@/components/PageLink";
import PageView from "@/components/PageView";
import ProcessScroller, { Step } from "@/components/process/ProcessScroller";
import Reveal from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Process",
  description:
    "Six steps from your door to the plant and back: booking, collection, sorting and logging, washing, pressing and finishing, and the return slot you choose.",
};

/**
 * The frame on each step is the shot the film uses for it, taken from the ranges
 * documented in `config/scenes.ts`. The page and the film therefore illustrate
 * the process with the same images, in the same order.
 */
const STEPS: Step[] = [
  {
    id: "book",
    title: "You book a slot",
    frame: 20,
    duration: "60 seconds",
    body: "Pick a two-hour collection window and tell us where the bag will be. No account, no card on file, no minimum order — you pay once the order has been weighed.",
    detail: [
      "Two-hour collection windows, 7am to 9pm",
      "Same-day collection when booked before 7pm",
      "A named driver with a photo and live arrival time",
    ],
  },
  {
    id: "collect",
    title: "A driver collects it",
    frame: 112,
    duration: "Under 2 minutes at the door",
    body: "Hand the bag over or leave it out — either way it is weighed, sealed and scanned in front of you, and the receipt is on your phone before the van pulls away.",
    detail: [
      "Sealed with a numbered tag you keep",
      "Weighed at the door, not at the plant",
      "Contact-free collection on request",
    ],
  },
  {
    id: "sort",
    title: "It is sorted and logged",
    frame: 205,
    duration: "15 minutes",
    body: "At the plant every piece is photographed, logged against your order and separated by colour, fabric weight and care label. Anything that needs a decision is flagged before it goes near water.",
    detail: [
      "Photographed on arrival",
      "Separated by colour, weight and care label",
      "Stains and damage flagged to you first",
    ],
  },
  {
    id: "wash",
    title: "It is washed on its own",
    frame: 240,
    duration: "50 minutes",
    body: "Your order runs as its own load at the temperature the labels ask for, with a hypoallergenic detergent option and no softener on technical fabrics.",
    detail: [
      "One order, one drum — never combined",
      "Hypoallergenic detergent on request",
      "Dried flat or tumbled to the label",
    ],
  },
  {
    id: "finish",
    title: "It is pressed and finished",
    frame: 285,
    duration: "25 minutes",
    body: "Steam pressing on professional boards, collars and cuffs worked separately, then folded flat or hung and wrapped. This is the step that makes the difference you can see.",
    detail: [
      "Collars, cuffs and plackets pressed separately",
      "Folded flat or returned on hangers",
      "Wrapped in reusable, recyclable covers",
    ],
  },
  {
    id: "return",
    title: "It comes back to your door",
    frame: 428,
    duration: "Within 24 hours",
    body: "Back at the slot you chose, to the same door, with the photographs and the weight on the receipt. If anything is not right, we collect it again at our cost.",
    detail: [
      "Return slot chosen by you",
      "Full photo log on the receipt",
      "Re-clean collected free if you are not happy",
    ],
  },
];

export default function ProcessPage() {
  return (
    <PageView>
      <FilmStrip
        range={STRIPS.process}
        eyebrow="03 — Process"
        headline={"Six steps,\ndoor to door."}
        lede="The film shows it in ninety seconds. This is the same journey with the timings, the decisions and the things we will call you about."
      >
        <p>
          <strong>6</strong> steps
        </p>
        <p>
          <strong>24h</strong> end to end
        </p>
      </FilmStrip>

      <section className="section section--flush" aria-labelledby="process-title">
        <div className="shell">
          <Reveal className="section__head">
            <p className="eyebrow">Keep scrolling</p>
            <h2 className="h2" id="process-title">
              Every step, in the order it happens.
            </h2>
            <p className="lede">
              The ring on the left fills as you go. It is the same scroll position
              driving the film on the homepage — here it is just counting steps
              instead of frames.
            </p>
          </Reveal>
        </div>

        <ProcessScroller steps={STEPS} />
      </section>

      <section className="section section--tint" aria-labelledby="guarantee-title">
        <div className="shell shell--split">
          <Reveal className="split__head">
            <p className="eyebrow">If it goes wrong</p>
            <h2 className="h2" id="guarantee-title">
              Then it is ours to fix.
            </h2>
          </Reveal>
          <Reveal className="prose">
            <p className="body">
              A missed slot is refunded in full without being asked. A damaged item
              is replaced at its assessed value, using the photographs taken when
              it arrived — which is the reason those photographs exist. A finish you
              are not happy with is collected again the next day and re-done at our
              cost.
            </p>
            <p className="body">
              None of that is a promise about never making mistakes. It is what
              happens after one.
            </p>
            <PageLink href="/contact" className="btn btn--primary">
              Book a pickup
            </PageLink>
          </Reveal>
        </div>
      </section>
    </PageView>
  );
}
