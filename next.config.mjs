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
        // The frame sequence is immutable build output: a given frame-NNNNN.webp
        // never changes content, it is only ever replaced wholesale by a re-run
        // of scripts/extract-frames.ps1. Caching it for a year means a repeat
        // visitor scrubs the whole animation with no network at all.
        //
        // If the video is ever re-extracted, the frames keep their names, so
        // bump a version segment in FRAME_PATH (lib/story.ts) rather than
        // relying on cache expiry.
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
