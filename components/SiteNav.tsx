"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useLenis } from "lenis/react";
import { ROUTES } from "@/config/site";
import PageLink from "./PageLink";

/**
 * The one piece of chrome that survives every navigation.
 *
 * Two things make it read as premium rather than as a menu bar:
 *
 *   - It is anchored through the view transition. `viewTransitionName:
 *     site-header` plus the `animation: none` rules in globals.css mean the
 *     header is *not* snapshotted and slid with the page. It stays put while the
 *     content moves under it, which is the fixed reference point that tells the
 *     viewer the content changed and not the whole viewport.
 *   - The active pill is a shared layout animation (`layoutId`). Because this
 *     component lives in the root layout it is never unmounted, so when the
 *     route changes Motion animates the pill from the old item to the new one
 *     while the page itself slides. One element moving between two labels says
 *     "you are here now" far better than a colour swap.
 *
 * It stays put at every scroll position and only changes surface: transparent
 * over the opening frame, glass once there is picture behind it. See the scroll
 * handler below for why it does not hide.
 */
export default function SiteNav() {
  const pathname = usePathname();
  const lenis = useLenis();
  const { scrollY } = useScroll();

  const [lifted, setLifted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // The scroll handler runs on every frame of every scroll, on a page that is
  // also drawing a frame sequence. Setting state to the value it already holds
  // is a bailout rather than a free operation, so the flag is compared against a
  // ref first and React is only told when something really changed.
  const liftedRef = useRef(false);
  const menuOpenRef = useRef(false);
  menuOpenRef.current = menuOpen;
  const closeRef = useRef<HTMLButtonElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // The bar never hides. On a page whose whole job is a scroll-driven film, the
  // one thing that must not move is the thing you navigate with — a header that
  // slides away on the way down and back on the way up turns every change of
  // direction into a flicker, and it is exactly the scroll direction people
  // change most while scrubbing a film back and forth. All that changes is the
  // surface: transparent over the picture, glass once there is content behind it.
  useMotionValueEvent(scrollY, "change", (y) => {
    const next = y > 24;
    if (liftedRef.current === next) return;
    liftedRef.current = next;
    setLifted(next);
  });

  // The route changed, so the sheet's job is done.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Hold the page still behind the sheet, and give the keyboard a way out.
  useEffect(() => {
    if (!menuOpen) return;
    lenis?.stop();
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      lenis?.start();
    };
  }, [menuOpen, lenis]);

  return (
    <motion.header
      className={`siteNav${lifted ? " is-lifted" : ""}`}
      style={{ viewTransitionName: "site-header" }}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="siteNav__inner">
        <PageLink href="/" className="siteNav__brand" aria-label="Wash Zone, home">
          <img
            src="/Logo/wash%20zone%20logo.png"
            alt="Wash Zone Logo"
            className="siteNav__logoImg"
            width={34}
            height={34}
          />
          Wash<span className="siteNav__brandAccent">Zone</span>
        </PageLink>

        <nav className="siteNav__links" aria-label="Pages">
          {ROUTES.map((route) => {
            const isActive = pathname === route.href;
            return (
              <PageLink
                key={route.href}
                href={route.href}
                className={`siteNav__link${isActive ? " is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <motion.span
                    className="siteNav__pill"
                    layoutId="siteNavPill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="siteNav__linkLabel">{route.label}</span>
              </PageLink>
            );
          })}
        </nav>

        <div className="siteNav__actions">
          <PageLink href="/contact" className="btn btn--primary btn--sm siteNav__cta">
            Book a pickup
          </PageLink>

          <button
            ref={toggleRef}
            type="button"
            className="siteNav__toggle"
            aria-expanded={menuOpen}
            aria-controls="siteNavSheet"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="sr-only">
              {menuOpen ? "Close menu" : "Open menu"}
            </span>
            <span className="siteNav__toggleBars" aria-hidden="true">
              <motion.span animate={{ rotate: menuOpen ? 45 : 0, y: menuOpen ? 4 : 0 }} />
              <motion.span animate={{ rotate: menuOpen ? -45 : 0, y: menuOpen ? -4 : 0 }} />
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="siteNavSheet"
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
          >
            <motion.div
              className="sheet__panel"
              initial={{ y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0, transition: { duration: 0.16 } }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="sheet__head">
                <div className="sheet__brandWrap">
                  <img
                    src="/Logo/wash%20zone%20logo.png"
                    alt="Wash Zone Logo"
                    className="siteNav__logoImg"
                    width={28}
                    height={28}
                  />
                  <p className="sheet__eyebrow">Wash Zone</p>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  className="sheet__close"
                  onClick={() => {
                    setMenuOpen(false);
                    toggleRef.current?.focus();
                  }}
                >
                  <span className="sr-only">Close menu</span>
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      d="M6 6l12 12M18 6L6 18"
                    />
                  </svg>
                </button>
              </div>

              <ul className="sheet__list">
                {ROUTES.map((route, i) => (
                  <motion.li
                    key={route.href}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * i + 0.05, duration: 0.3 }}
                  >
                    <PageLink
                      href={route.href}
                      className={`sheet__link${
                        pathname === route.href ? " is-active" : ""
                      }`}
                      aria-current={pathname === route.href ? "page" : undefined}
                    >
                      <span className="sheet__index" aria-hidden="true">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>
                        <strong>{route.label}</strong>
                        <em>{route.blurb}</em>
                      </span>
                    </PageLink>
                  </motion.li>
                ))}
              </ul>

              <div className="sheet__actionWrap">
                <PageLink href="/contact" className="btn btn--primary btn--full sheet__ctaBtn">
                  Book a pickup
                </PageLink>
              </div>
            </motion.div>

            <button
              type="button"
              className="sheet__scrim"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => setMenuOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
