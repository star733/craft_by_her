import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function PaymentSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [loading, setLoading] = useState(false);

  // Get order data from location state
  const { cartItems, buyerDetails, orderData } = location.state || {};

  useEffect(() => {
    // Redirect if no order data
    if (!cartItems || !buyerDetails) {
      toast.error("No order data found. Please start from checkout.");
      navigate("/checkout");
    }
  }, [cartItems, buyerDetails, navigate]);

  const calculateTotals = () => {
    const totalAmount = cartItems?.reduce((sum, item) => {
      return sum + (item.variant.price * item.quantity);
    }, 0) || 0;
    
    const shippingCharges = 50; // Fixed shipping charge
    const finalAmount = totalAmount + shippingCharges;
    
    return { totalAmount, shippingCharges, finalAmount };
  };

  const handlePlaceOrder = async () => {
    if (!auth.currentUser) {
      toast.error("Please login to continue");
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      const user = auth.currentUser;
      const token = await user.getIdToken();

      // Transform cartItems to match backend expectations
      const transformedItems = cartItems.map(item => {
        const pid = item?.productId?._id || item?.productId || item?._id || item?.id;
        return {
          productId: pid,
          title: item?.productId?.title || item?.title || "",
          image: item?.productId?.image || item?.image || "",
          variant: item?.variant,
          quantity: item?.quantity || 1
        };
      });

      const finalOrderData = {
        items: transformedItems,
        buyerDetails,
        paymentMethod,
        notes: "",
      };

      console.log("Creating order:", finalOrderData);

      const response = await fetch("http://localhost:5000/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(finalOrderData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create order");
      }

      const result = await response.json();
      console.log("Order created:", result);

      // Redirect based on payment method
      if (paymentMethod === "online") {
        navigate("/payment", { 
          state: { 
            order: result.order,
            amount: calculateTotals().finalAmount 
          } 
        });
      } else {
        // For COD, replace history so user can't go back to payment page
        navigate(`/order-confirmation/${result.order._id}`, { 
          state: { order: result.order },
          replace: true 
        });
      }
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error(`Failed to place order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!cartItems || !buyerDetails) {
    return null;
  }

  const { totalAmount, shippingCharges, finalAmount } = calculateTotals();

  return (
    <div style={{ 
      background: "linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)", 
      minHeight: "100vh",
      paddingTop: "20px",
      paddingBottom: "40px"
    }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 20px" }}>
        {/* Header */}
        <div style={{ 
          textAlign: "center", 
          marginBottom: "30px",
          paddingBottom: "20px",
          borderBottom: "2px solid #e0e0e0"
        }}>
          <h1 style={{ 
            color: "#5c4033", 
            fontSize: "32px", 
            fontWeight: "700",
            marginBottom: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px"
          }}>
            💳 Choose Payment Method
          </h1>
          <p style={{ color: "#666", fontSize: "14px" }}>Review your order and select payment option</p>
        </div>

        <div style={{ display: "grid", gap: "24px" }}>
          {/* Order Summary */}
          <div style={{ 
            background: "linear-gradient(135deg, #ffffff 0%, #fafafa 100%)", 
            padding: "28px", 
            borderRadius: "16px", 
            border: "2px solid #e8e8e8",
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)"
          }}>
            <h2 style={{ 
              marginBottom: "24px", 
              color: "#5c4033", 
              fontSize: "22px", 
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              borderBottom: "2px solid #e8e8e8",
              paddingBottom: "16px"
            }}>
              📦 Order Summary
            </h2>
          
          {/* Cart Items */}
          <div style={{ marginBottom: "20px" }}>
            {cartItems.map((item, index) => (
              <div key={index} style={{ 
                display: "flex", 
                gap: "16px", 
                marginBottom: "16px", 
                paddingBottom: "16px", 
                borderBottom: index < cartItems.length - 1 ? "1px solid #eee" : "none" 
              }}>
                <div style={{ width: "80px", height: "80px", background: "#f5f5f5", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {item.image || (item.productId && item.productId.image) ? (
                    <img
                      src={`http://localhost:5000/uploads/${item.image || (item.productId && item.productId.image)}`}
                      alt={item.title || (item.productId && item.productId.title) || "Product"}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: "12px", color: "#999" }}>No Image</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>
                    {item.title || (item.productId && item.productId.title) || "Product"}
                  </h4>
                  <div style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>
                    {item.variant?.weight}
                  </div>
                  <div style={{ fontSize: "14px", color: "#5c4033", fontWeight: "600" }}>
                    ₹{item.variant?.price} × {item.quantity} = ₹{(item.variant?.price || 0) * (item.quantity || 0)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Price Breakdown */}
          <div style={{ 
            background: "#f9f9f9",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid #e8e8e8",
            marginTop: "16px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "15px" }}>
              <span style={{ color: "#555" }}>Subtotal:</span>
              <span style={{ fontWeight: "600" }}>₹{totalAmount}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", fontSize: "15px" }}>
              <span style={{ color: "#555" }}>Shipping:</span>
              <span style={{ fontWeight: "600", color: "#333" }}>
                ₹{shippingCharges}
              </span>
            </div>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              fontSize: "22px", 
              fontWeight: "700", 
              color: "#5c4033", 
              paddingTop: "16px", 
              borderTop: "2px dashed #d0d0d0",
              marginTop: "8px"
            }}>
              <span>Total Amount:</span>
              <span>₹{finalAmount}</span>
            </div>
          </div>
          </div>

          {/* Delivery Address */}
        <div style={{ 
          background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)", 
          padding: "24px", 
          borderRadius: "16px", 
          border: "2px solid #e3e8ef",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
        }}>
          <h2 style={{ 
            marginBottom: "16px", 
            color: "#5c4033",
            fontSize: "18px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            📍 Delivery Address
          </h2>
          <div style={{ 
            background: "#fff", 
            padding: "16px", 
            borderRadius: "8px",
            border: "1px solid #e8e8e8"
          }}>
            <p style={{ margin: "0 0 8px 0", fontWeight: "700", fontSize: "16px", color: "#333" }}>
              {buyerDetails.name}
            </p>
            <p style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#555", lineHeight: "1.6" }}>
              {buyerDetails.address.street}
              {buyerDetails.address.landmark && `, Near ${buyerDetails.address.landmark}`}
            </p>
            <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#555" }}>
              {buyerDetails.address.city}, {buyerDetails.address.state} - {buyerDetails.address.pincode}
            </p>
            <p style={{ 
              margin: "0", 
              fontSize: "14px", 
              color: "#666",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
              <span style={{ fontSize: "16px" }}>📞</span>
              {buyerDetails.phone}
            </p>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div style={{ 
          background: "linear-gradient(135deg, #ffffff 0%, #fafafa 100%)", 
          padding: "28px", 
          borderRadius: "16px", 
          border: "2px solid #e8e8e8",
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{ 
            marginBottom: "24px", 
            color: "#5c4033", 
            fontSize: "22px", 
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            borderBottom: "2px solid #e8e8e8",
            paddingBottom: "16px"
          }}>
            💳 Choose Payment Method
          </h2>
          
          <div style={{ display: "grid", gap: "16px" }}>
            {/* Online Payment Option */}
            <label 
              style={{ 
                display: "block",
                padding: "20px", 
                border: paymentMethod === "online" ? "3px solid #667eea" : "2px solid #ddd",
                borderRadius: "16px", 
                cursor: "pointer",
                background: paymentMethod === "online" ? "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)" : "white",
                transition: "all 0.3s ease",
                boxShadow: paymentMethod === "online" ? "0 4px 12px rgba(102, 126, 234, 0.2)" : "0 2px 6px rgba(0,0,0,0.05)"
              }}
              onMouseEnter={(e) => {
                if (paymentMethod !== "online") {
                  e.currentTarget.style.borderColor = "#667eea";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (paymentMethod !== "online") {
                  e.currentTarget.style.borderColor = "#ddd";
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="online"
                  checked={paymentMethod === "online"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ marginTop: "4px", width: "20px", height: "20px", cursor: "pointer" }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "10px", 
                    marginBottom: "8px" 
                  }}>
                    <span style={{ fontSize: "24px" }}>💳</span>
                    <div style={{ fontWeight: "700", fontSize: "18px", color: "#333" }}>Online Payment</div>
                  </div>
                  <div style={{ fontSize: "14px", color: "#666", marginBottom: "12px" }}>
                    Pay securely using UPI, Cards, Net Banking, Wallets & More
                  </div>
                  <div style={{ 
                    display: "flex", 
                    gap: "8px", 
                    flexWrap: "wrap", 
                    fontSize: "11px",
                    fontWeight: "600"
                  }}>
                    <span style={{ background: "#e8f4fd", color: "#1976d2", padding: "4px 10px", borderRadius: "12px" }}>UPI</span>
                    <span style={{ background: "#e8f4fd", color: "#1976d2", padding: "4px 10px", borderRadius: "12px" }}>Cards</span>
                    <span style={{ background: "#e8f4fd", color: "#1976d2", padding: "4px 10px", borderRadius: "12px" }}>Net Banking</span>
                    <span style={{ background: "#e8f4fd", color: "#1976d2", padding: "4px 10px", borderRadius: "12px" }}>Wallets</span>
                  </div>
                </div>
              </div>
            </label>
            
            {/* Cash on Delivery Option */}
            <label 
              style={{ 
                display: "block",
                padding: "20px", 
                border: paymentMethod === "cod" ? "3px solid #28a745" : "2px solid #ddd",
                borderRadius: "16px", 
                cursor: "pointer",
                background: paymentMethod === "cod" ? "linear-gradient(135deg, #28a74515 0%, #20c99715 100%)" : "white",
                transition: "all 0.3s ease",
                boxShadow: paymentMethod === "cod" ? "0 4px 12px rgba(40, 167, 69, 0.2)" : "0 2px 6px rgba(0,0,0,0.05)"
              }}
              onMouseEnter={(e) => {
                if (paymentMethod !== "cod") {
                  e.currentTarget.style.borderColor = "#28a745";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (paymentMethod !== "cod") {
                  e.currentTarget.style.borderColor = "#ddd";
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ marginTop: "4px", width: "20px", height: "20px", cursor: "pointer" }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "10px", 
                    marginBottom: "8px" 
                  }}>
                    <span style={{ fontSize: "24px" }}>💵</span>
                    <div style={{ fontWeight: "700", fontSize: "18px", color: "#333" }}>Cash on Delivery</div>
                  </div>
                  <div style={{ fontSize: "14px", color: "#666" }}>
                    Pay when your order is delivered at your doorstep
                  </div>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "16px", marginTop: "24px" }}>
          <button
            onClick={() => navigate("/checkout")}
            style={{
              flex: "0 0 auto",
              padding: "16px 32px",
              background: "white",
              color: "#6c757d",
              border: "2px solid #6c757d",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#6c757d";
              e.target.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "white";
              e.target.style.color = "#6c757d";
            }}
          >
            ← Back
          </button>
          
          <button
            onClick={handlePlaceOrder}
            disabled={loading}
            style={{
              flex: "1",
              padding: "18px 40px",
              background: loading ? "#ccc" : "linear-gradient(135deg, #5c4033 0%, #7d5a47 100%)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "18px",
              fontWeight: "700",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              boxShadow: loading ? "none" : "0 4px 15px rgba(92, 64, 51, 0.3)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px"
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 6px 20px rgba(92, 64, 51, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 15px rgba(92, 64, 51, 0.3)";
              }
            }}
          >
            {loading ? (
              <>
                <span style={{ 
                  display: "inline-block", 
                  width: "16px", 
                  height: "16px", 
                  border: "2px solid white", 
                  borderTopColor: "transparent", 
                  borderRadius: "50%", 
                  animation: "spin 1s linear infinite" 
                }}></span>
                Processing...
              </>
            ) : paymentMethod === "cod" ? (
              <>
                💵 Place Order (COD)
              </>
            ) : (
              <>
                💳 Proceed to Payment
              </>
            )}
          </button>
        </div>

        {/* Trust Badge */}
        <div style={{ 
          textAlign: "center", 
          marginTop: "24px",
          padding: "16px",
          background: "#f0f8ff",
          borderRadius: "12px",
          border: "1px solid #d0e8ff"
        }}>
          <div style={{ 
            fontSize: "14px", 
            color: "#555",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            flexWrap: "wrap"
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ color: "#28a745", fontSize: "16px" }}>✓</span>
              <span>Secure Checkout</span>
            </span>
            <span style={{ color: "#ddd" }}>|</span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ color: "#28a745", fontSize: "16px" }}>✓</span>
              <span>Easy Returns</span>
            </span>
            <span style={{ color: "#ddd" }}>|</span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ color: "#28a745", fontSize: "16px" }}>✓</span>
              <span>Fast Delivery</span>
            </span>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

