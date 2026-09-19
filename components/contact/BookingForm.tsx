"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { CONTACT } from "@/config/site";

/**
 * The booking form.
 *
 * There is no server action behind this, and it does not pretend there is. On
 * submit it composes the booking into a message and hands it to WhatsApp (or to
 * a mail client), which is a thing that genuinely happens rather than a success
 * toast over a request that went nowhere. When a backend exists, `submit()` is
 * the one function to change — everything above it is validation and focus
 * management that a server action would need anyway.
 *
 * Accessibility, in the order it matters here:
 *
 *   - Every field has a real, visible `<label>`. Placeholders are hints, never
 *     labels: they vanish exactly when a half-filled form is being checked.
 *   - Errors are validated on submit and on blur, never on keystroke, so the
 *     form does not tell you that "j" is not a phone number while you type one.
 *   - Each error sits under its field, is linked with `aria-describedby` and
 *     marked `aria-invalid`, and the first invalid field is focused after a
 *     failed submit.
 *   - The summary above the fields is a live region, so a failed submit is
 *     announced instead of silently scrolling.
 */

const SERVICES = [
  "Wash & fold",
  "Dry cleaning",
  "Ironing & pressing",
  "Bedding & curtains",
  "Sportswear & sneakers",
  "Repairs & restoration",
  "Not sure yet",
];

const SLOTS = [
  "Morning, 7am – 10am",
  "Midday, 10am – 1pm",
  "Afternoon, 1pm – 5pm",
  "Evening, 5pm – 9pm",
];

interface Fields {
  name: string;
  phone: string;
  address: string;
  service: string;
  date: string;
  slot: string;
  notes: string;
}

type Errors = Partial<Record<keyof Fields, string>>;

const EMPTY: Fields = {
  name: "",
  phone: "",
  address: "",
  service: SERVICES[0],
  date: "",
  slot: SLOTS[1],
  notes: "",
};

/** Deliberately loose: people write phone numbers in a dozen shapes. */
const PHONE = /^[+()\d][\d\s()+.-]{6,}$/;

function validate(fields: Fields): Errors {
  const errors: Errors = {};
  if (!fields.name.trim()) {
    errors.name = "We need a name to put on the collection.";
  }
  if (!fields.phone.trim()) {
    errors.phone = "Add a phone number so the driver can reach you.";
  } else if (!PHONE.test(fields.phone.trim())) {
    errors.phone = "That does not look like a phone number — digits only is fine.";
  }
  if (fields.address.trim().length < 6) {
    errors.address = "Add the street and number we are collecting from.";
  }
  if (!fields.date) {
    errors.date = "Pick the day you want the bag collected.";
  }
  return errors;
}

export default function BookingForm() {
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [failed, setFailed] = useState(false);
  const [sentVia, setSentVia] = useState<"whatsapp" | "email" | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const set = (key: keyof Fields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    // Clear a field's error as soon as it is touched again: an error message
    // that outlives the mistake trains people to ignore error messages.
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const blur = (key: keyof Fields) => {
    const found = validate(fields)[key];
    if (found) setErrors((prev) => ({ ...prev, [key]: found }));
  };

  const message = () =>
    [
      "Wash Zone pickup request",
      `Name: ${fields.name}`,
      `Phone: ${fields.phone}`,
      `Address: ${fields.address}`,
      `Service: ${fields.service}`,
      `Date: ${fields.date}`,
      `Slot: ${fields.slot}`,
      fields.notes ? `Notes: ${fields.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

  // Takes anything that can be prevented, so the same path serves the form's
  // submit event and the secondary button's click without a cast between them.
  const submit = (event: { preventDefault: () => void }, via: "whatsapp" | "email") => {
    event.preventDefault();
    const found = validate(fields);
    setErrors(found);

    if (Object.keys(found).length) {
      setFailed(true);
      const first = Object.keys(found)[0];
      formRef.current
        ?.querySelector<HTMLElement>(`[name="${first}"]`)
        ?.focus();
      return;
    }

    setFailed(false);
    const body = message();
    const href =
      via === "whatsapp"
        ? `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(body)}`
        : `mailto:${CONTACT.email}?subject=${encodeURIComponent(
            "Pickup request"
          )}&body=${encodeURIComponent(body)}`;

    window.open(href, via === "whatsapp" ? "_blank" : "_self");
    setSentVia(via);
  };

  const errorCount = Object.keys(errors).length;

  return (
    <form
      ref={formRef}
      className="form"
      noValidate
      onSubmit={(e) => submit(e, "whatsapp")}
    >
      <div aria-live="polite" className="form__live">
        {failed && errorCount > 0 && (
          <motion.p
            className="form__summary"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24 }}
          >
            {errorCount === 1
              ? "One field needs attention before we can send this."
              : `${errorCount} fields need attention before we can send this.`}
          </motion.p>
        )}
        {sentVia && (
          <motion.p
            className="form__sent"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24 }}
          >
            {sentVia === "whatsapp"
              ? "Your booking is ready in WhatsApp — press send there and we will confirm the slot."
              : "Your booking is ready in your mail app — press send there and we will confirm the slot."}
          </motion.p>
        )}
      </div>

      <div className="form__grid">
        <Field
          name="name"
          label="Your name"
          value={fields.name}
          error={errors.name}
          onChange={set}
          onBlur={blur}
          autoComplete="name"
          placeholder="Alex Moreau"
        />

        <Field
          name="phone"
          label="Phone"
          type="tel"
          value={fields.phone}
          error={errors.phone}
          onChange={set}
          onBlur={blur}
          autoComplete="tel"
          placeholder="+1 555 019 4477"
        />

        <Field
          name="address"
          label="Collection address"
          value={fields.address}
          error={errors.address}
          onChange={set}
          onBlur={blur}
          autoComplete="street-address"
          placeholder="14 Rue des Lilas, apartment 3"
          wide
        />

        <div className="field">
          <label className="field__label" htmlFor="service">
            Service
          </label>
          <select
            id="service"
            name="service"
            className="field__input"
            value={fields.service}
            onChange={(e) => set("service", e.target.value)}
          >
            {SERVICES.map((service) => (
              <option key={service}>{service}</option>
            ))}
          </select>
        </div>

        <Field
          name="date"
          label="Collection day"
          type="date"
          value={fields.date}
          error={errors.date}
          onChange={set}
          onBlur={blur}
        />

        <div className="field">
          <label className="field__label" htmlFor="slot">
            Preferred slot
          </label>
          <select
            id="slot"
            name="slot"
            className="field__input"
            value={fields.slot}
            onChange={(e) => set("slot", e.target.value)}
          >
            {SLOTS.map((slot) => (
              <option key={slot}>{slot}</option>
            ))}
          </select>
        </div>

        <div className="field field--wide">
          <label className="field__label" htmlFor="notes">
            Anything we should know{" "}
            <span className="field__optional">(optional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            className="field__input field__input--area"
            rows={3}
            value={fields.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Buzzer is broken, call when you arrive. One silk dress with a wine stain."
          />
        </div>
      </div>

      <div className="form__actions">
        <button type="submit" className="btn btn--primary">
          Send on WhatsApp
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={(e) => submit(e, "email")}
        >
          Send by email instead
        </button>
      </div>

      <p className="form__note">
        Nothing is stored on this site. Both buttons open your own WhatsApp or mail
        app with the booking written out, so you can see exactly what is sent —
        and nothing is sent until you press send there.
      </p>
    </form>
  );
}

function Field({
  name,
  label,
  value,
  error,
  onChange,
  onBlur,
  type = "text",
  autoComplete,
  placeholder,
  wide,
}: {
  name: keyof Fields;
  label: string;
  value: string;
  error?: string;
  onChange: (key: keyof Fields, value: string) => void;
  onBlur: (key: keyof Fields) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  wide?: boolean;
}) {
  const errorId = `${name}-error`;

  return (
    <div className={`field${wide ? " field--wide" : ""}${error ? " has-error" : ""}`}>
      <label className="field__label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        className="field__input"
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange(name, e.target.value)}
        onBlur={() => onBlur(name)}
      />
      {error && (
        <p className="field__error" id={errorId}>
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 2 1 21h22L12 2Zm0 6.2 1 6.3h-2l1-6.3ZM12 17a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
