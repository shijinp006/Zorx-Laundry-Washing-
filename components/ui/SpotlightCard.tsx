"use client";

import { PointerEvent, ReactNode, useRef } from "react";

/**
 * A card that lights up where the pointer is.
 *
 * The highlight is a single radial gradient positioned from two CSS custom
 * properties, written on `pointermove`. That is deliberately not React state: a
 * card lighting up would otherwise re-render on every pointer sample, and a grid
 * of them would re-render the grid. Writing two custom properties on the element
 * only invalidates paint.
 *
 * It is decoration, and it is treated as such. The glow never carries meaning
 * that is not also in the text, and the card's real hover state — a border and a
 * lift, in CSS — is mirrored on `:focus-within` so the keyboard gets it too. A
 * pointer-only affordance is not an affordance.
 */
export default function SpotlightCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={ref}
      className={`spotlight ${className}`.trim()}
      onPointerMove={onPointerMove}
    >
      <span className="spotlight__glow" aria-hidden="true" />
      <span className="spotlight__content">{children}</span>
    </div>
  );
}
