import PageLink from "@/components/PageLink";
import Reveal from "@/components/ui/Reveal";
import SpotlightCard from "@/components/ui/SpotlightCard";
import StatCounter from "@/components/ui/StatCounter";

/**
 * Where the film hands over.
 *
 * The runway above this ends on the brand lockup, which is a good ending for a
 * film and a dead end for a website. This is the landing: the same three
 * promises the film makes, in words you can act on, and the two links that leave
 * the page. It is also the first content on the site that scrolls normally
 * rather than being scrubbed, which is the signal that the film is over.
 */

const PROMISES = [
  {
    title: "Collection within 2 hours",
    body: "Book before 7pm and a driver is at your door the same evening. You get a name, a photo and a live arrival window.",
    tag: "Doorstep",
  },
  {
    title: "Sorted by fabric, not by batch",
    body: "Every order is separated by colour, weight and care label before anything is washed. Delicates never share a drum with denim.",
    tag: "In the plant",
  },
  {
    title: "Back on hangers in 24 hours",
    body: "Pressed, folded and wrapped, returned to the same door at a slot you choose. Nothing to sign, nothing to collect.",
    tag: "Return",
  },
];

export default function HomeOutro() {
  return (
    <section className="section section--outro" aria-labelledby="outro-title">
      <div className="shell">
        <Reveal className="section__head">
          <p className="eyebrow">After the credits</p>
          <h2 className="h2" id="outro-title">
            Everything you just watched,
            <br />
            available from tonight.
          </h2>
          <p className="lede">
            The film is ninety seconds of a service that runs every day across
            thirty-eight neighbourhoods. Here is the short version, without the
            soundtrack.
          </p>
        </Reveal>

        <ul className="cards cards--three">
          {PROMISES.map((promise, i) => (
            <Reveal as="li" key={promise.title} delay={i * 0.08}>
              <SpotlightCard className="card">
                <p className="card__tag">{promise.tag}</p>
                <h3 className="h3">{promise.title}</h3>
                <p className="body">{promise.body}</p>
              </SpotlightCard>
            </Reveal>
          ))}
        </ul>

        <Reveal className="stats">
          <StatCounter value={24} suffix="h" label="Average turnaround" />
          <StatCounter value={4.9} decimals={1} label="Rating, 1,842 reviews" />
          <StatCounter value={38} label="Neighbourhoods covered" />
          <StatCounter value={0} prefix="€" label="Collection and return" />
        </Reveal>

        <Reveal className="ctaRow">
          <PageLink href="/contact" className="btn btn--primary">
            Book a pickup
          </PageLink>
          <PageLink href="/services" className="btn btn--ghost">
            See what we wash
          </PageLink>
        </Reveal>
      </div>
    </section>
  );
}
