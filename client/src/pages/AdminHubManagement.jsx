import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useConfirm } from "../context/ConfirmContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function AdminHubManagement() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(true);
  
  // Hub Order Approvals State
  const [pendingHubOrders, setPendingHubOrders] = useState([]);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [selectedHubOrder, setSelectedHubOrder] = useState(null);
  const [showHubOrderModal, setShowHubOrderModal] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [hubsByDistrict, setHubsByDistrict] = useState({});

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        await fetchPendingHubOrders(user);
        await fetchAdminNotifications(user);
        await fetchHubStats(user);
      } else {
        navigate("/login");
      }
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  // Fetch pending hub orders for admin approval
  const fetchPendingHubOrders = async (user) => {
    try {
      await user.reload();
      const token = await user.getIdToken(true);
      const res = await fetch(`${API_BASE}/api/admin/orders/hub-orders/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        toast.error("Access denied: You are not an admin");
        return;
      }

      const data = await res.json();
      if (data.success) {
        setPendingHubOrders(data.orders || []);
        console.log(`Fetched ${data.orders.length} pending hub orders`);
      }
    } catch (err) {
      console.error("Fetch pending hub orders error:", err);
      setPendingHubOrders([]);
    }
  };

  // Fetch admin notifications
  const fetchAdminNotifications = async (user) => {
    try {
      await user.reload();
      const token = await user.getIdToken(true);
      const res = await fetch(`${API_BASE}/api/admin/orders/notifications?unreadOnly=false`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        toast.error("Access denied: You are not an admin");
        return;
      }

      const data = await res.json();
      if (data.success) {
        setAdminNotifications(data.notifications || []);
        setUnreadNotificationCount(data.unreadCount || 0);
        console.log(`Fetched ${data.notifications.length} admin notifications`);
      }
    } catch (err) {
      console.error("Fetch admin notifications error:", err);
      setAdminNotifications([]);
      setUnreadNotificationCount(0);
    }
  };

  // Fetch hub statistics
  const fetchHubStats = async (user) => {
    try {
      await user.reload();
      const token = await user.getIdToken(true);
      const res = await fetch(`${API_BASE}/api/admin/hub-stats/hubs-with-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        toast.error("Access denied: You are not an admin");
        return;
      }

      const data = await res.json();
      if (data.success) {
        setHubsByDistrict(data.hubsByDistrict || {});
        console.log(`Fetched hub stats for ${data.totalHubs} hubs`);
      }
    } catch (err) {
      console.error("Fetch hub stats error:", err);
      setHubsByDistrict({});
    }
  };

  // Approve hub order for delivery
  const approveHubOrder = async (orderId) => {
    const confirmed = await confirm({
      title: 'Approve Hub Order',
      message: 'Are you sure you want to approve this order for delivery to customer hub?',
      type: 'success',
      confirmText: 'Approve & Dispatch',
      cancelText: 'Cancel'
    });
    
    if (!confirmed) return;
    
    const loadingToast = toast.loading("Processing approval...");
    
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.dismiss(loadingToast);
        toast.error("You must be logged in to approve orders");
        return;
      }
      
      const token = await user.getIdToken(true);
      console.log(`📤 Approving order ${orderId}...`);
      
      const res = await fetch(`${API_BASE}/api/admin/orders/${orderId}/approve-hub-delivery`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
      });
      
      console.log(`📥 Response status: ${res.status}`);
      
      if (res.status === 403) {
        toast.dismiss(loadingToast);
        toast.error("Access denied: You are not an admin");
        return;
      }
      
      if (res.status === 404) {
        toast.dismiss(loadingToast);
        toast.error("Order not found");
        return;
      }
      
      const data = await res.json();
      console.log(`📊 Response data:`, data);
      
      if (data.success) {
        toast.dismiss(loadingToast);
        toast.success(`✅ Order approved and dispatched to customer hub!`, { 
          duration: 5000,
          icon: '🚚' 
        });
        
        // Immediately remove the approved order from the pending list
        setPendingHubOrders(prev => prev.filter(order => order._id !== orderId));
        
        // Wait a bit for database to fully update, then refresh
        setTimeout(async () => {
          await fetchPendingHubOrders(user);
          await fetchAdminNotifications(user);
        }, 500);
      } else {
        toast.dismiss(loadingToast);
        console.error("Approval failed:", data.error);
        toast.error(data.error || "Failed to approve order", { duration: 5000 });
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      console.error("Approve hub order error:", err);
      toast.error(`Network error: ${err.message || "Failed to approve order"}`, { duration: 5000 });
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "var(--bg, #f7f3ed)"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "48px",
            height: "48px",
            border: "4px solid var(--accent-soft, #f3e7dc)",
            borderTop: "4px solid var(--brand, #8b5e34)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto"
          }}></div>
          <p style={{ marginTop: "16px", color: "var(--text-muted, #7b6457)" }}>Loading hub data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      display: "flex", 
      minHeight: "100vh", 
      fontFamily: "var(--body-font, 'Poppins', sans-serif)",
      background: "var(--bg, #f7f3ed)"
    }}>
      {/* Sidebar */}
      <aside style={{ width: "240px", background: "var(--surface, #ffffff)", borderRight: "1px solid var(--border, #ead9c9)", padding: "20px" }}>
        <h2 style={{ fontSize: "20px", marginBottom: "30px", color: "var(--brand, #8b5e34)", fontFamily: "var(--title-font, 'Playfair Display', serif)" }}>CraftedByHer</h2>
        <nav style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <button 
            onClick={() => navigate("/admin")} 
            style={{
              backgroundColor: "transparent",
              border: "none",
              textAlign: "left",
              padding: "12px 16px",
              cursor: "pointer",
              color: "var(--text, #3f2d23)",
              fontSize: "15px",
              borderRadius: "6px",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center"
            }}
          >
             Dashboard
          </button>
          <button 
            style={{
              backgroundColor: "var(--accent-soft, #f3e7dc)",
              border: "none",
              textAlign: "left",
              padding: "12px 16px",
              cursor: "pointer",
              color: "var(--brand, #8b5e34)",
              fontSize: "15px",
              borderRadius: "6px",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              fontWeight: "bold"
            }}
          >
             Hub Management
            {unreadNotificationCount > 0 && (
              <span style={{
                marginLeft: "8px",
                background: "var(--accent, #7b2e2e)",
                color: "white",
                borderRadius: "50%",
                padding: "2px 6px",
                fontSize: "11px",
                fontWeight: "bold"
              }}>
                {unreadNotificationCount}
              </span>
            )}
          </button>
          <hr />
          <button 
            onClick={() => navigate("/admin")} 
            style={{
              backgroundColor: "transparent",
              border: "none",
              textAlign: "left",
              padding: "12px 16px",
              cursor: "pointer",
              color: "var(--accent, #7b2e2e)",
              fontSize: "15px",
              borderRadius: "6px",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              fontWeight: "bold"
            }}
          >
             Back to Admin
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "24px", background: "var(--bg, #f7f3ed)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h1 style={{ margin: 0, color: "var(--brand-strong, #6f4518)", fontFamily: "var(--title-font, 'Playfair Display', serif)" }}>Hub Management</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {unreadNotificationCount > 0 && (
              <div style={{
                background: "linear-gradient(135deg, var(--accent, #7b2e2e) 0%, var(--accent-hover, #4a1010) 100%)",
                color: "white",
                padding: "8px 16px",
                borderRadius: "20px",
                fontSize: "14px",
                fontWeight: "600",
                boxShadow: "0 2px 8px rgba(123, 46, 46, 0.3)"
              }}>
                 {unreadNotificationCount} Pending Approval{unreadNotificationCount > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Hub Approvals Section */}
        <div style={{ background: "var(--surface, #ffffff)", padding: "24px", borderRadius: "12px", border: "1px solid var(--border, #ead9c9)", boxShadow: "var(--shadow, 0 10px 24px rgba(63,45,35,.10))" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ margin: 0, color: "var(--brand, #8b5e34)", fontFamily: "var(--title-font, 'Playfair Display', serif)" }}>
              Hub Order Approvals
            </h2>
            
            <button
              onClick={() => {
                const user = auth.currentUser;
                if (user) {
                  fetchPendingHubOrders(user);
                  fetchAdminNotifications(user);
                  fetchHubStats(user);
                }
              }}
              style={{
                padding: "8px 16px",
                background: "var(--brand, #8b5e34)",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                transition: "background 0.2s ease"
              }}
              onMouseEnter={(e) => e.target.style.background = "var(--brand-strong, #6f4518)"}
              onMouseLeave={(e) => e.target.style.background = "var(--brand, #8b5e34)"}
            >
               Refresh
            </button>
          </div>

          {/* Hub Statistics Section */}
          {Object.keys(hubsByDistrict).length > 0 && (
            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ color: "var(--brand, #8b5e34)", marginBottom: "15px", fontSize: "18px", fontFamily: "var(--title-font, 'Playfair Display', serif)" }}>
                 Hub Order Statistics
              </h3>
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
                gap: "15px" 
              }}>
                {Object.entries(hubsByDistrict).sort((a, b) => a[0].localeCompare(b[0])).map(([district, hubs]) => (
                  <div key={district} style={{
                    background: "var(--surface, #ffffff)",
                    borderRadius: "12px",
                    padding: "16px",
                    border: "1px solid var(--border, #ead9c9)",
                    boxShadow: "var(--shadow, 0 10px 24px rgba(63,45,35,.10))"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
                      <span style={{ fontSize: "24px", marginRight: "8px" }}>🏪</span>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "var(--brand, #8b5e34)" }}>
                          {district}
                        </h4>
                        <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted, #7b6457)" }}>
                          {hubs.length} hub{hubs.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    {hubs.map(hub => (
                      <div key={hub.hubId} style={{
                        background: "var(--accent-soft, #f3e7dc)",
                        borderRadius: "8px",
                        padding: "12px",
                        marginTop: "8px",
                        border: "1px solid var(--border, #ead9c9)"
                      }}>
                        <p style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "600", color: "var(--text, #3f2d23)" }}>
                          {hub.name}
                        </p>
                        <p style={{ margin: "0 0 6px 0", fontSize: "12px", color: "var(--text-muted, #7b6457)" }}>
                          ID: <strong>{hub.hubId}</strong>
                        </p>
                        <div style={{
                          display: "flex",
                          gap: "12px",
                          marginTop: "8px",
                          paddingTop: "8px",
                          borderTop: "1px solid var(--border, #ead9c9)"
                        }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted, #7b6457)", textTransform: "uppercase" }}>
                              Orders
                            </p>
                            <p style={{ margin: "2px 0 0 0", fontSize: "18px", fontWeight: "700", color: "var(--brand, #8b5e34)" }}>
                              {hub.ordersAtHub || 0}
                            </p>
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted, #7b6457)", textTransform: "uppercase" }}>
                              Dispatched
                            </p>
                            <p style={{ margin: "2px 0 0 0", fontSize: "18px", fontWeight: "700", color: "var(--accent, #7b2e2e)" }}>
                              {hub.dispatchedToHub || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Approvals Section - CraftedByHer themed */}
          {pendingHubOrders.length > 0 ? (
            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ 
                color: "var(--brand, #8b5e34)", 
                marginBottom: "15px", 
                fontSize: "18px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: "var(--title-font, 'Playfair Display', serif)"
              }}>
                <span style={{ fontSize: "20px" }}>⚠️</span>
                Urgent: Orders Awaiting Your Approval ({pendingHubOrders.length})
              </h3>
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", 
                gap: "18px" 
              }}>
                {pendingHubOrders.map((order) => {
                  // Check if this order is being processed
                  const isProcessing = false; // Could add state to track this
                  
                  return (
                  <div 
                    key={order._id} 
                    style={{
                      borderRadius: "16px",
                      padding: "18px 18px 16px 18px",
                      background: "linear-gradient(135deg, var(--accent-soft, #f3e7dc) 0%, #f8f2ea 45%, #f3e9dd 100%)",
                      boxShadow: "var(--shadow, 0 10px 24px rgba(63,45,35,.10))",
                      border: "1px solid var(--border, #ead9c9)",
                      position: "relative",
                      overflow: "hidden",
                      opacity: isProcessing ? 0.6 : 1
                    }}
                  >
                    {/* Accent stripe */}
                    <div style={{
                      position: "absolute",
                      inset: 0,
                      pointerEvents: "none"
                    }}>
                      <div style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        width: "120px",
                        height: "4px",
                        background: "linear-gradient(90deg, var(--brand, #8b5e34), var(--accent, #7b2e2e))"
                      }} />
                    </div>

                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "flex-start", 
                      marginBottom: "12px",
                      gap: "8px"
                    }}>
                      <div>
                        <p style={{ 
                          margin: "0 0 4px 0", 
                          fontSize: "11px", 
                          textTransform: "uppercase", 
                          letterSpacing: "0.06em",
                          color: "var(--text-muted, #7b6457)",
                          fontWeight: 600
                        }}>
                          Order
                        </p>
                        <h4 style={{ 
                          margin: 0, 
                          color: "var(--brand-strong, #6f4518)", 
                          fontSize: "17px",
                          fontWeight: 700,
                          fontFamily: "var(--title-font, 'Playfair Display', serif)"
                        }}>
                          #{order.orderNumber}
                        </h4>
                      </div>
                      <span style={{
                        padding: "4px 10px",
                        borderRadius: "999px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: "linear-gradient(135deg, var(--accent, #7b2e2e) 0%, var(--accent-hover, #4a1010) 100%)",
                        color: "white",
                        boxShadow: "0 4px 10px rgba(123, 46, 46, 0.35)",
                        whiteSpace: "nowrap"
                      }}>
                        APPROVAL REQUIRED
                      </span>
                    </div>
                    
                    <div style={{ 
                      marginBottom: "14px", 
                      fontSize: "14px", 
                      color: "var(--text, #3f2d23)",
                      lineHeight: 1.5
                    }}>
                      <div style={{ marginBottom: "4px", fontWeight: 600, fontSize: "14px" }}>
                        {order.buyerDetails?.name}
                      </div>
                      <div style={{ marginBottom: "4px", fontSize: "13px", opacity: 0.9, color: "var(--text-muted, #7b6457)" }}>
                        {order.buyerDetails?.phone}
                      </div>
                      <div style={{ marginBottom: "4px", fontSize: "13px" }}>
                        Amount:&nbsp;
                        <span style={{ fontWeight: 700, color: "var(--brand, #8b5e34)" }}>
                          ₹{(order.finalAmount || order.totalAmount || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div style={{ marginBottom: "4px", fontSize: "13px", color: "var(--text-muted, #7b6457)" }}>
                        From&nbsp;
                        <span style={{ fontWeight: 600, color: "var(--text, #3f2d23)" }}>
                          {order.hubTracking?.sellerHubName}
                        </span>
                      </div>
                      <div style={{ fontSize: "13px", color: "var(--text-muted, #7b6457)" }}>
                        Items:&nbsp;
                        <span style={{ fontWeight: 600, color: "var(--text, #3f2d23)" }}>
                          {order.items?.length} product{order.items?.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={() => approveHubOrder(order._id)}
                        disabled={isProcessing}
                        style={{
                          flex: 1,
                          padding: "9px 10px",
                          background: isProcessing 
                            ? "var(--text-muted, #7b6457)" 
                            : "linear-gradient(135deg, var(--brand, #8b5e34) 0%, var(--brand-strong, #6f4518) 100%)",
                          color: "#fff",
                          border: "none",
                          borderRadius: "999px",
                          cursor: isProcessing ? "not-allowed" : "pointer",
                          fontSize: "13px",
                          fontWeight: 600,
                          letterSpacing: "0.03em",
                          textTransform: "uppercase",
                          boxShadow: isProcessing ? "none" : "0 6px 14px rgba(139, 94, 52, 0.35)",
                          transition: "all 0.2s ease",
                          opacity: isProcessing ? 0.7 : 1
                        }}
                        onMouseEnter={(e) => {
                          if (!isProcessing) {
                            e.target.style.background = "linear-gradient(135deg, var(--brand-strong, #6f4518) 0%, var(--brand, #8b5e34) 100%)";
                            e.target.style.transform = "translateY(-1px)";
                            e.target.style.boxShadow = "0 8px 18px rgba(139, 94, 52, 0.45)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isProcessing) {
                            e.target.style.background = "linear-gradient(135deg, var(--brand, #8b5e34) 0%, var(--brand-strong, #6f4518) 100%)";
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "0 6px 14px rgba(139, 94, 52, 0.35)";
                          }
                        }}
                      >
                        {isProcessing ? "Processing..." : "Approve & Dispatch"}
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ 
              textAlign: "center", 
              padding: "40px", 
              color: "var(--text-muted, #7b6457)",
              background: "var(--accent-soft, #f3e7dc)",
              borderRadius: "8px",
              border: "1px solid var(--border, #ead9c9)"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}></div>
              <div style={{ fontSize: "18px", fontWeight: "500", marginBottom: "8px", color: "var(--text, #3f2d23)" }}>
                No pending approvals
              </div>
              <div style={{ fontSize: "14px" }}>
                All hub orders have been processed. New approval requests will appear here when orders arrive at seller hubs.
              </div>
            </div>
          )}

          {/* All Notifications Section */}
          <div>
            <h3 style={{ color: "var(--brand, #8b5e34)", marginBottom: "15px", fontSize: "18px", fontFamily: "var(--title-font, 'Playfair Display', serif)" }}>
               Recent Hub Notifications
            </h3>
            
            {adminNotifications.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "40px", 
                color: "var(--text-muted, #7b6457)",
                background: "var(--accent-soft, #f3e7dc)",
                borderRadius: "8px",
                border: "1px solid var(--border, #ead9c9)"
              }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}></div>
                <div style={{ fontSize: "18px", fontWeight: "500", marginBottom: "8px", color: "var(--text, #3f2d23)" }}>
                  No notifications yet
                </div>
                <div style={{ fontSize: "14px" }}>
                  Hub notifications will appear here when orders move between hubs
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {adminNotifications.slice(0, 10).map((notification) => (
                  <div 
                    key={notification._id} 
                    style={{
                      border: `2px solid ${notification.read ? "var(--border, #ead9c9)" : "var(--brand, #8b5e34)"}`,
                      borderRadius: "8px",
                      padding: "16px",
                      background: notification.read ? "var(--surface, #ffffff)" : "var(--accent-soft, #f3e7dc)",
                      transition: "all 0.3s ease"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                      <h4 style={{ 
                        margin: 0, 
                        fontSize: "16px", 
                        color: notification.read ? "var(--text-muted, #7b6457)" : "var(--brand-strong, #6f4518)",
                        fontWeight: notification.read ? "500" : "600",
                        fontFamily: notification.read ? "var(--body-font, 'Poppins', sans-serif)" : "var(--title-font, 'Playfair Display', serif)"
                      }}>
                        {notification.title}
                      </h4>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: "600",
                        background: 
                          notification.type === "admin_approval_required" ? "var(--accent, #7b2e2e)" :
                          notification.type === "order_dispatched_to_customer_hub" ? "var(--brand, #8b5e34)" :
                          notification.type === "order_arrived_customer_hub" ? "var(--brand-strong, #6f4518)" : "var(--text-muted, #7b6457)",
                        color: "white"
                      }}>
                        {notification.type === "admin_approval_required" ? "APPROVAL REQUIRED" :
                         notification.type === "order_dispatched_to_customer_hub" ? "DISPATCHED TO HUB" :
                         notification.type === "order_arrived_customer_hub" ? "ARRIVED" : "INFO"}
                      </span>
                    </div>
                    
                    <p style={{ 
                      margin: "0 0 12px 0", 
                      fontSize: "14px", 
                      color: notification.read ? "var(--text-muted, #7b6457)" : "var(--text, #3f2d23)",
                      lineHeight: "1.4"
                    }}>
                      {notification.message}
                    </p>
                    
                    <div style={{ 
                      fontSize: "12px", 
                      color: "var(--text-muted, #7b6457)", 
                      marginTop: "8px"
                    }}>
                      {new Date(notification.createdAt).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
