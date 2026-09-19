"use client";

import { motion } from "motion/react";
import SpotlightCard from "@/components/ui/SpotlightCard";
import { revealItem } from "@/components/ui/ShowMore";

/**
 * A bento grid rather than six equal tiles: the two services most people book
 * are given the space that says so.
 */
const SERVICES = [
  {
    id: "wash-fold",
    name: "Wash & fold",
    size: "wide",
    price: "from €2.40 / kg",
    body: "Everyday laundry, separated by colour and fabric weight, washed at the temperature the care label asks for and folded flat. Returned in a sealed, reusable bag.",
    points: ["Sorted by fabric", "Hypoallergenic option", "Folded or on hangers"],
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
    points: ["Up to 13kg duvets", "Curtain re-hanging"],
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

export default function ServicesDetail() {
  return (
    <>
      <motion.ul className="bento" variants={revealItem}>
        {SERVICES.map((service) => (
          <li
            key={service.id}
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
          </li>
        ))}
      </motion.ul>

      <motion.div className="detail__head" variants={revealItem}>
        <p className="eyebrow">Care standards</p>
        <h3 className="h2">Three rules the plant will not bend.</h3>
        <p className="body">
          They exist because they are the three things that go wrong at every
          laundry that does not have them.
        </p>
      </motion.div>

      <motion.ol className="ruleList" variants={revealItem}>
        {STANDARDS.map((standard, i) => (
          <li className="rule" key={standard.title}>
            <p className="rule__index" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </p>
            <div>
              <h4 className="h4">{standard.title}</h4>
              <p className="body">{standard.body}</p>
            </div>
          </li>
        ))}
      </motion.ol>
    </>
  );
}
