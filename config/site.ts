/**
 * The site's routes, in order.
 *
 * The order is not cosmetic: it decides which way a view transition slides.
 * Moving to a later route reads as going forward, moving to an earlier one as
 * coming back, which is the convention `PageLink` and `PageView` implement (see
 * `components/PageView.tsx`). Reorder this and the whole site's directional
 * motion follows.
 */
export interface Route {
  href: string;
  label: string;
  /** Sub-label in the mobile sheet, where there is room to say more. */
  blurb: string;
}

export const ROUTES: Route[] = [
  { href: "/", label: "Home", blurb: "The whole journey, in one scroll" },
  { href: "/services", label: "Services", blurb: "What we wash, press and restore" },
  { href: "/process", label: "Process", blurb: "Six steps, door to door" },
  { href: "/pricing", label: "Pricing", blurb: "Plans and per-item rates" },
  { href: "/contact", label: "Contact", blurb: "Book a pickup in 60 seconds" },
];

export const routeIndex = (href: string) =>
  ROUTES.findIndex((r) => r.href === href);

/**
 * Which direction a navigation from `from` to `to` travels.
 *
 * Anything off the map (a deep link, a 404) counts as forward: a slide in the
 * reading direction is the safe default, and it is what a first visit to a page
 * should feel like.
 */
export function navDirection(from: string, to: string): "nav-forward" | "nav-back" {
  const a = routeIndex(from);
  const b = routeIndex(to);
  if (a === -1 || b === -1) return "nav-forward";
  return b < a ? "nav-back" : "nav-forward";
}

export const CONTACT = {
  phoneLabel: "+1 (555) 019-4477",
  phoneHref: "tel:+15550194477",
  whatsapp: "15551234567",
  whatsappPrefill: "Hi Wash Zone — I'd like to book a pickup.",
  email: "hello@washzone.example",
  hours: "Pickups 7am–9pm, seven days",
};

export const whatsappHref = () =>
  `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(
    CONTACT.whatsappPrefill
  )}`;
