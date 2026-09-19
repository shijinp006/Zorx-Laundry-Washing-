"use client";

import { motion, useScroll, useSpring } from "motion/react";

/**
 * A hairline across the top of every page showing how far through it you are.
 *
 * `useScroll()` with no target measures the document, so this works the same on
 * the film's 950vh runway and on a short contact page. The spring is there
 * because the bar is the one element that reads as an instrument: Lenis already
 * smooths the scroll, and a second, softer easing on top makes the line settle
 * after the page stops rather than stopping dead with it.
 */
export default function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 26,
    restDelta: 0.001,
  });

  return (
    <motion.div
      className="scrollBar"
      style={{ scaleX, transformOrigin: "left" }}
      aria-hidden="true"
    />
  );
}
