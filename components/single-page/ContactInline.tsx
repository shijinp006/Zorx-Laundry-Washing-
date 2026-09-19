"use client";

import { useState } from "react";
import { motion } from "motion/react";

export default function ContactInline() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    date: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="contactInline">
      <div className="contactInline__grid">
        <div className="contactInline__info">
          <h3 className="h3">Schedule Your Collection</h3>
          <p className="body">
            Choose a pickup time and tell us where to find your bag. We weigh and tag your laundry at your door within a 2-hour window.
          </p>
          <div className="contactInline__details">
            <div className="contactDetailItem">
              <span className="contactDetailIcon">📍</span>
              <div>
                <strong>Operating Area</strong>
                <p>38 Neighborhoods across the city</p>
              </div>
            </div>
            <div className="contactDetailItem">
              <span className="contactDetailIcon">⏰</span>
              <div>
                <strong>Collection Hours</strong>
                <p>7:00 AM – 9:00 PM, 7 days a week</p>
              </div>
            </div>
            <div className="contactDetailItem">
              <span className="contactDetailIcon">💬</span>
              <div>
                <strong>Instant WhatsApp</strong>
                <p>+351 912 345 678</p>
              </div>
            </div>
          </div>
        </div>

        <div className="contactInline__formWrap">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="contactInline__success"
            >
              <div className="successIcon">✓</div>
              <h3>Booking Request Received!</h3>
              <p>We have assigned your driver. You will receive a WhatsApp confirmation with a live tracking link shortly.</p>
            </motion.div>
          ) : (
            <form className="contactInline__form" onSubmit={handleSubmit}>
              <div className="formGroup">
                <label htmlFor="inline-name">Full Name</label>
                <input
                  id="inline-name"
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="formGroup">
                <label htmlFor="inline-phone">Phone / WhatsApp</label>
                <input
                  id="inline-phone"
                  type="tel"
                  required
                  placeholder="+351 912 000 000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div className="formGroup">
                <label htmlFor="inline-address">Pickup Address</label>
                <input
                  id="inline-address"
                  type="text"
                  required
                  placeholder="Street address & apartment"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <div className="formRow">
                <div className="formGroup">
                  <label htmlFor="inline-date">Preferred Date</label>
                  <input
                    id="inline-date"
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn--primary btn--full">
                Confirm Pickup Request
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
