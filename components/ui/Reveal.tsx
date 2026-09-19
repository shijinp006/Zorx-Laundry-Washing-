"use client";

import { ReactNode } from "react";
import { motion } from "motion/react";

/**
 * The site's one entrance animation.
 *
 * Every block of page content arrives the same way: 28px up, sharpening, once.
 * One shared curve across the whole site is what stops a long scroll-driven page
 * from feeling like a showreel of different effects — the film is allowed to be
 * the spectacle, the copy is not.
 *
 * `once: true` is deliberate. Content that re-animates every time it re-enters
 * the viewport punishes scrolling back, which on a site this tall is something
 * people do constantly.
 *
 * Reduced motion is handled globally by `MotionConfig reducedMotion="user"` in
 * `SmoothScroller`: the transforms are dropped and only the opacity remains, so
 * nothing ever stays invisible.
 */
export default function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  /**
   * The element to render. A card inside a `<ul>` has to reveal as the `<li>`
   * itself — wrapping the list item in a div would make the list invalid, and
   * screen readers stop counting items when it does.
   */
  as?: "div" | "li";
}) {
  const Tag = as === "li" ? motion.li : motion.div;

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px -12% 0px" }}
      transition={{ duration: 0.62, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Tag>
  );
}
