import { SCENES } from "@/config/scenes";

/**
 * The film, as text.
 *
 * The homepage is five `<canvas>` elements being redrawn at scroll position. To
 * a screen reader that is five unlabelled elements, and to a crawler it is
 * nothing at all — the commercial's captions are pixels, not characters, so the
 * words burned into the picture are unreadable to both.
 *
 * This mirrors them as flowing text, in film order, inside an `sr-only` block.
 *
 * It deliberately uses no headings. Each scroll chapter already contributes an
 * `<h2>`, and an earlier version of this gave every scene one too — which put
 * thirteen `<h2>`s in the outline, five of them describing the same stages as
 * the chapters underneath. Heading navigation is how a screen reader user skims
 * a page, so a transcript that doubles the outline makes the page harder to use,
 * not easier. A definition list carries the same content and stays out of the
 * way.
 */
export default function StoryLayer() {
  return (
    <div className="sr-only">
      <h1>Wash Zone — premium laundry collection, cleaning and delivery</h1>
      <p>
        This page tells its story with a film that plays as you scroll. The film
        is captioned in eight stages; those captions and what each one shows are
        transcribed below, and the same story is written out in full in the five
        sections that follow.
      </p>
      <dl>
        {SCENES.map((scene) => (
          <div key={scene.id}>
            <dt>
              {scene.headline}
              {scene.description ? ` — ${scene.description}` : ""}
            </dt>
            <dd>{scene.note}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
