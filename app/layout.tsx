import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import SmoothScroller from "@/components/SmoothScroller";
import AOSInit from "@/components/AOSInit";
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
  title: "Wash Zone — Laundry, off your hands",
  description:
    "Book a pickup, and we collect, sort, wash, press, fold and deliver. A cinematic look at how Wash Zone handles every order, from your door and back again.",
};

export const viewport: Viewport = {
  themeColor: "#104b87",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${jakarta.variable}`}>
      <body suppressHydrationWarning>
        <AOSInit />
        <SmoothScroller>{children}</SmoothScroller>
      </body>
    </html>
  );
}

