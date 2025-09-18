// src/pages/Contact.jsx
import React, { useState } from "react";
import { toast, ToastContainer } from "react-toastify";

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);

  const errors = {
    name: !name.trim() ? "Please enter your name" : "",
    email: !email.trim()
      ? "Please enter your email"
      : !emailRx.test(email)
      ? "Please enter a valid email"
      : "",
    subject: !subject.trim() ? "Please enter a subject" : "",
    message: message.trim().length < 10 ? "Please write at least 10 characters" : "",
    phone:
      phone && !/^\d{10}$/.test(phone)
        ? "Enter a 10-digit phone (optional field)"
        : "",
  };

  const firstError =
    errors.name || errors.email || errors.phone || errors.subject || errors.message;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (firstError) {
      setTouched({ name: true, email: true, phone: true, subject: true, message: true });
      toast.error("Please fix the highlighted fields.", { className: "custom-toast" });
      return;
    }
    setLoading(true);
    try {
      // OPTIONAL: send to your API (create this route later if you like)
      await fetch("http://localhost:5000/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, subject, message }),
      }).catch(() => {}); // ignore if not implemented yet

      toast.success("Thanks! We’ll get back to you shortly.", {
        className: "custom-toast",
        autoClose: 1400,
      });

      setName("");
      setEmail("");
      setPhone("");
      setSubject("");
      setMessage("");
      setTouched({});
    } catch (err) {
      toast.error("Could not send message. Please try again.", {
        className: "custom-toast",
      });
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = (k) =>
    `bk-auth-input ${touched[k] && errors[k] ? "input-error" : ""} ${
      touched[k] && !errors[k] ? "input-valid" : ""
    }`;

  return (
    <main>
      {/* Heading */}
      <section
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="cbh-container" style={{ padding: "28px 0 18px" }}>
          <h1 className="bk-section__title" style={{ margin: 0 }}>
            Contact Us
          </h1>
          <p
            style={{
              color: "var(--text-muted)",
              margin: "8px auto 0",
              maxWidth: 760,
              textAlign: "center",
            }}
          >
            Questions, custom orders, or feedback — we’d love to hear from you.
          </p>
        </div>
      </section>

      {/* Content */}
      <section style={{ padding: "24px 0 36px", background: "#fff" }}>
        <div
          className="cbh-container"
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr .9fr",
            gap: 24,
            alignItems: "start",
          }}
        >
          {/* Form */}
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 18,
              background: "var(--surface)",
              boxShadow: "var(--shadow)",
              padding: 20,
            }}
          >
            <h3 style={{ marginTop: 0, color: "var(--text)" }}>Send a Message</h3>
            <form onSubmit={onSubmit} noValidate>
              <input
                className={fieldClass("name")}
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              />
              {touched.name && errors.name && (
                <div className="field-error">{errors.name}</div>
              )}

              <input
                className={fieldClass("email")}
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              />
              {touched.email && errors.email && (
                <div className="field-error">{errors.email}</div>
              )}

              <input
                className={fieldClass("phone")}
                type="text"
                placeholder="Phone (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              />
              {touched.phone && errors.phone && (
                <div className="field-error">{errors.phone}</div>
              )}

              <input
                className={fieldClass("subject")}
                type="text"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, subject: true }))}
              />
              {touched.subject && errors.subject && (
                <div className="field-error">{errors.subject}</div>
              )}

              <textarea
                className={fieldClass("message")}
                placeholder="Your message"
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, message: true }))}
                style={{
                  resize: "vertical",
                  fontFamily: "inherit",
                  borderRadius: 12,
                }}
              />
              {touched.message && errors.message && (
                <div className="field-error">{errors.message}</div>
              )}

              <div className="bk-form-actions">
                <button className="bk-btn bk-btn--primary" disabled={loading}>
                  {loading ? "Sending…" : "Send Message"}
                </button>
              </div>
            </form>
            <ToastContainer />
          </div>

          {/* Info card */}
          <aside
            style={{
              border: "1px solid var(--border)",
              borderRadius: 18,
              background: "var(--surface)",
              boxShadow: "var(--shadow)",
              overflow: "hidden",
            }}
          >
            <img
              src="/images/about/map.jpg"
              alt="Map"
              style={{ width: "100%", height: 200, objectFit: "cover" }}
            />
            <div style={{ padding: 16 }}>
              <h3 style={{ marginTop: 0, color: "var(--text)" }}>Visit / Reach Us</h3>
              <p style={{ color: "var(--text-muted)", marginBottom: 8 }}>
                CraftedByHer Micro-Kitchen Network
                <br />
                Your City, India
              </p>
              <p style={{ color: "var(--text-muted)", margin: "8px 0" }}>
                <strong>Hours:</strong> Mon–Sat, 9:00 AM – 7:00 PM
                <br />
                <strong>Email:</strong> hello@craftedbyher.in
                <br />
                <strong>Phone:</strong> +91-90000-00000
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <a className="bk-btn bk-btn--pill bk-btn--ghost" href="/products">
                  Browse Menu
                </a>
                <a className="bk-btn bk-btn--pill bk-btn--primary" href="/about">
                  Our Story
                </a>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
