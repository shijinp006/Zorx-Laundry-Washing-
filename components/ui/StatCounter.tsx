"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

/**
 * A number that counts up the first time it is scrolled into view.
 *
 * The count is written straight to the DOM node from Motion's `onUpdate`, not
 * through state. At 60fps a 1.2s count is ~72 updates; as state that is 72
 * renders of the stat block, and a row of four would be ~288.
 *
 * The final value is in the markup as text for anyone who never sees the
 * animation — a screen reader, a crawler, or a visitor who asked for reduced
 * motion, where the number simply appears at its value.
 */
export default function StatCounter({
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  label,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  label: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const reduced = useReducedMotion();

  // Zero it on mount, before it is ever scrolled to. The markup ships the final
  // number so it is correct without JavaScript, which means the node would
  // otherwise show its answer and then snap back to 0 to count up.
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    el.textContent = `${prefix}${(0).toFixed(decimals)}${suffix}`;
  }, [reduced, prefix, suffix, decimals]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || reduced) return;

    const controls = animate(0, value, {
      duration: 1.15,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = `${prefix}${v.toFixed(decimals)}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [inView, value, prefix, suffix, decimals, reduced]);

  return (
    <div className="stat">
      <p className="stat__value">
        <span ref={ref}>
          {prefix}
          {value.toFixed(decimals)}
          {suffix}
        </span>
      </p>
      <p className="stat__label">{label}</p>
    </div>
  );
}
