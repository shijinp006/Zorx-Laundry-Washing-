"use client";

import { ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MotionConfig } from "motion/react";
import { ReactLenis, useLenis } from "lenis/react";

/**
 * Lenis smooth scrolling, and the site's one motion policy.
 *
 * The tuning stays close to native: the wheel is not multiplied down and touch
 * is left alone, so the page still feels like a normal page — it just carries a
 * little momentum, which is what stops the frame sequence from looking steppy.
 *
 * `lerp` is the trade-off between smoothness and how closely the picture
 * follows the input. Lower means heavier smoothing and a longer tail, which
 * reads as the frames lagging behind the scroll; higher tracks the input more
 * tightly but lets the discrete frame steps show through. 0.1 keeps enough
 * momentum to hide the stepping while staying close to the hand.
 *
 * Note this is not the speed control — that is `--runway` in globals.css.
 * Multiplying the wheel down here would shorten the travel per notch and make
 * the page feel unresponsive rather than slower.
 *
 * `MotionConfig reducedMotion="user"` is here because it is the highest point
 * every animated component on the site sits under. It drops transforms from
 * every Motion animation for a visitor who asked for reduced motion while
 * leaving opacity alone, so nothing that fades in stays invisible. Components
 * therefore do not each have to branch on the preference — and must not, because
 * branching the rendered tree on a client-only preference would not match the
 * server's HTML.
 */
export default function SmoothScroller({ children }: { children: ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        wheelMultiplier: 1,
        smoothWheel: true,
        // Native momentum on touch devices feels better than a simulated one.
        syncTouch: false,
      }}
    >
      <MotionConfig reducedMotion="user">
        <RouteChangeResize />
        {children}
      </MotionConfig>
    </ReactLenis>
  );
}

/**
 * Re-measure after a navigation.
 *
 * The routes differ enormously in height — the film's runway is 950vh, the
 * contact page is about two screens — and Lenis caches the scrollable size it
 * eases against. Its own ResizeObserver usually catches the swap, but it fires
 * after the new page has painted, and one frame of easing against the old
 * document height at the top of a new page is visible. Asking for the
 * measurement as part of the navigation removes the race.
 */
function RouteChangeResize() {
  const pathname = usePathname();
  const lenis = useLenis();

  useEffect(() => {
    lenis?.resize();
  }, [pathname, lenis]);

  return null;
}
