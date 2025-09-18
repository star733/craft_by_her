// src/pages/Products.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { CATEGORIES } from "../data/products"; // keep categories only

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function Products() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [active, setActive] = useState("All");
  const [q, setQ] = useState("");
  const gridRef = useRef(null);

  // ✅ Fetch products from backend
  useEffect(() => {
    fetch("http://localhost:5000/api/items")
      .then((res) => res.json())
      .then((data) => {
        console.log("Products API response:", data);
  
        // support both shapes
        const items = Array.isArray(data) ? data : data.products || [];
        setProducts(items);
      })
      .catch((err) => console.error("Failed to load products:", err));
  }, []);
  
  // ✅ Sync category with URL
  useEffect(() => {
    const slug = params.get("cat");
    if (!slug) return;

    if (slug === "bestsellers") {
      if (active !== "Bestsellers") setActive("Bestsellers");
      return;
    }

    const match = CATEGORIES.find((c) => slugify(c) === slug);
    if (match && match !== active) setActive(match);
  }, [params, active]);

  // ✅ Scroll if #grid
  useEffect(() => {
    if (location.hash === "#grid" && gridRef.current) {
      setTimeout(() => {
        gridRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, [location.hash, active, q]);

  // ✅ Filter products
  const filtered = useMemo(() => {
    let base;

    if (active === "Bestsellers") {
      base = products.filter((p) =>
        (p.tag || "").toLowerCase().includes("bestseller")
      );
    } else {
      base =
        active === "All"
          ? products
          : products.filter(
              (p) =>
                p.category === active ||
                p.category?.name === active // handle populated category
            );
    }

    const rq = q.trim().toLowerCase();
    if (!rq) return base;
    return base.filter(
      (p) =>
        p.title.toLowerCase().includes(rq) ||
        (p.tag || "").toLowerCase().includes(rq)
    );
  }, [products, active, q]);

  const onPickCategory = (c) => {
    setActive(c);
    navigate(`/products?cat=${slugify(c)}#grid`);
  };

  return (
    <main className="cbh-products">
      {/* Title + search */}
      <section
        style={{
          borderBottom: "1px solid var(--border)",
          background: "#fff",
        }}
      >
        <div className="cbh-container" style={{ padding: "16px 0 10px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "end",
              gap: 12,
            }}
          >
            <div>
              <h1 className="cbh-title" style={{ margin: "6px 0" }}>
                Our Products
              </h1>
              <p style={{ color: "var(--text-muted)", margin: 0 }}>
                Honest Snacks, Cakes, Pickles & Spice Powders
              </p>
            </div>

            {/* Search */}
            <div>
              <input
                type="search"
                placeholder="Search snacks, cakes, pickles, powders…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  minWidth: 260,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Category strip */}
      <section className="cbh-cat-wrap" aria-label="Filters">
        <div className="cbh-container">
          <div className="cbh-cat-strip">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className={`cbh-cat-pill ${active === c ? "active" : ""}`}
                onClick={() => onPickCategory(c)}
                aria-pressed={active === c}
              >
                <span
                  className="cbh-cat-img all"
                  style={{
                    backgroundImage:
                      c === "All"
                        ? "url(/images/products/all.jpg)"
                        : c === "Snacks"
                        ? "url(/images/home/cat-snacks.jpg)"
                        : c === "Cakes"
                        ? "url(/images/home/cat-cakes.jpg)"
                        : c === "Pickles"
                        ? "url(/images/home/cat-pickles.jpg)"
                        : c === "Powders"
                        ? "url(/images/home/cat-powders.jpg)"
                        : c === "Spices"
                        ? "url(/images/home/cat-spices.jpg)"
                        : "linear-gradient(135deg, #f1e8f4, #efe3f2)",
                  }}
                />
                <span className="cbh-cat-text">
                  <span className="cbh-cat-label">{c}</span>
                  <span className="cbh-cat-cap">Explore</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section id="grid" style={{ padding: "8px 0 26px", background: "#fff" }}>
        <div className="cbh-container" ref={gridRef}>
          <div className="cbh-grid">
            {filtered.map((p) => (
              <div key={p._id} className="cbh-card" style={{ 
                background: "#fff", 
                borderRadius: "12px", 
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                cursor: "pointer"
              }}
              onClick={() => navigate(`/products/${p._id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
              }}
              >
                {/* ✅ Image */}
                <div style={{ position: "relative", overflow: "hidden" }}>
                  {p.image || p.img ? (
                    <img
                      src={`http://localhost:5000/uploads/${p.image || p.img}`}
                      alt={p.title}
                      style={{
                        width: "100%",
                        height: "200px",
                        objectFit: "cover",
                        transition: "transform 0.3s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "200px",
                        backgroundImage: "linear-gradient(135deg, #f5f5f5, #e0e0e0)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#999",
                        fontSize: "14px"
                      }}
                    >
                      No Image
                    </div>
                  )}
                </div>

                {/* ✅ Content */}
                <div style={{ padding: "16px" }}>
                  {/* Title + Category */}
                  <h3 style={{ 
                    margin: "0 0 8px 0", 
                    fontSize: "18px", 
                    fontWeight: "600",
                    color: "#333",
                    lineHeight: "1.3"
                  }}>
                    {p.title}
                  </h3>
                  
                  <p style={{ 
                    fontSize: "12px", 
                    color: "#5c4033", 
                    margin: "0 0 12px 0",
                    fontWeight: "500",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    {p.category?.name || p.category || "Uncategorized"}
                  </p>

                  {/* Hide detailed price/variants on list cards per request */}

                  {/* Add to Cart Button */}
                  <button
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "#5c4033",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#4a3429";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#5c4033";
                    }}
                    onClick={() => navigate(`/products/${p._id}`)}
                  >
                    View
                  </button>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div style={{ 
                gridColumn: "1 / -1", 
                textAlign: "center", 
                padding: "60px 20px",
                color: "#666"
              }}>
                <div style={{
                  fontSize: "48px",
                  marginBottom: "16px",
                  opacity: "0.3"
                }}>
                  🔍
                </div>
                <h3 style={{ 
                  margin: "0 0 8px 0", 
                  fontSize: "20px", 
                  color: "#333" 
                }}>
                  No products found
                </h3>
                <p style={{ 
                  margin: "0", 
                  fontSize: "14px", 
                  color: "#666" 
                }}>
                  Try adjusting your search or filter criteria
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
