"use client";

import { MotionConfig, motion } from "motion/react";

/**
 * The #104b87 world the cinematic frames float in.
 *
 * The canvas above this layer is feathered at its edges, so these slow-drifting
 * light pools and rising bubbles read as atmosphere around the film rather than
 * decoration behind a solid block.
 *
 * Reduced motion is handled by `MotionConfig reducedMotion="user"`, which stops
 * the animations without changing the rendered tree. Branching the markup on a
 * client-only preference instead would not match the server's HTML.
 *
 * The glows deliberately animate position only, never `scale`. They are up to
 * 700px across under `filter: blur(60-80px)`, and scaling a blurred layer makes
 * the browser re-rasterize that blur every frame rather than just moving a
 * cached texture on the compositor. Running that continuously behind the canvas
 * competed with `drawImage` for GPU time and showed up as scroll stutter. Pure
 * translation is a compositor-only transform, and on a blob this soft the
 * missing 12% scale is not visible.
 */

/** Deterministic so the server and client markup agree. */
const BUBBLES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  size: 10 + ((i * 13) % 34),
  left: 3 + ((i * 37) % 94),
  duration: 22 + ((i * 7) % 18),
  delay: -((i * 5) % 26),
  drift: (i % 2 === 0 ? 1 : -1) * (14 + ((i * 11) % 30)),
  opacity: 0.1 + (i % 4) * 0.055,
}));

export default function AmbientBackground() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="ambient" aria-hidden="true">
        <div className="ambient__base" />

        <motion.div
          className="ambient__glow ambient__glow--one"
          animate={{ x: [0, 90, -50, 0], y: [0, -70, 60, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="ambient__glow ambient__glow--two"
          animate={{ x: [0, -80, 60, 0], y: [0, 70, -50, 0] }}
          transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="ambient__glow ambient__glow--three"
          animate={{ opacity: [0.28, 0.6, 0.28] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />

        {BUBBLES.map((b) => (
          <motion.span
            key={b.id}
            className="ambient__bubble"
            style={{ left: `${b.left}%`, width: b.size, height: b.size }}
            initial={{ y: "106vh", opacity: 0 }}
            animate={{
              y: "-12vh",
              x: [0, b.drift, 0],
              opacity: [0, b.opacity, b.opacity, 0],
            }}
            transition={{
              duration: b.duration,
              repeat: Infinity,
              delay: b.delay,
              ease: "linear",
            }}
          />
        ))}
      </div>
    </MotionConfig>
  );
}
