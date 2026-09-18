"use client";

import { SCENES } from "@/config/scenes";

/**
 * The flat, always-readable version of the film's narrative, for screen readers
 * and crawlers.
 *
 * `SceneText` draws the real copy over the canvas, but every one of its blocks
 * is `aria-hidden` and spends most of the scroll at opacity 0 — a crawler would
 * see a canvas and nothing else. This mirrors the same scene copy as ordinary
 * flowing text, in order.
 *
 * It reads from `config/scenes.ts` for a reason: this used to mirror the older
 * `lib/beats.ts` copy, which meant the accessible text said something different
 * from what was on screen. One source of truth avoids that drifting again.
 */
export default function StoryLayer() {
  return (
    <div className="sr-only">
      <h1>Wash Zone — premium laundry collection, cleaning and delivery</h1>
      {SCENES.map((scene) => (
        <section key={scene.id}>
          <h2>{scene.headline.replace(/\n/g, " ")}</h2>
          {scene.description ? <p>{scene.description}</p> : null}
        </section>
      ))}
    </div>
  );
}
