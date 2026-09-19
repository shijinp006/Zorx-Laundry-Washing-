import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import AmbientBackground from "@/components/AmbientBackground";
import FooterReveal from "@/components/FooterReveal";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import SiteNav from "@/components/SiteNav";
import SmoothScroller from "@/components/SmoothScroller";
import WhatsAppButton from "@/components/WhatsAppButton";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Wash Zone — Laundry, off your hands",
    template: "%s — Wash Zone",
  },
  description:
    "Book a pickup, and we collect, sort, wash, press, fold and deliver. A cinematic look at how Wash Zone handles every order, from your door and back again.",
};

export const viewport: Viewport = {
  themeColor: "#104b87",
};

/**
 * Everything that survives a navigation lives here.
 *
 * The nav, the ambient background, the progress hairline, the footer and the
 * WhatsApp button are all in the layout on purpose: a layout is not re-mounted
 * between routes, so they are the fixed frame the pages slide inside. That is
 * also why no `<ViewTransition>` appears in this file — a layout never enters or
 * exits, so its enter/exit animations could never fire. The directional wrapper
 * belongs in each `page.tsx` (see `components/PageView.tsx`).
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${jakarta.variable}`}>
      <body suppressHydrationWarning>
        {/*
          Motion renders its `initial` state into the server HTML, which is what
          makes the entrances seamless — and what would leave every headline and
          card at opacity 0 for a visitor whose scripts never ran. The canvas film
          genuinely needs JavaScript, but the words do not, so without it every
          element Motion parked is forced visible. The selector matches the inline
          style Motion writes, so it needs no cooperation from the components.
        */}
        <noscript>
          <style>{`[style*="opacity:0"]{opacity:1!important;transform:none!important;filter:none!important}`}</style>
        </noscript>

        <a className="skipLink" href="#main">
          Skip to content
        </a>

        <SmoothScroller>
          <AmbientBackground />
          <ScrollProgressBar />
          <SiteNav />

          <main id="main">{children}</main>

          <FooterReveal />
          <WhatsAppButton />
        </SmoothScroller>
      </body>
    </html>
  );
}
