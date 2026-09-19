"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import PageLink from "@/components/PageLink";
import Reveal from "@/components/ui/Reveal";
import SpotlightCard from "@/components/ui/SpotlightCard";

type Billing = "once" | "monthly";

interface Plan {
  id: string;
  name: string;
  blurb: string;
  price: Record<Billing, number>;
  unit: Record<Billing, string>;
  features: string[];
  featured?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "essentials",
    name: "Essentials",
    blurb: "Everyday laundry for one or two people, washed, dried and folded.",
    price: { once: 2.4, monthly: 39 },
    unit: { once: "per kg", monthly: "per month, 18kg included" },
    features: [
      "Wash, dry and fold",
      "24-hour turnaround",
      "Free collection and return",
      "Hypoallergenic detergent option",
    ],
  },
  {
    id: "signature",
    name: "Signature",
    blurb: "Laundry, dry cleaning and pressing on one collection, for people who wear ironed shirts.",
    price: { once: 3.6, monthly: 69 },
    unit: { once: "per kg", monthly: "per month, 24kg + 8 pressed items" },
    features: [
      "Everything in Essentials",
      "8 pressed items each month",
      "Dry cleaning at member rates",
      "Same-day collection before 7pm",
      "Priority slots at weekends",
    ],
    featured: true,
  },
  {
    id: "household",
    name: "Household",
    blurb: "Family volumes, bedding and curtains, on a repeating fortnightly slot.",
    price: { once: 2.1, monthly: 119 },
    unit: { once: "per kg", monthly: "per month, 45kg + 2 bedding sets" },
    features: [
      "Everything in Signature",
      "2 bedding sets each month",
      "Curtain take-down and re-hang",
      "A fixed fortnightly slot",
      "One named account manager",
    ],
  },
];

const formatPrice = (value: number) =>
  value % 1 === 0 ? `€${value}` : `€${value.toFixed(2)}`;

/**
 * Plans, and the one control on the page.
 *
 * The switch is two real buttons with `aria-pressed`, not a styled checkbox: the
 * choice is between two named things, and "pressed" is what a screen reader
 * should hear rather than "checked". The sliding indicator behind them is a
 * `layoutId`, so Motion measures both positions and animates between them — no
 * hardcoded offsets to go wrong when the labels are translated or the font
 * changes.
 *
 * The prices themselves cross-fade through `AnimatePresence` keyed on the billing
 * mode. A number that swaps instantly reads as a page reload; one that fades and
 * lifts reads as the same card answering a different question. The unit line
 * moves with it, because "€39" without "per month, 18kg included" is not a price.
 */
export default function PlanSwitcher() {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <>
      <Reveal className="switch">
        <div className="switch__group" role="group" aria-label="Billing period">
          {(["once", "monthly"] as Billing[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`switch__btn${billing === mode ? " is-active" : ""}`}
              aria-pressed={billing === mode}
              onClick={() => setBilling(mode)}
            >
              {billing === mode && (
                <motion.span
                  className="switch__pill"
                  layoutId="billingPill"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="switch__label">
                {mode === "once" ? "Pay as you go" : "Monthly plan"}
              </span>
            </button>
          ))}
        </div>
        <p className="switch__note">
          {billing === "monthly"
            ? "Monthly plans save around 15% and hold your slot. Cancel any month."
            : "No commitment. Weighed at your door, charged once, nothing kept on file."}
        </p>
      </Reveal>

      <ul className="plans">
        {PLANS.map((plan, i) => (
          <Reveal as="li" key={plan.id} delay={i * 0.07}>
            <SpotlightCard
              className={`plan${plan.featured ? " plan--featured" : ""}`}
            >
              {plan.featured && (
                <p className="plan__badge">Most booked</p>
              )}
              <h3 className="h3">{plan.name}</h3>
              <p className="plan__blurb">{plan.blurb}</p>

              <div className="plan__priceWrap">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={billing}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10, transition: { duration: 0.14 } }}
                    transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <p className="plan__price">{formatPrice(plan.price[billing])}</p>
                    <p className="plan__unit">{plan.unit[billing]}</p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <ul className="ticks">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                      <path
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 12.5l5 5L20 6.5"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <PageLink
                href="/contact"
                className={`btn ${plan.featured ? "btn--primary" : "btn--ghost"} btn--block`}
              >
                Choose {plan.name}
              </PageLink>
            </SpotlightCard>
          </Reveal>
        ))}
      </ul>
    </>
  );
}
