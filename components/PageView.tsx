import { ReactNode, ViewTransition } from "react";

/**
 * The directional wrapper every page's content sits in.
 *
 * React's `<ViewTransition>` drives the browser's View Transitions API: React
 * pairs the old and new snapshots of a transition, and the `enter`/`exit` props
 * name the CSS class each one gets. The classes are styled in `globals.css`
 * under `::view-transition-old(.nav-forward)` and friends.
 *
 * `default: "none"` matters. Without it, every navigation-shaped update —
 * browser back, `router.refresh()`, a Suspense reveal — would slide the page,
 * including ones that have no direction. Only navigations that a `PageLink`
 * tagged with a transition type animate.
 *
 * This has to be used inside `page.tsx`, never in a layout. Layouts persist
 * across navigations, so their children mount and unmount but the layout itself
 * never enters or exits — the enter and exit animations would never fire.
 */
const DIRECTIONAL = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "none",
};

export default function PageView({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={DIRECTIONAL} exit={DIRECTIONAL} default="none">
      {children}
    </ViewTransition>
  );
}
