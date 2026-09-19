"use client";

import { useRef } from "react";
import { HomeBeat, captionOpacity } from "@/config/sections";
import { mapRange } from "@/lib/story";
import { useScrollProgress } from "@/components/ScrollEngine";

/**
 * One section's copy, permanently mounted inside the homepage's single pinned
 * stage rather than arriving with its own pin. `captionOpacity` decides how
 * visible it is at the current progress; everything else — the 3D tilt as it
 * settles in, whether pointer events reach it — follows from that one number,
 * written straight to the element from the scroll loop.
 *
 * Same entrance recipe as the footer's (`FooterReveal.tsx`): tilted back,
 * receded and dim at opacity 0, settling flat, full scale and fully lit by
 * opacity 1. Reusing `captionOpacity` for the transform too means fading out
 * plays the same tilt in reverse, not just a plain fade.
 */
export default function HomeCaption({ beat }: { beat: HomeBeat }) {
  const section = beat.section;
  const copyRef = useRef<HTMLDivElement>(null);

  useScrollProgress((p) => {
    const el = copyRef.current;
    if (!el) return;
    const opacity = captionOpacity(beat, p);
    const translateY = mapRange(opacity, [0, 1], [96, 0]);
    const rotateX = mapRange(opacity, [0, 1], [22, 0]);
    const scale = mapRange(opacity, [0, 1], [0.92, 1]);

    el.style.opacity = String(opacity);
    el.style.transform = `translateY(${translateY}px) rotateX(${rotateX}deg) scale(${scale})`;
    el.style.pointerEvents = opacity > 0.5 ? "auto" : "none";
  });

  if (!section) return null;

  return (
    <div ref={copyRef} className="chapter__copy" style={{ opacity: 0 }}>
      <p className="chapter__eyebrow">{section.eyebrow}</p>
      <h2 className="chapter__title" id={`${section.id}-title`}>
        {section.title}
      </h2>
      <p className="chapter__lede">{section.lede}</p>

      {section.points.length > 0 && (
        <ul className="chapter__points">
          {section.points.map((point) => (
            <li key={point}>
              <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 12.5l5 5L20 6.5"
                />
              </svg>
              {point}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
