// src/pages/About.jsx
import React from "react";

export default function About() {
  return (
    <main>
      {/* Hero / Intro */}
      <section
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="cbh-container" style={{ padding: "28px 0 18px" }}>
          <h1 className="bk-section__title" style={{ margin: 0 }}>
            About CraftedByHer
          </h1>
          <p
            style={{
              color: "var(--text-muted)",
              margin: "8px auto 0",
              maxWidth: 760,
              textAlign: "center",
            }}
          >
            A women-led food collective crafting honest snacks, cakes, pickles
            and spice powders — clean label, small batches, and a whole lot of heart.
          </p>
        </div>
      </section>

      {/* Founder + Story */}
      <section style={{ padding: "28px 0", background: "#fff" }}>
        <div className="cbh-container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.2fr",
              gap: 24,
              alignItems: "center",
            }}
          >
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 18,
                overflow: "hidden",
                boxShadow: "var(--shadow)",
              }}
            >
              <img
                src="/images/about/founder.jpg"
                alt="Founder"
                style={{ width: "100%", height: 420, objectFit: "cover" }}
              />
            </div>

            <div>
              <h2 style={{ margin: "0 0 8px", color: "var(--text)" }}>
                Women-Led. Home-Grown.
              </h2>
              <p style={{ color: "var(--text-muted)" }}>
                CraftedByHer began in a tiny apartment kitchen with one belief:
                food can be honest and delightful without artificial colours,
                flavours or shortcuts. What started as weekend bakes for friends
                soon blossomed into a community of trained home chefs, hygienic
                micro-kitchens, and a promise of clean label goodness.
              </p>
              <p style={{ color: "var(--text-muted)" }}>
                Today, every order supports fair wages, flexible schedules and
                continuous upskilling for women artisans. We keep batches small,
                ingredients real, and flavours comforting — just like home.
              </p>

              <div style={{ marginTop: 14 }}>
                <a href="/products" className="bk-btn bk-btn--pill bk-btn--primary">
                  Explore Our Menu
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section style={{ padding: "10px 0 28px" }}>
        <h2 className="bk-section__title">What We Stand For</h2>
        <div className="cbh-container">
          <div className="bk-cards">
            <article className="bk-card">
              <img
                className="bk-card__img"
                src="/images/about/valueclean.jpg"
                alt="Clean label"
              />
              <div className="bk-card__body">
                <div className="bk-card__title">Clean Label</div>
                <p className="bk-card__text">
                  Real ingredients you can pronounce. No preservatives, no
                  colours, no nonsense.
                </p>
              </div>
            </article>
            <article className="bk-card">
              <img
                className="bk-card__img"
                src="/images/about/valuewomen.jpg"
                alt="Women first"
              />
              <div className="bk-card__body">
                <div className="bk-card__title">Women First</div>
                <p className="bk-card__text">
                  Flexible, dignified work and skill-building for women
                  artisans across the city.
                </p>
              </div>
            </article>
            <article className="bk-card">
              <img
                className="bk-card__img"
                src="/images/about/valuefresh.jpg"
                alt="Small batches"
              />
              <div className="bk-card__body">
                <div className="bk-card__title">Small Batches</div>
                <p className="bk-card__text">
                  Made-to-order in micro-kitchens for peak freshness and flavour.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Timeline / Milestones */}
      <section style={{ padding: "10px 0 34px", background: "#fff" }}>
        <h2 className="bk-section__title">Our Journey</h2>
        <div className="cbh-container">
          <div
            style={{
              display: "grid",
              gap: 16,
              maxWidth: 900,
              margin: "0 auto",
            }}
          >
            {[
              {
                year: "2022",
                text:
                  "Started with weekend bakes and a handful of loyal customers.",
              },
              {
                year: "2023",
                text:
                  "Expanded to snacks & pickles, onboarded the first cohort of women home-chefs.",
              },
              {
                year: "2024",
                text:
                  "Set up micro-kitchen network, launched pan-city delivery and eco packaging.",
              },
            ].map((m) => (
              <div
                key={m.year}
                style={{
                  display: "grid",
                  gridTemplateColumns: "100px 1fr",
                  gap: 14,
                  alignItems: "center",
                  padding: "12px 14px",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  background: "var(--surface)",
                  boxShadow: "var(--shadow)",
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    color: "var(--brand-strong)",
                    fontSize: 20,
                  }}
                >
                  {m.year}
                </div>
                <div style={{ color: "var(--text-muted)" }}>{m.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "20px 0 40px" }}>
        <div
          className="cbh-container"
          style={{
            border: "1px solid var(--border)",
            borderRadius: 18,
            background: "var(--surface)",
            boxShadow: "var(--shadow)",
            padding: 22,
            textAlign: "center",
          }}
        >
          <h3 style={{ marginTop: 0, color: "var(--text)" }}>
            Taste the difference of honest food
          </h3>
          <p style={{ color: "var(--text-muted)", marginTop: 6, marginBottom: 14 }}>
            From our home kitchens to yours — fresh, clean and delicious.
          </p>
          <a href="/products" className="bk-btn bk-btn--pill bk-btn--primary">
            Order Now
          </a>
        </div>
      </section>
    </main>
  );
}
