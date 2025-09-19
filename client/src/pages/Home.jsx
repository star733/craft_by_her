// src/pages/Home.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const CATEGORIES = [
  { label: "Bestsellers", img: "/images/home/cat-bestsellers.jpg" },
  { label: "Snacks", img: "/images/home/cat-snacks.jpg" },
  { label: "Cakes", img: "/images/home/cat-cakes.jpg" },
  { label: "Pickles", img: "/images/home/cat-pickles.jpg" },
  { label: "Powders", img: "/images/home/cat-powders.jpg" },
  { label: "Spices", img: "/images/home/cat-spices.jpg" },
];

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function Home() {
  const [products, setProducts] = useState([]);
  const [bestsellers, setBestsellers] = useState([]);

  const navigate = useNavigate();

  // ✅ Fetch products from backend
  useEffect(() => {
    fetch("http://localhost:5000/api/items")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.products || []);
        setProducts(list);

        // User-requested fixed bestsellers (case-insensitive)
        const WANTED_TITLES = [
          "achappam",
          "strawberry cake",
          "fish pickle",
          "banana dry",
          "chips",
        ];

        const normalize = (s) => (s || "").toLowerCase().trim();
        const wantedIndex = (title) => {
          const t = normalize(title);
          return WANTED_TITLES.findIndex((w) => {
            const wnorm = normalize(w);
            // allow contains either way to be lenient (e.g., Banana Chips / Chips)
            return t === wnorm || t.includes(wnorm) || wnorm.includes(t);
          });
        };

        // Pick and order according to WANTED_TITLES
        let picks = list
          .map((p) => ({ p, idx: wantedIndex(p.title) }))
          .filter((x) => x.idx !== -1)
          .sort((a, b) => a.idx - b.idx)
          .map((x) => x.p)
          .slice(0, 5);

        // If fewer than 5 found, top up from tagged/flagged bestsellers
        if (picks.length < 5) {
          const extras = list.filter(
            (p) =>
              (p.tag || "").toLowerCase().includes("bestseller") || p.isBestseller === true
          );
          for (const item of extras) {
            if (!picks.find((x) => x._id === item._id) && picks.length < 5) {
              picks.push(item);
            }
          }
        }

        // Still fewer? fill with latest items
        if (picks.length < 5) {
          const latest = [...list].sort(
            (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
          );
          for (const item of latest) {
            if (!picks.find((x) => x._id === item._id) && picks.length < 5) {
              picks.push(item);
            }
          }
        }

        setBestsellers(picks.slice(0, 5));
      })
      .catch((err) => console.error("Failed to load products:", err));
  }, []);

  const goToCategory = (label) => {
    if (label === "Bestsellers") {
      // Scroll to bestsellers section on the same page
      const bestsellersSection = document.getElementById("shop");
      if (bestsellersSection) {
        bestsellersSection.scrollIntoView({ 
          behavior: "smooth",
          block: "start"
        });
      }
    } else {
      // Navigate to products page for other categories
      const slug = slugify(label);
      navigate(`/products?cat=${slug}#grid`);
    }
  };

  return (
    <>
      {/* Announcement / promo bar */}
      <section
        aria-label="Promotions"
        style={{ background: "#8b5e34", color: "#fff" }}
      >
        <div
          className="cbh-container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            padding: "10px 0",
          }}
        >
          <span style={{ fontWeight: 700 }}>
            <i className="bi bi-truck" /> Free shipping above ₹599
          </span>
          <span className="text-accent" style={{ color: "white" }}>
            <i className="bi bi-gift" /> Festive Gift Boxes now open
          </span>
        </div>
      </section>

      {/* HERO */}
      <section id="home" className="bk-hero">
        <div className="bk-hero__inner">
          <div className="bk-hero__panel">
            <div className="bk-eyebrow">
              <i className="bi bi-stars" /> Women-Led • Clean Label
            </div>
            <h1 className="bk-hero__title">
              Honest{" "}
              <span className="text-accent">
                Snacks, Cakes, Pickles
              </span>{" "}
              & Spice Powders
            </h1>
            <p className="bk-hero__desc">
              Crafted in small batches by home-chefs. No artificial colours. No
              preservatives. Just real, delicious food.
            </p>
            <div className="bk-cta" style={{ gap: 12 }}>
              <button
                onClick={() => navigate('/products')}
                className="bk-btn bk-btn--pill bk-btn--primary"
                style={{ border: 'none', cursor: 'pointer' }}
              >
                <i className="bi bi-bag-check" /> Order Now
              </button>
              <button
                onClick={() => navigate('/mission')}
                className="bk-btn bk-btn--pill bk-btn--ghost"
                style={{ border: 'none', cursor: 'pointer' }}
              >
                Our Story
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK CATEGORIES */}
      <section
        aria-labelledby="cats"
        style={{
          background: "#fff",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="cbh-container" style={{ padding: "16px 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h2
              id="cats"
              className="bk-section__title"
              style={{ margin: 0 }}
            >
              Shop by Category
            </h2>
            <div
              className="cbh-cat-strip"
              style={{ justifyContent: "center" }}
            >
              {CATEGORIES.map((c) => (
                <button
                  key={c.label}
                  className="cbh-cat-pill"
                  onClick={() => goToCategory(c.label)}
                >
                  <span
                    className="cbh-cat-img"
                    style={{ backgroundImage: `url(${c.img})` }}
                    aria-hidden="true"
                  />
                  <span className="cbh-cat-text">
                    <span className="cbh-cat-label">{c.label}</span>
                    <span className="cbh-cat-cap">Explore</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="bk-why">
        <h2 className="bk-section__title">Why customers love us</h2>
        <div className="cbh-container">
          <div className="bk-cards">
            <article className="bk-card">
              <img
                className="bk-card__img"
                src="/images/home/why-1.jpg"
                alt="Clean ingredients"
              />
              <div className="bk-card__body">
                <div className="bk-card__title">Clean Ingredients</div>
                <p className="bk-card__text">
                  Cold-pressed oils, quality grains & spices. No shortcuts.
                </p>
                <button
                  onClick={() => navigate('/products')}
                  className="bk-btn bk-btn--pill bk-btn--ghost"
                  style={{ border: 'none', cursor: 'pointer' }}
                >
                  See Products
                </button>
              </div>
            </article>

            <article className="bk-card">
              <img
                className="bk-card__img"
                src="/images/home/why-2.jpg"
                alt="Women led"
              />
              <div className="bk-card__body">
                <div className="bk-card__title">Women-Led Collective</div>
                <p className="bk-card__text">
                  Every order supports fair, dignified & flexible work.
                </p>
                <button
                  onClick={() => navigate('/mission')}
                  className="bk-btn bk-btn--pill bk-btn--ghost"
                  style={{ border: 'none', cursor: 'pointer' }}
                >
                  Our Mission
                </button>
              </div>
            </article>

            <article className="bk-card">
              <img
                className="bk-card__img"
                src="/images/home/why-3.jpg"
                alt="Small batches"
              />
              <div className="bk-card__body">
                <div className="bk-card__title">Small Batches, Big Flavor</div>
                <p className="bk-card__text">
                  Freshly made & shipped pan-India in eco packaging.
                </p>
                <button
                  onClick={() => navigate('/products')}
                  className="bk-btn bk-btn--pill bk-btn--ghost"
                  style={{ border: 'none', cursor: 'pointer' }}
                >
                  Order Now
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* BESTSELLERS GRID */}
      <section
        id="shop"
        aria-labelledby="bestsellers"
        style={{ padding: "30px 0" }}
      >
        <div className="cbh-container">
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div>
              <h2
                id="bestsellers"
                className="bk-section__title"
                style={{ marginBottom: 6 }}
              >
                Bestsellers
              </h2>
              <p
                style={{
                  color: "var(--text-muted)",
                  margin: 0,
                  fontSize: 14,
                }}
              >
                Fresh, small-batch products our customers swear by
              </p>
            </div>
            <a href="/products" className="bk-link">
              View all →
            </a>
          </div>

          <div className="cbh-grid">
            {bestsellers.map((p) => (
              <div key={p._id} className="cbh-card">
                {p.image ? (
                  <img
                    src={`http://localhost:5000/uploads/${p.image}`}
                    alt={p.title}
                    style={{
                      width: "100%",
                      height: "180px",
                      objectFit: "cover",
                      borderRadius: 8,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "180px",
                      background: "#f0f0f0",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#999",
                    }}
                  >
                    No Image
                  </div>
                )}

                <h3 style={{ margin: "10px 0 4px" }}>{p.title}</h3>
                <p style={{ fontSize: 14, color: "#666", margin: 0 }}>
                  {p.category?.name || p.category || "Uncategorized"}
                </p>

                {/* Hide variants/prices on home cards; show only on details page */}
              </div>
            ))}

            {bestsellers.length === 0 && (
              <p style={{ color: "var(--text-muted)" }}>
                No bestseller products yet.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* STORY SPLIT */}
      <section id="story" className="bk-visit">
        <h2 className="bk-section__title">
          Crafted by Women, Rooted in Home Kitchens
        </h2>
        <div className="cbh-container">
          <div className="bk-visit__inner">
            <div className="bk-visit__copy">
              <p>
                We started in a tiny apartment kitchen with a belief that
                everyday snacks can be healthy, honest and delightful. Today, our
                collective supports women home-chefs across the city with
                training, hygiene and fair wages.
              </p>
              <p
                className="text-accent"
                style={{ color: "var(--brand)" }}
              >
                FSSAI compliant • 4.9★ rated • Eco packaging
              </p>
              <a
                className="bk-btn bk-btn--pill bk-btn--primary"
                href="/products"
              >
                <i className="bi bi-bag" /> Start Ordering
              </a>
            </div>

            <div className="bk-visit__grid">
              <img src="/images/home/story1.jpg" alt="Women baking" />
              <img src="/images/home/story2.jpg" alt="Ingredients" />
              <img src="/images/home/story3.jpg" alt="Fresh bake" />
            </div>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className="bk-gallery">
        <h2 className="bk-section__title">Fresh from our kitchen</h2>
        <div className="cbh-container">
          <div className="bk-masonry">
            <img src="/images/home/gal1.jpg" alt="Gallery 1" />
            <img src="/images/home/gal2.jpg" alt="Gallery 2" />
            <img src="/images/home/gal3.jpg" alt="Gallery 3" />
            <img src="/images/home/gal4.jpg" alt="Gallery 4" />
          </div>
        </div>
      </section>

      {/* Footer note */}
      <footer className="footer">
        Designed with ❤ for women artisans
      </footer>
    </>
  );
}
