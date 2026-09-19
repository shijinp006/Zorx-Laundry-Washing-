"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export interface AccordionItem {
  q: string;
  a: string;
}

/**
 * A disclosure list for the questions a first-time customer actually asks.
 *
 * Built on a real `<button>` per row with `aria-expanded` and an `aria-labelledby`
 * region, so it works from the keyboard and announces state. Only one panel is
 * open at a time, which keeps the page height predictable while scroll-driven
 * animations are running elsewhere on it.
 *
 * `height: auto` is animated rather than a fixed max-height, so a long answer is
 * never clipped. That is a layout-animating property and the one place on the
 * site it is allowed: it happens on a click, once, not under the scroll.
 */
export default function Accordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();

  return (
    <div className="accordion">
      {items.map((item, i) => {
        const isOpen = open === i;
        const panelId = `${base}-panel-${i}`;
        const buttonId = `${base}-button-${i}`;

        return (
          <div className={`accordion__row${isOpen ? " is-open" : ""}`} key={item.q}>
            <h3 className="accordion__heading">
              <button
                id={buttonId}
                type="button"
                className="accordion__trigger"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                <span>{item.q}</span>
                <motion.span
                  className="accordion__icon"
                  aria-hidden="true"
                  animate={{ rotate: isOpen ? 135 : 0 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      d="M12 5v14M5 12h14"
                    />
                  </svg>
                </motion.span>
              </button>
            </h3>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="accordion__panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p>{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
