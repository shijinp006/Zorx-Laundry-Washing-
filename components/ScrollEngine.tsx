"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { useLenis } from "lenis/react";
import type LenisInstance from "lenis";
import { FrameRange, FULL_RANGE } from "@/lib/frameLoader";
import { clamp, frameFromProgress } from "@/lib/story";

/**
 * SCROLL → Lenis's own raf tick → progress → frame → canvas / DOM.
 *
 * One loop, not two. Lenis already runs `requestAnimationFrame` to smooth the
 * scroll position (`autoRaf`, on by default); this stage measures itself once,
 * then recomputes `progress` and `frame` from inside the `"scroll"` event Lenis
 * emits at the end of that same tick. Nothing here starts a second scheduler to
 * go read the result back out a frame later — the previous version used
 * Framer Motion's `useScroll`/`useTransform`, which runs its own independent
 * frame loop and, being a separate scheduler, could read the position Lenis had
 * computed on the *previous* tick. One frame of drift is not much on its own,
 * but it is one more thing fighting the canvas for the scroll's meaning, and it
 * is not needed: Lenis already knows the number the instant it changes.
 *
 * A `ScrollValue` (below) replaces the `MotionValue` a consumer used to read.
 * It is a plain, dependency-free pub-sub: `set` runs its listeners
 * synchronously, in the same call stack as the Lenis tick, so a subscriber's
 * canvas draw or style write happens in the same frame the scroll moved in —
 * not the next one Motion's own loop gets around to.
 */
export interface ScrubPhase {
  /** Progress at which the frames start moving. */
  start: number;
  /** Progress at which they stop, holding the last frame from here on. */
  end: number;
}

type Listener = (value: number) => void;

/** A single live number, written once per Lenis tick and read by however many consumers need it. */
export class ScrollValue {
  private value: number;
  private listeners = new Set<Listener>();

  constructor(initial: number) {
    this.value = initial;
  }

  get(): number {
    return this.value;
  }

  set(next: number) {
    this.value = next;
    for (const listener of this.listeners) listener(next);
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}

interface ScrollEngineValue {
  /** 0 → 1 across this stage's runway. The value everything on the stage reads. */
  progress: ScrollValue;
  /** Continuous frame position inside `range`, derived from `progress`. */
  frame: ScrollValue;
  /** The slice of the film this stage scrubs. */
  range: FrameRange;
  /** Where in the scroll the frames move; held either side of it. */
  phase: ScrubPhase;
  /** Read the latest progress without subscribing. */
  getProgress: () => number;
  /** Smoothly scroll so the runway sits at the given progress (0-1). */
  scrollToProgress: (progress: number, duration?: number) => void;
}

const ScrollEngineContext = createContext<ScrollEngineValue | null>(null);

/**
 * A tall element whose own scroll range defines progress 0 → 1 for everything
 * pinned inside it — the canvas, the copy, the chapter rail. They stay in lock
 * step because they all read the same two `ScrollValue`s, written from the same
 * measurement in the same tick.
 *
 * The stage measures its own top offset and travel distance once (on mount and
 * on resize) rather than every scroll tick, since that is the only part of this
 * that needs layout: reading `getBoundingClientRect` on every Lenis tick would
 * reintroduce a forced reflow into the one loop this exists to keep cheap.
 */
export function ScrollStage({
  children,
  className,
  id,
  range = FULL_RANGE,
  phase,
  mapFrame,
  style,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  /** Which frames this stage scrubs. Defaults to the whole film. */
  range?: FrameRange;
  /** Confine the scrub to part of the scroll, holding either side of it. */
  phase?: ScrubPhase;
  /**
   * Override the built-in hold-scrub-hold mapping entirely, for a stage whose
   * progress → frame curve is more than one hold-scrub-hold — a multi-section
   * reel with its own beat per section, say. Must be referentially stable
   * (wrap it in `useCallback`/module scope): like `phase`, its identity, not
   * just its output, decides when the Lenis subscription below is rebuilt.
   */
  mapFrame?: (progress: number) => number;
  style?: React.CSSProperties;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

  const { from, to } = range;
  const isFullFilm = from === FULL_RANGE.from && to === FULL_RANGE.to;
  const hasPhase = phase != null;
  const scrubStart = phase?.start ?? 0;
  const scrubEnd = phase?.end ?? 1;

  // One ScrollValue pair per stage, for its whole lifetime — not re-created on
  // a re-render, since consumers hold a subscription to the instance.
  const progressValue = useRef<ScrollValue | null>(null);
  if (!progressValue.current) progressValue.current = new ScrollValue(0);
  const frameValue = useRef<ScrollValue | null>(null);
  if (!frameValue.current) frameValue.current = new ScrollValue(from);

  const toFrame = useCallback(
    (p: number) => {
      if (mapFrame) return mapFrame(p);
      if (isFullFilm && !hasPhase) return frameFromProgress(p);
      // Hold, scrub, hold. Clamping `t` is what produces the two holds: below
      // `start` it pins to 0 and above `end` to 1, so the canvas simply keeps
      // drawing the same frame while the rest of the section does its work.
      const span = scrubEnd - scrubStart || 1;
      const t = clamp((p - scrubStart) / span);
      return from + t * (to - from);
    },
    // Depends on the phase's values, not the object reference — a caller that
    // passes a fresh `{ start, end }` literal every render (several do) must
    // not tear down and re-subscribe the Lenis listener below on every render.
    [mapFrame, isFullFilm, hasPhase, scrubStart, scrubEnd, from, to]
  );

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    // "start start" → progress 0 when the stage's top reaches the viewport top;
    // "end end" → progress 1 when its bottom reaches the viewport bottom. The
    // travel is therefore the stage's height minus one viewport, which is
    // exactly the distance a `position: sticky` child stays pinned for.
    let top = 0;
    let travel = 1;
    const measure = () => {
      const scrollNow = lenisRef.current?.scroll ?? window.scrollY;
      const rect = el.getBoundingClientRect();
      top = rect.top + scrollNow;
      travel = Math.max(el.offsetHeight - window.innerHeight, 1);
    };

    const apply = (scrollNow: number) => {
      const p = clamp((scrollNow - top) / travel);
      progressValue.current!.set(p);
      frameValue.current!.set(toFrame(p));
    };

    measure();
    apply(lenisRef.current?.scroll ?? window.scrollY);

    const onResize = () => {
      measure();
      apply(lenisRef.current?.scroll ?? window.scrollY);
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(el);
    window.addEventListener("resize", onResize);

    // The one scroll loop: Lenis emits this from inside its own `raf`, after it
    // has already moved the page for this tick — so `progress` and `frame`
    // are current the instant a subscriber reads them, not a tick behind it.
    const onScroll = (instance: LenisInstance) => apply(instance.scroll);
    const unsubscribe = lenisRef.current?.on("scroll", onScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      unsubscribe?.();
    };
    // Re-measure and re-subscribe if the stage's own frame mapping changes, or
    // Lenis mounts after this effect's first run (it starts undefined).
  }, [lenis, toFrame]);

  const getProgress = useCallback(() => progressValue.current!.get(), []);

  const scrollToProgress = useCallback((target: number, duration = 1.6) => {
    const el = stageRef.current;
    if (!el) return;
    // Read layout at click time rather than caching it. This runs once per
    // interaction, never in the scroll loop, so there is nothing to thrash.
    const l = lenisRef.current;
    const scroll = typeof l?.scroll === "number" ? l.scroll : window.scrollY;
    const top = el.getBoundingClientRect().top + scroll;
    const travel = Math.max(el.offsetHeight - window.innerHeight, 1);
    const y = top + clamp(target) * travel;

    if (l) l.scrollTo(y, { duration, lock: false });
    else window.scrollTo({ top: y, behavior: "smooth" });
  }, []);

  const value = useMemo<ScrollEngineValue>(
    () => ({
      progress: progressValue.current!,
      frame: frameValue.current!,
      range: { from, to },
      phase: { start: scrubStart, end: scrubEnd },
      getProgress,
      scrollToProgress,
    }),
    [from, to, scrubStart, scrubEnd, getProgress, scrollToProgress]
  );

  return (
    <div ref={stageRef} id={id} className={className} style={style}>
      <ScrollEngineContext.Provider value={value}>
        {children}
      </ScrollEngineContext.Provider>
    </div>
  );
}

export function useScrollEngine(): ScrollEngineValue {
  const ctx = useContext(ScrollEngineContext);
  if (!ctx) {
    throw new Error("useScrollEngine must be used inside <ScrollStage>");
  }
  return ctx;
}

/**
 * Subscribe to a `ScrollValue` without re-rendering. The callback runs
 * synchronously inside the `ScrollStage`'s Lenis `"scroll"` handler, so it
 * should only write to refs or the DOM directly — the same contract
 * `useMotionValueEvent` had, just off a plain subscription instead of a
 * `MotionValue`.
 *
 * It also fires once on mount, so a consumer paints correctly straight away
 * instead of waiting for the first scroll.
 */
function useValueSubscription(value: ScrollValue, fn: (v: number) => void) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    fnRef.current(value.get());
    return value.subscribe((v) => fnRef.current(v));
  }, [value]);
}

/** Per-frame scroll progress (0-1) for this stage. */
export function useScrollProgress(fn: (progress: number) => void) {
  useValueSubscription(useScrollEngine().progress, fn);
}

/** Per-frame continuous frame position for this stage. */
export function useScrollFrame(fn: (frame: number) => void) {
  useValueSubscription(useScrollEngine().frame, fn);
}
