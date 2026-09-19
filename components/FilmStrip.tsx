"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { FrameRange } from "@/lib/frameLoader";
import { mapRange } from "@/lib/story";
import FrameCanvas from "./FrameCanvas";
import { ScrollStage, useScrollProgress } from "./ScrollEngine";

/**
 * The scroll-scrubbed hero every inner page opens on.
 *
 * Same machinery as the homepage film, pointed at one shot instead of all 239
 * frames: `ScrollStage` turns the hero's own scroll range into progress, maps
 * it to a frame, and the canvas draws it. That is the point — the film is the
 * site's language, so a page that dropped it for a static photograph would
 * read as a different website.
 *
 * The copy rides the same value, written straight to its element from the
 * scroll loop rather than through a `MotionValue`. It lifts, fades and blurs
 * out as the shot plays through, so the picture is clear by the time the
 * page's real content arrives underneath it.
 */
export default function FilmStrip({
  range,
  eyebrow,
  headline,
  lede,
  children,
}: {
  range: FrameRange;
  eyebrow: string;
  headline: string;
  lede: string;
  /** Optional row of facts under the lede. */
  children?: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);

  return (
    <ScrollStage className="strip" range={range}>
      <div className={`strip__pin${ready ? " is-ready" : ""}`}>
        <FrameCanvas
          className="strip__canvas"
          showLoader={false}
          onReady={setReady}
        />
        <div className="strip__scrim" aria-hidden="true" />
        <StripCopy eyebrow={eyebrow} headline={headline} lede={lede}>
          {children}
        </StripCopy>
      </div>
    </ScrollStage>
  );
}

function StripCopy({
  eyebrow,
  headline,
  lede,
  children,
}: {
  eyebrow: string;
  headline: string;
  lede: string;
  children?: React.ReactNode;
}) {
  const copyRef = useRef<HTMLDivElement>(null);

  // Everything below is one scroll value fanned out, written straight to the
  // element inside the same Lenis tick that moved the page. Only compositor
  // properties are touched — translate, opacity and a filter on a single small
  // block — so scrubbing the hero never costs a layout.
  useScrollProgress((p) => {
    const el = copyRef.current;
    if (!el) return;
    const y = mapRange(p, [0, 1], [0, -90]);
    const opacity = mapRange(p, [0, 0.55, 0.92], [1, 1, 0]);
    const blurPx = mapRange(p, [0.5, 1], [0, 7]);
    el.style.transform = `translateY(${y}px)`;
    el.style.opacity = String(opacity);
    el.style.filter = blurPx > 0 ? `blur(${blurPx}px)` : "";
  });

  return (
    <div ref={copyRef} className="strip__copy">
      <motion.p
        className="strip__eyebrow"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {eyebrow}
      </motion.p>

      <h1 className="strip__headline">
        {headline.split("\n").map((line, i) => (
          <span className="strip__line" key={i}>
            <motion.span
              initial={{ opacity: 0, y: 34 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.08 + i * 0.09,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {line}
            </motion.span>
          </span>
        ))}
      </h1>

      <motion.p
        className="strip__lede"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
      >
        {lede}
      </motion.p>

      {children ? <div className="strip__meta">{children}</div> : null}
    </div>
  );
}
