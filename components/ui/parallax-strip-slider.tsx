// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

/* Inline stand-in for @gsap/react's useGSAP. Mirrors its default
   `revertOnUpdate: false`: one gsap.context lives for the component's
   lifetime, the callback is re-added when dependencies change, and the
   context is reverted only on unmount. Reverting on every dependency
   change (the naive version) rolls finished tweens back to their start
   state — which is what snapped the progress bar to slide 1 mid-sequence.
   Covers both call shapes used below — plain effect, and one that returns
   its own cleanup. */
function useGSAP(
  callback: () => void | (() => void),
  options?: {
    dependencies?: unknown[];
    scope?: { current: Element | null } | Element | null;
  }
) {
  const deps = options?.dependencies ?? [];
  const scope = options?.scope;
  const ctxRef = useRef<gsap.Context | null>(null);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  useLayoutEffect(() => {
    const el =
      scope && typeof scope === "object" && "current" in scope
        ? scope.current
        : (scope as Element | null);
    ctxRef.current = gsap.context(() => {}, el ?? undefined);
    return () => {
      ctxRef.current?.revert();
      ctxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (!ctxRef.current) return;
    cleanupRef.current?.();
    const ret = ctxRef.current.add(callback);
    cleanupRef.current = typeof ret === "function" ? ret : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

if (typeof window !== "undefined") {
  gsap.registerPlugin(SplitText);
}

// Animation timing
const STRIP_COUNT = 10;
const REVEAL_DURATION = 0.5;
const STRIP_STAGGER = 0.04;
const ZOOM_DURATION = 0.9;
const ZOOM_FROM = 1.2;
const AUTOPLAY_INTERVAL = 5000;
const TITLE_CHAR_DURATION = 0.6;
const TITLE_CHAR_STAGGER = 0.04;
const TITLE_CHAR_Y_PERCENT = 100;
const PROGRESS_DURATION = 0.9;

type Slide = {
  src: string;
  title: string;
  chapter?: string;
};

export type ParallaxStripSliderProps = {
  /** Slides to cycle through. Defaults to a built-in sample set. */
  slides?: Slide[];
  className?: string;
  /** Number of vertical strips in the wipe reveal. */
  stripCount?: number;
  /** Duration of each strip's clip-path wipe, in seconds. */
  revealDuration?: number;
  /** Delay between consecutive strips, in seconds. */
  stripStagger?: number;
  /** Starting scale of the incoming image (Ken-Burns zoom). */
  zoomFrom?: number;
  /** Duration of the image zoom settle, in seconds. */
  zoomDuration?: number;
  /** Auto-advance slides on a timer. */
  autoplay?: boolean;
  /** Show the top progress bar. */
  showProgressBar?: boolean;
  /** Show the numeric slide counter. */
  showCounter?: boolean;
  /** Enable the click-to-navigate overlay and its circular cursor (left half = prev, right half = next). */
  showControls?: boolean;
  /** Color of the progress bar fill, caption text, and control borders. */
  accentColor?: string;
  /** Slider background, seen behind the images. */
  backgroundColor?: string;
};

const R2 =
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/strip-paralax-slider";

const DEFAULT_SLIDES: Slide[] = [
  {
    src: `${R2}/img01.png`,
    title: "Fire",
    chapter: "Collection 01",
  },
  {
    src: `${R2}/img02.png`,
    title: "Allure",
    chapter: "Collection 02",
  },
  {
    src: `${R2}/img03.png`,
    title: "Ember",
    chapter: "Collection 03",
  },
];

type TransitionDirection = "next" | "prev";

function prefersReducedMotion() {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
  );
}

export default function ParallaxStripSlider({
  slides = DEFAULT_SLIDES,
  className = "",
  stripCount = STRIP_COUNT,
  revealDuration = REVEAL_DURATION,
  stripStagger = STRIP_STAGGER,
  zoomFrom = ZOOM_FROM,
  zoomDuration = ZOOM_DURATION,
  autoplay = false,
  showProgressBar = true,
  showCounter = true,
  showControls = true,
  accentColor = "#ffffff",
  backgroundColor = "#000000",
}: ParallaxStripSliderProps) {
  const [current, setCurrent] = useState(0);
  const [incoming, setIncoming] = useState<number | null>(null);
  const [caption, setCaption] = useState(0);
  const [direction, setDirection] = useState<TransitionDirection>("next");
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const chapterRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const counterNumRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const stripsRef = useRef<HTMLDivElement[]>([]);
  const zoomRef = useRef<HTMLDivElement[]>([]);
  const isAnimating = useRef(false);
  const isFirstCaption = useRef(true);
  const splitRef = useRef<SplitText | null>(null);

  // Circular click-to-navigate cursor.
  const cursorRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);
  const isInside = useRef(false);
  const mouse = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });

  const total = slides.length;

  // Touch vs. mouse decides the layout — not raw width. A narrow but
  // mouse-driven frame (21st preview, split editor) keeps the full desktop
  // experience with the follow cursor; only real touch devices get the
  // stacked layout.
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setIsCoarsePointer(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Load the display serif once (was a Next <style jsx global> import).
  useEffect(() => {
    const id = "hpx-instrument-serif";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap";
    document.head.appendChild(link);
  }, []);

  const goTo = useCallback(
    (next: number, transitionDirection: TransitionDirection) => {
      if (isAnimating.current || next === current || total < 2) return;
      isAnimating.current = true;
      setDirection(transitionDirection);
      setIncoming(next);
    },
    [current, total]
  );

  const onNext = useCallback(
    () => goTo((current + 1) % total, "next"),
    [current, total, goTo]
  );
  const onPrev = useCallback(
    () => goTo((current - 1 + total) % total, "prev"),
    [current, total, goTo]
  );

  // Auto-advance on a timer; pauses while a transition is mid-flight and when
  // reduced motion is requested.
  useEffect(() => {
    if (!autoplay || total < 2) return;
    if (typeof window !== "undefined" && prefersReducedMotion()) return;
    const id = window.setInterval(() => {
      if (!isAnimating.current) onNext();
    }, AUTOPLAY_INTERVAL);
    return () => window.clearInterval(id);
  }, [autoplay, total, onNext]);

  // Wipe + zoom + progress on slide change.
  useGSAP(
    () => {
      if (incoming === null) return;

      const strips = stripsRef.current.slice(0, stripCount).filter(Boolean);
      const zooms = zoomRef.current.slice(0, stripCount).filter(Boolean);
      if (!strips.length) return;
      const isPrevious = direction === "prev";
      const orderedStrips = isPrevious ? [...strips].reverse() : strips;

      // Reduced motion: swap without the reveal.
      if (prefersReducedMotion()) {
        setCaption(incoming);
        setCurrent(incoming);
        setIncoming(null);
        isAnimating.current = false;
        return;
      }

      const settle = () => {
        setCaption(incoming);
        setCurrent(incoming);
        setIncoming(null);
        isAnimating.current = false;
      };

      const tl = gsap.timeline({ onComplete: settle });

      // Reverse stagger + clip origin when moving backward.
      tl.fromTo(
        orderedStrips,
        { clipPath: isPrevious ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)" },
        {
          clipPath: isPrevious ? "inset(0 0 0 0%)" : "inset(0 0% 0 0)",
          duration: revealDuration,
          ease: "power3.out",
          stagger: stripStagger,
        },
        0
      );

      tl.fromTo(
        zooms,
        { scale: zoomFrom },
        {
          scale: 1,
          duration: zoomDuration,
          ease: "power3.out",
        },
        0
      );

      // Bar slides toward the incoming fill.
      if (progressRef.current) {
        tl.to(
          progressRef.current,
          {
            scaleX: (incoming + 1) / total,
            duration: PROGRESS_DURATION,
            ease: "power3.inOut",
          },
          0
        );
      }

      // Outgoing caption texts fade out under the strips.
      const outgoing = [
        captionRef.current,
        titleRef.current,
        counterRef.current,
      ].filter(Boolean);
      if (outgoing.length) {
        tl.to(
          outgoing,
          {
            autoAlpha: 0,
            y: -2,
            duration: 0.35,
            ease: "power2.in",
          },
          0.15
        );
        tl.add(() => setCaption(incoming), 0.5);
      }
    },
    {
      dependencies: [
        incoming,
        direction,
        stripCount,
        revealDuration,
        stripStagger,
        zoomFrom,
        zoomDuration,
      ],
      scope: rootRef,
    }
  );

  // Revert the split before React commits the new title.
  useLayoutEffect(() => {
    splitRef.current?.revert();
    splitRef.current = null;
  }, [caption]);

  // Incoming caption reveal: title chars, chapter fade, counter number.
  useGSAP(
    () => {
      if (isFirstCaption.current) {
        isFirstCaption.current = false;
        return;
      }
      if (!captionRef.current || !titleRef.current) return;

      // Snap back what the outgoing tween hid.
      gsap.set([captionRef.current, titleRef.current], { autoAlpha: 1, y: 0 });

      if (prefersReducedMotion()) {
        gsap.set(
          [
            chapterRef.current,
            titleRef.current,
            counterRef.current,
            counterNumRef.current,
          ],
          { autoAlpha: 1, y: 0, yPercent: 0 }
        );
        return;
      }

      // Chars only — no line/mask wrappers that shift metrics.
      const split = new SplitText(titleRef.current, { type: "chars" });
      splitRef.current = split;

      const tl = gsap.timeline({
        // Restore plain <h2> once the reveal is done.
        onComplete: () => {
          split.revert();
          if (splitRef.current === split) splitRef.current = null;
        },
      });

      // Title: char stagger up from below the clip.
      tl.from(
        split.chars,
        {
          yPercent: TITLE_CHAR_Y_PERCENT,
          duration: TITLE_CHAR_DURATION,
          ease: "power2.out",
          stagger: TITLE_CHAR_STAGGER,
        },
        0
      );

      // Chapter: fade only.
      if (chapterRef.current) {
        tl.fromTo(
          chapterRef.current,
          { autoAlpha: 0, y: 0 },
          { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" },
          0
        );
      }

      // Counter: fade block, lift just the number.
      if (counterRef.current) {
        tl.fromTo(
          counterRef.current,
          { autoAlpha: 0, y: 0 },
          { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out" },
          0
        );
      }
      if (counterNumRef.current) {
        tl.from(
          counterNumRef.current,
          {
            yPercent: 110,
            duration: 0.55,
            ease: "power3.out",
          },
          0
        );
      }
    },
    { dependencies: [caption], scope: rootRef }
  );

  // Drop the last live split on unmount.
  useGSAP(
    () => () => {
      splitRef.current?.revert();
      splitRef.current = null;
    },
    { scope: rootRef }
  );

  // Circular cursor: smooth follow + arrow that flips with the pointer side.
  useEffect(() => {
    if (!showControls || isCoarsePointer) return;
    const cursor = cursorRef.current;
    const l1 = line1Ref.current;
    const l2 = line2Ref.current;
    if (!cursor || !l1 || !l2) return;

    gsap.set(cursor, { xPercent: -50, yPercent: -50, opacity: 0, scale: 0.6 });
    gsap.set(l1, {
      transformOrigin: "100% 50%",
      xPercent: -50,
      yPercent: -50,
      y: -1.5,
      rotation: 45,
      x: 0,
    });
    gsap.set(l2, {
      transformOrigin: "100% 50%",
      xPercent: -50,
      yPercent: -50,
      y: 1.5,
      rotation: -45,
      x: 0,
    });

    let currentSide: "left" | "right" = "right";
    let rafId: number | null = null;

    const handleMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      const target = e.target instanceof Element ? e.target : null;
      const isOverControls = Boolean(
        target?.closest(
          'button, input, textarea, select, a, label, [role="button"], [contenteditable="true"], [class*="remixer-panel"]'
        )
      );

      mouse.current.x = x;
      mouse.current.y = y;

      const rect = rootRef.current?.getBoundingClientRect();
      const isOut =
        !rect ||
        x <= rect.left ||
        y <= rect.top ||
        x >= rect.right ||
        y >= rect.bottom;

      if (isOut || isOverControls) {
        if (isInside.current) {
          isInside.current = false;
          gsap.to(cursor, {
            opacity: 0,
            scale: 0.6,
            duration: 0.25,
            ease: "power3.inOut",
          });
        }
        return;
      }

      if (!isInside.current) {
        pos.current.x = x;
        pos.current.y = y;
        gsap.set(cursor, { x, y });
        gsap.to(cursor, {
          opacity: 1,
          scale: 1,
          duration: 0.25,
          ease: "power3.out",
        });
        isInside.current = true;
      }

      const isLeft = rect ? x < rect.left + rect.width / 2 : false;
      const nextSide = isLeft ? "left" : "right";

      if (nextSide !== currentSide) {
        currentSide = nextSide;
        if (nextSide === "left") {
          gsap.to(l1, {
            rotation: 135,
            x: "-1vw",
            duration: 0.35,
            ease: "power3.inOut",
          });
          gsap.to(l2, {
            rotation: -135,
            x: "-1vw",
            duration: 0.35,
            ease: "power3.inOut",
          });
        } else {
          gsap.to(l1, {
            rotation: 45,
            x: 4,
            duration: 0.35,
            ease: "power3.inOut",
          });
          gsap.to(l2, {
            rotation: -45,
            x: 4,
            duration: 0.35,
            ease: "power3.inOut",
          });
        }
      }
    };

    const render = () => {
      pos.current.x += (mouse.current.x - pos.current.x) * 0.12;
      pos.current.y += (mouse.current.y - pos.current.y) * 0.12;
      gsap.set(cursor, { x: pos.current.x, y: pos.current.y });
      rafId = requestAnimationFrame(render);
    };

    window.addEventListener("mousemove", handleMove);
    render();

    return () => {
      window.removeEventListener("mousemove", handleMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [showControls, isCoarsePointer]);

  const renderStrips = (slide: Slide) => {
    const width = 100 / stripCount;

    return Array.from({ length: stripCount }, (_, i) => (
      <div
        key={i}
        ref={(el) => {
          if (el) stripsRef.current[i] = el;
        }}
        className="absolute inset-y-0 overflow-hidden"
        style={{
          left: `${i * width}%`,
          width: `${width}%`,
          // Cover the seam between neighbours.
          marginLeft: i === 0 ? 0 : "-0.5px",
          paddingLeft: i === 0 ? 0 : "0.5px",
        }}
      >
        {/* Full-width image pulled back by this strip's offset. */}
        <div
          className="absolute inset-y-0"
          style={{
            left: `-${i * 100}%`,
            width: `${stripCount * 100}%`,
          }}
        >
          <div
            ref={(el) => {
              if (el) zoomRef.current[i] = el;
            }}
            className="relative h-full w-full will-change-transform"
          >
            <img
              src={slide.src}
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full select-none object-cover"
            />
          </div>
        </div>
      </div>
    ));
  };

  const activeSlide = slides[caption];
  const stacked = isCoarsePointer;

  return (
    <div
      ref={rootRef}
      style={{ backgroundColor }}
      className={`parallax-strip-slider relative h-full w-full overflow-hidden ${className}`}
    >
      {/* Outgoing slide, revealed away underneath. */}
      <div className="absolute inset-0">
        <img
          src={slides[current].src}
          alt={slides[current].title}
          draggable={false}
          className="absolute inset-0 h-full w-full select-none object-cover"
        />
      </div>

      {/* Incoming slide, mounted only during a transition. */}
      {incoming !== null && (
        <div className="absolute inset-0">{renderStrips(slides[incoming])}</div>
      )}

      {/* Click-to-navigate overlay: left half steps back, right half advances. */}
      {showControls && total > 1 && (
        <div
          className="absolute inset-0 z-20"
          style={{ cursor: stacked ? "pointer" : "none" }}
          onClick={(e) => {
            if (isAnimating.current) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const isLeft = e.clientX < rect.left + rect.width / 2;
            if (isLeft) onPrev();
            else onNext();
          }}
        />
      )}

      {/* Top progress bar, floating over the image. */}
      {showProgressBar && (
        <div
          className="pointer-events-none absolute inset-x-6 top-6 z-10 h-px sm:inset-x-10 sm:top-8"
          style={{ backgroundColor: `${accentColor}33` }}
        >
          <div
            ref={progressRef}
            className="h-full w-full origin-left"
            style={{
              transform: `scaleX(${(caption + 1) / total})`,
              backgroundColor: accentColor,
            }}
          />
        </div>
      )}

      {/* Top-left label */}
      <div
        ref={captionRef}
        className="pointer-events-none absolute inset-x-0 top-0 px-6 pt-12 sm:px-10 sm:pt-16"
      >
        <span
          ref={chapterRef}
          className="block text-xs font-medium tracking-wide"
          style={{ color: accentColor }}
        >
          {activeSlide.chapter ??
            `Collection ${String(caption + 1).padStart(2, "0")}`}
        </span>
      </div>

      {/* Bottom bar: three fixed thirds on one line for mouse; stacked column
          with the title + counter grouped for touch. */}
      <div
        className={`absolute inset-x-0 bottom-0 flex px-6 pb-10 sm:px-10 ${
          stacked
            ? "flex-col items-stretch gap-5 pb-24"
            : "items-end"
        }`}
      >
        <h2
          ref={titleRef}
          className={`pointer-events-none flex items-end overflow-hidden text-6xl leading-none sm:text-7xl lg:text-8xl ${
            stacked ? "order-2 w-full" : "w-1/3 shrink-0"
          }`}
          style={{
            fontFamily: '"Instrument Serif", Georgia, serif',
            color: accentColor,
          }}
        >
          {activeSlide.title}
        </h2>

        {/* Middle third keeps its width so the counter stays pinned right. */}
        {!stacked && <div aria-hidden className="w-1/3 shrink-0" />}

        {showCounter && (
          <span
            ref={counterRef}
            className={`pointer-events-none flex shrink-0 items-center text-xs ${
              stacked
                ? "order-1 w-full justify-end"
                : "h-full w-1/3 justify-end py-5"
            }`}
            style={{ color: `${accentColor}b3` }}
          >
            {/* Fixed-width clip so the number can lift in without reflow. */}
            <span className="inline-block w-[2ch] overflow-hidden text-right">
              <span ref={counterNumRef} className="inline-block">
                {String(caption + 1).padStart(2, "0")}
              </span>
            </span>
            <span> / {String(total).padStart(2, "0")}</span>
          </span>
        )}
      </div>

      {/* Circular nav cursor — follows the pointer, arrow flips per side. */}
      {showControls && total > 1 && !isCoarsePointer && (
        <div
          ref={cursorRef}
          className="pointer-events-none fixed left-0 top-0 z-[100]"
        >
          <div
            className="flex size-15 items-center justify-center rounded-full"
            style={{ backgroundColor: accentColor }}
          >
            <div className="relative size-7.5">
              <span
                ref={line1Ref}
                className="absolute left-1/2 top-1/2 h-0.5 w-4"
                style={{ backgroundColor: "#000000" }}
              />
              <span
                ref={line2Ref}
                className="absolute left-1/2 top-1/2 h-0.5 w-4"
                style={{ backgroundColor: "#000000" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
