import type { Metadata } from "next";
import { STRIPS } from "@/config/strips";
import FilmStrip from "@/components/FilmStrip";
import PageLink from "@/components/PageLink";
import PageView from "@/components/PageView";
import Marquee from "@/components/ui/Marquee";
import Reveal from "@/components/ui/Reveal";
import SpotlightCard from "@/components/ui/SpotlightCard";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Wash and fold, dry cleaning, ironing and pressing, bedding and curtains, sportswear and sneakers, repairs and restoration — collected from your door and returned within 24 hours.",
};

const TICKER = [
  "Shirts",
  "Suits",
  "Bedding",
  "Curtains",
  "Denim",
  "Silk",
  "Cashmere",
  "Sportswear",
  "Sneakers",
  "Coats",
  "Table linen",
  "Uniforms",
];

/**
 * A bento grid rather than equal cards: the two services most people book carry
 * the most weight on the page, which a six-up grid of identical tiles cannot say.
 */
const SERVICES = [
  {
    id: "wash-fold",
    name: "Wash & fold",
    size: "wide",
    price: "from €2.40 / kg",
    body: "Everyday laundry, separated by colour and fabric weight, washed at the temperature the care label asks for and folded flat. Returned in a sealed, reusable bag.",
    points: ["Sorted by fabric", "Hypoallergenic detergent option", "Folded or on hangers"],
  },
  {
    id: "dry-cleaning",
    name: "Dry cleaning",
    size: "tall",
    price: "from €6.90 / item",
    body: "Solvent cleaning for tailoring, silk, wool and anything lined. Every piece is inspected, spot-treated and finished by hand before it is wrapped.",
    points: ["Hand finishing", "Stain pre-treatment", "Suit and dress bags"],
  },
  {
    id: "ironing",
    name: "Ironing & pressing",
    size: "",
    price: "from €2.10 / item",
    body: "Steam pressing on professional boards — collars, cuffs and plackets done separately, so a shirt holds its shape until you wear it.",
    points: ["Collar and cuff detail", "Crease to order"],
  },
  {
    id: "home",
    name: "Bedding & curtains",
    size: "",
    price: "from €9.50 / set",
    body: "Duvets, pillows, throws and lined curtains, washed at volume in machines your own cannot match, then dried flat.",
    points: ["Up to 13kg duvets", "Curtain re-hanging service"],
  },
  {
    id: "sport",
    name: "Sportswear & sneakers",
    size: "",
    price: "from €12.00 / pair",
    body: "Technical fabrics washed without softener so they keep wicking, and trainers cleaned by hand, deodorised and re-laced.",
    points: ["No softener on technical kit", "Hand-cleaned uppers"],
  },
  {
    id: "repairs",
    name: "Repairs & restoration",
    size: "full",
    price: "quoted per piece",
    body: "Hems, zips, buttons, linings and moth damage. We photograph the piece, quote before we start, and nothing is altered without your word.",
    points: ["Quote before work", "Photographed on arrival", "Invisible mending"],
  },
];

const STANDARDS = [
  {
    title: "One order, one drum",
    body: "Orders are never combined. Your load is washed on its own, which is the only way a plant can promise nothing of yours came back with someone else's.",
  },
  {
    title: "Photographed on arrival",
    body: "Every item is logged and photographed when it reaches the plant. If something is damaged before we touch it, you see that picture, not an argument.",
  },
  {
    title: "Care labels are not optional",
    body: "Where a label and a stain disagree, we call you. A stain is temporary, a shrunk wool coat is not.",
  },
];

export default function ServicesPage() {
  return (
    <PageView>
      <FilmStrip
        range={STRIPS.services}
        eyebrow="02 — Services"
        headline={"What we wash,\npress and restore."}
        lede="Six services, one collection. Put everything in one bag and we separate it at the plant — you are never asked to sort your own laundry to fit our categories."
      >
        <p>
          <strong>24h</strong> standard turnaround
        </p>
        <p>
          <strong>Free</strong> collection and return
        </p>
      </FilmStrip>

      <Marquee items={TICKER} />

      <section className="section" aria-labelledby="services-title">
        <div className="shell">
          <Reveal className="section__head">
            <p className="eyebrow">The list</p>
            <h2 className="h2" id="services-title">
              Priced per kilo or per piece,
              <br />
              never per surprise.
            </h2>
            <p className="lede">
              Everything below is collected and returned at no extra cost.
              Turnaround is 24 hours as standard, or same-day before 10am.
            </p>
          </Reveal>

          <ul className="bento">
            {SERVICES.map((service, i) => (
              <Reveal
                as="li"
                key={service.id}
                delay={i * 0.06}
                className={`bento__slot${service.size ? ` bento__slot--${service.size}` : ""}`}
              >
                <SpotlightCard className="card card--service">
                  <div className="card__top">
                    <h3 className="h3">{service.name}</h3>
                    <p className="card__price">{service.price}</p>
                  </div>
                  <p className="body">{service.body}</p>
                  <ul className="tags">
                    {service.points.map((point) => (
                      <li className="tag" key={point}>
                        {point}
                      </li>
                    ))}
                  </ul>
                </SpotlightCard>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section--tint" aria-labelledby="standards-title">
        <div className="shell shell--split">
          <Reveal className="split__head">
            <p className="eyebrow">Care standards</p>
            <h2 className="h2" id="standards-title">
              Three rules the plant will not bend.
            </h2>
            <p className="body">
              They exist because they are the three things that go wrong at every
              laundry that does not have them.
            </p>
            <PageLink href="/process" className="btn btn--ghost">
              See the full process
            </PageLink>
          </Reveal>

          <ol className="ruleList">
            {STANDARDS.map((standard, i) => (
              <Reveal as="li" className="rule" key={standard.title} delay={i * 0.08}>
                <p className="rule__index" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <div>
                  <h3 className="h4">{standard.title}</h3>
                  <p className="body">{standard.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <Reveal className="ctaBand">
            <div>
              <h2 className="h2">Ready when you are.</h2>
              <p className="lede">
                Book a collection slot and leave the bag by the door. We do the
                rest of the film.
              </p>
            </div>
            <div className="ctaRow">
              <PageLink href="/contact" className="btn btn--primary">
                Book a pickup
              </PageLink>
              <PageLink href="/pricing" className="btn btn--ghost">
                See pricing
              </PageLink>
            </div>
          </Reveal>
        </div>
      </section>
    </PageView>
  );
}
