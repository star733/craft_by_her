// src/components/ProductCard.jsx
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";

export default function ProductCard({ p }) {
  const navigate = useNavigate();
  
  // Handle both old (img) and new (image) field formats
  const imageUrl = p.image
    ? `http://localhost:5000/uploads/${p.image}` // ✅ new uploads from admin
    : p.img
    ? `http://localhost:5000/uploads/${p.img}`     // ✅ old uploads
    : "/images/placeholder.jpg";                 // fallback

  const handleCardClick = () => {
    navigate(`/products/${p._id}`);
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation(); // Prevent card click
    
    if (!auth.currentUser) {
      toast.error("Please login to add items to cart");
      navigate("/login");
      return;
    }

    if (!p.variants || p.variants.length === 0) {
      toast.error("No variants available for this product");
      return;
    }

    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();

      const response = await fetch("http://localhost:5000/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: p._id,
          variant: p.variants[0], // Use first variant
          quantity: 1,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add to cart");
      }

      toast.success("Added to cart successfully!");
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart");
    }
  };

  return (
    <article className="cbh-card" onClick={handleCardClick} style={{ cursor: "pointer" }}>
      <div
        className="cbh-card-img"
        style={{ backgroundImage: `url(${imageUrl})` }}
        aria-label={p.title}
        role="img"
      />
      <div className="cbh-card-body">
        <div className="cbh-card-title">
          {p.title}
          {p.tag && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 12,
                color: "var(--brand)",
                fontWeight: 700,
              }}
            >
              • {p.tag}
            </span>
          )}
        </div>

        {/* ✅ Variants with weight + price */}
        {p.variants && p.variants.length > 0 ? (
          <div className="cbh-card-price">
            {p.variants.map((v, idx) => (
              <div key={idx}>
                {v.weight} — ₹{v.price}
              </div>
            ))}
          </div>
        ) : (
          <div className="cbh-card-price">₹{p.price || "—"}</div>
        )}

        <button
          className="bk-btn bk-btn--pill bk-btn--primary"
          style={{ marginTop: 10 }}
          onClick={handleCardClick}
        >
          View
        </button>
      </div>
    </article>
  );
}
