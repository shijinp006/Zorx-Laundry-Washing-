"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FrameLoader } from "@/lib/frameLoader";
import { TOTAL_FRAMES, frameFromProgress } from "@/lib/story";
import { useScrollEngine, useScrollProgress } from "./ScrollEngine";

/** Cap the backing store at 2x — beyond that costs memory for no visible gain. */
const MAX_DPR = 2;

/**
 * scroll progress → frame calculation → Canvas.
 *
 * Redraws only when the resolved frame index actually changes, so a still
 * scroll position costs nothing and a moving one stays on the compositor's
 * budget. The image is cover-fitted in device pixels for a sharp result on
 * high-DPI screens.
 *
 * Two things can make the canvas stale, and only one of them is scrolling:
 * a frame finishing its decode, or the backing store being resized, both of
 * which happen while the scroll sits still. The engine only ticks while the
 * scroll is moving, so those cases schedule their own redraw against the last
 * published progress rather than waiting for the next scroll.
 */
export default function FrameCanvas({
  onReady,
}: {
  onReady: (ready: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loaderRef = useRef<FrameLoader | null>(null);
  const lastDrawnRef = useRef(-1);
  const lastFrameRef = useRef(1);
  const dirtyRef = useRef(true);

  const [loadRatio, setLoadRatio] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  /** The loader has everything it needs; the reveal now waits on a real paint. */
  const loaderReadyRef = useRef(false);
  /** Guards the reveal so it fires once, from inside the draw. */
  const revealedRef = useRef(false);

  const { getProgress } = useScrollEngine();
  const getProgressRef = useRef(getProgress);
  getProgressRef.current = getProgress;

  // Set below, once `render` exists. Held in a ref so the loader callback and
  // the resize observer can reach it without being re-created.
  const renderRef = useRef<(progress: number) => void>(() => {});
  const redrawRafRef = useRef(0);

  /**
   * Repaint at the current scroll position, outside a scroll tick. Coalesced
   * into one rAF so a burst of decodes costs a single draw.
   */
  const scheduleRedraw = useCallback(() => {
    if (redrawRafRef.current) return;
    redrawRafRef.current = requestAnimationFrame(() => {
      redrawRafRef.current = 0;
      renderRef.current(getProgressRef.current());
    });
  }, []);

  useEffect(
    () => () => {
      if (redrawRafRef.current) cancelAnimationFrame(redrawRafRef.current);
    },
    []
  );

  // Preload the sequence.
  useEffect(() => {
    const loader = new FrameLoader(
      (loaded, target) => {
        setLoadRatio(Math.min(loaded / target, 1));
        dirtyRef.current = true;
        if (loaded >= target) {
          // Arm the reveal; `render` performs it after the first real draw.
          loaderReadyRef.current = true;
        }
        scheduleRedraw();
      },
      // Any frame decoding may be a better match than what is on screen —
      // including while the scroll sits still, when nothing else would repaint.
      () => {
        dirtyRef.current = true;
        scheduleRedraw();
      }
    );
    loaderRef.current = loader;
    void loader.start();

    return () => {
      loader.stop();
      loaderRef.current = null;
    };
  }, [scheduleRedraw]);

  // Size the backing store to the element's real pixel size.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const rect = canvas.getBoundingClientRect();
      const width = Math.round(rect.width * dpr);
      const height = Math.round(rect.height * dpr);
      if (width === canvas.width && height === canvas.height) return;
      canvas.width = width;
      canvas.height = height;
      // Assigning width/height clears the backing store, so repaint in this
      // same task. Deferring to a rAF would let the browser composite one
      // blank frame first, which shows as a flash on every resize step.
      dirtyRef.current = true;
      renderRef.current(getProgressRef.current());
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
    // Reaches `render` through a ref, so this binds once and never re-observes.
  }, []);

  /** progress → frame index → draw. */
  const render = useCallback((progress: number) => {
    const canvas = canvasRef.current;
    const loader = loaderRef.current;
    if (!canvas || !loader) return;

    const frame = Math.min(
      Math.max(Math.round(frameFromProgress(progress)), 1),
      TOTAL_FRAMES
    );

    // Keep the loader's decode window aimed at where the viewer is heading.
    if (frame !== lastFrameRef.current) {
      loader.update(frame, frame - lastFrameRef.current);
      lastFrameRef.current = frame;
    }

    // Already showing exactly the right frame, and nothing else invalidated it.
    if (frame === lastDrawnRef.current && !dirtyRef.current) return;

    // Prefer the real frame; fall back to the nearest decoded neighbour so a
    // fast scroll never shows a gap.
    const candidate = loader.best(frame);
    if (!candidate) return;

    // Hold the current picture rather than swap to a worse stand-in, so what
    // is on screen only ever improves. A slightly stale frame is much less
    // noticeable than one that jumps away from where you are.
    //
    // This is a guard, not a fix for an observed bug. It was written expecting
    // the pinned skeleton (1, 17, 33, …) to cause visible backward jumps on a
    // cold cache, but simulating this loader's own eviction and decode lag
    // across forward scrolls, reversals and nav jumps produced no case where
    // the branch fires — `best()` already returns a monotonic sequence when
    // the target moves monotonically. It stays because it costs nothing and it
    // makes `lastDrawnRef` mean "what is actually on screen", which the
    // comparison below depends on.
    if (candidate.frame !== frame && lastDrawnRef.current >= 1) {
      const onScreen = Math.abs(lastDrawnRef.current - frame);
      if (Math.abs(candidate.frame - frame) >= onScreen) {
        // Stay dirty so the exact frame replaces this as soon as it decodes.
        dirtyRef.current = true;
        return;
      }
    }

    const img = candidate.bitmap;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    if (cw === 0 || ch === 0) return;

    // Cover fit: fill the viewport, crop the overflow, keep the subject centred.
    const scale = Math.max(cw / img.width, ch / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, dx, dy, dw, dh);

    // Record the frame actually drawn, not the one asked for. The distance
    // comparison above depends on this being the truth about what is on screen.
    lastDrawnRef.current = candidate.frame;
    // If that was a stand-in, stay dirty so the real frame replaces it the
    // moment it finishes decoding.
    dirtyRef.current = candidate.frame !== frame;

    // Reveal only once something real is on the canvas. Handing over on the
    // loader's count alone faded a blank canvas up over a second and then
    // popped the first frame into it.
    if (loaderReadyRef.current && !revealedRef.current) {
      revealedRef.current = true;
      setRevealed(true);
      onReadyRef.current(true);
    }
  }, []);

  renderRef.current = render;

  // SCROLL → Lenis → rAF → progress → here. Runs inside the engine's tick, so
  // the frame drawn belongs to the scroll position of the frame being drawn.
  useScrollProgress(render);

  return (
    <>
      <canvas ref={canvasRef} className="stage__canvas" aria-hidden="true" />

      {!revealed && (
        <div className="loader" role="status" aria-live="polite">
          <div className="loader__mark">WASH ZONE</div>
          <div className="loader__track">
            <div
              className="loader__fill"
              style={{ transform: `scaleX(${loadRatio})` }}
            />
          </div>
          <div className="loader__text">
            Preparing the sequence · {Math.round(loadRatio * 100)}%
          </div>
        </div>
      )}
    </>
  );
}
