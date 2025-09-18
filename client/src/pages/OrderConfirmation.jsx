import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function OrderConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) {
      toast.error("Please login to view order details");
      navigate("/login");
      return;
    }

    if (location.state?.order) {
      setOrder(location.state.order);
      setPaymentSuccess(location.state.paymentSuccess || false);
    } else {
      toast.error("No order found");
      navigate("/orders");
    }
  }, [navigate, location.state]);

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "#ffc107";
      case "confirmed": return "#17a2b8";
      case "preparing": return "#fd7e14";
      case "shipped": return "#6f42c1";
      case "delivered": return "#28a745";
      case "cancelled": return "#dc3545";
      default: return "#6c757d";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending": return "Order Pending";
      case "confirmed": return "Order Confirmed";
      case "preparing": return "Preparing Your Order";
      case "shipped": return "Shipped";
      case "delivered": return "Delivered";
      case "cancelled": return "Cancelled";
      default: return status;
    }
  };

  const getPaymentStatusText = (status) => {
    switch (status) {
      case "pending": return "Payment Pending";
      case "paid": return "Payment Completed";
      case "failed": return "Payment Failed";
      case "refunded": return "Payment Refunded";
      default: return status;
    }
  };

  if (!order) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Loading order details...</h2>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      {/* Success Message */}
      {paymentSuccess && (
        <div style={{ 
          background: "#d4edda", 
          border: "1px solid #c3e6cb", 
          color: "#155724", 
          padding: "16px", 
          borderRadius: "8px", 
          marginBottom: "30px",
          textAlign: "center"
        }}>
          <h2 style={{ margin: "0 0 8px 0", color: "#155724" }}>🎉 Order Placed Successfully!</h2>
          <p style={{ margin: 0 }}>Thank you for your order. We'll start preparing it right away!</p>
        </div>
      )}

      <h1 style={{ marginBottom: "30px", color: "#5c4033" }}>Order Confirmation</h1>

      {/* Order Status */}
      <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "24px", border: "1px solid #ddd" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, color: "#5c4033" }}>Order #{order.orderNumber}</h2>
          <div style={{ 
            background: getStatusColor(order.orderStatus), 
            color: "white", 
            padding: "6px 12px", 
            borderRadius: "20px", 
            fontSize: "14px", 
            fontWeight: "600" 
          }}>
            {getStatusText(order.orderStatus)}
          </div>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "14px" }}>
          <div>
            <strong>Order Date:</strong> {new Date(order.createdAt).toLocaleDateString()}
          </div>
          <div>
            <strong>Payment Method:</strong> {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}
          </div>
          <div>
            <strong>Payment Status:</strong> 
            <span style={{ 
              color: order.paymentStatus === "paid" ? "#28a745" : 
                    order.paymentStatus === "pending" ? "#ffc107" : "#dc3545",
              fontWeight: "600",
              marginLeft: "8px"
            }}>
              {getPaymentStatusText(order.paymentStatus)}
            </span>
          </div>
          <div>
            <strong>Total Amount:</strong> ₹{order.finalAmount}
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "24px", border: "1px solid #ddd" }}>
        <h3 style={{ marginBottom: "20px", color: "#5c4033" }}>Order Items</h3>
        
        {order.items.map((item, index) => (
          <div key={index} style={{ 
            display: "flex", 
            gap: "16px", 
            marginBottom: "16px", 
            paddingBottom: "16px", 
            borderBottom: index < order.items.length - 1 ? "1px solid #eee" : "none" 
          }}>
            <div style={{ width: "80px", height: "80px", background: "#f5f5f5", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {item.image ? (
                <img
                  src={`http://localhost:5000/uploads/${item.image}`}
                  alt={item.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }}
                />
              ) : (
                <span style={{ fontSize: "12px", color: "#999" }}>No Image</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>{item.title}</h4>
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>
                {item.variant.weight}
              </div>
              <div style={{ fontSize: "14px", color: "#5c4033", fontWeight: "600" }}>
                ₹{item.variant.price} × {item.quantity} = ₹{item.variant.price * item.quantity}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delivery Address */}
      <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "24px", border: "1px solid #ddd" }}>
        <h3 style={{ marginBottom: "20px", color: "#5c4033" }}>Delivery Address</h3>
        
        <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
          <div style={{ fontWeight: "600", marginBottom: "8px" }}>{order.buyerDetails.name}</div>
          <div>{order.buyerDetails.address.street}</div>
          {order.buyerDetails.address.landmark && (
            <div>Near {order.buyerDetails.address.landmark}</div>
          )}
          <div>{order.buyerDetails.address.city}, {order.buyerDetails.address.state} - {order.buyerDetails.address.pincode}</div>
          <div style={{ marginTop: "8px" }}>
            <strong>Phone:</strong> {order.buyerDetails.phone}
          </div>
          <div>
            <strong>Email:</strong> {order.buyerDetails.email}
          </div>
        </div>
      </div>

      {/* Price Breakdown */}
      <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "24px", border: "1px solid #ddd" }}>
        <h3 style={{ marginBottom: "20px", color: "#5c4033" }}>Price Breakdown</h3>
        
        <div style={{ fontSize: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span>Subtotal:</span>
            <span>₹{order.totalAmount}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span>Shipping:</span>
            <span>{order.shippingCharges === 0 ? "Free" : `₹${order.shippingCharges}`}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: "600", color: "#5c4033", paddingTop: "12px", borderTop: "2px solid #5c4033" }}>
            <span>Total:</span>
            <span>₹{order.finalAmount}</span>
          </div>
        </div>
      </div>

      {/* Payment Details (if online payment) */}
      {order.paymentMethod === "online" && order.paymentDetails && (
        <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "24px", border: "1px solid #ddd" }}>
          <h3 style={{ marginBottom: "20px", color: "#5c4033" }}>Payment Details</h3>
          
          <div style={{ fontSize: "14px" }}>
            <div style={{ marginBottom: "8px" }}>
              <strong>Transaction ID:</strong> {order.paymentDetails.transactionId}
            </div>
            <div style={{ marginBottom: "8px" }}>
              <strong>Payment Gateway:</strong> {order.paymentDetails.paymentGateway}
            </div>
            {order.paymentDetails.paidAt && (
              <div>
                <strong>Paid At:</strong> {new Date(order.paymentDetails.paidAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
        <button
          onClick={() => navigate("/orders")}
          style={{
            padding: "12px 24px",
            background: "#5c4033",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          View All Orders
        </button>
        <button
          onClick={() => navigate("/products")}
          style={{
            padding: "12px 24px",
            background: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
}
