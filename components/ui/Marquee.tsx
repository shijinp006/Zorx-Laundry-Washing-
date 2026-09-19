/**
 * An endless ticker of the things we actually take.
 *
 * Pure CSS: two identical copies of the list translated by -50%, which is the
 * standard seamless loop. It is not a Motion animation on purpose — a marquee
 * runs for as long as the page is open, and Motion animations are driven from
 * the same frame loop as the scroll-scrubbed canvas. A CSS animation on a
 * transform runs on the compositor and never competes with a draw.
 *
 * The second copy is `aria-hidden`: a screen reader should read the list once,
 * not twice, and it is a decorative restatement of the services below it anyway.
 * The whole strip stops moving under `prefers-reduced-motion` (see globals.css).
 */
export default function Marquee({ items }: { items: string[] }) {
  return (
    <div className="marquee">
      <div className="marquee__track">
        <ul className="marquee__row">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <ul className="marquee__row" aria-hidden="true">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
