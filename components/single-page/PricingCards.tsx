"use client";

import { motion } from "motion/react";

interface PricingPlan {
  id: string;
  name: string;
  tagline: string;
  price: string;
  period: string;
  popular?: boolean;
  features: string[];
}

const PLANS: PricingPlan[] = [
  {
    id: "payg",
    name: "Pay As You Go",
    tagline: "Ideal for occasional loads & single items",
    price: "€2.40",
    period: "/ kg",
    features: [
      "Weighed & verified at your door",
      "Free 24h collection & delivery",
      "No account or subscription needed",
      "Per-item dry cleaning options",
    ],
  },
  {
    id: "signature",
    name: "Signature Plan",
    tagline: "Our most popular weekly laundry service",
    price: "€48",
    period: "/ month",
    popular: true,
    features: [
      "Includes 20kg monthly wash & fold",
      "Save 15% on per-item pressing",
      "Priority same-day pickup window",
      "Dedicated eco-friendly garment bags",
    ],
  },
  {
    id: "household",
    name: "Household Plan",
    tagline: "For busy families & large bedding loads",
    price: "€89",
    period: "/ month",
    features: [
      "Includes 40kg monthly wash & fold",
      "Free bed linen & curtain service",
      "Unlimited free re-cleans",
      "Flexible schedule & instant WhatsApp support",
    ],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.94 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export default function PricingCards() {
  return (
    <motion.div
      className="pricingCardsContainer"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
    >
      <div className="pricingCardsGrid">
        {PLANS.map((plan) => (
          <motion.div
            key={plan.id}
            variants={cardVariants}
            className={`pricingCard ${plan.popular ? "pricingCard--popular" : ""}`}
          >
            {plan.popular && (
              <span className="pricingCard__badge">Most Popular</span>
            )}
            <div className="pricingCard__header">
              <h3 className="pricingCard__title">{plan.name}</h3>
              <p className="pricingCard__tagline">{plan.tagline}</p>
            </div>
            <div className="pricingCard__priceRow">
              <span className="pricingCard__price">{plan.price}</span>
              <span className="pricingCard__period">{plan.period}</span>
            </div>
            <ul className="pricingCard__features">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="pricingCard__feature">
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="pricingCard__check"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <button type="button" className={`btn ${plan.popular ? "btn--primary" : "btn--ghost"} pricingCard__cta`}>
              Choose Plan
            </button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
