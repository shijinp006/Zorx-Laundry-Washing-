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
import { clamp } from "@/lib/story";

type Subscriber = (progress: number) => void;

interface ScrollEngineValue {
  /** Register a per-frame listener. Returns an unsubscribe function. */
  subscribe: (fn: Subscriber) => () => void;
  /** Read the latest progress without subscribing. */
  getProgress: () => number;
  /** Smoothly scroll so the runway sits at the given progress (0-1). */
  scrollToProgress: (progress: number, duration?: number) => void;
  /** The tall element whose scroll range defines progress 0 → 1. */
  stageRef: (el: HTMLElement | null) => void;
}

const ScrollEngineContext = createContext<ScrollEngineValue | null>(null);

/**
 * SCROLL → Lenis → requestAnimationFrame → scroll progress 0-1.
 *
 * Progress is computed once per tick from the smoothed Lenis position and
 * pushed to every subscriber. Consumers (canvas, text, nav) all read that one
 * value, which is what keeps the frame, the copy and the navigation locked to
 * each other.
 *
 * The publish happens inside Lenis's own scroll callback, not in a rAF loop of
 * our own. That matters for how tightly the picture tracks the scroll: Lenis
 * updates `lenis.scroll` inside its rAF, and a second independent rAF has no
 * ordering guarantee against it. Ours would in fact have been registered first
 * — React runs a child's effects before its parent's, and this provider is a
 * child of <ReactLenis> — so every tick read the position Lenis had computed on
 * the *previous* frame, leaving the canvas one frame behind the input.
 *
 * Reading from Lenis's callback removes the ordering question entirely: the
 * frame drawn is always the one for the scroll position of the frame being
 * drawn. Without Lenis (no instance yet, or a browser that never starts it) the
 * native scroll event drives the same publish through one coalescing rAF.
 */
export function ScrollEngineProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<ReturnType<typeof useLenis>>(undefined);

  const stageElRef = useRef<HTMLElement | null>(null);
  const subscribersRef = useRef<Set<Subscriber>>(new Set());
  const progressRef = useRef(0);
  // Cached geometry, so the rAF loop never reads layout (no thrashing).
  const geometryRef = useRef({ top: 0, height: 0, viewport: 0 });

  const currentScroll = useCallback(() => {
    const l = lenisRef.current;
    return typeof l?.scroll === "number" ? l.scroll : window.scrollY;
  }, []);

  /**
   * Recompute progress and fan it out. `force` re-publishes an unchanged value,
   * which is what geometry changes need — the scroll position can sit still
   * while the runway's length under it changes.
   */
  const publish = useCallback(
    (force = false) => {
      const { top, height, viewport } = geometryRef.current;
      const range = height - viewport;
      const next = range > 0 ? clamp((currentScroll() - top) / range) : 0;

      if (!force && next === progressRef.current) return;

      progressRef.current = next;
      subscribersRef.current.forEach((fn) => fn(next));
    },
    [currentScroll]
  );

  // Lenis drives the publish, so the value is always the current frame's.
  const lenis = useLenis(
    useCallback(
      (instance) => {
        lenisRef.current = instance;
        publish();
      },
      [publish]
    )
  );
  lenisRef.current = lenis;

  const measure = useCallback(() => {
    const el = stageElRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    geometryRef.current = {
      top: rect.top + currentScroll(),
      height: el.offsetHeight,
      viewport: window.innerHeight,
    };
    // Re-publish: the same scroll position means a different progress once the
    // runway's length has changed. Nothing else would resend it, because Lenis
    // only ticks while the scroll is actually moving.
    publish(true);
  }, [currentScroll, publish]);

  const stageRef = useCallback(
    (el: HTMLElement | null) => {
      stageElRef.current = el;
      if (el) measure();
    },
    [measure]
  );

  const subscribe = useCallback((fn: Subscriber) => {
    subscribersRef.current.add(fn);
    // Hand the new subscriber the current value immediately so it can paint
    // correctly on mount instead of waiting a frame.
    fn(progressRef.current);
    return () => {
      subscribersRef.current.delete(fn);
    };
  }, []);

  const getProgress = useCallback(() => progressRef.current, []);

  const scrollToProgress = useCallback(
    (progress: number, duration = 1.6) => {
      const { top, height, viewport } = geometryRef.current;
      const range = Math.max(height - viewport, 1);
      const target = top + clamp(progress) * range;
      const l = lenisRef.current;
      if (l) {
        l.scrollTo(target, { duration, lock: false });
      } else {
        window.scrollTo({ top: target, behavior: "smooth" });
      }
    },
    []
  );

  // Keep cached geometry fresh.
  useEffect(() => {
    measure();

    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    const observer = new ResizeObserver(onResize);
    if (stageElRef.current) observer.observe(stageElRef.current);
    observer.observe(document.documentElement);

    // Fonts settling can change layout height slightly.
    document.fonts?.ready.then(onResize).catch(() => {});

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      observer.disconnect();
    };
  }, [measure]);

  /**
   * Fallback for when there is no Lenis instance driving the publish. The
   * scroll event can fire several times per frame, so it is coalesced into one
   * rAF — the same SCROLL → rAF → progress path, just without the smoothing.
   */
  useEffect(() => {
    if (lenis) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        publish();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    publish(true);

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [lenis, publish]);

  const value = useMemo<ScrollEngineValue>(
    () => ({ subscribe, getProgress, scrollToProgress, stageRef }),
    [subscribe, getProgress, scrollToProgress, stageRef]
  );

  return (
    <ScrollEngineContext.Provider value={value}>
      {children}
    </ScrollEngineContext.Provider>
  );
}

export function useScrollEngine(): ScrollEngineValue {
  const ctx = useContext(ScrollEngineContext);
  if (!ctx) {
    throw new Error("useScrollEngine must be used inside <ScrollEngineProvider>");
  }
  return ctx;
}

/**
 * Subscribe to progress without re-rendering. The callback runs on every
 * animation frame, so it should only write to refs or the DOM directly.
 */
export function useScrollProgress(fn: Subscriber) {
  const { subscribe } = useScrollEngine();
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => subscribe((p) => fnRef.current(p)), [subscribe]);
}
