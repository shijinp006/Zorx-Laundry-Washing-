import type { Metadata } from "next";
import { CONTACT, whatsappHref } from "@/config/site";
import { STRIPS } from "@/config/strips";
import BookingForm from "@/components/contact/BookingForm";
import FilmStrip from "@/components/FilmStrip";
import PageView from "@/components/PageView";
import Reveal from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Book a laundry pickup in about a minute, or message us on WhatsApp. Collection windows run 7am to 9pm, seven days a week, across thirty-eight neighbourhoods.",
};

const AREAS = [
  "Old Town",
  "Riverside",
  "Marchetti",
  "Northgate",
  "Saint-Ouen",
  "Harbour West",
  "Lindenhof",
  "Belleville",
  "Kirchberg",
  "Sablon",
  "Docklands",
  "Grüneberg",
];

export default function ContactPage() {
  return (
    <PageView>
      <FilmStrip
        range={STRIPS.contact}
        eyebrow="05 — Contact"
        headline={"Leave the bag.\nWe will take it from here."}
        lede="Pick a slot and we are there within the window — usually the same evening. If you would rather just type at a person, WhatsApp is answered by one."
      >
        <p>
          <strong>7am–9pm</strong> seven days
        </p>
        <p>
          <strong>2h</strong> collection windows
        </p>
      </FilmStrip>

      <section className="section" aria-labelledby="book-title">
        <div className="shell shell--split shell--split-wide">
          <Reveal className="split__head">
            <p className="eyebrow">Book a pickup</p>
            <h2 className="h2" id="book-title">
              About a minute, and then it is off your hands.
            </h2>
            <p className="body">
              No account and no card. We weigh the bag at your door, send the price
              before the van leaves, and you pay once — after the order has been
              collected, not before.
            </p>

            <ul className="contactList">
              <li>
                <span className="contactList__label">WhatsApp</span>
                <a href={whatsappHref()} target="_blank" rel="noopener noreferrer">
                  Message us now
                </a>
              </li>
              <li>
                <span className="contactList__label">Phone</span>
                <a href={CONTACT.phoneHref}>{CONTACT.phoneLabel}</a>
              </li>
              <li>
                <span className="contactList__label">Email</span>
                <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              </li>
              <li>
                <span className="contactList__label">Hours</span>
                <span>{CONTACT.hours}</span>
              </li>
            </ul>
          </Reveal>

          <Reveal className="formCard" delay={0.08}>
            <BookingForm />
          </Reveal>
        </div>
      </section>

      <section className="section section--tint" aria-labelledby="areas-title">
        <div className="shell">
          <Reveal className="section__head">
            <p className="eyebrow">Coverage</p>
            <h2 className="h2" id="areas-title">
              Thirty-eight neighbourhoods, and counting.
            </h2>
            <p className="lede">
              A dozen of them below. If yours is not listed, ask anyway — we add
              routes where there is demand, and we will tell you honestly whether
              that is weeks or months away.
            </p>
          </Reveal>

          <Reveal>
            <ul className="tags tags--wrap">
              {AREAS.map((area) => (
                <li className="tag" key={area}>
                  {area}
                </li>
              ))}
              <li className="tag tag--more">+26 more</li>
            </ul>
          </Reveal>
        </div>
      </section>
    </PageView>
  );
}
