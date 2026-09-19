"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import { mapRange } from "@/lib/story";
import { useScrollProgress } from "./ScrollEngine";

/**
 * The invitation to scroll, and its own removal.
 *
 * A site whose entire first screen is a held film shot has to say that scrolling
 * is what moves it, and then stop saying it immediately — a hint that is still
 * on screen after the viewer has taken it has become furniture. Its opacity is
 * mapped off the first 4% of the runway, so it is gone within roughly half a
 * screen of scrolling and comes back if you return to the top.
 *
 * The fade is written straight to the element from the scroll loop rather than
 * through a `MotionValue`, so it lands in the same Lenis tick as the frame
 * canvas. The slide-up entrance below stays on Motion — it fires once, off
 * `ready`, and never touches the scroll pipeline.
 */
export default function ScrollCue({ ready }: { ready: boolean }) {
  const cueRef = useRef<HTMLDivElement>(null);

  useScrollProgress((p) => {
    const el = cueRef.current;
    if (!el) return;
    el.style.opacity = String(mapRange(p, [0, 0.04], [1, 0]));
  });

  return (
    <motion.div
      ref={cueRef}
      className="cue"
      initial={{ y: 18 }}
      animate={{ y: ready ? 0 : 18 }}
      transition={{ delay: 0.9, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      aria-hidden="true"
    >
      <span className="cue__label">Scroll</span>
      <span className="cue__track">
        <motion.span
          className="cue__dot"
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </span>
    </motion.div>
  );
}
