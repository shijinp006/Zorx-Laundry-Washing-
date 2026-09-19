"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ComponentProps } from "react";
import { navDirection } from "@/config/site";

type LinkProps = ComponentProps<typeof Link>;

/**
 * A `next/link` that tells the view transition which way it is going.
 *
 * `transitionTypes` is what `PageView` keys its enter/exit classes off, so a
 * link that skips this component navigates without a directional slide. Every
 * in-site link should be one of these; a plain `<Link>` is the way to opt out on
 * purpose.
 *
 * The direction comes from where the target sits in `ROUTES` relative to the
 * page you are on, so the same link slides forward from the film and back from
 * contact — which is what makes the site feel like a place with an order to it
 * rather than a set of pages.
 */
export default function PageLink({
  href,
  children,
  ...rest
}: LinkProps & { href: string }) {
  const pathname = usePathname();

  return (
    <Link href={href} transitionTypes={[navDirection(pathname, href)]} {...rest}>
      {children}
    </Link>
  );
}
