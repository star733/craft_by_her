import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useConfirm } from "../context/ConfirmContext";

export default function Orders() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      toast.error("Please login to view your orders");
      navigate("/login");
      return;
    }

    fetchOrders();
  }, [navigate]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      const token = await user.getIdToken();
      
      const response = await fetch("http://localhost:5000/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const ordersData = await response.json();
        console.log("Fetched orders:", ordersData);
        setOrders(ordersData);
      } else {
        throw new Error("Failed to fetch orders");
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "#ffc107";
      case "confirmed": return "#17a2b8";
      case "preparing": return "#fd7e14";
      case "at_seller_hub": return "#fd7e14";
      case "shipped": return "#6f42c1";
      case "out_for_delivery": return "#20c997";
      case "delivered": return "#28a745";
      case "cancelled": return "#dc3545";
      // Legacy status mappings
      case "in_transit_to_customer_hub": return "#6f42c1";
      case "at_customer_hub": return "#20c997";
      default: return "#6c757d";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending": return "Order Placed";
      case "confirmed": return "Order Confirmed";
      case "preparing": return "Processing";
      case "at_seller_hub": return "Processing";
      case "shipped": return "Shipped";
      case "out_for_delivery": return "Out for Delivery";
      case "delivered": return "Delivered";
      case "cancelled": return "Cancelled";
      // Legacy status mappings
      case "in_transit_to_customer_hub": return "Shipped";
      case "at_customer_hub": return "Out for Delivery";
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

  const handleCancelOrder = async (orderId, order) => {
    const paymentInfo = order.paymentStatus === "paid" 
      ? " Since you've already paid, the amount will be refunded to your original payment method within 5-7 business days."
      : "";
    
    const confirmMessage = `Are you sure you want to cancel this order?${paymentInfo}`;
    
    const confirmed = await confirm({
      title: 'Cancel Order',
      message: confirmMessage,
      type: 'warning',
      confirmText: 'Cancel Order'
    });
    
    if (!confirmed) return;

    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();
      
      const response = await fetch(`http://localhost:5000/api/orders/${orderId}/cancel`, {
        method: "PUT",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          cancelReason: "Order cancelled by customer"
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (order.paymentStatus === "paid") {
          toast.success("Order cancelled successfully! Refund will be processed within 5-7 business days.");
        } else {
          toast.success("Order cancelled successfully!");
        }
        fetchOrders(); // Refresh orders list
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel order");
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error(`Failed to cancel order: ${error.message}`);
    }
  };

  const canCancelOrder = (order) => {
    // Allow canceling if order is not yet shipped or delivered
    return ["pending", "confirmed", "preparing", "at_seller_hub"].includes(order.orderStatus);
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Loading your orders...</h2>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ marginBottom: "30px", color: "#5c4033" }}>My Orders</h1>

      {orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>📦</div>
          <h2 style={{ marginBottom: "16px", color: "#666" }}>No Orders Yet</h2>
          <p style={{ color: "#666", marginBottom: "20px" }}>
            You haven't placed any orders yet. Start shopping to see your orders here!
          </p>
          <button
            onClick={() => navigate("/products")}
            style={{
              padding: "12px 24px",
              background: "#5c4033",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "600",
            }}
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {orders.map((order) => (
            <div key={order._id} style={{ 
              background: "#fff", 
              padding: "24px", 
              borderRadius: "12px", 
              border: "1px solid #ddd",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
              {/* Order Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                  <h3 style={{ margin: "0 0 8px 0", color: "#5c4033" }}>
                    Order #{order.orderNumber}
                  </h3>
                  <div style={{ fontSize: "14px", color: "#666" }}>
                    Placed on {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ 
                    background: getStatusColor(order.orderStatus), 
                    color: "white", 
                    padding: "6px 12px", 
                    borderRadius: "20px", 
                    fontSize: "12px", 
                    fontWeight: "600",
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    {getStatusText(order.orderStatus)}
                    {canCancelOrder(order) && (
                      <span style={{ fontSize: "10px", opacity: "0.8" }}>• Cancellable</span>
                    )}
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "#5c4033" }}>
                    ₹{order.finalAmount}
                  </div>
                </div>
              </div>

              {/* Order Items Preview */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  {order.items.slice(0, 3).map((item, index) => (
                    <div key={index} style={{ 
                      width: "60px", 
                      height: "60px", 
                      background: "#f5f5f5", 
                      borderRadius: "8px", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      overflow: "hidden"
                    }}>
                      {(item.image || (item.productId && item.productId.image)) ? (
                        <img
                          src={`http://localhost:5000/uploads/${item.image || (item.productId && item.productId.image)}`}
                          alt={item.title || (item.productId && item.productId.title) || "Product"}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <span style={{ fontSize: "10px", color: "#999" }}>No Image</span>
                      )}
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div style={{ 
                      width: "60px", 
                      height: "60px", 
                      background: "#e9ecef", 
                      borderRadius: "8px", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      fontSize: "12px",
                      color: "#666",
                      fontWeight: "600"
                    }}>
                      +{order.items.length - 3}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
                  {order.items.length} item{order.items.length !== 1 ? 's' : ''} • 
                  {order.paymentMethod === "cod" ? " Cash on Delivery" : " Online Payment"} • 
                  {getPaymentStatusText(order.paymentStatus)}
                </div>
                
                {/* Refund Information */}
                {order.refundDetails && order.refundDetails.refundStatus !== "not_applicable" && (
                  <div style={{
                    marginTop: "12px",
                    padding: "12px",
                    background: order.refundDetails.refundStatus === "completed" ? "#d4edda" : "#fff3cd",
                    border: `1px solid ${order.refundDetails.refundStatus === "completed" ? "#c3e6cb" : "#ffeeba"}`,
                    borderRadius: "8px",
                  }}>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "8px",
                      marginBottom: "8px" 
                    }}>
                      <span style={{ fontSize: "18px" }}>
                        {order.refundDetails.refundStatus === "completed" ? "✅" : "💰"}
                      </span>
                      <strong style={{ 
                        color: order.refundDetails.refundStatus === "completed" ? "#155724" : "#856404",
                        fontSize: "14px" 
                      }}>
                        Refund {order.refundDetails.refundStatus === "pending" ? "Initiated" : 
                               order.refundDetails.refundStatus === "processing" ? "Processing" : 
                               order.refundDetails.refundStatus === "completed" ? "Completed" : "Status"}
                      </strong>
                    </div>
                    
                    <div style={{ fontSize: "13px", color: "#666", marginBottom: "4px" }}>
                      <strong>Amount:</strong> ₹{order.refundDetails.refundAmount}
                    </div>
                    
                    {order.refundDetails.refundMethod !== "not_applicable" && (
                      <div style={{ fontSize: "13px", color: "#666", marginBottom: "4px" }}>
                        <strong>Method:</strong> {
                          order.refundDetails.refundMethod === "original_payment" ? "Original Payment Method" :
                          order.refundDetails.refundMethod === "bank_transfer" ? "Bank Transfer" :
                          order.refundDetails.refundMethod === "wallet" ? "Wallet" : 
                          order.refundDetails.refundMethod
                        }
                      </div>
                    )}
                    
                    {order.refundDetails.refundInitiatedAt && (
                      <div style={{ fontSize: "13px", color: "#666", marginBottom: "4px" }}>
                        <strong>Initiated:</strong> {new Date(order.refundDetails.refundInitiatedAt).toLocaleString()}
                      </div>
                    )}
                    
                    {order.refundDetails.refundCompletedAt && (
                      <div style={{ fontSize: "13px", color: "#666", marginBottom: "4px" }}>
                        <strong>Completed:</strong> {new Date(order.refundDetails.refundCompletedAt).toLocaleString()}
                      </div>
                    )}
                    
                    {order.refundDetails.refundTransactionId && (
                      <div style={{ fontSize: "13px", color: "#666", marginBottom: "4px" }}>
                        <strong>Transaction ID:</strong> {order.refundDetails.refundTransactionId}
                      </div>
                    )}
                    
                    {order.refundDetails.refundNotes && (
                      <div style={{ 
                        fontSize: "12px", 
                        color: "#666", 
                        marginTop: "8px",
                        fontStyle: "italic"
                      }}>
                        {order.refundDetails.refundNotes}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Order Actions */}
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => navigate(`/order-confirmation/${order._id}`, { state: { order } })}
                  style={{
                    padding: "8px 16px",
                    background: "#5c4033",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  View Details
                </button>
                
                {canCancelOrder(order) && (
                  <button
                    onClick={() => handleCancelOrder(order._id, order)}
                    style={{
                      padding: "8px 16px",
                      background: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                      transition: "background-color 0.3s ease",
                    }}
                    onMouseOver={(e) => e.target.style.background = "#c82333"}
                    onMouseOut={(e) => e.target.style.background = "#dc3545"}
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
