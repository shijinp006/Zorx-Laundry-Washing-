import type { Metadata } from "next";
import { STRIPS } from "@/config/strips";
import FilmStrip from "@/components/FilmStrip";
import PageView from "@/components/PageView";
import PlanSwitcher from "@/components/pricing/PlanSwitcher";
import Accordion from "@/components/ui/Accordion";
import Reveal from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Per-kilo and per-item laundry pricing with free collection and return. Pay as you go, or a monthly plan that holds your slot and saves around 15%.",
};

const RATES = [
  { item: "Shirt, washed and pressed", once: "€3.20", plan: "€2.40" },
  { item: "Trousers or chinos", once: "€4.10", plan: "€3.10" },
  { item: "Two-piece suit", once: "€14.90", plan: "€11.20" },
  { item: "Dress, lined", once: "€12.50", plan: "€9.40" },
  { item: "Coat, wool", once: "€18.00", plan: "€13.50" },
  { item: "Duvet, double", once: "€24.00", plan: "€18.00" },
  { item: "Curtains, per metre drop", once: "€9.50", plan: "€7.10" },
  { item: "Trainers, per pair", once: "€12.00", plan: "€9.00" },
];

const FAQ = [
  {
    q: "How is a per-kilo order weighed?",
    a: "At your door, on a certified scale, in front of you. The weight and the price are on your phone before the driver leaves, so there is no invoice later that you cannot check.",
  },
  {
    q: "What happens if I go over my monthly allowance?",
    a: "The overage is charged at your plan's per-kilo rate, which is lower than the pay-as-you-go rate. You are told the moment an order takes you past the allowance, not at the end of the month.",
  },
  {
    q: "Is collection really free?",
    a: "Yes, both ways, with no minimum order. We would rather price the cleaning honestly than add a delivery fee to a low headline rate.",
  },
  {
    q: "Can I cancel a monthly plan?",
    a: "Any month, from the account page or by replying to any of our messages. Unused allowance does not roll over, so we will tell you if you are consistently under your plan and should move down one.",
  },
  {
    q: "Do you charge more for same-day?",
    a: "Same-day collection is included on Signature and Household. On pay as you go it is €6 per order, and only when booked before 10am.",
  },
];

export default function PricingPage() {
  return (
    <PageView>
      <FilmStrip
        range={STRIPS.pricing}
        eyebrow="04 — Pricing"
        headline={"Two ways to pay.\nNeither one hides a fee."}
        lede="Per kilo for everyday laundry, per item for anything pressed or dry cleaned. Collection and return are free on every order, on every plan."
      >
        <p>
          <strong>€0</strong> collection
        </p>
        <p>
          <strong>~15%</strong> saved on a plan
        </p>
      </FilmStrip>

      <section className="section" aria-labelledby="plans-title">
        <div className="shell">
          <Reveal className="section__head">
            <p className="eyebrow">Plans</p>
            <h2 className="h2" id="plans-title">
              Pick the one that matches your week.
            </h2>
          </Reveal>

          <PlanSwitcher />
        </div>
      </section>

      <section className="section section--tint" aria-labelledby="rates-title">
        <div className="shell">
          <Reveal className="section__head">
            <p className="eyebrow">Per item</p>
            <h2 className="h2" id="rates-title">
              Dry cleaning and pressing rates.
            </h2>
            <p className="lede">
              Plan rates apply to Signature and Household members. Anything not
              listed is quoted before we start — including repairs and restoration.
            </p>
          </Reveal>

          <Reveal className="tableWrap">
            <table className="table">
              <caption className="sr-only">
                Per-item dry cleaning and pressing rates, pay as you go compared
                with plan members
              </caption>
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Pay as you go</th>
                  <th scope="col">On a plan</th>
                </tr>
              </thead>
              <tbody>
                {RATES.map((rate) => (
                  <tr key={rate.item}>
                    <th scope="row">{rate.item}</th>
                    <td>{rate.once}</td>
                    <td className="table__plan">{rate.plan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </div>
      </section>

      <section className="section" aria-labelledby="faq-title">
        <div className="shell shell--split">
          <Reveal className="split__head">
            <p className="eyebrow">Questions</p>
            <h2 className="h2" id="faq-title">
              The five we are asked most.
            </h2>
            <p className="body">
              If yours is not here, message us on WhatsApp — it is the fastest way
              to get a person.
            </p>
          </Reveal>

          <Reveal>
            <Accordion items={FAQ} />
          </Reveal>
        </div>
      </section>
    </PageView>
  );
}
