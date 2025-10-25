import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    rating: 0,
    totalEarnings: 0,
    monthlyEarnings: 0
  });
  const [activeSection, setActiveSection] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [readyForDelivery, setReadyForDelivery] = useState(false);
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [selectedOrderForPickup, setSelectedOrderForPickup] = useState(null);
  const [pickupNotes, setPickupNotes] = useState("");

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem("deliveryToken");
    const agentData = localStorage.getItem("deliveryAgent");

    console.log("=== AUTHENTICATION CHECK ===");
    console.log("Token exists:", !!token);
    console.log("Agent data exists:", !!agentData);
    console.log("Token:", token);
    console.log("Agent data:", agentData);

    if (!token || !agentData) {
      console.log("Missing token or agent data, redirecting to login");
      toast.error("Please login to access delivery dashboard");
      navigate("/delivery-login");
      return;
    }

    try {
      const parsedAgent = JSON.parse(agentData);
      console.log("Parsed agent:", parsedAgent);
      setAgent(parsedAgent);
      setIsOnline(parsedAgent.isOnline || false);
      setReadyForDelivery(parsedAgent.readyForDelivery || false);
      
      // Fetch initial data
      fetchStats();
      fetchOrders();
    } catch (err) {
      console.error("Error parsing agent data:", err);
      // Clear invalid data and redirect to login
      localStorage.removeItem("deliveryToken");
      localStorage.removeItem("deliveryAgent");
      navigate("/delivery-login");
    }
  }, [navigate]);

  // Get current location and set up automatic sharing
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );

      // Set up automatic location sharing every 30 seconds
      const locationInterval = setInterval(() => {
        if (isOnline && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const newLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              };
              setLocation(newLocation);
              
              // Automatically share location if agent is online and authenticated
              if (agent && localStorage.getItem("deliveryToken")) {
                shareLiveLocation();
              }
            },
            (error) => {
              console.error("Error getting location for auto-share:", error);
            }
          );
        }
      }, 30000); // 30 seconds

      return () => clearInterval(locationInterval);
    }
  }, [isOnline]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("deliveryToken");
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/delivery-orders/stats/dashboard", {
        headers: getAuthHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchOrders = async () => {
    try {
      console.log("=== FETCHING DELIVERY ORDERS ===");
      console.log("Auth headers:", getAuthHeaders());
      console.log("Agent ID:", agent?.agentId);
      
      const res = await fetch(`http://localhost:5000/api/delivery-orders`, {
        headers: getAuthHeaders()
      });

      console.log("Response status:", res.status);
      console.log("Response ok:", res.ok);

      if (res.ok) {
        const data = await res.json();
        console.log("Response data:", data);
        if (data.success) {
          console.log("Orders fetched:", data.orders);
          console.log("Number of orders:", data.orders?.length || 0);
          setOrders(data.orders || []);
        } else {
          console.error("API returned success: false", data);
          setOrders([]);
        }
      } else {
        const errorData = await res.json();
        console.error("Server error:", errorData);
        setOrders([]);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setOrders([]);
    }
  };

  const updateOnlineStatus = async (status) => {
    try {
      const res = await fetch("http://localhost:5000/api/delivery/status/online", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ isOnline: status })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIsOnline(status);
          toast.success(`You are now ${status ? 'online' : 'offline'}`);
          
          // Update local storage
          const agentData = JSON.parse(localStorage.getItem("deliveryAgent"));
          agentData.isOnline = status;
          localStorage.setItem("deliveryAgent", JSON.stringify(agentData));
        }
      }
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Failed to update status");
    }
  };

  const updateReadyForDeliveryStatus = async (status) => {
    try {
      const res = await fetch("http://localhost:5000/api/delivery/status/ready", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ readyForDelivery: status })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setReadyForDelivery(status);
          toast.success(`You are now ${status ? 'ready for delivery' : 'not ready for delivery'}`);
          
          // Update local storage
          const agentData = JSON.parse(localStorage.getItem("deliveryAgent"));
          agentData.readyForDelivery = status;
          localStorage.setItem("deliveryAgent", JSON.stringify(agentData));
        }
      }
    } catch (err) {
      console.error("Error updating ready status:", err);
      toast.error("Failed to update ready status");
    }
  };

  const updateLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    toast.info("Getting your current location...", { autoClose: 1500 });

    // Open a blank tab now (user gesture) to avoid popup blockers; update it after we have coords
    const previewWin = window.open("", "_blank");

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude
      };
      try {
        const res = await fetch("http://localhost:5000/api/delivery/location", {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(coords)
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setLocation(coords);
            toast.success("Location updated successfully");
            const mapUrl = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
            if (previewWin && !previewWin.closed) {
              previewWin.location.href = mapUrl;
            } else {
              window.open(mapUrl, "_blank");
            }
          } else {
            toast.error(data.error || "Failed to update location");
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          toast.error(errData.error || "Failed to update location");
        }
      } catch (err) {
        console.error("Error updating location:", err);
        toast.error("Failed to update location");
      }
    }, (error) => {
      console.error("Geolocation error:", error);
      toast.error("Permission denied or unavailable");
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  };

  const updateOrderStatus = async (orderId, status, notes = "") => {
    try {
      console.log("=== UPDATING ORDER STATUS ===");
      console.log("Order ID:", orderId);
      console.log("Status:", status);
      
      const res = await fetch(`http://localhost:5000/api/delivery-orders/${orderId}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, notes })
      });

      console.log("Response status:", res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log("Response data:", data);
        if (data.success) {
          toast.success(`Order ${status.replace('_', ' ')} successfully!`);
          // Refresh orders to show updated status
          await fetchOrders();
        } else {
          toast.error(data.error || "Failed to update order status");
        }
      } else {
        const errorData = await res.json();
        console.error("Server error:", errorData);
        toast.error(errorData.error || "Failed to update order status");
      }
    } catch (err) {
      console.error("Error updating order status:", err);
      toast.error("Error updating order status");
    }
  };

  const acceptRejectOrder = async (orderId, action) => {
    try {
      console.log("=== ACCEPT/REJECT ORDER ===");
      console.log("Order ID:", orderId);
      console.log("Action:", action);
      
      const res = await fetch(`http://localhost:5000/api/delivery-orders/${orderId}/accept`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action })
      });

      console.log("Response status:", res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log("Response data:", data);
        if (data.success) {
          toast.success(`Order ${action}ed successfully!`);
          // Refresh orders to show updated status
          await fetchOrders();
        } else {
          toast.error(data.error || `Failed to ${action} order`);
        }
      } else {
        const errorData = await res.json();
        console.error("Server error:", errorData);
        toast.error(errorData.error || `Failed to ${action} order`);
      }
    } catch (err) {
      console.error(`Error ${action}ing order:`, err);
      toast.error(`Error ${action}ing order`);
    }
  };

  const shareLiveLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    // Check if agent is authenticated
    if (!agent || !localStorage.getItem("deliveryToken")) {
      console.log("Agent not authenticated, skipping location share");
      return;
    }

    toast.info("Sharing your live location...", { autoClose: 1500 });

    // Open a blank tab now (user gesture) to avoid popup blockers; update it after we have coords
    const previewWin = window.open("", "_blank");

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude
      };
      try {
        const res = await fetch("http://localhost:5000/api/delivery-orders/location", {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(coords)
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setLocation(coords);
            toast.success("Live location shared successfully");
            const mapUrl = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
            if (previewWin && !previewWin.closed) {
              previewWin.location.href = mapUrl;
            } else {
              window.open(mapUrl, "_blank");
            }
          } else {
            toast.error(data.error || "Failed to share live location");
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          toast.error(errData.error || "Failed to share live location");
        }
      } catch (err) {
        console.error("Error sharing live location:", err);
        // Only show error toast if it's not a connection issue
        if (!err.message?.includes('Failed to fetch') && !err.message?.includes('ERR_CONNECTION_REFUSED')) {
          toast.error("Failed to share live location");
        }
      }
    }, (error) => {
      console.error("Geolocation error:", error);
      toast.error("Permission denied or unavailable");
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  };

  const getGoogleMapsUrl = (order) => {
    if (!order.buyerDetails?.address) return null;
    
    const address = `${order.buyerDetails.address.street || ''}, ${order.buyerDetails.address.city || ''}, ${order.buyerDetails.address.state || ''} ${order.buyerDetails.address.pincode || ''}`.trim();
    const encodedAddress = encodeURIComponent(address);
    return `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
  };

  const handleLogout = () => {
    localStorage.removeItem("deliveryToken");
    localStorage.removeItem("deliveryAgent");
    toast.success("Logged out successfully");
    navigate("/delivery-login");
  };

  if (!agent) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "100vh",
        fontSize: "18px" 
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: "#fafafa",
      position: "relative"
    }}>
      {/* Sidebar */}
      <aside style={{
        width: "280px",
        background: "#ffffff",
        borderRight: "1px solid #e0e0e0",
        padding: "24px 20px",
        boxShadow: "0 0 20px rgba(0, 0, 0, 0.05)",
        overflowY: "auto"
      }}>
        {/* Profile Section */}
        <div style={{
          textAlign: "center",
          marginBottom: "24px",
          padding: "24px 20px",
          background: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #e0e0e0"
        }}>
          <div style={{
            width: "64px",
            height: "64px",
            background: "#f5f5f5",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px",
            fontSize: "28px",
            border: "2px solid #e0e0e0"
          }}>
            🚚
          </div>
          <h3 style={{ margin: "0 0 4px 0", color: "#333", fontSize: "17px", fontWeight: "600" }}>{agent.name}</h3>
          <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#999" }}>
            ID: {agent.agentId}
          </p>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: "600",
            backgroundColor: isOnline ? "#f0f9f4" : "#fef2f2",
            color: isOnline ? "#10b981" : "#ef4444",
            border: isOnline ? "1px solid #d1fae5" : "1px solid #fee2e2",
            marginBottom: "14px"
          }}>
            <span style={{ fontSize: "8px" }}>●</span>
            {isOnline ? "ONLINE" : "OFFLINE"}
          </div>
          <button
            onClick={() => updateOnlineStatus(!isOnline)}
            style={{
              width: "100%",
              padding: "10px 16px",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              color: "#666",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "500",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#f5f5f5";
              e.target.style.borderColor = "#ccc";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#ffffff";
              e.target.style.borderColor = "#e0e0e0";
            }}
          >
            {isOnline ? "Go Offline" : "Go Online"}
          </button>
        </div>

        {/* Ready for Delivery Status */}
        <div style={{
          padding: "18px",
          background: "#ffffff",
          borderRadius: "12px",
          marginBottom: "24px",
          border: "1px solid #e0e0e0"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <span style={{ fontWeight: "600", color: "#333", fontSize: "13px" }}>
              📦 Ready Status
            </span>
            <span style={{
              padding: "4px 12px",
              borderRadius: "16px",
              fontSize: "10px",
              fontWeight: "600",
              background: readyForDelivery ? "#f0f9f4" : "#f5f5f5",
              color: readyForDelivery ? "#10b981" : "#999",
              border: readyForDelivery ? "1px solid #d1fae5" : "1px solid #e0e0e0"
            }}>
              {readyForDelivery ? "✓ READY" : "NOT READY"}
            </span>
          </div>
          <button
            onClick={() => updateReadyForDeliveryStatus(!readyForDelivery)}
            style={{
              width: "100%",
              padding: "10px 16px",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              background: "#ffffff",
              color: "#666",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "500",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#f5f5f5";
              e.target.style.borderColor = "#ccc";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#ffffff";
              e.target.style.borderColor = "#e0e0e0";
            }}
          >
            {readyForDelivery ? "Mark Not Ready" : "Mark Ready"}
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            onClick={() => setActiveSection("dashboard")}
            style={{
              ...navButtonStyle,
              ...(activeSection === "dashboard" ? activeNavStyle : {})
            }}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveSection("orders")}
            style={{
              ...navButtonStyle,
              ...(activeSection === "orders" ? activeNavStyle : {})
            }}
          >
            📦 My Orders
          </button>
          <button
            onClick={() => setActiveSection("profile")}
            style={{
              ...navButtonStyle,
              ...(activeSection === "profile" ? activeNavStyle : {})
            }}
          >
            👤 Profile
          </button>
          <button
            onClick={() => setActiveSection("earnings")}
            style={{
              ...navButtonStyle,
              ...(activeSection === "earnings" ? activeNavStyle : {})
            }}
          >
            💰 Earnings & History
          </button>
          <button
            onClick={updateLocation}
            style={{
              ...navButtonStyle,
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              marginTop: "8px"
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#f5f5f5";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#ffffff";
            }}
          >
            📍 Update Location
          </button>
          <button
            onClick={shareLiveLocation}
            style={{
              ...navButtonStyle,
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              marginTop: "4px"
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#f5f5f5";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#ffffff";
            }}
          >
            📡 Share Live Location
          </button>
          <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid #eee" }} />
          <button
            onClick={handleLogout}
            style={{
              ...navButtonStyle,
              color: "#dc3545",
              fontWeight: "bold"
            }}
          >
            🚪 Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ 
        flex: 1, 
        padding: "32px", 
        backgroundColor: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(10px)",
        overflowY: "auto",
        margin: "16px",
        borderRadius: "24px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
      }}>
        {/* Dashboard Section */}
        {activeSection === "dashboard" && (
          <>
            <div style={{ marginBottom: "28px" }}>
              <h1 style={{ 
                margin: "0 0 6px 0", 
                color: "#333",
                fontSize: "22px",
                fontWeight: "700"
              }}>
                Dashboard
              </h1>
              <p style={{ margin: 0, color: "#999", fontSize: "14px" }}>Welcome back! Track your performance and manage orders</p>
            </div>
            
            {/* Stats Cards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              marginBottom: "24px"
            }}>
              <div style={statCardStyle} 
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.08)";
                }}
              >
                <div style={{ fontSize: "28px", marginBottom: "12px", opacity: 0.8 }}>📦</div>
                <h3 style={{ margin: "0 0 8px 0", color: "#999", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Deliveries</h3>
                <p style={{ margin: 0, fontSize: "26px", fontWeight: "700", color: "#333" }}>
                  {stats.totalDeliveries}
                </p>
              </div>
              
              <div style={statCardStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.08)";
                }}
              >
                <div style={{ fontSize: "28px", marginBottom: "12px", opacity: 0.8 }}>⭐</div>
                <h3 style={{ margin: "0 0 8px 0", color: "#999", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Rating</h3>
                <p style={{ margin: 0, fontSize: "26px", fontWeight: "700", color: "#333" }}>
                  {stats.rating ? stats.rating.toFixed(1) : "0.0"}
                  <span style={{ fontSize: "15px", color: "#999", fontWeight: "500" }}>/5.0</span>
                </p>
              </div>
              
              <div style={statCardStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.08)";
                }}
              >
                <div style={{ fontSize: "28px", marginBottom: "12px", opacity: 0.8 }}>💰</div>
                <h3 style={{ margin: "0 0 8px 0", color: "#999", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Earnings</h3>
                <p style={{ margin: 0, fontSize: "26px", fontWeight: "700", color: "#10b981" }}>
                  ₹{stats.totalEarnings}
                </p>
              </div>
              
              <div style={statCardStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.08)";
                }}
              >
                <div style={{ fontSize: "28px", marginBottom: "12px", opacity: 0.8 }}>📅</div>
                <h3 style={{ margin: "0 0 8px 0", color: "#999", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>This Month</h3>
                <p style={{ margin: 0, fontSize: "26px", fontWeight: "700", color: "#6366f1" }}>
                  ₹{stats.monthlyEarnings}
                </p>
              </div>
            </div>

            {/* Recent Orders */}
            <div style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ margin: 0, color: "#5c4033" }}>Recent Orders</h2>
                <button
                  onClick={() => setActiveSection("orders")}
                  style={{
                    backgroundColor: "transparent",
                    color: "var(--brand-strong, #6f4518)",
                    border: "1px solid var(--brand-strong, #6f4518)",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                >
                  View All
                </button>
              </div>
              {orders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <div style={{ fontSize: "32px", marginBottom: "15px" }}>📦</div>
                  <p style={{ color: "#666", marginBottom: "10px" }}>
                    No orders assigned yet.
                  </p>
                  <p style={{ color: "#999", fontSize: "14px" }}>
                    Orders will appear here when admin assigns them to you.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {orders.slice(0, 5).map((order) => (
                    <div key={order._id} style={{
                      padding: "15px",
                      border: "1px solid #e9ecef",
                      borderRadius: "8px",
                      backgroundColor: "#fafafa"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                      <div>
                          <h4 style={{ margin: "0 0 5px 0", color: "#5c4033" }}>Order #{order.orderNumber}</h4>
                          <p style={{ margin: "0 0 3px 0", fontSize: "14px", color: "#666" }}>
                            Customer: {order.buyerDetails?.name}
                          </p>
                        <p style={{ margin: "0", fontSize: "14px", color: "#666" }}>
                            Phone: {order.buyerDetails?.phone}
                        </p>
                      </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ margin: "0 0 5px 0", fontSize: "16px", fontWeight: "600", color: "#5c4033" }}>
                            ₹{order.finalAmount}
                          </p>
                      <span style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "500",
                            backgroundColor: order.orderStatus === "delivered" ? "#d4edda" : 
                                       order.orderStatus === "shipped" ? "#fff3cd" : "#cce5ff",
                            color: order.orderStatus === "delivered" ? "#155724" : 
                                   order.orderStatus === "shipped" ? "#856404" : "#004085"
                          }}>
                            {order.orderStatus?.toUpperCase()}
                      </span>
                        </div>
                      </div>
                      
                      {/* Quick address info */}
                      {order.buyerDetails?.address && (
                        <div style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
                          📍 {order.buyerDetails.address.city}, {order.buyerDetails.address.state} - {order.buyerDetails.address.pincode}
                        </div>
                      )}
                      
                      {/* Quick action button */}
                      <div style={{ marginTop: "10px", textAlign: "right" }}>
                        <button
                          onClick={() => setActiveSection("orders")}
                          style={{
                            backgroundColor: "var(--brand, #8b5e34)",
                            color: "white",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px"
                          }}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Orders Section */}
        {activeSection === "orders" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
              <h1 style={{ color: "#5c4033", margin: 0 }}>My Orders</h1>
              <button
                onClick={fetchOrders}
                style={{
                  backgroundColor: "var(--brand, #8b5e34)",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                🔄 Refresh
              </button>
            </div>
            
            <div style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
            }}>
              {orders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <div style={{ fontSize: "48px", marginBottom: "20px" }}>📦</div>
                  <h3 style={{ color: "#5c4033", marginBottom: "10px" }}>No Orders Assigned</h3>
                  <p style={{ color: "#666", marginBottom: "20px" }}>
                    You don't have any orders assigned to you yet.
                  </p>
                  <div style={{ 
                    backgroundColor: "#f8f9fa", 
                    padding: "20px", 
                    borderRadius: "8px", 
                    border: "1px solid #e9ecef",
                    textAlign: "left",
                    maxWidth: "500px",
                    margin: "0 auto"
                  }}>
                    <h4 style={{ color: "#5c4033", marginBottom: "10px" }}>How it works:</h4>
                    <ol style={{ color: "#666", fontSize: "14px", lineHeight: "1.6" }}>
                      <li>Admin will assign orders to you from the admin dashboard</li>
                      <li>Once assigned, orders will appear here automatically</li>
                      <li>You can update order status (pickup, in transit, delivered)</li>
                      <li>Make sure you're online to receive new assignments</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 style={{ marginBottom: "20px", color: "#5c4033" }}>
                    Assigned Orders ({orders.length})
                  </h2>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {orders.map((order) => (
                      <div key={order._id} style={{
                        border: "1px solid #e0e0e0",
                        borderRadius: "12px",
                        padding: "24px",
                        backgroundColor: "#ffffff",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                        transition: "all 0.2s ease"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
                          <div>
                            <h3 style={{ margin: "0 0 5px 0", color: "#5c4033" }}>
                              Order #{order.orderNumber}
                            </h3>
                            <p style={{ margin: "0 0 5px 0", fontSize: "14px", color: "#666" }}>
                              Customer: {order.buyerDetails?.name}
                            </p>
                            <p style={{ margin: "0 0 5px 0", fontSize: "14px", color: "#666" }}>
                              Phone: {order.buyerDetails?.phone}
                            </p>
                            <p style={{ margin: "0", fontSize: "16px", fontWeight: "600", color: "#5c4033" }}>
                              Total: ₹{order.finalAmount}
                            </p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <span style={{
                              padding: "6px 12px",
                              borderRadius: "20px",
                              fontSize: "12px",
                              fontWeight: "500",
                              backgroundColor: order.orderStatus === "delivered" ? "#d4edda" : 
                                         order.orderStatus === "accepted" ? "#d1ecf1" :
                                         order.orderStatus === "rejected" ? "#f8d7da" :
                                         order.orderStatus === "picked_up" ? "#fff3cd" :
                                         order.orderStatus === "in_transit" ? "#e2e3e5" :
                                         order.orderStatus === "shipped" ? "#fff3cd" : "#cce5ff",
                              color: order.orderStatus === "delivered" ? "#155724" : 
                                     order.orderStatus === "accepted" ? "#0c5460" :
                                     order.orderStatus === "rejected" ? "#721c24" :
                                     order.orderStatus === "picked_up" ? "#856404" :
                                     order.orderStatus === "in_transit" ? "#383d41" :
                                     order.orderStatus === "shipped" ? "#856404" : "#004085"
                            }}>
                              {order.orderStatus?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        
                        {/* Customer Address */}
                        {order.buyerDetails?.address && (
                          <div style={{ marginBottom: "15px" }}>
                            <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#5c4033" }}>Delivery Address:</h4>
                            <div style={{ 
                              backgroundColor: "#fff", 
                              padding: "12px", 
                              borderRadius: "6px", 
                              border: "1px solid #e9ecef",
                              fontSize: "14px",
                              color: "#666"
                            }}>
                              {order.buyerDetails.address.street && <div>{order.buyerDetails.address.street}</div>}
                              {order.buyerDetails.address.city && <div>{order.buyerDetails.address.city}</div>}
                              {order.buyerDetails.address.state && <div>{order.buyerDetails.address.state}</div>}
                              {order.buyerDetails.address.pincode && <div>PIN: {order.buyerDetails.address.pincode}</div>}
                              {order.buyerDetails.address.landmark && <div>Landmark: {order.buyerDetails.address.landmark}</div>}
                            </div>
                          </div>
                        )}
                        
                        {/* Order Items */}
                        <div style={{ marginBottom: "15px" }}>
                          <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#5c4033" }}>Items:</h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {order.items?.map((item, index) => (
                              <div key={index} style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "8px 12px",
                                backgroundColor: "#fff",
                                borderRadius: "4px",
                                border: "1px solid #e9ecef"
                              }}>
                                <div>
                                  <span style={{ fontWeight: "500" }}>{item.title}</span>
                                  {item.variant && (
                                    <span style={{ color: "#666", marginLeft: "8px" }}>
                                      ({item.variant.weight})
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: "14px", color: "#666" }}>
                                  Qty: {item.quantity} × ₹{item.variant?.price || 0}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Delivery Info */}
                        {order.deliveryInfo && (
                          <div style={{ marginBottom: "15px" }}>
                            <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#5c4033" }}>Delivery Info:</h4>
                            <div style={{ 
                              backgroundColor: "#fff", 
                              padding: "12px", 
                              borderRadius: "6px", 
                              border: "1px solid #e9ecef",
                              fontSize: "14px",
                              color: "#666"
                            }}>
                              <div>Assigned: {order.deliveryInfo.assignedAt ? new Date(order.deliveryInfo.assignedAt).toLocaleString() : "Not assigned"}</div>
                              {order.deliveryInfo.pickedUpAt && (
                                <div>Picked up: {new Date(order.deliveryInfo.pickedUpAt).toLocaleString()}</div>
                              )}
                              {order.deliveryInfo.deliveredAt && (
                                <div>Delivered: {new Date(order.deliveryInfo.deliveredAt).toLocaleString()}</div>
                              )}
                              {order.deliveryInfo.deliveryNotes && (
                                <div>Notes: {order.deliveryInfo.deliveryNotes}</div>
                              )}
                            </div>
                            {/* Timeline */}
                            <div style={{ marginTop: "16px", background: "#fafafa", border: "1px solid #e0e0e0", padding: "16px", borderRadius: "10px" }}>
                              <h5 style={{ margin: "0 0 14px 0", color: "#666", fontSize: "12px", fontWeight: "600" }}>Order Progress</h5>
                              {(() => {
                                const di = order.deliveryInfo || {};
                                const steps = [
                                  { key: 'confirmed', label: 'Order Confirmed', ts: order.createdAt, status: 'confirmed', icon: '✓' },
                                  { key: 'assigned', label: 'Assigned', ts: di.assignedAt, status: 'assigned', icon: '📋' },
                                  { key: 'accepted', label: 'Accepted', ts: di.acceptedAt, status: 'accepted', icon: '✅' },
                                  { key: 'shipped', label: 'Shipped', ts: di.pickedUpAt, status: 'picked_up', icon: '📦' },
                                  { key: 'delivered', label: 'Delivered', ts: di.deliveredAt, status: 'delivered', icon: '🎉' }
                                ];
                                // Check both timestamp and order status
                                const activeIdx = steps.reduce((acc, s, idx) => {
                                  if (s.ts) return idx;
                                  // Also check if order status matches or is beyond this step
                                  if (s.status === 'delivered' && order.orderStatus === 'delivered') return idx;
                                  if (s.status === 'picked_up' && (order.orderStatus === 'picked_up' || order.orderStatus === 'shipped' || order.orderStatus === 'in_transit' || order.orderStatus === 'delivered')) return idx;
                                  if (s.status === 'accepted' && (order.orderStatus === 'accepted' || order.orderStatus === 'picked_up' || order.orderStatus === 'shipped' || order.orderStatus === 'in_transit' || order.orderStatus === 'delivered')) return idx;
                                  if (s.status === 'assigned' && (order.orderStatus === 'assigned' || order.orderStatus === 'accepted' || order.orderStatus === 'picked_up' || order.orderStatus === 'shipped' || order.orderStatus === 'in_transit' || order.orderStatus === 'delivered')) return idx;
                                  return acc;
                                }, -1);
                                return (
                                  <div>
                                    {steps.map((s, idx) => (
                                      <div key={s.key} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: '12px', alignItems: 'start' }}>
                                        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                                          <div style={{ 
                                            width: 18, 
                                            height: 18, 
                                            borderRadius: '50%', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            background: idx <= activeIdx ? '#333' : '#e0e0e0',
                                            color: 'white',
                                            fontSize: '9px',
                                            fontWeight: '600',
                                            marginTop: 2,
                                            border: 'none'
                                          }}>
                                            {idx <= activeIdx ? '✓' : ''}
                                          </div>
                                          {idx < steps.length - 1 && (
                                            <span style={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', width: 2, height: 30, background: idx < activeIdx ? '#333' : '#e0e0e0' }} />
                                          )}
                                        </div>
                                        <div style={{ paddingBottom: 12 }}>
                                          <div style={{ fontWeight: 600, color: idx <= activeIdx ? '#333' : '#999', fontSize: '13px' }}>
                                            {s.label}
                                          </div>
                                          {s.ts && (
                                            <div style={{ marginTop: 3, color: '#999', fontSize: '11px' }}>
                                              {new Date(s.ts).toLocaleString()}
                                            </div>
                                          )}
                                          {!s.ts && idx <= activeIdx + 1 && (
                                            <div style={{ color: '#ccc', fontSize: 11, marginTop: 3 }}>Pending</div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div style={{ display: "flex", gap: "10px", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                          {/* Left side - Map and Location */}
                          <div style={{ display: "flex", gap: "10px" }}>
                            {getGoogleMapsUrl(order) && (
                              <a
                                href={getGoogleMapsUrl(order)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  backgroundColor: "var(--error, #9e4c34)",
                                  color: "white",
                                  border: "none",
                                  padding: "8px 16px",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  textDecoration: "none",
                                  display: "inline-block"
                                }}
                              >
                                🗺️ View Route
                              </a>
                            )}
                          </div>

                          {/* Right side - Status Actions */}
                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            {/* Accept for assigned orders */}
                            {order.orderStatus === "assigned" && (
                              <button
                                onClick={() => {
                                  if (window.confirm("Accept this delivery assignment?")) {
                                    acceptRejectOrder(order._id, "accept");
                                  }
                                }}
                                style={{
                                  backgroundColor: "var(--brand, #8b5e34)",
                                  color: "white",
                                  border: "none",
                                  padding: "8px 16px",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontSize: "12px"
                                }}
                              >
                                ✅ Accept
                              </button>
                            )}

                            {/* Pickup confirmation for accepted orders */}
                            {order.orderStatus === "accepted" && (
                              <button
                                onClick={() => {
                                  setSelectedOrderForPickup(order);
                                  setPickupNotes("");
                                  setShowPickupModal(true);
                                }}
                                style={{
                                  backgroundColor: "var(--brand, #8b5e34)",
                                  color: "white",
                                  border: "none",
                                  padding: "8px 16px",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontSize: "12px"
                                }}
                              >
                                📦 Mark as Pickup
                              </button>
                            )}
                            
                            {/* Remove explicit Out for Delivery button. Pickup will start tracking automatically. */}
                            
                            {/* In-transit orders - waiting for buyer to mark as delivered */}
                            {order.orderStatus === "in_transit" && (
                              <div style={{
                                backgroundColor: "#e3f2fd",
                                color: "#1976d2",
                                border: "1px solid #2196f3",
                                padding: "8px 16px",
                                borderRadius: "4px",
                                fontSize: "12px",
                                textAlign: "center"
                              }}>
                                🚚 Out for Delivery - Waiting for buyer to confirm delivery
                              </div>
                            )}
                            
                            {/* Delivered orders */}
                            {order.orderStatus === "delivered" && (
                              <div style={{
                                backgroundColor: "#d4edda",
                                color: "#155724",
                                border: "1px solid #c3e6cb",
                                padding: "8px 16px",
                                borderRadius: "4px",
                                fontSize: "12px",
                                textAlign: "center"
                              }}>
                                ✅ Order Delivered
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Profile Section */}
        {activeSection === "profile" && (
          <>
            <h1 style={{ marginBottom: "30px", color: "#5c4033" }}>My Profile</h1>
            <div style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                  <h3 style={{ marginBottom: "15px", color: "#5c4033" }}>Personal Information</h3>
                  <p><strong>Name:</strong> {agent.name}</p>
                  <p><strong>Agent ID:</strong> {agent.agentId}</p>
                  <p><strong>Phone:</strong> {agent.phone}</p>
                  <p><strong>Email:</strong> {agent.email}</p>
                  <p><strong>Username:</strong> {agent.username}</p>
                </div>
                <div>
                  <h3 style={{ marginBottom: "15px", color: "#5c4033" }}>Vehicle Information</h3>
                  <p><strong>Type:</strong> {agent.vehicleInfo?.type || "Not specified"}</p>
                  <p><strong>Number:</strong> {agent.vehicleInfo?.number || "Not specified"}</p>
                  <p><strong>Status:</strong> 
                    <span style={{
                      marginLeft: "8px",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      backgroundColor: "#d4edda",
                      color: "#155724"
                    }}>
                      {agent.status}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Earnings & History Section */}
        {activeSection === "earnings" && (
          <>
            <h1 style={{ marginBottom: "30px", color: "#5c4033" }}>Earnings & History</h1>
            
            {/* Earnings Summary */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "20px",
              marginBottom: "30px"
            }}>
              <div style={{
                backgroundColor: "#fff",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>💰</div>
                <h3 style={{ margin: "0 0 5px 0", color: "#5c4033" }}>Total Earnings</h3>
                <p style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: "#28a745" }}>
                  ₹{stats.totalEarnings}
                </p>
              </div>
              
              <div style={{
                backgroundColor: "#fff",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>📅</div>
                <h3 style={{ margin: "0 0 5px 0", color: "#5c4033" }}>This Month</h3>
                <p style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: "#007bff" }}>
                  ₹{stats.monthlyEarnings}
                </p>
              </div>
              
              <div style={{
                backgroundColor: "#fff",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>📦</div>
                <h3 style={{ margin: "0 0 5px 0", color: "#5c4033" }}>Completed Orders</h3>
                <p style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: "#6c757d" }}>
                  {stats.totalDeliveries}
                </p>
              </div>
              
              <div style={{
                backgroundColor: "#fff",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>⭐</div>
                <h3 style={{ margin: "0 0 5px 0", color: "#5c4033" }}>Average Rating</h3>
                <p style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: "#ffc107" }}>
                  {stats.rating ? stats.rating.toFixed(1) : "0.0"}/5.0
                </p>
              </div>
            </div>

            {/* Delivery History */}
            <div style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
            }}>
              <h2 style={{ marginBottom: "20px", color: "#5c4033" }}>Delivery History</h2>
              
              {orders.filter(order => order.orderStatus === "delivered").length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <div style={{ fontSize: "48px", marginBottom: "20px" }}>📦</div>
                  <h3 style={{ color: "#5c4033", marginBottom: "10px" }}>No Completed Deliveries</h3>
                  <p style={{ color: "#666" }}>
                    Your completed deliveries will appear here.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {orders.filter(order => order.orderStatus === "delivered").map((order) => (
                    <div key={order._id} style={{
                      border: "1px solid #e9ecef",
                      borderRadius: "8px",
                      padding: "15px",
                      backgroundColor: "#f8f9fa"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <h4 style={{ margin: "0 0 5px 0", color: "#5c4033" }}>
                            Order #{order.orderNumber}
                          </h4>
                          <p style={{ margin: "0 0 3px 0", fontSize: "14px", color: "#666" }}>
                            Customer: {order.buyerDetails?.name}
                          </p>
                          <p style={{ margin: "0", fontSize: "14px", color: "#666" }}>
                            Delivered: {order.deliveryInfo?.deliveredAt ? new Date(order.deliveryInfo.deliveredAt).toLocaleDateString() : "N/A"}
                          </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ margin: "0 0 5px 0", fontSize: "16px", fontWeight: "600", color: "#28a745" }}>
                            ₹{order.finalAmount}
                          </p>
                          <span style={{
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            backgroundColor: "#d4edda",
                            color: "#155724"
                          }}>
                            DELIVERED
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Pickup Confirmation Modal */}
      {showPickupModal && selectedOrderForPickup && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            padding: "24px",
            maxWidth: "500px",
            width: "100%",
            position: "relative"
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowPickupModal(false)}
              style={{
                position: "absolute",
                top: "15px",
                right: "15px",
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: "#666"
              }}
            >
              ×
            </button>

            <h2 style={{ marginBottom: "20px", color: "#5c4033" }}>
              Confirm Pickup
            </h2>

            <div style={{ marginBottom: "20px" }}>
              <p><strong>Order:</strong> #{selectedOrderForPickup.orderNumber}</p>
              <p><strong>Customer:</strong> {selectedOrderForPickup.buyerDetails?.name}</p>
              <p><strong>Total:</strong> ₹{selectedOrderForPickup.finalAmount}</p>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ marginBottom: "10px", color: "#5c4033" }}>Pickup Notes (Optional)</h3>
              <textarea
                value={pickupNotes}
                onChange={(e) => setPickupNotes(e.target.value)}
                placeholder="Add any notes about the pickup (e.g., items condition, special instructions, etc.)"
                style={{
                  width: "100%",
                  minHeight: "80px",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "14px",
                  resize: "vertical"
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setShowPickupModal(false)}
                style={{
                  background: "#ccc",
                  color: "#333",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await updateOrderStatus(selectedOrderForPickup._id, "picked_up", pickupNotes);
                  setShowPickupModal(false);
                  setSelectedOrderForPickup(null);
                  setPickupNotes("");
                }}
                style={{
                  background: "#28a745",
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                Confirm Pickup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const navButtonStyle = {
  backgroundColor: "transparent",
  border: "none",
  textAlign: "left",
  padding: "12px 16px",
  cursor: "pointer",
  color: "#666",
  fontSize: "14px",
  borderRadius: "8px",
  width: "100%",
  transition: "all 0.2s ease",
  fontWeight: "500",
  display: "flex",
  alignItems: "center",
  gap: "10px"
};

const activeNavStyle = {
  background: "#f5f5f5",
  color: "#333",
  fontWeight: "600"
};

const statCardStyle = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
  textAlign: "center",
  border: "1px solid #e0e0e0",
  transition: "all 0.2s ease",
  cursor: "pointer"
};
