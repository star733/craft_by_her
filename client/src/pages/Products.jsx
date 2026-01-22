// src/pages/Products.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { MAIN_CATEGORIES, ALL_SUBCATEGORIES } from "../data/categories";

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function Products() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [activeMainCategory, setActiveMainCategory] = useState(null);
  const [activeSubCategory, setActiveSubCategory] = useState(null);
  const [q, setQ] = useState("");
  const gridRef = useRef(null);

  // ✅ Fetch products from backend
  useEffect(() => {
    fetch("http://localhost:5000/api/items")
      .then((res) => res.json())
      .then((data) => {
        console.log("Products API response:", data);
        const items = Array.isArray(data) ? data : data.products || [];
        setProducts(items);
      })
      .catch((err) => console.error("Failed to load products:", err));
  }, []);
  
  // ✅ Sync category with URL
  useEffect(() => {
    const mainCat = params.get("main");
    const subCat = params.get("sub");
    const cat = params.get("cat"); // Legacy support

    if (cat === "bestsellers") {
      setActiveMainCategory(null);
      setActiveSubCategory("Bestsellers");
      return;
    }

    if (mainCat) {
      const main = Object.keys(MAIN_CATEGORIES).find(
        (k) => slugify(k) === mainCat
      );
      if (main) setActiveMainCategory(main);
    }

    if (subCat) {
      const sub = ALL_SUBCATEGORIES.find((s) => slugify(s) === subCat);
      if (sub) setActiveSubCategory(sub);
    } else if (cat) {
      // Legacy category support
      const legacy = ALL_SUBCATEGORIES.find((c) => slugify(c) === cat);
      if (legacy) {
        // Find which main category this subcategory belongs to
        const main = Object.keys(MAIN_CATEGORIES).find((mainKey) =>
          MAIN_CATEGORIES[mainKey].subcategories.includes(legacy)
        );
        if (main) {
          setActiveMainCategory(main);
          setActiveSubCategory(legacy);
        }
      }
    }
  }, [params]);

  // ✅ Scroll if #grid
  useEffect(() => {
    if (location.hash === "#grid" && gridRef.current) {
      setTimeout(() => {
        gridRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, [location.hash, activeMainCategory, activeSubCategory, q]);

  // ✅ Filter products
  const filtered = useMemo(() => {
    // Exclude test products first
    let base = products.filter(p => {
      if (p.title && p.title.toLowerCase().includes("test product")) return false;
      return true;
    });

    if (activeSubCategory === "Bestsellers") {
      // Show bestsellers: 3 craft products and 2 food products
      const craftProducts = products.filter((p) => {
        // Check new structure first
        if (p.mainCategory === "Crafts") return true;
        // Check legacy structure - if category contains "craft" (case-insensitive)
        if (p.category && typeof p.category === 'string' && p.category.toLowerCase().includes('craft')) return true;
        return false;
      });
      
      const foodProducts = products.filter((p) => {
        // Check new structure first
        if (p.mainCategory === "Food") return true;
        // Check legacy structure - if mainCategory is not Crafts and category doesn't contain "craft"
        if (p.mainCategory && p.mainCategory !== "Crafts") return true;
        // If no mainCategory, check if category exists and doesn't contain "craft"
        if (p.category && typeof p.category === 'string' && !p.category.toLowerCase().includes('craft')) return true;
        // If category is an object (legacy), assume it's food
        if (p.category && typeof p.category === 'object') return true;
        return false;
      });

      // Get 3 craft products (prioritize by creation date or tag)
      const selectedCrafts = [...craftProducts]
        .sort((a, b) => {
          const aIsTagged = (a.tag || "").toLowerCase().includes("bestseller") || a.isBestseller === true;
          const bIsTagged = (b.tag || "").toLowerCase().includes("bestseller") || b.isBestseller === true;
          if (aIsTagged && !bIsTagged) return -1;
          if (!aIsTagged && bIsTagged) return 1;
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        })
        .slice(0, 3);

      // Get 2 food products (prioritize by creation date or tag)
      const selectedFood = [...foodProducts]
        .sort((a, b) => {
          const aIsTagged = (a.tag || "").toLowerCase().includes("bestseller") || a.isBestseller === true;
          const bIsTagged = (b.tag || "").toLowerCase().includes("bestseller") || b.isBestseller === true;
          if (aIsTagged && !bIsTagged) return -1;
          if (!aIsTagged && bIsTagged) return 1;
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        })
        .slice(0, 2);

      // Combine: 3 crafts + 2 food
      base = [...selectedCrafts, ...selectedFood];
    } else if (activeSubCategory) {
      base = products.filter((p) => {
        // Check new structure first
        if (p.subCategory === activeSubCategory) return true;
        // Check legacy structure
        if (p.category === activeSubCategory || p.category?.name === activeSubCategory) return true;
        return false;
      });
    } else if (activeMainCategory) {
      base = products.filter((p) => {
        // Check new structure first
        if (p.mainCategory === activeMainCategory) return true;
        // Check legacy - find if category belongs to this main category
        const subcats = MAIN_CATEGORIES[activeMainCategory].subcategories;
        const catName = p.category?.name || p.category;
        return subcats.includes(catName);
      });
    }

    const rq = q.trim().toLowerCase();
    if (!rq) return base;
    return base.filter(
      (p) =>
        p.title.toLowerCase().includes(rq) ||
        (p.tag || "").toLowerCase().includes(rq)
    );
  }, [products, activeMainCategory, activeSubCategory, q]);

  const onPickMainCategory = (mainCat) => {
    setActiveMainCategory(mainCat);
    setActiveSubCategory(null);
    navigate(`/products?main=${slugify(mainCat)}#grid`);
  };

  const onPickSubCategory = (subCat) => {
    setActiveSubCategory(subCat);
    const main = Object.keys(MAIN_CATEGORIES).find((mainKey) =>
      MAIN_CATEGORIES[mainKey].subcategories.includes(subCat)
    );
    if (main) {
      setActiveMainCategory(main);
      navigate(`/products?main=${slugify(main)}&sub=${slugify(subCat)}#grid`);
    }
  };

  const onClearFilters = () => {
    setActiveMainCategory(null);
    setActiveSubCategory(null);
    navigate(`/products#grid`);
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
                Honest Food & Handcrafted Items
              </p>
            </div>

            {/* Search */}
            <div>
              <input
                type="search"
                placeholder="Search products…"
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

      {/* Main Category strip */}
      <section className="cbh-cat-wrap" aria-label="Main Categories">
        <div className="cbh-container">
          <div className="cbh-cat-strip">
            <button
              className={`cbh-cat-pill ${!activeMainCategory && !activeSubCategory ? "active" : ""}`}
              onClick={onClearFilters}
              aria-pressed={!activeMainCategory && !activeSubCategory}
            >
              <span
                className="cbh-cat-img all"
                style={{
                  backgroundImage: "url(/images/products/all.jpg)",
                }}
              />
              <span className="cbh-cat-text">
                <span className="cbh-cat-label">All</span>
                <span className="cbh-cat-cap">Explore</span>
              </span>
            </button>
            {Object.keys(MAIN_CATEGORIES).map((mainCat) => (
              <button
                key={mainCat}
                className={`cbh-cat-pill ${activeMainCategory === mainCat ? "active" : ""}`}
                onClick={() => onPickMainCategory(mainCat)}
                aria-pressed={activeMainCategory === mainCat}
              >
                <span
                  className="cbh-cat-img"
                  style={{
                    backgroundImage:
                      mainCat === "Food"
                        ? "url(/images/home/cat-snacks.jpg)"
                        : mainCat === "Crafts"
                        ? "url(/images/home/cat-crafts.jpg)"
                        : "linear-gradient(135deg, #f1e8f4, #efe3f2)",
                  }}
                />
                <span className="cbh-cat-text">
                  <span className="cbh-cat-label">{mainCat}</span>
                  <span className="cbh-cat-cap">Explore</span>
                </span>
              </button>
            ))}
            <button
              className={`cbh-cat-pill ${activeSubCategory === "Bestsellers" ? "active" : ""}`}
              onClick={() => {
                setActiveSubCategory("Bestsellers");
                setActiveMainCategory(null);
                navigate(`/products?cat=bestsellers#grid`);
              }}
              aria-pressed={activeSubCategory === "Bestsellers"}
            >
              <span
                className="cbh-cat-img"
                style={{
                  backgroundImage: "url(/images/home/cat-bestsellers.jpg)",
                }}
              />
              <span className="cbh-cat-text">
                <span className="cbh-cat-label">Bestsellers</span>
                <span className="cbh-cat-cap">Explore</span>
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Sub Category strip (shown when main category is selected) */}
      {activeMainCategory && (
        <section
          className="cbh-cat-wrap"
          aria-label="Sub Categories"
          style={{ background: "#f9f9f9", borderTop: "1px solid var(--border)" }}
        >
          <div className="cbh-container">
            <div className="cbh-cat-strip">
              {MAIN_CATEGORIES[activeMainCategory].subcategories.map((subCat) => (
                <button
                  key={subCat}
                  className={`cbh-cat-pill ${activeSubCategory === subCat ? "active" : ""}`}
                  onClick={() => onPickSubCategory(subCat)}
                  aria-pressed={activeSubCategory === subCat}
                  style={{ fontSize: "14px" }}
                >
                  <span className="cbh-cat-text">
                    <span className="cbh-cat-label">{subCat}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

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
                    {p.mainCategory && p.subCategory 
                      ? `${p.mainCategory} > ${p.subCategory}`
                      : p.subCategory || p.category?.name || p.category || "Uncategorized"}
                  </p>

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
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/products/${p._id}`);
                    }}
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
