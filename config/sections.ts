import { FrameRange } from "@/lib/frameLoader";
import { clamp, mapRange } from "@/lib/story";

/**
 * The homepage's captioned stops, in film order.
 *
 * These used to each be their own pinned panel — its own `ScrollStage`, its own
 * `FrameCanvas`, its own frame loader — stitched edge to edge. That played the
 * three ranges below back to back and skipped everything between them (frames
 * 40-198, the van's drive and the handover), which is what made the homepage
 * read as separate sections rather than one film: a hard cut at every
 * boundary, with footage the viewer never saw holding it together.
 *
 * `buildHomepageReel` below turns them into one continuous stage instead —
 * see its own comment for how the gaps and the captions share one timeline.
 */
export interface Section {
  id: string;
  /** Label in the navigation. */
  nav: string;
  eyebrow: string;
  title: string;
  lede: string;
  points: string[];
  /** Label for the expander, when the section has one. */
  more?: string;
  range: FrameRange;
  runway: number;
  /**
   * The frame a nav click should land on.
   *
   * Named per section rather than derived from a fraction of its length: a
   * single "land a fifth in" rule cannot hit the right shot in every section,
   * because they hold very different numbers of cuts. A fifth into `process`
   * is an operator at a folding table; the shot that says *process* is the
   * drum turning, and only naming its frame gets you there.
   */
  landingFrame: number;
}

const build = (s: Omit<Section, "runway">): Section => ({
  ...s,
  runway: Math.round(160 + (s.range.to - s.range.from + 1) * 2.6),
});

export const SECTIONS: Section[] = [
  build({
    id: "booking",
    nav: "Home",
    eyebrow: "01 — Booking",
    title: "Two taps, and it is booked.",
    lede: "Choose a two-hour window and tell us where the bag will be. No account, no card kept on file, no minimum order — you pay once it has been weighed at your door.",
    points: [
      "Collection windows from 7am to 9pm, seven days",
      "Same-day pickup when you book before 7pm",
      "A named driver, with a photo and a live arrival time",
    ],
    range: { from: 1, to: 44 },
    // The top of the page. "Home" going anywhere else would surprise people,
    // and the opening caption fades up as soon as they start scrolling anyway.
    landingFrame: 1,
  }),
  build({
    id: "services",
    nav: "Services",
    eyebrow: "02 — Services",
    title: "The service comes to you.",
    lede: "Everyday laundry, dry cleaning, pressing, bedding, sportswear and repairs — all on one collection. Put it in one bag and we separate it at the plant.",
    points: [
      "One bag, six services, no sorting on your side",
      "Weighed at the door and sealed with a tag you keep",
      "Free collection and return on every order",
    ],
    range: { from: 50, to: 186 },
    /** The van in full side profile, mid-road. */
    landingFrame: 80,
  }),
  build({
    id: "process",
    nav: "Process",
    eyebrow: "03 — Process",
    title: "Sorted, logged, washed alone.",
    lede: "Every piece is photographed on arrival and separated by colour, fabric weight and care label. Your order then runs as its own load — never combined with anyone else's.",
    points: [
      "Photographed and logged the moment it arrives",
      "One order, one drum",
      "Anything that needs a decision is flagged before it goes near water",
    ],
    range: { from: 199, to: 389 },
    /** Close on the drum turning — the shot that reads as "process". */
    landingFrame: 240,
  }),
];

/**
 * One beat of the homepage's single continuous stage: either a captioned stop
 * (`section` set) or a bridge — a stretch of film between two stops that keeps
 * playing with no caption over it, instead of being skipped the way the old
 * per-section stages skipped it.
 *
 * `start`/`end` are this beat's own share of the *whole homepage's* progress
 * (0-1), the same way `CHAPTERS` in `lib/story.ts` gives each chapter a slice
 * of the full film's progress — a bridge gets a slice sized like any other
 * beat, so the frames inside it aren't rushed past just for lacking a caption.
 *
 * `readHold` is the fraction of this beat's own slice, at the end of it, where
 * the film stops and the copy is there to be read. See `buildHomepageReel`.
 */
export interface HomeBeat {
  id: string;
  section: Section | null;
  from: number;
  to: number;
  start: number;
  end: number;
  readHold: number;
}

/**
 * Blends each beat's share of scroll between its true frame length and an
 * equal split, same knob as `lib/story.ts`'s `PACING` and same reason: a pure
 * frame-length split would let a short bridge fly by too fast to register,
 * and a pure equal split would make a 191-frame beat scrub at the same rate
 * as a 12-frame one.
 *
 * It sits high because the equal-share floor is what made the short bridges
 * feel broken: at 0.72 the 5-frame bridge drew 76vh of scroll, so the picture
 * advanced one frame every 15vh and read as a stall rather than a shot.
 */
const RUNWAY_PACING = 0.92;

/**
 * How much scroll the film holds still for at the end of a captioned beat, so
 * the copy can be read against a picture that is not moving.
 *
 * In **vh, not a fraction of the beat** — that distinction is the whole point.
 * This used to be a percentage (`PHASE`/`FIRST_PHASE`, 18% arriving and 38%
 * reading), which was fine when every section was its own ~200vh stage. On one
 * merged reel the beats are far bigger and far less even, and the same
 * percentages turned into 65-182vh of frozen film each — which, landing either
 * side of an already-slow bridge, is what made the page feel stuck mid-scroll.
 *
 * There is deliberately no arrival hold any more. It existed to break the
 * film's motion before a caption arrived, but in a continuous reel the
 * previous beat's read hold has just done exactly that, so a second hold
 * immediately after only doubled the frozen stretch.
 */
const READ_HOLD_VH = 85;

/** Never let the read hold take so much of a beat that it stops scrubbing. */
const MAX_READ_HOLD = 0.42;

function buildHomepageReel(sections: Section[]): HomeBeat[] {
  const raw: Omit<HomeBeat, "start" | "end" | "readHold">[] = [];
  let cursor = sections[0].range.from;

  for (const section of sections) {
    if (section.range.from > cursor) {
      raw.push({
        id: `${section.id}-bridge`,
        section: null,
        from: cursor,
        to: section.range.from - 1,
      });
    }
    raw.push({
      id: section.id,
      section,
      from: section.range.from,
      to: section.range.to,
    });
    cursor = section.range.to + 1;
  }

  const spans = raw.map((b) => Math.max(b.to - b.from + 1, 1));
  const totalSpan = spans.reduce((sum, s) => sum + s, 0);
  const equalShare = 1 / raw.length;
  const weights = spans.map(
    (span) => RUNWAY_PACING * (span / totalSpan) + (1 - RUNWAY_PACING) * equalShare
  );
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // The runway the whole reel occupies, needed here (not just as an export)
  // because a beat's read hold is measured against it in real scroll distance.
  const totalRunwayVh = Math.round(160 + totalSpan * 2.6);

  let acc = 0;
  const beats = raw.map((b, i) => {
    const weight = weights[i] / totalWeight;
    const start = acc;
    acc += weight;

    const ownRunwayVh = weight * totalRunwayVh;
    const readHold = b.section
      ? Math.min(READ_HOLD_VH / ownRunwayVh, MAX_READ_HOLD)
      : 0;

    return { ...b, start, end: acc, readHold };
  });
  beats[beats.length - 1].end = 1;
  return beats;
}

export const HOMEPAGE_BEATS: HomeBeat[] = buildHomepageReel(SECTIONS);

export const HOMEPAGE_RANGE: FrameRange = {
  from: HOMEPAGE_BEATS[0].from,
  to: HOMEPAGE_BEATS[HOMEPAGE_BEATS.length - 1].to,
};

export const HOMEPAGE_RUNWAY = Math.round(
  160 + (HOMEPAGE_RANGE.to - HOMEPAGE_RANGE.from + 1) * 2.6
);

/**
 * Progress (0-1) across the whole homepage reel → frame position.
 *
 * A bridge scrubs straight through. A captioned beat scrubs for all of its
 * slice except the read hold at the end, where the film stops on its last
 * frame while the copy is up. Nothing holds at the *start* of a beat any more
 * — see `READ_HOLD_VH`.
 */
export function frameForHomepageProgress(progress: number): number {
  const p = clamp(progress);
  const beats = HOMEPAGE_BEATS;

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i];
    if (p <= beat.end || i === beats.length - 1) {
      const span = beat.end - beat.start || 1;
      const local = clamp((p - beat.start) / span);
      const scrubSpan = 1 - beat.readHold || 1;
      const t = clamp(local / scrubSpan);
      return beat.from + t * (beat.to - beat.from);
    }
  }
  return HOMEPAGE_RANGE.to;
}

/**
 * A frame → the reel progress that draws it. The exact inverse of
 * `frameForHomepageProgress`, so a nav click can name a shot and land on it.
 *
 * Because a beat scrubs before it holds, the progress this returns always sits
 * in the scrubbing part of its beat — past the caption's fade-in, so the copy
 * is fully up when you arrive rather than still arriving.
 */
export function progressForHomepageFrame(frame: number): number {
  const beats = HOMEPAGE_BEATS;

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i];
    if (frame <= beat.to || i === beats.length - 1) {
      const frameSpan = beat.to - beat.from || 1;
      const t = clamp((frame - beat.from) / frameSpan);
      const local = t * (1 - beat.readHold);
      return clamp(beat.start + local * (beat.end - beat.start));
    }
  }
  return 1;
}

/**
 * How visible a captioned beat's copy should be, given the reel's overall
 * progress.
 *
 * The fade is on its own timing rather than borrowing the film's, because the
 * two want different things: the picture should start moving the instant a
 * beat begins, while the words still need a moment to arrive and a moment to
 * leave. The last caption has nothing to cross-fade into, so it stays up until
 * the stage unpins.
 */
const CAPTION_FADE = 0.12;

export function captionOpacity(beat: HomeBeat, progress: number): number {
  if (!beat.section) return 0;
  const beats = HOMEPAGE_BEATS;
  const index = beats.indexOf(beat);
  const isLastCaption = !beats.slice(index + 1).some((b) => b.section);

  const span = beat.end - beat.start || 1;
  const local = clamp((progress - beat.start) / span);
  const fadeOutStart = isLastCaption ? 1 : 1 - CAPTION_FADE;

  return mapRange(
    local,
    [0, CAPTION_FADE, fadeOutStart, 1],
    [0, 1, 1, isLastCaption ? 1 : 0]
  );
}
