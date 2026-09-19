import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root: a stray package-lock.json in the user's home
  // directory would otherwise make Turbopack infer C:\Users\shiji as the root.
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
  // Keep the dev overlay badge off the cinematic stage. Compile and runtime
  // errors are still surfaced in the terminal and the browser console.
  devIndicators: false,

  async headers() {
    return [
      {
        // The frame sequence is immutable build output: a given
        // /frames/vN/frame-NNNNN.webp never changes content, it is only ever
        // replaced wholesale by a re-run of scripts/extract-frames.ps1. Caching
        // it for a year means a repeat visitor scrubs the whole animation with
        // no network at all.
        //
        // THE VERSION SEGMENT IS NOT OPTIONAL. `immutable` tells the browser not
        // to revalidate even on reload, so re-extracting the film over the same
        // URLs strands every previous visitor on the old footage for a year.
        // That is exactly what happened when the 30-second film replaced the
        // 10-second one: the page kept playing the old commercial out of cache.
        // Bump FRAME_VERSION in lib/story.ts and output to the matching
        // directory on every re-extraction.
        //
        // `:frame*` matches any depth, so it covers /frames/v2/... and whatever
        // version comes after it without editing this rule.
        source: "/frames/:frame*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
