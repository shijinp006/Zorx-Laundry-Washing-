"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  RevealStyle,
  SCENES,
  TimedScene,
  headlineLines,
} from "@/config/scenes";
import { VAN_APPROACH, VAN_DEPART, sampleVan } from "@/config/vanTrack";
import { FRAME_HEIGHT, FRAME_WIDTH, frameFromProgress } from "@/lib/story";
import { useScrollProgress } from "./ScrollEngine";

/**
 * scroll progress → matching scene → wave reveal.
 *
 * Sits on top of the canvas and reads the same progress value the frames are
 * drawn from, so a headline cannot drift away from the shot it describes. All
 * four of a scene's timing landmarks come from `progressFromFrame`, the exact
 * mapping `FrameCanvas` uses — change the pacing in story.ts and the words
 * follow the picture with no adjustment here.
 *
 * This file contains no copy and no frame numbers. Those live in
 * `config/scenes.ts`.
 *
 *
 * HOW THE WAVE WORKS
 *
 * Words are staggered by index across a share of the reveal window, so word 1
 * lands, then word 2 a little later, and so on. Each word carries only
 * `translate3d` and `opacity` — both compositor properties — and the
 * blur-to-sharp pass is applied once to the block rather than per word, because
 * a `filter` on every word would re-rasterize each of them on every tick.
 *
 *
 * WHY THIS WRITES TO THE DOM DIRECTLY
 *
 * Progress updates on every animation frame while scrolling. Re-rendering
 * through React at that rate would be far too much work, so the callback only
 * writes to refs. Three things keep the cost down:
 *
 *   - a scene outside its window is styled once and then skipped entirely, so
 *     at most two scenes are ever being written to (the one arriving and the
 *     one leaving);
 *   - a value is only written when it has moved enough to be visible, which
 *     stops a slow scroll from issuing hundreds of identical style writes;
 *   - `will-change` is set on the block, not on every word.
 */

/** Rise distance for each word, in px. */
const RISE_PX = 40;
/** Extra lift as the copy leaves, in px. */
const LIFT_PX = 18;
/** Blur applied to the whole block at the start of the reveal, in px. */
const BLUR_PX = 8;
/**
 * Share of the reveal window spent staggering between the first and last word.
 * The rest is the travel time of an individual word, so a higher number makes
 * the wave longer and each word quicker.
 */
const STAGGER_SPAN = 0.55;
/** A shorter stagger on the way out — leaving should read faster than arriving. */
const EXIT_STAGGER_SPAN = 0.28;
/** Skip a style write under this much change. */
const EPS_OPACITY = 0.004;
const EPS_PX = 0.15;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number) => t * t * t;

/** Time-based intro for the opening scene, in ms. */
const INTRO_MS = 950;

/* --- per-effect constants ------------------------------------------------ */

/** liquid: further to fall than the wave, so it reads as dropping. */
const DROP_PX = 54;
/** fly3d: how far behind the screen the words start. */
const FLY_Z_PX = 620;
const FLY_ROT_X = 62;
const FLY_ROT_Y = 14;
/** glass: the panel scales up from this. */
const GLASS_SCALE_FROM = 0.88;
/** track: gap held between the van's top edge and the caption, in px. */
const TRACK_GAP_PX = 20;
/**
 * track: never let the caption climb above this, in px.
 *
 * The frame is cover-fitted, so on a wide viewport the crop puts the van's top
 * edge only ~50-115px below the viewport top — high enough for a caption
 * pinned above it to collide with the navbar. Clamping trades a few frames of
 * vertical tracking at the end of the shot for copy that stays readable.
 */
const TRACK_MIN_TOP_PX = 104;

/**
 * mask: the van's left edge travels this range as it pulls away, and it is what
 * drives the reveal. Measured once at module load from the tracking data rather
 * than hard-coded, so regenerating `vanTrack.ts` cannot leave it stale.
 */
const DEPART_X0_MIN = Math.min(...VAN_DEPART.map((v) => v.x0));
const DEPART_X0_MAX = Math.max(...VAN_DEPART.map((v) => v.x0));

/**
 * Maps a point in the FRAME to a point in the viewport.
 *
 * The canvas is cover-fitted — scaled to fill and cropped — so a normalised
 * frame coordinate is not a normalised viewport coordinate. This repeats the
 * same maths `FrameCanvas` draws with; without it, tracked text would sit
 * correctly only at exactly 16:9 and drift off the van at every other size.
 */
function frameToViewport(
  cx: number,
  cy: number,
  w: number,
  h: number
): { x: number; y: number } {
  const scale = Math.max(w / FRAME_WIDTH, h / FRAME_HEIGHT);
  const dw = FRAME_WIDTH * scale;
  const dh = FRAME_HEIGHT * scale;
  return { x: (w - dw) / 2 + cx * dw, y: (h - dh) / 2 + cy * dh };
}

/** The transform for one word, per reveal style. `rise` and `leave` are 0-1. */
function wordTransform(
  mode: RevealStyle,
  rise: number,
  leave: number
): string {
  const lift = leave * LIFT_PX;

  switch (mode) {
    case "liquid": {
      // A droplet: falls in stretched tall and narrow, then settles wide as it
      // lands. The scale runs slightly ahead of the fall so the squash reads
      // after the drop arrives rather than during it.
      const s = easeOutCubic(clamp01(rise * 1.18));
      const sy = 1.42 - 0.42 * s;
      const sx = 0.88 + 0.12 * s;
      const y = (1 - rise) * DROP_PX - lift;
      return `translate3d(0, ${y.toFixed(2)}px, 0) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
    }
    case "fly3d": {
      // Flies in from behind the screen and rotates flat, to match the iron
      // travelling toward camera.
      const z = -(1 - rise) * FLY_Z_PX;
      const rx = -(1 - rise) * FLY_ROT_X;
      const ry = (1 - rise) * FLY_ROT_Y;
      const y = (1 - rise) * 18 - lift;
      return `translate3d(0, ${y.toFixed(2)}px, ${z.toFixed(1)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    }
    case "glass": {
      // The panel does the moving, so the words barely travel — that keeps the
      // type crisp while the surface behind it scales.
      const y = (1 - rise) * 10 - lift;
      return `translate3d(0, ${y.toFixed(2)}px, 0)`;
    }
    case "mask": {
      // The van's edge does the revealing; a small lift stops it reading static.
      const y = (1 - rise) * 14 - lift;
      return `translate3d(0, ${y.toFixed(2)}px, 0)`;
    }
    case "track":
    case "wave":
    default: {
      const y = (1 - rise) * RISE_PX - lift;
      return `translate3d(0, ${y.toFixed(2)}px, 0)`;
    }
  }
}

function SceneBlock({
  scene,
  isFirst,
  isLast,
  ready,
}: {
  scene: TimedScene;
  isFirst: boolean;
  /** The closing line holds instead of leaving — see the exit below. */
  isLast: boolean;
  ready: boolean;
}) {
  const blockRef = useRef<HTMLDivElement>(null);
  /**
   * The blur goes on the inner text block, never on `.scene`. `.scene` is
   * `inset: 0`, so a filter there would promote a viewport-sized layer and
   * re-rasterize all of it each tick; the inner block is only as big as the
   * words.
   */
  const innerRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLElement[]>([]);
  /** Last written values, so unchanged styles are not re-applied. */
  const lastRef = useRef<{ y: number; o: number }[]>([]);
  const visibleRef = useRef<boolean | null>(null);
  const blurRef = useRef(-1);
  /** Latest published progress, so the mount intro can repaint at it. */
  const lastProgressRef = useRef(0);
  /** 0-1 of the mount intro; only ever used by the opening scene. */
  const introRef = useRef(0);
  const reducedRef = useRef(false);

  const lines = useMemo(() => headlineLines(scene.headline), [scene.headline]);

  useEffect(() => {
    reducedRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  /** Collects the word spans in reading order: label, headline, description. */
  const collect = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    wordsRef.current = Array.from(
      el.querySelectorAll<HTMLElement>("[data-word]")
    );
    // Infinity, not NaN. The write below is gated on
    // `Math.abs(value - last) > EPS`, and any comparison against NaN is false,
    // so seeding with NaN meant the first write never happened for any word —
    // every one of them kept the CSS defaults (opacity 0, translated 40px down)
    // and no text ever appeared. Infinity always exceeds the threshold, so the
    // first paint always lands.
    lastRef.current = wordsRef.current.map(() => ({
      y: Number.POSITIVE_INFINITY,
      o: Number.POSITIVE_INFINITY,
    }));
  }, []);

  const paint = useCallback((progress: number) => {
    const block = blockRef.current;
    const words = wordsRef.current;
    if (!block || !words.length) return;

    const { start, end, revealEnd, exitStart } = scene;

    // Outside the window: style once, then do nothing until it matters again.
    //
    // The opening scene is exempt at its lower edge. Its `start` is exactly
    // progress 0, so a plain `progress <= start` test hid it on load and the
    // mount intro had nothing to paint — the hero came up with no headline
    // until the first scroll.
    if ((progress <= start && !isFirst) || (progress >= end && !isLast)) {
      if (visibleRef.current !== false) {
        visibleRef.current = false;
        block.style.visibility = "hidden";
        const innerOut = innerRef.current;
        if (innerOut) {
          innerOut.style.willChange = "auto";
          innerOut.style.filter = "none";
        }
        blurRef.current = -1;
      }
      return;
    }

    if (visibleRef.current !== true) {
      visibleRef.current = true;
      block.style.visibility = "visible";
      const innerIn = innerRef.current;
      if (innerIn) innerIn.style.willChange = "filter";
    }

    // Where we are within the reveal, and within the exit.
    const revealSpan = Math.max(revealEnd - start, 1e-6);
    const exitSpan = Math.max(end - exitStart, 1e-6);
    let rt = clamp01((progress - start) / revealSpan);
    // The closing line never leaves. It is the sign-off, so it should still be
    // on screen when the runway runs out rather than fading into a bare frame.
    const xt = isLast ? 0 : clamp01((progress - exitStart) / exitSpan);

    // The opening headline also plays in on load, so the hero is not blank
    // before the first scroll. `max` means scrolling only ever takes it
    // further in — the two drivers cannot fight each other.
    if (isFirst) rt = Math.max(rt, introRef.current);

    // A scene can hold before its words arrive.
    const delay = scene.animationDelay ?? 0;
    if (delay > 0) rt = clamp01((rt - delay) / Math.max(1 - delay, 1e-6));

    const reduced = reducedRef.current;

    // One blur pass for the whole block, and none once it has settled — a
    // permanent filter would keep the text on its own rasterized layer.
    if (!reduced) {
      const blur = (1 - rt) * BLUR_PX + xt * BLUR_PX * 0.6;
      const q = Math.round(blur * 10) / 10;
      if (q !== blurRef.current) {
        blurRef.current = q;
        const inner = innerRef.current;
        if (inner) inner.style.filter = q > 0.2 ? `blur(${q}px)` : "none";
      }
    }

    const n = words.length;
    const denom = Math.max(n - 1, 1);

    for (let i = 0; i < n; i++) {
      // Each word gets its own slice of the window, offset by its index.
      const inStart = (i / denom) * STAGGER_SPAN;
      const inT = clamp01((rt - inStart) / Math.max(1 - STAGGER_SPAN, 1e-6));
      const rise = easeOutCubic(inT);

      const outStart = (i / denom) * EXIT_STAGGER_SPAN;
      const outT = clamp01(
        (xt - outStart) / Math.max(1 - EXIT_STAGGER_SPAN, 1e-6)
      );
      const leave = easeInCubic(outT);

      const o = rise * (1 - leave);
      const y = reduced ? 0 : (1 - rise) * RISE_PX - leave * LIFT_PX;

      let last = lastRef.current[i];
      if (!last) {
        // Word list changed without `collect` re-running (a copy edit in dev,
        // for instance). Seed it rather than throwing on a missing entry.
        last = { y: Number.POSITIVE_INFINITY, o: Number.POSITIVE_INFINITY };
        lastRef.current[i] = last;
      }
      const el = words[i];
      if (Math.abs(o - last.o) > EPS_OPACITY) {
        last.o = o;
        el.style.opacity = o.toFixed(3);
      }
      if (Math.abs(y - last.y) > EPS_PX) {
        last.y = y;
        el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
      }
    }
  }, [scene, isFirst, isLast]);

  const paintRef = useRef(paint);
  paintRef.current = paint;

  useScrollProgress((p) => {
    lastProgressRef.current = p;
    paintRef.current(p);
  });

  // Mount intro for the opening scene, once the frames are on screen.
  useEffect(() => {
    if (!isFirst || !ready) return;
    if (reducedRef.current) {
      introRef.current = 1;
      paintRef.current(lastProgressRef.current);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = () => {
      const t = clamp01((performance.now() - t0) / INTRO_MS);
      introRef.current = t;
      // Repaint at the live progress so a scroll during the intro still wins.
      paintRef.current(lastProgressRef.current);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isFirst, ready]);

  const align = scene.textAlignment === "center" ? " scene--centered" : "";

  return (
    <div
      ref={(el) => {
        blockRef.current = el;
        collect(el);
      }}
      className={`scene scene--${scene.textPosition} scene--${scene.anchor} scene--${scene.theme}${align}`}
      style={{ visibility: "hidden" }}
      aria-hidden="true"
    >
      <div className="scene__inner" ref={innerRef} data-aos="fade-up" data-aos-duration="600">
        {scene.label ? (
          <p className="scene__label">
            {scene.label.split(/\s+/).map((w, i) => (
              <span className="scene__word" data-word key={i}>
                {w}
                {" "}
              </span>
            ))}
          </p>
        ) : null}

        <h2 className="scene__headline">
          {lines.map((words, li) => (
            <span className="scene__line" key={li}>
              {words.map((w, wi) => (
                <span className="scene__word" data-word key={wi}>
                  {w}
                  {wi < words.length - 1 ? " " : ""}
                </span>
              ))}
            </span>
          ))}
        </h2>

        {scene.description ? (
          <p className="scene__desc">
            {scene.description.split(/\s+/).map((w, i) => (
              <span className="scene__word" data-word key={i}>
                {w}
                {" "}
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * All scenes are mounted at once and cross-faded by scroll position, so nothing
 * mounts or unmounts mid-scroll — a React commit during a scrub is exactly the
 * kind of hitch this layer has to avoid.
 */
export default function SceneText({ ready }: { ready: boolean }) {
  return (
    <div className="sceneLayer" aria-hidden="true">
      {SCENES.map((scene, i) => (
        <SceneBlock
          key={scene.id}
          scene={scene}
          isFirst={i === 0}
          isLast={i === SCENES.length - 1}
          ready={ready}
        />
      ))}
    </div>
  );
}
