import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [amount, setAmount] = useState(0);
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
  });
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(1); // 1: Payment Form, 2: Processing, 3: Success/Failure

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

  const handleInputChange = (field, value) => {
    setPaymentDetails(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const formatCardNumber = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");
    // Add spaces every 4 digits
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiryDate = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");
    // Add slash after 2 digits
    if (digits.length >= 2) {
      return digits.substring(0, 2) + "/" + digits.substring(2, 4);
    }
    return digits;
  };

  const validatePaymentForm = () => {
    if (!paymentDetails.cardNumber.replace(/\s/g, "")) {
      toast.error("Card number is required");
      return false;
    }
    if (paymentDetails.cardNumber.replace(/\s/g, "").length !== 16) {
      toast.error("Card number must be 16 digits");
      return false;
    }
    if (!paymentDetails.expiryDate) {
      toast.error("Expiry date is required");
      return false;
    }
    if (!paymentDetails.cvv) {
      toast.error("CVV is required");
      return false;
    }
    if (paymentDetails.cvv.length !== 3) {
      toast.error("CVV must be 3 digits");
      return false;
    }
    if (!paymentDetails.cardholderName.trim()) {
      toast.error("Cardholder name is required");
      return false;
    }
    return true;
  };

  const simulatePayment = async () => {
    if (!validatePaymentForm()) return;

    try {
      setProcessing(true);
      setStep(2);

      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Simulate random payment success/failure (90% success rate)
      const isSuccess = Math.random() > 0.1;

      if (isSuccess) {
        // Update order payment status
        const user = auth.currentUser;
        const token = await user.getIdToken();

        const transactionId = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;

        const response = await fetch(`http://localhost:5000/api/orders/${order._id}/payment`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            paymentStatus: "paid",
            transactionId: transactionId,
            paymentGateway: "dummy_gateway",
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update payment status");
        }

        setStep(3);
        toast.success("Payment successful!");
        
        // Redirect to confirmation after 2 seconds
        setTimeout(() => {
          navigate("/order-confirmation", { 
            state: { 
              order: { ...order, paymentStatus: "paid", paymentDetails: { transactionId } },
              paymentSuccess: true 
            } 
          });
        }, 2000);
      } else {
        setStep(4);
        toast.error("Payment failed. Please try again.");
      }
    } catch (error) {
      console.error("Payment error:", error);
      setStep(4);
      toast.error("Payment failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (!order) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Loading payment details...</h2>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ marginBottom: "30px", color: "#5c4033", textAlign: "center" }}>
        Payment Details
      </h1>

      {/* Order Summary */}
      <div style={{ background: "#f8f9fa", padding: "20px", borderRadius: "12px", marginBottom: "30px" }}>
        <h3 style={{ marginBottom: "16px", color: "#5c4033" }}>Order Summary</h3>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span>Order Number:</span>
          <span style={{ fontWeight: "600" }}>{order.orderNumber}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span>Total Amount:</span>
          <span style={{ fontWeight: "600", color: "#5c4033" }}>₹{amount}</span>
        </div>
        <div style={{ fontSize: "14px", color: "#666", marginTop: "12px" }}>
          This is a dummy payment gateway for demonstration purposes.
        </div>
      </div>

      {/* Payment Steps */}
      {step === 1 && (
        <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", border: "1px solid #ddd" }}>
          <h2 style={{ marginBottom: "20px", color: "#5c4033" }}>Card Details</h2>
          
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
              Card Number *
            </label>
            <input
              type="text"
              value={paymentDetails.cardNumber}
              onChange={(e) => handleInputChange("cardNumber", formatCardNumber(e.target.value))}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "16px",
                fontFamily: "monospace",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                Expiry Date *
              </label>
              <input
                type="text"
                value={paymentDetails.expiryDate}
                onChange={(e) => handleInputChange("expiryDate", formatExpiryDate(e.target.value))}
                placeholder="MM/YY"
                maxLength={5}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontFamily: "monospace",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                CVV *
              </label>
              <input
                type="text"
                value={paymentDetails.cvv}
                onChange={(e) => handleInputChange("cvv", e.target.value.replace(/\D/g, ""))}
                placeholder="123"
                maxLength={3}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontFamily: "monospace",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "30px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
              Cardholder Name *
            </label>
            <input
              type="text"
              value={paymentDetails.cardholderName}
              onChange={(e) => handleInputChange("cardholderName", e.target.value)}
              placeholder="Enter cardholder name"
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "16px",
              }}
            />
          </div>

          <button
            onClick={simulatePayment}
            disabled={processing}
            style={{
              width: "100%",
              padding: "16px",
              background: processing ? "#ccc" : "#5c4033",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: processing ? "not-allowed" : "pointer",
              transition: "background-color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (!processing) {
                e.target.style.background = "#4a3429";
              }
            }}
            onMouseLeave={(e) => {
              if (!processing) {
                e.target.style.background = "#5c4033";
              }
            }}
          >
            {processing ? "Processing..." : `Pay ₹${amount}`}
          </button>
        </div>
      )}

      {/* Processing Step */}
      {step === 2 && (
        <div style={{ background: "#fff", padding: "40px", borderRadius: "12px", textAlign: "center", border: "1px solid #ddd" }}>
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>💳</div>
          <h2 style={{ marginBottom: "16px", color: "#5c4033" }}>Processing Payment...</h2>
          <p style={{ color: "#666", marginBottom: "20px" }}>
            Please wait while we process your payment.
          </p>
          <div style={{ 
            width: "40px", 
            height: "40px", 
            border: "4px solid #f3f3f3", 
            borderTop: "4px solid #5c4033", 
            borderRadius: "50%", 
            animation: "spin 1s linear infinite",
            margin: "0 auto"
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Success Step */}
      {step === 3 && (
        <div style={{ background: "#fff", padding: "40px", borderRadius: "12px", textAlign: "center", border: "1px solid #ddd" }}>
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>✅</div>
          <h2 style={{ marginBottom: "16px", color: "#28a745" }}>Payment Successful!</h2>
          <p style={{ color: "#666", marginBottom: "20px" }}>
            Your payment has been processed successfully.
          </p>
          <p style={{ fontSize: "14px", color: "#999" }}>
            Redirecting to order confirmation...
          </p>
        </div>
      )}

      {/* Failure Step */}
      {step === 4 && (
        <div style={{ background: "#fff", padding: "40px", borderRadius: "12px", textAlign: "center", border: "1px solid #ddd" }}>
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>❌</div>
          <h2 style={{ marginBottom: "16px", color: "#dc3545" }}>Payment Failed</h2>
          <p style={{ color: "#666", marginBottom: "20px" }}>
            Your payment could not be processed. Please try again.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button
              onClick={() => setStep(1)}
              style={{
                padding: "12px 24px",
                background: "#5c4033",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => navigate("/cart")}
              style={{
                padding: "12px 24px",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Back to Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

