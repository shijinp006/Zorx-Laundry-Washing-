"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { frameSrc } from "@/lib/story";

export interface Step {
  id: string;
  title: string;
  body: string;
  detail: string[];
  /** The frame from the film that shows this step. */
  frame: number;
  duration: string;
}

/**
 * The process, told by scrolling rather than by reading a numbered list.
 *
 * One `useScroll` on the outer container drives three things at once: the ring
 * that fills as you descend, the step the sticky column is naming, and which card
 * on the right is lit. They cannot disagree, because there is only one value.
 *
 * The ring is `pathLength` on an SVG circle, bound straight to the motion value —
 * an SVG attribute Motion can animate on the compositor, so a progress indicator
 * that updates on every frame of a long scroll costs no React renders. Only the
 * step *index* goes through state, and that changes six times in the whole
 * section.
 */
export default function ProcessScroller({ steps }: { steps: Step[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const next = Math.min(steps.length - 1, Math.max(0, Math.floor(p * steps.length)));
    if (next !== activeRef.current) {
      activeRef.current = next;
      setActive(next);
    }
  });

  const percent = useTransform(scrollYProgress, (p) => `${Math.round(p * 100)}%`);
  const step = steps[active];

  return (
    <div className="process" ref={containerRef}>
      <div className="process__inner shell">
        <div className="process__sticky">
          <div className="process__ring" aria-hidden="true">
            <svg viewBox="0 0 120 120">
              <circle className="process__ringTrack" cx="60" cy="60" r="54" />
              {/* `pathLength` is normalised: Motion renders pathLength="1" plus a
                  stroke-dasharray, so the server sends an empty ring and the fill
                  is a dasharray animation on the compositor rather than a
                  re-layout of the SVG. */}
              <motion.circle
                className="process__ringFill"
                cx="60"
                cy="60"
                r="54"
                style={{ pathLength: scrollYProgress }}
              />
            </svg>
            <motion.span className="process__percent">{percent}</motion.span>
          </div>

          <p className="process__counter" aria-hidden="true">
            Step {String(active + 1).padStart(2, "0")} of{" "}
            {String(steps.length).padStart(2, "0")}
          </p>

          {/* A live region: the sticky column is the only thing that tells a
              screen-reader user which step the scroll has reached. */}
          <div className="process__now" aria-live="polite">
            <h3 className="h3">{step.title}</h3>
            <p className="process__duration">{step.duration}</p>
          </div>

          <ol className="process__dots">
            {steps.map((s, i) => (
              <li
                key={s.id}
                className={`process__dot${i <= active ? " is-done" : ""}${
                  i === active ? " is-active" : ""
                }`}
              >
                <span className="sr-only">{s.title}</span>
              </li>
            ))}
          </ol>
        </div>

        <ol className="process__steps">
          {steps.map((s, i) => (
            <li
              key={s.id}
              className={`process__step${i === active ? " is-active" : ""}`}
            >
              <div className="process__stepHead">
                <p className="process__stepIndex" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="h3">{s.title}</h3>
              </div>

              {/* A still lifted straight out of the film's own frame sequence, so
                  the page illustrates itself with the shot the film used for this
                  step. Plain <img>: these files are pre-sized 1280x720 WebP served
                  immutable for a year (see next.config.mjs), so running them
                  through the image optimizer would add a hop and change nothing. */}
              <img
                className="process__shot"
                src={frameSrc(s.frame)}
                width={1280}
                height={720}
                alt=""
                loading="lazy"
                decoding="async"
              />

              <p className="body">{s.body}</p>
              <ul className="ticks">
                {s.detail.map((d) => (
                  <li key={d}>
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
                    {d}
                  </li>
                ))}
              </ul>
              <p className="process__stepTime">{s.duration}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
