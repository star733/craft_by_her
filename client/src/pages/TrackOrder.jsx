import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function TrackOrder() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState({
    connected: false,
    updates: 0,
    distanceM: 0,
    coords: null,
    delivered: false
  });

  useEffect(() => {
    if (!auth.currentUser) {
      toast.error("Please login to track your order");
      navigate("/login");
      return;
    }

    fetchOrderDetails();
  }, [navigate, orderId]);

  const fetchOrderDetails = async () => {
    if (!orderId) {
      toast.error("Order ID is required");
      navigate("/orders");
      return;
    }

    try {
      setLoading(true);
      const token = await auth.currentUser.getIdToken();
      const resp = await fetch(`${API_BASE}/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!resp.ok) {
        throw new Error("Failed to fetch order");
      }

      const data = await resp.json();
      setOrder(data);

      // Check if order is delivered
      if (data.orderStatus === "delivered") {
        setLive(prev => ({ ...prev, delivered: true }));
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      toast.error("Order not found");
      navigate("/orders");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      pending: "#f59e0b",
      confirmed: "#3b82f6",
      preparing: "#8b5cf6",
      at_seller_hub: "#6366f1",
      awaiting_admin_approval: "#f59e0b",
      approved_by_admin: "#d4a574",
      in_transit_to_customer_hub: "#06b6d4",
      at_customer_hub: "#6366f1",
      ready_for_pickup: "#8b5cf6",
      assigned: "#3b82f6",
      accepted: "#3b82f6",
      picked_up: "#06b6d4",
      out_for_delivery: "#06b6d4",
      delivered: "#d4a574",
      cancelled: "#ef4444",
      rejected: "#ef4444",
      failed: "#ef4444"
    };
    return statusColors[status] || "#6b7280";
  };

  const getStatusText = (status) => {
    const statusTexts = {
      pending: "Pending",
      confirmed: "Confirmed",
      preparing: "Preparing",
      at_seller_hub: "At Seller Hub",
      awaiting_admin_approval: "Awaiting Admin Approval",
      approved_by_admin: "Approved by Admin",
      in_transit_to_customer_hub: "In Transit to Hub",
      at_customer_hub: "At Customer Hub",
      ready_for_pickup: "Ready for Pickup",
      assigned: "Assigned to Delivery",
      accepted: "Accepted by Delivery",
      picked_up: "Picked Up",
      out_for_delivery: "Out for Delivery",
      delivered: "Delivered",
      cancelled: "Cancelled",
      rejected: "Rejected",
      failed: "Failed"
    };
    return statusTexts[status] || status;
  };

  const getStatusSteps = (status) => {
    const steps = [
      { key: "confirmed", label: "Order Confirmed" },
      { key: "preparing", label: "Preparing" },
      { key: "at_seller_hub", label: "At Seller Hub" },
      { key: "approved_by_admin", label: "Approved" },
      { key: "in_transit_to_customer_hub", label: "In Transit" },
      { key: "at_customer_hub", label: "At Hub" },
      { key: "out_for_delivery", label: "Out for Delivery" },
      { key: "delivered", label: "Delivered" }
    ];

    const statusOrder = [
      "confirmed",
      "preparing",
      "at_seller_hub",
      "awaiting_admin_approval",
      "approved_by_admin",
      "in_transit_to_customer_hub",
      "at_customer_hub",
      "ready_for_pickup",
      "assigned",
      "accepted",
      "picked_up",
      "out_for_delivery",
      "delivered"
    ];

    const currentIndex = statusOrder.indexOf(status);
    
    return steps.map((step, index) => {
      const stepIndex = statusOrder.indexOf(step.key);
      const isCompleted = stepIndex >= 0 && stepIndex <= currentIndex;
      const isCurrent = stepIndex === currentIndex;
      
      return {
        ...step,
        completed: isCompleted,
        current: isCurrent
      };
    });
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: "80vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <div style={{ textAlign: "center" }}>
          <div className="loading-spinner" style={{
            width: "50px",
            height: "50px",
            border: "4px solid #f3f3f3",
            borderTop: "4px solid #5c4033",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 20px"
          }}></div>
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ 
        minHeight: "80vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <div style={{ textAlign: "center", padding: "40px" }}>
          <h2 style={{ color: "#5c4033", marginBottom: "20px" }}>Order Not Found</h2>
          <button
            onClick={() => navigate("/orders")}
            style={{
              padding: "12px 24px",
              backgroundColor: "#5c4033",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            View All Orders
          </button>
        </div>
      </div>
    );
  }

  const statusSteps = getStatusSteps(order.orderStatus);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <button
          onClick={() => navigate("/orders")}
          style={{
            background: "none",
            border: "none",
            color: "#5c4033",
            cursor: "pointer",
            fontSize: "16px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          ← Back to Orders
        </button>
        <h1 style={{ color: "#5c4033", marginBottom: "8px" }}>
          Track Order #{order.orderNumber || order._id}
        </h1>
        <p style={{ color: "#666", fontSize: "14px" }}>
          Placed on {new Date(order.createdAt).toLocaleString()}
        </p>
      </div>

      {/* Order Status Timeline */}
      <div style={{
        background: "#fff",
        padding: "32px",
        borderRadius: "12px",
        marginBottom: "24px",
        border: "1px solid #ddd",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{ color: "#5c4033", marginBottom: "24px" }}>Order Status</h2>
        
        <div style={{ position: "relative", paddingLeft: "40px" }}>
          {statusSteps.map((step, index) => (
            <div key={step.key} style={{ position: "relative", marginBottom: "32px" }}>
              {/* Timeline Line */}
              {index < statusSteps.length - 1 && (
                <div style={{
                  position: "absolute",
                  left: "15px",
                  top: "30px",
                  width: "2px",
                  height: "calc(100% + 16px)",
                  backgroundColor: step.completed ? "#d4a574" : "#e5e7eb"
                }}></div>
              )}

              {/* Timeline Dot */}
              <div style={{
                position: "absolute",
                left: "-25px",
                top: "4px",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: step.completed ? "#d4a574" : step.current ? getStatusColor(order.orderStatus) : "#e5e7eb",
                border: "4px solid #fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                zIndex: 1
              }}>
                {step.completed && (
                  <span style={{ color: "white", fontSize: "16px" }}>✓</span>
                )}
              </div>

              {/* Step Content */}
              <div>
                <div style={{
                  fontSize: "16px",
                  fontWeight: step.current ? "600" : "400",
                  color: step.completed || step.current ? "#1f2937" : "#9ca3af",
                  marginBottom: "4px"
                }}>
                  {step.label}
                </div>
                {step.current && (
                  <div style={{
                    fontSize: "14px",
                    color: getStatusColor(order.orderStatus),
                    fontWeight: "500"
                  }}>
                    Current Status
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Current Status Badge */}
        <div style={{
          marginTop: "24px",
          padding: "16px",
          background: "#f3f4f6",
          borderRadius: "8px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937", marginBottom: "4px" }}>
            Current Status: {getStatusText(order.orderStatus)}
          </div>
          <div style={{ fontSize: "14px", color: "#6b7280" }}>
            {order.orderStatus === "delivered" 
              ? "Your order has been successfully delivered!" 
              : order.orderStatus === "out_for_delivery"
              ? "Your order is on the way!"
              : "We're processing your order. You'll receive updates here."}
          </div>
        </div>
      </div>

      {/* Order Details */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "24px",
        marginBottom: "24px"
      }}>
        {/* Order Information */}
        <div style={{
          background: "#fff",
          padding: "24px",
          borderRadius: "12px",
          border: "1px solid #ddd",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          <h3 style={{ color: "#5c4033", marginBottom: "16px" }}>Order Information</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Order Number</div>
              <div style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>
                #{order.orderNumber || order._id}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Order Date</div>
              <div style={{ fontSize: "16px", color: "#1f2937" }}>
                {new Date(order.createdAt).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Total Amount</div>
              <div style={{ fontSize: "20px", fontWeight: "600", color: "#5c4033" }}>
                ₹{order.finalAmount || order.totalAmount}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Payment Method</div>
              <div style={{ fontSize: "16px", color: "#1f2937" }}>
                {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Information */}
        <div style={{
          background: "#fff",
          padding: "24px",
          borderRadius: "12px",
          border: "1px solid #ddd",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          <h3 style={{ color: "#5c4033", marginBottom: "16px" }}>Delivery Address</h3>
          {order.buyerDetails && order.buyerDetails.address ? (
            <div style={{ fontSize: "14px", color: "#1f2937", lineHeight: "1.6" }}>
              <div style={{ fontWeight: "600", marginBottom: "8px" }}>
                {order.buyerDetails.name}
              </div>
              <div>{order.buyerDetails.address.street}</div>
              <div>
                {order.buyerDetails.address.city}, {order.buyerDetails.address.state}
              </div>
              <div>{order.buyerDetails.address.pincode}</div>
              {order.buyerDetails.phone && (
                <div style={{ marginTop: "8px", color: "#6b7280" }}>
                  Phone: {order.buyerDetails.phone}
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: "#9ca3af" }}>No delivery address available</div>
          )}

          {/* Hub Tracking Info */}
          {order.hubTracking && (
            <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #e5e7eb" }}>
              <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#5c4033", marginBottom: "12px" }}>
                Hub Information
              </h4>
              {order.hubTracking.sellerHubName && (
                <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>
                  <strong>Seller Hub:</strong> {order.hubTracking.sellerHubName}
                </div>
              )}
              {order.hubTracking.customerHubName && (
                <div style={{ fontSize: "13px", color: "#6b7280" }}>
                  <strong>Customer Hub:</strong> {order.hubTracking.customerHubName}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div style={{
        background: "#fff",
        padding: "24px",
        borderRadius: "12px",
        border: "1px solid #ddd",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <h3 style={{ color: "#5c4033", marginBottom: "20px" }}>Order Items</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {order.items && order.items.map((item, index) => (
            <div key={index} style={{
              display: "flex",
              gap: "16px",
              padding: "16px",
              background: "#f9fafb",
              borderRadius: "8px"
            }}>
              <div style={{
                width: "80px",
                height: "80px",
                background: "#e5e7eb",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0
              }}>
                {item.image ? (
                  <img
                    src={`${API_BASE}/uploads/${item.image}`}
                    alt={item.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontSize: "12px", color: "#9ca3af" }}>No Image</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937", marginBottom: "4px" }}>
                  {item.title}
                </div>
                <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>
                  Quantity: {item.quantity} {item.variant && `• ${item.variant.weight}`}
                </div>
                <div style={{ fontSize: "16px", fontWeight: "600", color: "#5c4033" }}>
                  ₹{(item.variant?.price || 0) * item.quantity}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery Tracking Updates */}
      {order.deliveryInfo && order.deliveryInfo.trackingUpdates && order.deliveryInfo.trackingUpdates.length > 0 && (
        <div style={{
          background: "#fff",
          padding: "24px",
          borderRadius: "12px",
          marginTop: "24px",
          border: "1px solid #ddd",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          <h3 style={{ color: "#5c4033", marginBottom: "20px" }}>Tracking Updates</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {order.deliveryInfo.trackingUpdates.slice().reverse().map((update, index) => (
              <div key={index} style={{
                padding: "12px",
                background: "#f9fafb",
                borderRadius: "8px",
                borderLeft: "4px solid #5c4033"
              }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#1f2937", marginBottom: "4px" }}>
                  {update.status || update.message}
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                  {new Date(update.timestamp).toLocaleString()}
                </div>
                {update.location && (
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                    📍 {update.location}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

