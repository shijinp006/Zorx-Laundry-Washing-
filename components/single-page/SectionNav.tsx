"use client";

import { useState } from "react";
import {
  HomeBeat,
  HOMEPAGE_BEATS,
  progressForHomepageFrame,
} from "@/config/sections";
import { useScrollEngine, useScrollProgress } from "@/components/ScrollEngine";

/**
 * Dot nav for the homepage's three captioned stops.
 *
 * The reel plays the bridging footage between them too now (see
 * `config/sections.ts`), so a viewer who only wants Services or Process has
 * more scroll to cover than before. This is how they skip it: each dot scrolls
 * to the progress that draws its section's `landingFrame` — a named shot, not
 * a fraction of the way in — which lands past the caption's fade, so the copy
 * is already up on arrival. The active dot follows whichever beat's window the
 * current progress falls in, read off the same `ScrollValue` the canvas draws
 * from rather than a second, independent measurement.
 */
export default function SectionNav() {
  const { scrollToProgress } = useScrollEngine();
  const captioned = HOMEPAGE_BEATS.filter(
    (b): b is HomeBeat & { section: NonNullable<HomeBeat["section"]> } =>
      b.section != null
  );
  const [activeId, setActiveId] = useState(captioned[0]?.section.id ?? "");

  useScrollProgress((p) => {
    let active = captioned[0];
    for (const beat of captioned) {
      if (p >= beat.start) active = beat;
    }
    if (active && active.section.id !== activeId) {
      setActiveId(active.section.id);
    }
  });

  if (!captioned.length) return null;

  return (
    <nav className="singlePageNav" aria-label="Section navigation">
      <ul className="singlePageNav__list">
        {captioned.map((beat) => (
          <li key={beat.id}>
            <button
              type="button"
              className={`singlePageNav__item ${
                activeId === beat.section.id ? "is-active" : ""
              }`}
              onClick={() =>
                scrollToProgress(
                  progressForHomepageFrame(beat.section.landingFrame)
                )
              }
              aria-label={`Jump to ${beat.section.nav}`}
            >
              <span className="singlePageNav__dot" />
              <span className="singlePageNav__label">{beat.section.nav}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
