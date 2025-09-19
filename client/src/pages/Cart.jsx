import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (auth.currentUser) {
      fetchCart();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCart = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch("http://localhost:5000/api/cart", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCart(data);
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
      toast.error("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;

    try {
      setUpdating(true);
      const user = auth.currentUser;
      const token = await user.getIdToken();

      const response = await fetch("http://localhost:5000/api/cart/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemId,
          quantity: newQuantity,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCart(data);
        toast.success("Cart updated successfully!");
      } else {
        throw new Error("Failed to update cart");
      }
    } catch (error) {
      console.error("Error updating cart:", error);
      toast.error("Failed to update cart");
    } finally {
      setUpdating(false);
    }
  };

  const removeItem = async (itemId) => {
    try {
      setUpdating(true);
      const user = auth.currentUser;
      const token = await user.getIdToken();

      const response = await fetch(`http://localhost:5000/api/cart/remove/${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCart(data);
        toast.success("Item removed from cart!");
      } else {
        throw new Error("Failed to remove item");
      }
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("Failed to remove item");
    } finally {
      setUpdating(false);
    }
  };

  const clearCart = async () => {
    if (!window.confirm("Are you sure you want to clear your cart?")) return;

    try {
      setUpdating(true);
      const user = auth.currentUser;
      const token = await user.getIdToken();

      const response = await fetch("http://localhost:5000/api/cart/clear", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setCart({ items: [], totalAmount: 0 });
        toast.success("Cart cleared successfully!");
      } else {
        throw new Error("Failed to clear cart");
      }
    } catch (error) {
      console.error("Error clearing cart:", error);
      toast.error("Failed to clear cart");
    } finally {
      setUpdating(false);
    }
  };

  if (!auth.currentUser) {
    return (
      <div style={containerStyle}>
        <div style={loginPromptStyle}>
          <h2>Please Login to View Your Cart</h2>
          <p>You need to be logged in to view and manage your cart items.</p>
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
          <p>Loading your cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>🛒 Your Cart</h1>
        <p style={subtitleStyle}>
          {cart.items.length} {cart.items.length === 1 ? "item" : "items"} in your cart
        </p>
      </div>

      {cart.items.length === 0 ? (
        <div style={emptyCartStyle}>
          <div style={emptyIconStyle}>🛒</div>
          <h2>Your cart is empty</h2>
          <p>Add some delicious products to get started!</p>
          <button onClick={() => navigate("/products")} style={buttonPrimary}>
            Browse Products
          </button>
        </div>
      ) : (
        <div style={cartContainerStyle}>
          {/* Cart Items */}
          <div style={itemsContainerStyle}>
            {cart.items.map((item) => {
              const imageUrl = item.productId.image
                ? `http://localhost:5000/uploads/${item.productId.image}`
                : item.productId.img
                ? `http://localhost:5000/uploads/${item.productId.img}`
                : "/images/placeholder.png";

              return (
                <div key={item._id} style={itemCardStyle}>
                  <div style={itemImageStyle}>
                    <img
                      src={imageUrl}
                      alt={item.productId.title}
                      style={productImageStyle}
                      onError={(e) => {
                        e.target.src = "/images/placeholder.png";
                      }}
                    />
                  </div>

                  <div style={itemDetailsStyle}>
                    <h3 style={itemTitleStyle}>{item.productId.title}</h3>
                    <p style={itemVariantStyle}>
                      {item.variant.weight} - ₹{item.variant.price}
                    </p>
                    
                    <div style={quantityContainerStyle}>
                      <label style={quantityLabelStyle}>Quantity:</label>
                      <div style={quantitySelectorStyle}>
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity - 1)}
                          disabled={updating || item.quantity <= 1}
                          style={quantityButtonStyle}
                        >
                          -
                        </button>
                        <span style={quantityValueStyle}>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity + 1)}
                          disabled={updating}
                          style={quantityButtonStyle}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div style={itemPriceStyle}>
                      ₹{(item.variant.price * item.quantity).toFixed(2)}
                    </div>
                  </div>

                  <div style={itemActionsStyle}>
                    <button
                      onClick={() => navigate(`/products/${item.productId._id}`)}
                      style={viewButtonStyle}
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => removeItem(item._id)}
                      disabled={updating}
                      style={removeButtonStyle}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cart Summary */}
          <div style={summaryContainerStyle}>
            <div style={summaryCardStyle}>
              <h3 style={summaryTitleStyle}>Cart Summary</h3>
              
              <div style={summaryRowStyle}>
                <span>Items ({cart.items.length}):</span>
                <span>₹{cart.totalAmount.toFixed(2)}</span>
              </div>
              
              <div style={summaryRowStyle}>
                <span>Delivery:</span>
                <span style={{ color: "#22c55e" }}>FREE</span>
              </div>
              
              <hr style={summaryDividerStyle} />
              
              <div style={totalRowStyle}>
                <span>Total:</span>
                <span>₹{cart.totalAmount.toFixed(2)}</span>
              </div>

              <div style={actionButtonsStyle}>
                <button
                  onClick={clearCart}
                  disabled={updating}
                  style={clearButtonStyle}
                >
                  Clear Cart
                </button>
                <button
                  onClick={() => navigate("/checkout", { state: { cartItems: cart.items } })}
                  style={checkoutButtonStyle}
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const containerStyle = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #f5f1eb 0%, #e8dcc6 100%)",
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

const emptyCartStyle = {
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

const cartContainerStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 350px",
  gap: "30px",
  maxWidth: "1200px",
  margin: "0 auto",
};

const itemsContainerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

const itemCardStyle = {
  background: "#fff",
  borderRadius: "12px",
  padding: "20px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  display: "grid",
  gridTemplateColumns: "120px 1fr auto",
  gap: "20px",
  alignItems: "center",
};

const itemImageStyle = {
  width: "120px",
  height: "120px",
  borderRadius: "8px",
  overflow: "hidden",
};

const productImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const itemDetailsStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const itemTitleStyle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#333",
  margin: "0",
};

const itemVariantStyle = {
  fontSize: "14px",
  color: "#666",
  margin: "0",
};

const quantityContainerStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const quantityLabelStyle = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#333",
};

const quantitySelectorStyle = {
  display: "flex",
  alignItems: "center",
  border: "2px solid #e0e0e0",
  borderRadius: "6px",
  overflow: "hidden",
};

const quantityButtonStyle = {
  background: "#5c4033",
  color: "#fff",
  border: "none",
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: "600",
  transition: "background 0.3s ease",
};

const quantityValueStyle = {
  padding: "8px 16px",
  fontSize: "14px",
  fontWeight: "600",
  background: "#fff",
  minWidth: "40px",
  textAlign: "center",
};

const itemPriceStyle = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#5c4033",
};

const itemActionsStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const viewButtonStyle = {
  background: "#5c4033",
  color: "#fff",
  border: "none",
  padding: "8px 16px",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: "500",
  cursor: "pointer",
  transition: "background 0.3s ease",
};

const removeButtonStyle = {
  background: "#dc3545",
  color: "#fff",
  border: "none",
  padding: "8px 16px",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: "500",
  cursor: "pointer",
  transition: "background 0.3s ease",
};

const summaryContainerStyle = {
  position: "sticky",
  top: "20px",
};

const summaryCardStyle = {
  background: "#fff",
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
};

const summaryTitleStyle = {
  fontSize: "20px",
  fontWeight: "600",
  color: "#333",
  margin: "0 0 20px 0",
};

const summaryRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "12px",
  fontSize: "14px",
  color: "#666",
};

const summaryDividerStyle = {
  border: "none",
  borderTop: "1px solid #e0e0e0",
  margin: "16px 0",
};

const totalRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "18px",
  fontWeight: "700",
  color: "#5c4033",
  marginBottom: "20px",
};

const actionButtonsStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const clearButtonStyle = {
  background: "#dc3545",
  color: "#fff",
  border: "none",
  padding: "12px 20px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "background 0.3s ease",
};

const checkoutButtonStyle = {
  background: "#5c4033",
  color: "#fff",
  border: "none",
  padding: "12px 20px",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: "600",
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
