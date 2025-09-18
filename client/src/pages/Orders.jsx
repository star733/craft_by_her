import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Orders() {
  const navigate = useNavigate();
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

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) {
      return;
    }

    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();
      
      const response = await fetch(`http://localhost:5000/api/orders/${orderId}/cancel`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("Order cancelled successfully");
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
    return ["pending", "confirmed"].includes(order.orderStatus) && 
           order.paymentStatus !== "paid";
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
                    marginBottom: "8px"
                  }}>
                    {getStatusText(order.orderStatus)}
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
                      {item.image ? (
                        <img
                          src={`http://localhost:5000/uploads/${item.image}`}
                          alt={item.title}
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
              </div>

              {/* Order Actions */}
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => navigate(`/order-confirmation`, { state: { order } })}
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
                    onClick={() => handleCancelOrder(order._id)}
                    style={{
                      padding: "8px 16px",
                      background: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
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


