"use client";

import { ReactNode } from "react";
import { ReactLenis } from "lenis/react";
import { ScrollEngineProvider } from "./ScrollEngine";

/**
 * Lenis smooth scrolling, wrapping the scroll engine that everything reads from.
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
      <ScrollEngineProvider>{children}</ScrollEngineProvider>
    </ReactLenis>
  );
}
