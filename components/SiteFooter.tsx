import { CONTACT, ROUTES } from "@/config/site";
import PageLink from "./PageLink";

/**
 * The end of every page.
 *
 * Deliberately quiet and unanimated. A site this full of motion needs somewhere
 * for it to stop, and the footer is where a visitor goes when they have decided
 * something and want a phone number — the worst possible moment to make them
 * wait for a reveal.
 */
export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brandCol">
          <p className="footer__brand">
            <img
              src="/Logo/wash%20zone%20logo.png"
              alt="Wash Zone Logo"
              className="siteNav__logoImg"
              width={30}
              height={30}
              style={{ display: "inline-block", verticalAlign: "middle", marginRight: "0.5rem" }}
            />
            Wash<span>Zone</span>
          </p>
          <p className="footer__line">
            Collected, cleaned, pressed and returned. Usually within 24 hours.
          </p>
          <p className="footer__line footer__line--faint">{CONTACT.hours}</p>
        </div>

        <nav className="footer__nav" aria-label="Footer">
          <h2 className="footer__title">Pages</h2>
          <ul>
            {ROUTES.map((route) => (
              <li key={route.href}>
                <PageLink href={route.href}>{route.label}</PageLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer__nav">
          <h2 className="footer__title">Get in touch</h2>
          <ul>
            <li>
              <a href={CONTACT.phoneHref}>{CONTACT.phoneLabel}</a>
            </li>
            <li>
              <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer__base">
        <p>© {new Date().getFullYear()} Wash Zone. All rights reserved.</p>
        <p className="footer__credit">
          Film scrubbed frame by frame, 239 frames, at whatever speed you scroll.
        </p>
      </div>
    </footer>
  );
}
