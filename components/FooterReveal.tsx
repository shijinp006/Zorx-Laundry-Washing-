"use client";

import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";
import { clamp, mapRange } from "@/lib/story";
import SiteFooter from "./SiteFooter";

/**
 * The footer's 3D entrance, played once as it scrolls into view at the bottom
 * of any page.
 *
 * It stays in normal document flow — nothing here is `fixed` or `sticky`, so
 * the page's ambient glow layer (`AmbientBackground.tsx`, itself `fixed` and
 * meant to show through everywhere) keeps doing that right up to the footer,
 * rather than being blanked out by an opaque curtain the way the classic
 * sticky-footer-reveal technique would need. What changes is how the footer
 * arrives: tilted back, receded and dim while its top edge is still at the
 * bottom of the screen, settling flat, full scale and fully lit by the time
 * it has scrolled up `REVEAL_VH_FRACTION` of a screen further.
 *
 * `perspective` lives on this component's own wrapper, not on `body` or any
 * other shared ancestor — putting a `perspective`/`transform`/`filter` on an
 * ancestor of the site's `position: fixed` elements (the nav, the WhatsApp
 * button, the scroll bar) would make it their containing block instead of the
 * viewport, and they would start scrolling away with the page.
 */
const REVEAL_VH_FRACTION = 0.55;

export default function FooterReveal() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const panel = panelRef.current;
    if (!wrapper || !panel) return;

    const apply = () => {
      const rect = wrapper.getBoundingClientRect();
      const revealDistance = Math.max(window.innerHeight * REVEAL_VH_FRACTION, 1);
      const progress = clamp((window.innerHeight - rect.top) / revealDistance);

      const translateY = mapRange(progress, [0, 1], [96, 0]);
      const rotateX = mapRange(progress, [0, 1], [22, 0]);
      const scale = mapRange(progress, [0, 1], [0.92, 1]);
      const opacity = mapRange(progress, [0, 1], [0.25, 1]);

      panel.style.transform = `translateY(${translateY}px) rotateX(${rotateX}deg) scale(${scale})`;
      panel.style.opacity = String(opacity);
    };

    apply();
    // Same loop as `ScrollEngine.tsx`: Lenis's own scroll tick, no separate
    // scheduler reading the position back out a frame later.
    const unsubscribe = lenisRef.current?.on("scroll", apply);
    window.addEventListener("resize", apply);

    return () => {
      unsubscribe?.();
      window.removeEventListener("resize", apply);
    };
  }, [lenis]);

  return (
    <div ref={wrapperRef} className="footerReveal">
      <div ref={panelRef} className="footerReveal__panel">
        <SiteFooter />
      </div>
    </div>
  );
}
