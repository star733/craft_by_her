import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Load Razorpay script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(1); // 1: Payment Method, 2: Processing, 3: Success/Failure

  useEffect(() => {
    if (!auth.currentUser) {
      toast.error("Please login to proceed with payment");
      navigate("/login");
      return;
    }

    if (location.state?.order && location.state?.amount) {
      setOrder(location.state.order);
      setAmount(location.state.amount);
    } else {
      toast.error("No order found");
      navigate("/cart");
    }
  }, [navigate, location.state]);

  const handleRazorpayPayment = async () => {
    try {
      setProcessing(true);
      setStep(2);

      // Load Razorpay script
      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded) {
        throw new Error("Failed to load Razorpay");
      }

      const user = auth.currentUser;
      const token = await user.getIdToken();

      // Create Razorpay order
      const response = await fetch("http://localhost:5000/api/payment/create-razorpay-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: order._id,
          amount: amount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create payment order");
      }

      const { order: razorpayOrder, key } = await response.json();

      console.log("=== FRONTEND RAZORPAY DEBUG ===");
      console.log("Received key from server:", key);
      console.log("Razorpay order:", razorpayOrder);

      // Force real Razorpay payment - no mock mode
      console.log("🚀 Opening REAL Razorpay payment gateway");
      console.log("Key:", key);
      console.log("Amount:", razorpayOrder.amount);
      console.log("Order ID:", razorpayOrder.id);

      // Razorpay options for real payments
      const options = {
        key: key,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "CraftedByHer",
        description: `Order #${order.orderNumber}`,
        order_id: razorpayOrder.id,
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
          emi: true,
          paylater: true
        },
        handler: async function (response) {
          try {
            // Verify payment
            const verifyResponse = await fetch("http://localhost:5000/api/payment/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                orderId: order._id,
                razorpay_order_id: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });

            if (!verifyResponse.ok) {
              throw new Error("Payment verification failed");
            }

            const verifyData = await verifyResponse.json();
            const updatedOrder = verifyData.order || { ...order, paymentStatus: "paid", orderStatus: "confirmed" };

            setStep(3);
            toast.success("Payment successful!");
            
            // Redirect to order confirmation with updated order from server
            // Use replace: true to prevent going back to payment page
            setTimeout(() => {
              navigate("/order-confirmation", {
                state: { order: updatedOrder, paymentSuccess: true },
                replace: true
              });
            }, 2000);
          } catch (error) {
            console.error("Payment verification error:", error);
            toast.error("Payment verification failed");
            setStep(3);
          }
        },
        prefill: {
          name: order.buyerDetails.name,
          email: order.buyerDetails.email,
          contact: order.buyerDetails.phone,
        },
        notes: {
          order_number: order.orderNumber,
        },
        theme: {
          color: "#5c4033",
        },
        config: {
          display: {
            sequence: ['block.upi', 'block.card', 'block.netbanking', 'block.wallet', 'block.paylater'],
            preferences: {
              show_default_blocks: true,
            },
          },
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
            setStep(1);
            toast.info("Payment cancelled");
          },
        },
      };

      console.log("🔧 Creating Razorpay instance with options:", options);
      
      if (!window.Razorpay) {
        throw new Error("Razorpay script not loaded properly");
      }
      
      const razorpayInstance = new window.Razorpay(options);
      console.log("✅ Razorpay instance created successfully");
      console.log("🚀 Opening Razorpay payment gateway...");
      
      razorpayInstance.open();
      console.log("✅ Razorpay gateway opened!");
    } catch (error) {
      console.error("Payment error:", error);
      toast.error(`Payment failed: ${error.message}`);
      setProcessing(false);
      setStep(1);
    }
  };

  const handleCODPayment = async () => {
    try {
      setProcessing(true);
      setStep(2);

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      setStep(3);
      toast.success("Order placed successfully!");
      
      // Redirect to order confirmation
      setTimeout(() => {
        navigate("/order-confirmation", {
          state: { order: { ...order, paymentStatus: "pending" } },
        });
      }, 2000);
    } catch (error) {
      console.error("COD error:", error);
      toast.error("Failed to place order");
      setProcessing(false);
      setStep(1);
    }
  };

  const getStatusIcon = () => {
    switch (step) {
      case 1:
        return "💳";
      case 2:
        return "⏳";
      case 3:
        return "✅";
      default:
        return "💳";
    }
  };

  const getStatusText = () => {
    switch (step) {
      case 1:
        return "Choose Payment Method";
      case 2:
        return "Processing Payment...";
      case 3:
        return "Payment Successful!";
      default:
        return "Choose Payment Method";
    }
  };

  if (!order) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "50vh",
        fontSize: "18px",
        color: "#666"
      }}>
        Loading order details...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)",
      padding: "40px 20px",
      paddingTop: "20px"
    }}>
      <div style={{
        maxWidth: "900px",
        margin: "0 auto"
      }}>
        {/* Header */}
        <div style={{
          textAlign: "center",
          marginBottom: "30px",
          paddingBottom: "20px",
          borderBottom: "2px solid #e0e0e0"
        }}>
          <div style={{ fontSize: "56px", marginBottom: "12px" }}>
            {getStatusIcon()}
          </div>
          <h1 style={{
            color: "#5c4033",
            fontSize: "32px",
            fontWeight: "700",
            marginBottom: "8px",
            margin: "0"
          }}>
            {getStatusText()}
          </h1>
          <p style={{ color: "#666", fontSize: "16px", margin: "10px 0 0" }}>
            Order #{order.orderNumber}
          </p>
        </div>

        <div style={{
          backgroundColor: "white",
          borderRadius: "16px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          overflow: "hidden"
        }}>

        {/* Content */}
        <div style={{ padding: "30px" }}>
          {step === 1 && (
            <>
              {/* Order Summary */}
              <div style={{
                background: "linear-gradient(135deg, #ffffff 0%, #fafafa 100%)",
                borderRadius: "16px",
                padding: "28px",
                marginBottom: "30px",
                border: "2px solid #e8e8e8",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
              }}>
                <h3 style={{
                  margin: "0 0 20px",
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
                </h3>
                <div style={{
                  background: "#f9f9f9",
                  padding: "20px",
                  borderRadius: "12px",
                  border: "1px solid #e8e8e8"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "15px" }}>
                    <span style={{ color: "#555" }}>Items ({order.items.length})</span>
                    <span style={{ fontWeight: "600" }}>₹{order.totalAmount.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", fontSize: "15px" }}>
                    <span style={{ color: "#555" }}>Shipping</span>
                    <span style={{ fontWeight: "600", color: "#333" }}>₹{(order.shippingCharges || 50).toFixed(2)}</span>
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
                    <span>₹{(order.finalAmount || (order.totalAmount + (order.shippingCharges || 50))).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Online Payment - Only Option */}
              <div style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                padding: "32px",
                borderRadius: "16px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                color: "white",
                marginBottom: "30px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                  <div style={{
                    fontSize: "48px",
                    background: "rgba(255,255,255,0.2)",
                    borderRadius: "12px",
                    padding: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    💳
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "700" }}>Secure Online Payment</h2>
                    <p style={{ margin: "4px 0 0 0", opacity: 0.9 }}>Powered by Razorpay</p>
                  </div>
                </div>

                <div style={{
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: "12px",
                  padding: "16px",
                  marginTop: "20px"
                }}>
                  <p style={{ margin: "0 0 12px 0", fontWeight: "600" }}>✓ 100% Secure & Encrypted Payments</p>
                  <p style={{ margin: "0 0 12px 0", fontSize: "14px", opacity: 0.9 }}>
                    Pay using your preferred method - All major payment options available
                  </p>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", fontSize: "12px" }}>
                    <span style={{ background: "rgba(255,255,255,0.2)", padding: "6px 12px", borderRadius: "20px" }}>🔵 UPI</span>
                    <span style={{ background: "rgba(255,255,255,0.2)", padding: "6px 12px", borderRadius: "20px" }}>💳 Cards</span>
                    <span style={{ background: "rgba(255,255,255,0.2)", padding: "6px 12px", borderRadius: "20px" }}>🏦 Net Banking</span>
                    <span style={{ background: "rgba(255,255,255,0.2)", padding: "6px 12px", borderRadius: "20px" }}>👛 Wallets</span>
                    <span style={{ background: "rgba(255,255,255,0.2)", padding: "6px 12px", borderRadius: "20px" }}>📱 Google Pay</span>
                    <span style={{ background: "rgba(255,255,255,0.2)", padding: "6px 12px", borderRadius: "20px" }}>📱 PhonePe</span>
                    <span style={{ background: "rgba(255,255,255,0.2)", padding: "6px 12px", borderRadius: "20px" }}>💰 Paytm</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "16px", marginTop: "24px" }}>
                <button
                  onClick={() => navigate("/payment-selection", {
                    state: location.state
                  })}
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
                  onClick={handleRazorpayPayment}
                  disabled={processing}
                  style={{
                    flex: "1",
                    padding: "18px 40px",
                    background: processing ? "#ccc" : "linear-gradient(135deg, #5c4033 0%, #7d5a47 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "18px",
                    fontWeight: "700",
                    cursor: processing ? "not-allowed" : "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: processing ? "none" : "0 4px 15px rgba(92, 64, 51, 0.3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px"
                  }}
                  onMouseEnter={(e) => {
                    if (!processing) {
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = "0 6px 20px rgba(92, 64, 51, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!processing) {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "0 4px 15px rgba(92, 64, 51, 0.3)";
                    }
                  }}
                >
                  {processing ? (
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
                  ) : (
                    <>
                      💳 Pay ₹{amount.toFixed(2)}
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
                    <span>SSL Encrypted</span>
                  </span>
                  <span style={{ color: "#ddd" }}>|</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ color: "#28a745", fontSize: "16px" }}>✓</span>
                    <span>PCI DSS Compliant</span>
                  </span>
                  <span style={{ color: "#ddd" }}>|</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ color: "#28a745", fontSize: "16px" }}>✓</span>
                    <span>100% Secure</span>
                  </span>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: "48px", marginBottom: "20px" }}>⏳</div>
              <h3 style={{ color: "#5c4033", marginBottom: "10px" }}>
                Processing Your Payment...
              </h3>
              <p style={{ color: "#666" }}>
                Please wait while we process your payment. Do not close this window.
              </p>
            </div>
          )}

          {step === 3 && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: "48px", marginBottom: "20px" }}>✅</div>
              <h3 style={{ color: "#28a745", marginBottom: "10px" }}>
                Payment Successful!
              </h3>
              <p style={{ color: "#666", marginBottom: "20px" }}>
                Your order has been confirmed and payment has been processed.
              </p>
              <p style={{ color: "#999", fontSize: "14px" }}>
                Redirecting to order confirmation...
              </p>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}