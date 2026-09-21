"use client";

import { ReactNode, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { MotionConfig } from "motion/react";
import { ReactLenis, useLenis } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Locomotive Scroll v5 & Lenis smooth scrolling with GSAP ScrollTrigger.
 *
 * Integrates Locomotive Scroll v5 (built on Lenis smooth scroll engine) with
 * GSAP ScrollTrigger while keeping the canvas frame scroll engine responsive.
 */
export default function SmoothScroller({ children }: { children: ReactNode }) {
  const locomotiveRef = useRef<any>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const LocomotiveScroll = (await import("locomotive-scroll")).default;
        if (!active) return;

        locomotiveRef.current = new LocomotiveScroll({
          lenisOptions: {
            lerp: 0.1,
            wheelMultiplier: 1,
            smoothWheel: true,
            syncTouch: false,
          },
        });

        // Keep GSAP ScrollTrigger synchronized with scroll updates
        if (locomotiveRef.current?.on) {
          locomotiveRef.current.on("scroll", () => {
            ScrollTrigger.update();
          });
        }

        ScrollTrigger.refresh();
      } catch (err) {
        console.warn("Locomotive Scroll initialization deferred:", err);
      }
    })();

    return () => {
      active = false;
      if (locomotiveRef.current) {
        locomotiveRef.current.destroy?.();
        locomotiveRef.current = null;
      }
    };
  }, []);

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
 * Re-measure after a navigation for Lenis & GSAP ScrollTrigger.
 */
function RouteChangeResize() {
  const pathname = usePathname();
  const lenis = useLenis();

  useEffect(() => {
    lenis?.resize();
    if (typeof window !== "undefined") {
      ScrollTrigger.refresh();
    }
  }, [pathname, lenis]);

  return null;
}

