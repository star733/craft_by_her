import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Wishlist() {
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState({ products: [] });
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (auth.currentUser) {
      fetchWishlist();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchWishlist = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch("http://localhost:5000/api/wishlist", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWishlist(data);
      }
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      toast.error("Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      setRemoving(true);
      const user = auth.currentUser;
      const token = await user.getIdToken();

      const response = await fetch(`http://localhost:5000/api/wishlist/remove/${productId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWishlist(data);
        toast.success("Removed from wishlist!");
      } else {
        throw new Error("Failed to remove from wishlist");
      }
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      toast.error("Failed to remove from wishlist");
    } finally {
      setRemoving(false);
    }
  };

  const addToCart = async (product) => {
    if (!product.variants || product.variants.length === 0) {
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
          productId: product._id,
          variant: product.variants[0], // Use first variant
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

  if (!auth.currentUser) {
    return (
      <div style={containerStyle}>
        <div style={loginPromptStyle}>
          <h2>Please Login to View Your Wishlist</h2>
          <p>You need to be logged in to view and manage your wishlist items.</p>
          <button onClick={() => navigate("/login")} style={buttonPrimary}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={loadingStyle}>
          <div style={spinnerStyle}></div>
          <p>Loading your wishlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>❤️ Your Wishlist</h1>
        <p style={subtitleStyle}>
          {wishlist.products.length} {wishlist.products.length === 1 ? "item" : "items"} in your wishlist
        </p>
      </div>

      {wishlist.products.length === 0 ? (
        <div style={emptyWishlistStyle}>
          <div style={emptyIconStyle}>❤️</div>
          <h2>Your wishlist is empty</h2>
          <p>Add some products you love to your wishlist!</p>
          <button onClick={() => navigate("/products")} style={buttonPrimary}>
            Browse Products
          </button>
        </div>
      ) : (
        <div style={wishlistGridStyle}>
          {wishlist.products.map((product) => {
            const imageUrl = product.image
              ? `http://localhost:5000/uploads/${product.image}`
              : product.img
              ? `http://localhost:5000/uploads/${product.img}`
              : "/images/placeholder.png";

            return (
              <div key={product._id} style={productCardStyle}>
                <div style={imageContainerStyle}>
                  <img
                    src={imageUrl}
                    alt={product.title}
                    style={productImageStyle}
                    onError={(e) => {
                      e.target.src = "/images/placeholder.png";
                    }}
                  />
                  <button
                    onClick={() => removeFromWishlist(product._id)}
                    disabled={removing}
                    style={removeButtonStyle}
                  >
                    ❌
                  </button>
                </div>

                <div style={productDetailsStyle}>
                  <h3 style={productTitleStyle}>{product.title}</h3>
                  <p style={categoryStyle}>
                    {product.category?.name || "Uncategorized"}
                  </p>

                  {product.variants && product.variants.length > 0 ? (
                    <div style={variantsStyle}>
                      {product.variants.map((variant, index) => (
                        <div key={index} style={variantStyle}>
                          <span style={variantWeightStyle}>{variant.weight}</span>
                          <span style={variantPriceStyle}>₹{variant.price}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={priceStyle}>₹{product.price || "—"}</div>
                  )}

                  <div style={actionButtonsStyle}>
                    <button
                      onClick={() => navigate(`/products/${product._id}`)}
                      style={viewButtonStyle}
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => addToCart(product)}
                      style={addToCartButtonStyle}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Styles
const containerStyle = {
  minHeight: "100vh",
  background: "#f8fafc",
  padding: "20px",
  fontFamily: "Inter, sans-serif",
};

const loadingStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "50vh",
  gap: "20px",
};

const spinnerStyle = {
  width: "40px",
  height: "40px",
  border: "4px solid #f3f3f3",
  borderTop: "4px solid #5c4033",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};

const loginPromptStyle = {
  textAlign: "center",
  padding: "40px",
  background: "#fff",
  borderRadius: "16px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
  maxWidth: "400px",
  margin: "0 auto",
};

const headerStyle = {
  textAlign: "center",
  marginBottom: "30px",
};

const titleStyle = {
  fontSize: "32px",
  fontWeight: "700",
  color: "#5c4033",
  margin: "0 0 10px 0",
};

const subtitleStyle = {
  fontSize: "16px",
  color: "#666",
  margin: "0",
};

const emptyWishlistStyle = {
  textAlign: "center",
  padding: "60px 20px",
  background: "#fff",
  borderRadius: "16px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
  maxWidth: "400px",
  margin: "0 auto",
};

const emptyIconStyle = {
  fontSize: "64px",
  marginBottom: "20px",
};

const wishlistGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "24px",
  maxWidth: "1200px",
  margin: "0 auto",
};

const productCardStyle = {
  background: "#fff",
  borderRadius: "12px",
  overflow: "hidden",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
};

const imageContainerStyle = {
  position: "relative",
  height: "200px",
  overflow: "hidden",
};

const productImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const removeButtonStyle = {
  position: "absolute",
  top: "8px",
  right: "8px",
  background: "rgba(220, 53, 69, 0.9)",
  color: "#fff",
  border: "none",
  borderRadius: "50%",
  width: "32px",
  height: "32px",
  cursor: "pointer",
  fontSize: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background 0.3s ease",
};

const productDetailsStyle = {
  padding: "20px",
};

const productTitleStyle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#333",
  margin: "0 0 8px 0",
  lineHeight: "1.3",
};

const categoryStyle = {
  fontSize: "12px",
  color: "#666",
  margin: "0 0 12px 0",
  textTransform: "uppercase",
  fontWeight: "500",
};

const variantsStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  marginBottom: "16px",
};

const variantStyle = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "14px",
};

const variantWeightStyle = {
  color: "#666",
};

const variantPriceStyle = {
  color: "#5c4033",
  fontWeight: "600",
};

const priceStyle = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#5c4033",
  marginBottom: "16px",
};

const actionButtonsStyle = {
  display: "flex",
  gap: "8px",
};

const viewButtonStyle = {
  flex: "1",
  background: "#5c4033",
  color: "#fff",
  border: "none",
  padding: "10px 16px",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: "500",
  cursor: "pointer",
  transition: "background 0.3s ease",
};

const addToCartButtonStyle = {
  flex: "1",
  background: "#22c55e",
  color: "#fff",
  border: "none",
  padding: "10px 16px",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: "500",
  cursor: "pointer",
  transition: "background 0.3s ease",
};

const buttonPrimary = {
  background: "#5c4033",
  color: "#fff",
  border: "none",
  padding: "12px 24px",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "background 0.3s ease",
};

// Add CSS animation for spinner
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
