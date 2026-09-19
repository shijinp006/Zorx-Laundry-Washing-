"use client";

import { ReactNode, useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

/**
 * A section's extra detail, folded away until it is asked for.
 *
 * The reveal is two animations layered on one another, which is what stops it
 * reading as a box being resized:
 *
 *   - the container animates `height: auto`, so the page makes room for exactly
 *     as much content as there is and nothing is ever clipped;
 *   - the content inside staggers its own children in behind that, 60ms apart,
 *     so the block assembles as the space opens rather than appearing whole in a
 *     gap that was already there.
 *
 * Closing reverses it at roughly half the duration and without the stagger.
 * Leaving should be quicker than arriving — the viewer has already decided.
 *
 * Height is a layout-animating property, which is normally the thing to avoid.
 * It is fine here for the reason the scroll animations are not: this runs once,
 * on a click, not on every frame of a scroll.
 */

export const revealGroup = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.06, delayChildren: 0.12 } },
};

export const revealItem = {
  hidden: { opacity: 0, y: 22 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function ShowMore({
  label,
  closeLabel = "Show less",
  children,
}: {
  label: string;
  closeLabel?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const panelId = `${id}-panel`;

  return (
    <div className="showMore">
      <button
        type="button"
        className={`showMore__trigger${open ? " is-open" : ""}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{open ? closeLabel : label}</span>
        <motion.span
          className="showMore__chevron"
          aria-hidden="true"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 9l6 6 6-6"
            />
          </svg>
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            className="showMore__panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { duration: 0.34, ease: [0.4, 0, 1, 1] },
                opacity: { duration: 0.18 },
              },
            }}
            transition={{
              height: { duration: 0.58, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 0.32, delay: 0.06 },
            }}
          >
            <motion.div
              className="showMore__inner"
              variants={revealGroup}
              initial="hidden"
              animate="shown"
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
