"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  CHAPTERS,
  SectionId,
  chapterFromProgress,
  progressFromFrame,
} from "@/lib/story";
import { useScrollEngine, useScrollProgress } from "./ScrollEngine";

/**
 * Floating glass navigation whose active item is derived from the same scroll
 * progress that drives the frames. Clicking scrolls the runway to that
 * chapter's frames — the sequence keeps playing through, it never cuts away.
 */
export default function Navbar() {
  const { scrollToProgress } = useScrollEngine();
  const [active, setActive] = useState<SectionId>("home");
  const activeRef = useRef<SectionId>("home");

  useScrollProgress((progress) => {
    const id = chapterFromProgress(progress).id;
    if (id !== activeRef.current) {
      activeRef.current = id;
      setActive(id);
    }
  });

  const go = (id: SectionId) => {
    const chapter = CHAPTERS.find((c) => c.id === id);
    if (!chapter) return;
    // Land on the chapter's chosen frame, so a click always arrives on the
    // same image. `progressFromFrame` is the exact inverse of the mapping the
    // canvas draws with, so the frame that lands is the frame named.
    scrollToProgress(progressFromFrame(chapter.landingFrame));
  };

  return (
    <motion.header
      className="nav"
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      data-aos="fade-down"
    >
      <Link
        className="nav__brand"
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          go("home");
        }}
      >
        <motion.span
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{ display: "inline-block" }}
        >
          Wash<span>Zone</span>
        </motion.span>
      </Link>

      <nav className="nav__links" aria-label="Chapters">
        {CHAPTERS.map((chapter) => {
          const isActive = active === chapter.id;
          return (
            <motion.button
              key={chapter.id}
              type="button"
              className={`nav__link${isActive ? " is-active" : ""}`}
              aria-current={isActive ? "true" : undefined}
              onClick={() => go(chapter.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {chapter.label}
              {isActive && (
                <motion.div
                  className="nav__active-pill"
                  layoutId="activePill"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>
    </motion.header>
  );
}

