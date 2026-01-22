import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { 
  FiBell, 
  FiPackage, 
  FiTruck, 
  FiMapPin, 
  FiUser, 
  FiLogOut,
  FiRefreshCw,
  FiClock,
  FiCheckCircle,
  FiMenu,
  FiX,
  FiBox,
  FiGrid,
  FiCheck,
  FiUsers,
  FiKey,
  FiChevronRight,
  FiStar
} from "react-icons/fi";

export default function CraftedByHerHubDashboard() {
  const navigate = useNavigate();
  const [manager, setManager] = useState(null);
  const [stats, setStats] = useState({
    totalHubs: 0,
    ordersAtSellerHubs: 0,
    ordersInTransit: 0,
    ordersAtCustomerHubs: 0,
    ordersAwaitingPickup: 0,
    deliveredOrders: 0
  });
  const [hubsByDistrict, setHubsByDistrict] = useState({});
  const [ordersByDistrict, setOrdersByDistrict] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedDistricts, setExpandedDistricts] = useState({});
  const [activeSection, setActiveSection] = useState("dashboard");
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [otpOrders, setOtpOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [generatingOTP, setGeneratingOTP] = useState(false);
  const [otpGenerated, setOtpGenerated] = useState(false);
  // Order lists for different sections
  const [sellerHubOrders, setSellerHubOrders] = useState([]);
  const [customerHubOrders, setCustomerHubOrders] = useState([]);
  const [approvedOrders, setApprovedOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("hubManagerToken");
    const managerData = localStorage.getItem("hubManager");

    if (!token || !managerData) {
      toast.error("Please login first");
      navigate("/hub-manager/login");
      return;
    }

    setManager(JSON.parse(managerData));
    fetchDashboardData(token);
  }, [navigate]);

  const fetchDashboardData = async (token) => {
    setLoading(true);
    try {
      const managerData = localStorage.getItem("hubManager");
      const manager = managerData ? JSON.parse(managerData) : null;
      const managerId = manager?.managerId;
      
      if (!managerId) {
        toast.error("Manager ID not found. Please login again.");
        navigate("/hub-manager/login");
        return;
      }

      // Fetch all data in parallel
      const [hubsRes, notificationsRes, ordersRes, statsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/hubs/all-with-stats`).catch(() => ({ ok: false })),
        
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/hub-notifications?managerId=${managerId}&unreadOnly=true`).catch(() => ({ ok: false })),
        
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/hub-notifications/orders-by-district`).catch(() => ({ ok: false })),
        
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/hub-notifications/dashboard-stats`).catch(() => ({ ok: false }))
      ]);

      // Process responses
      if (hubsRes.ok) {
        const hubsData = await hubsRes.json();
        if (hubsData.success && hubsData.hubs) {
          
          // Group hubs by district
          const grouped = {};
          hubsData.hubs.forEach(hub => {
            const district = hub.district || "N/A";
            if (!grouped[district]) grouped[district] = [];
            grouped[district].push(hub);
          });
          setHubsByDistrict(grouped);
          
          // Calculate stats from hubs data
          const totalHubs = hubsData.hubs.length;
          setStats(prev => ({
            ...prev,
            totalHubs
          }));
        }
      }

      if (notificationsRes.ok) {
        const notificationsData = await notificationsRes.json();
        if (notificationsData.success) {
          setNotifications(notificationsData.notifications || []);
          setUnreadCount(notificationsData.unreadCount || 0);
        }
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        if (ordersData.success) {
          setOrdersByDistrict(ordersData.ordersByDistrict || {});
        }
      }

      // Update stats with real data from dashboard-stats endpoint
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success && statsData.stats) {
          setStats(prev => ({
            ...prev,
            ordersAtSellerHubs: statsData.stats.ordersAtSellerHubs || 0,
            ordersInTransit: statsData.stats.ordersInTransit || 0,
            ordersAtCustomerHubs: statsData.stats.ordersAtCustomerHubs || 0,
            ordersAwaitingPickup: statsData.stats.ordersAwaitingPickup || 0,
            deliveredOrders: statsData.stats.deliveredOrders || 0
          }));
        }
      }

    } catch (error) {
      console.error("❌ Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("hubManagerToken");
    localStorage.removeItem("hubManager");
    toast.success("Logged out successfully");
    navigate("/hub-manager/login");
  };

  const handleRefresh = () => {
    const token = localStorage.getItem("hubManagerToken");
    if (token) {
      fetchDashboardData(token);
      // Also refresh orders if in a specific section
      if (activeSection === 'seller-orders') {
        fetchSellerHubOrders();
      } else if (activeSection === 'customer-orders') {
        fetchCustomerHubOrders();
      } else if (activeSection === 'approved-orders') {
        fetchApprovedOrders();
      }
      toast.success("Dashboard refreshed");
    }
  };

  // Fetch seller hub orders
  const fetchSellerHubOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/hub-notifications/seller-hub-orders`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSellerHubOrders(data.orders || []);
        }
      }
    } catch (error) {
      console.error("Error fetching seller hub orders:", error);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch customer hub orders
  const fetchCustomerHubOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/hub-notifications/customer-hub-orders`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCustomerHubOrders(data.orders || []);
        }
      }
    } catch (error) {
      console.error("Error fetching customer hub orders:", error);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch approved orders
  const fetchApprovedOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/hub-notifications/approved-orders`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setApprovedOrders(data.orders || []);
        }
      }
    } catch (error) {
      console.error("Error fetching approved orders:", error);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch orders when section changes
  useEffect(() => {
    if (activeSection === 'seller-orders') {
      fetchSellerHubOrders();
    } else if (activeSection === 'customer-orders') {
      fetchCustomerHubOrders();
    } else if (activeSection === 'approved-orders') {
      fetchApprovedOrders();
    }
  }, [activeSection]);

  const markNotificationAsRead = async (notificationId) => {
    const token = localStorage.getItem("hubManagerToken");
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/hub-notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (res.ok) {
        // Remove notification from the list (since we only show unread ones)
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        // Refresh orders data to show the new order in the hub
        const ordersRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/hub-notifications/orders-by-district`);
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          if (ordersData.success) {
            setOrdersByDistrict(ordersData.ordersByDistrict || {});
          }
        }
        
        toast.success("Notification marked as read");
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const toggleDistrictExpansion = (district) => {
    setExpandedDistricts(prev => ({
      ...prev,
      [district]: !prev[district]
    }));
  };

  const handleNotificationClick = (notification) => {
    setSelectedNotification(notification);
    setShowNotifications(false);
    if (!notification.read) {
      markNotificationAsRead(notification._id);
    }
  };

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard Overview", icon: FiGrid },
    { id: "hubs", label: "Hubs (District-wise)", icon: FiMapPin },
    { id: "seller-orders", label: "Seller Hub Orders", icon: FiPackage },
    { id: "approved-orders", label: "Approved Orders", icon: FiCheck },
    { id: "customer-orders", label: "Customer Hub Orders", icon: FiUsers },
    { id: "otp-verification", label: "OTP Verification", icon: FiKey }
  ];

  const overviewCards = [
    {
      title: "Total Hubs",
      value: stats.totalHubs,
      icon: FiMapPin,
      color: "brand",
      description: "Active hubs across Kerala"
    },
    {
      title: "Orders at Seller Hubs",
      value: stats.ordersAtSellerHubs,
      icon: FiPackage,
      color: "accent",
      description: "Orders waiting at seller hubs"
    },
    {
      title: "Orders in Transit",
      value: stats.ordersInTransit,
      icon: FiTruck,
      color: "muted",
      description: "Orders being transported"
    },
    {
      title: "Orders at Customer Hubs",
      value: stats.ordersAtCustomerHubs,
      icon: FiBox,
      color: "success",
      description: "Orders at customer hubs"
    },
    {
      title: "Orders Awaiting Pickup",
      value: stats.ordersAwaitingPickup,
      icon: FiClock,
      color: "warning",
      description: "Ready for customer pickup"
    },
    {
      title: "Delivered Orders",
      value: stats.deliveredOrders,
      icon: FiCheckCircle,
      color: "success",
      description: "Successfully delivered"
    }
  ];

  const getDistrictIcon = (district) => {
    const icons = {
      "Thiruvananthapuram": "🏛️",
      "Kollam": "⚓",
      "Pathanamthitta": "⛪",
      "Alappuzha": "🌴",
      "Kottayam": "📚",
      "Idukki": "⛰️",
      "Ernakulam": "🏙️",
      "Thrissur": "🎭",
      "Palakkad": "🌾",
      "Malappuram": "🕌",
      "Kozhikode": "🏖️",
      "Wayanad": "🌲",
      "Kannur": "🏰",
      "Kasaragod": "🏝️"
    };
    return icons[district] || "📍";
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: "var(--bg)", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "48px",
            height: "48px",
            border: "4px solid var(--border)",
            borderTop: "4px solid var(--brand)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px"
          }}></div>
          <p style={{ color: "var(--text-muted)", fontSize: "16px" }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "var(--bg)", 
      display: "flex",
      fontFamily: "var(--body-font)"
    }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarCollapsed ? "80px" : "280px",
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        boxShadow: "var(--shadow)",
        transition: "width 0.3s ease",
        position: "relative"
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: "24px 20px",
          borderBottom: "1px solid var(--border)",
          background: "linear-gradient(135deg, var(--surface) 0%, var(--accent-soft) 100%)"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {!sidebarCollapsed && (
              <div>
                <h1 style={{
                  fontFamily: "var(--title-font)",
                  fontSize: "24px",
                  fontWeight: "900",
                  color: "var(--brand)",
                  margin: "0 0 4px 0"
                }}>
                  CraftedByHer
                </h1>
                <p style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  margin: 0,
                  fontWeight: "600"
                }}>
                  Hub Manager Portal
                </p>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                background: "transparent",
                border: "none",
                padding: "8px",
                borderRadius: "8px",
                cursor: "pointer",
                color: "var(--text)",
                transition: "background 0.2s ease"
              }}
              onMouseEnter={(e) => e.target.style.background = "var(--accent-soft)"}
              onMouseLeave={(e) => e.target.style.background = "transparent"}
            >
              <FiMenu size={20} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: "20px 16px" }}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {sidebarItems.map((item) => (
              <li key={item.id} style={{ marginBottom: "8px" }}>
                <button
                  onClick={() => setActiveSection(item.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    background: activeSection === item.id ? "var(--accent-soft)" : "transparent",
                    border: activeSection === item.id ? "2px solid var(--brand)" : "2px solid transparent",
                    borderRadius: "12px",
                    color: activeSection === item.id ? "var(--brand)" : "var(--text)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    fontWeight: activeSection === item.id ? "700" : "600",
                    fontSize: "14px"
                  }}
                  onMouseEnter={(e) => {
                    if (activeSection !== item.id) {
                      e.target.style.background = "rgba(139, 94, 52, 0.05)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSection !== item.id) {
                      e.target.style.background = "transparent";
                    }
                  }}
                >
                  <item.icon size={18} />
                  {!sidebarCollapsed && (
                    <>
                      <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                      <FiChevronRight size={14} />
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Profile */}
        {!sidebarCollapsed && (
          <div style={{
            position: "absolute",
            bottom: "20px",
            left: "16px",
            right: "16px"
          }}>
            <div style={{
              background: "var(--accent-soft)",
              borderRadius: "16px",
              padding: "16px",
              border: "1px solid var(--border)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  background: "var(--brand)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white"
                }}>
                  <FiUser size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "var(--text)",
                    margin: "0 0 2px 0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}>
                    {manager?.name || 'Central Hub Manager'}
                  </p>
                  <p style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}>
                    {manager?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--error)",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "var(--error-bg)";
                  e.target.style.borderColor = "var(--error)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "transparent";
                  e.target.style.borderColor = "var(--border)";
                }}
              >
                <FiLogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <header style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "20px 32px",
          boxShadow: "0 2px 4px rgba(63, 45, 35, 0.04)"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{
                fontFamily: "var(--title-font)",
                fontSize: "28px",
                fontWeight: "900",
                color: "var(--text)",
                margin: "0 0 4px 0"
              }}>
                {sidebarItems.find(item => item.id === activeSection)?.label || 'Dashboard'}
              </h2>
              <p style={{
                color: "var(--text-muted)",
                margin: 0,
                fontSize: "14px",
                fontWeight: "500"
              }}>
                {activeSection === 'dashboard' && 'Overview of all hub operations across Kerala'}
                {activeSection === 'hubs' && 'Manage hubs across all 14 districts'}
                {activeSection === 'seller-orders' && 'Orders currently at seller hubs'}
                {activeSection === 'approved-orders' && 'Orders approved for delivery'}
                {activeSection === 'customer-orders' && 'Orders at customer hubs awaiting pickup'}
                {activeSection === 'otp-verification' && 'Verify delivery OTPs for order completion'}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button
                onClick={handleRefresh}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  padding: "10px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  color: "var(--text)",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "var(--accent-soft)";
                  e.target.style.borderColor = "var(--brand)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "transparent";
                  e.target.style.borderColor = "var(--border)";
                }}
                title="Refresh Dashboard"
              >
                <FiRefreshCw size={18} />
              </button>

              {/* Notifications */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  style={{
                    position: "relative",
                    background: "transparent",
                    border: "1px solid var(--border)",
                    padding: "10px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    color: "var(--text)",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "var(--accent-soft)";
                    e.target.style.borderColor = "var(--brand)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "transparent";
                    e.target.style.borderColor = "var(--border)";
                  }}
                  title="Notifications"
                >
                  <FiBell size={18} />
                  {unreadCount > 0 && (
                    <span style={{
                      position: "absolute",
                      top: "-6px",
                      right: "-6px",
                      background: "var(--error)",
                      color: "white",
                      fontSize: "12px",
                      fontWeight: "700",
                      borderRadius: "50%",
                      width: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px solid var(--surface)"
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    right: "0",
                    marginTop: "8px",
                    width: "380px",
                    background: "var(--surface)",
                    borderRadius: "16px",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow)",
                    zIndex: 50,
                    maxHeight: "500px",
                    overflow: "hidden"
                  }}>
                    <div style={{
                      padding: "20px",
                      borderBottom: "1px solid var(--border)",
                      background: "var(--accent-soft)"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <h3 style={{
                          fontFamily: "var(--title-font)",
                          fontSize: "18px",
                          fontWeight: "700",
                          color: "var(--text)",
                          margin: 0
                        }}>
                          Notifications
                        </h3>
                        {unreadCount > 0 && (
                          <span style={{
                            fontSize: "14px",
                            color: "var(--brand)",
                            fontWeight: "600"
                          }}>
                            {unreadCount} unread
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                      {notifications.length === 0 ? (
                        <div style={{
                          padding: "40px 20px",
                          textAlign: "center",
                          color: "var(--text-muted)"
                        }}>
                          <FiBell size={40} style={{ opacity: 0.3, marginBottom: "12px" }} />
                          <p style={{ margin: 0, fontSize: "14px" }}>No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification._id}
                            onClick={() => handleNotificationClick(notification)}
                            style={{
                              padding: "16px 20px",
                              borderBottom: "1px solid var(--border)",
                              cursor: "pointer",
                              transition: "background 0.2s ease",
                              background: !notification.read ? "var(--accent-soft)" : "transparent",
                              borderLeft: !notification.read ? "4px solid var(--brand)" : "4px solid transparent"
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = "var(--accent-soft)";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = !notification.read ? "var(--accent-soft)" : "transparent";
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
                              <div style={{
                                padding: "8px",
                                borderRadius: "8px",
                                background: !notification.read ? "var(--brand)" : "var(--border)",
                                color: !notification.read ? "white" : "var(--text-muted)"
                              }}>
                                <FiPackage size={16} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{
                                  fontWeight: "700",
                                  color: "var(--text)",
                                  fontSize: "14px",
                                  margin: "0 0 4px 0"
                                }}>
                                  {notification.title}
                                </p>
                                <p style={{
                                  color: "var(--text-muted)",
                                  fontSize: "13px",
                                  margin: "0 0 8px 0",
                                  lineHeight: "1.4",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden"
                                }}>
                                  {notification.message}
                                </p>
                                <div style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                  fontSize: "12px",
                                  color: "var(--text-muted)"
                                }}>
                                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    <FiClock size={12} />
                                    {new Date(notification.createdAt).toLocaleDateString()}
                                  </span>
                                  {notification.orderNumber && (
                                    <span style={{
                                      background: "var(--border)",
                                      padding: "2px 8px",
                                      borderRadius: "12px",
                                      fontSize: "11px",
                                      fontWeight: "600"
                                    }}>
                                      {notification.orderNumber}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {!notification.read && (
                                <div style={{
                                  width: "8px",
                                  height: "8px",
                                  background: "var(--brand)",
                                  borderRadius: "50%",
                                  flexShrink: 0,
                                  marginTop: "4px"
                                }}></div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main style={{ flex: 1, padding: "32px", background: "var(--bg)" }}>
          {activeSection === 'dashboard' && (
            <div>
              {/* Welcome Section */}
              <div style={{
                background: "linear-gradient(135deg, var(--surface) 0%, var(--accent-soft) 100%)",
                borderRadius: "20px",
                padding: "32px",
                marginBottom: "32px",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow)"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
                  <div>
                    <h3 style={{
                      fontFamily: "var(--title-font)",
                      fontSize: "32px",
                      fontWeight: "900",
                      color: "var(--brand)",
                      margin: "0 0 8px 0"
                    }}>
                      Welcome back! 👋
                    </h3>
                    <p style={{
                      fontSize: "16px",
                      color: "var(--text-muted)",
                      margin: "0 0 12px 0"
                    }}>
                      {manager?.email}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                      <span style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        background: "rgba(139, 94, 52, 0.1)",
                        color: "var(--brand)",
                        borderRadius: "20px",
                        fontSize: "14px",
                        fontWeight: "600"
                      }}>
                        <FiMapPin size={14} />
                        ID: {manager?.managerId || "N/A"}
                      </span>
                      <span style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        background: "rgba(139, 94, 52, 0.1)",
                        color: "var(--brand)",
                        borderRadius: "20px",
                        fontSize: "14px",
                        fontWeight: "600"
                      }}>
                        <FiStar size={14} />
                        District: {manager?.district || "All Districts"}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", gap: "24px" }}>
                    <div style={{ textAlign: "center" }}>
                      <p style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "var(--text-muted)",
                        margin: "0 0 4px 0"
                      }}>
                        Total Hubs
                      </p>
                      <p style={{
                        fontSize: "36px",
                        fontWeight: "900",
                        color: "var(--brand)",
                        margin: 0
                      }}>
                        {stats.totalHubs}
                      </p>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <p style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "var(--text-muted)",
                        margin: "0 0 4px 0"
                      }}>
                        Districts
                      </p>
                      <p style={{
                        fontSize: "36px",
                        fontWeight: "900",
                        color: "var(--brand)",
                        margin: 0
                      }}>
                        {Object.keys(hubsByDistrict).length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overview Cards */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "24px",
                marginBottom: "32px"
              }}>
                {overviewCards.map((card, index) => (
                  <div
                    key={index}
                    style={{
                      background: "var(--surface)",
                      borderRadius: "16px",
                      padding: "24px",
                      border: "1px solid var(--border)",
                      boxShadow: "var(--shadow)",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                      cursor: "pointer"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = "translateY(-4px)";
                      e.target.style.boxShadow = "0 20px 40px rgba(63, 45, 35, 0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "var(--shadow)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <p style={{
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "var(--text-muted)",
                          margin: "0 0 8px 0"
                        }}>
                          {card.title}
                        </p>
                        <p style={{
                          fontSize: "36px",
                          fontWeight: "900",
                          color: "var(--text)",
                          margin: "0 0 8px 0"
                        }}>
                          {card.value}
                        </p>
                        <p style={{
                          fontSize: "13px",
                          color: "var(--text-muted)",
                          margin: 0
                        }}>
                          {card.description}
                        </p>
                      </div>
                      <div style={{
                        padding: "16px",
                        borderRadius: "12px",
                        background: "var(--accent-soft)"
                      }}>
                        <card.icon size={28} style={{ color: "var(--brand)" }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Activity */}
              <div style={{
                background: "var(--surface)",
                borderRadius: "16px",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow)",
                overflow: "hidden"
              }}>
                <div style={{
                  padding: "24px",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--accent-soft)"
                }}>
                  <h3 style={{
                    fontFamily: "var(--title-font)",
                    fontSize: "20px",
                    fontWeight: "700",
                    color: "var(--text)",
                    margin: 0
                  }}>
                    Recent Activity
                  </h3>
                </div>
                <div style={{ padding: "24px" }}>
                  {notifications.slice(0, 5).map((notification, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        padding: "16px 0",
                        borderBottom: index < 4 ? "1px solid var(--border)" : "none"
                      }}
                    >
                      <div style={{
                        padding: "12px",
                        background: "var(--accent-soft)",
                        borderRadius: "12px"
                      }}>
                        <FiPackage size={18} style={{ color: "var(--brand)" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontWeight: "700",
                          color: "var(--text)",
                          margin: "0 0 4px 0",
                          fontSize: "15px"
                        }}>
                          {notification.title}
                        </p>
                        <p style={{
                          color: "var(--text-muted)",
                          fontSize: "14px",
                          margin: 0
                        }}>
                          {notification.message}
                        </p>
                      </div>
                      <span style={{
                        fontSize: "13px",
                        color: "var(--text-muted)",
                        fontWeight: "500"
                      }}>
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div style={{
                      textAlign: "center",
                      padding: "40px 20px",
                      color: "var(--text-muted)"
                    }}>
                      <FiPackage size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
                      <p style={{ margin: 0, fontSize: "16px" }}>No recent activity</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'hubs' && (
            <div>
              <div style={{
                background: "var(--surface)",
                borderRadius: "16px",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow)",
                overflow: "hidden"
              }}>
                <div style={{
                  padding: "24px",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--accent-soft)"
                }}>
                  <h3 style={{
                    fontFamily: "var(--title-font)",
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "var(--text)",
                    margin: "0 0 8px 0"
                  }}>
                    District-wise Hub Management
                  </h3>
                  <p style={{
                    color: "var(--text-muted)",
                    margin: 0,
                    fontSize: "14px"
                  }}>
                    Manage all {stats.totalHubs} hubs across Kerala's 14 districts
                  </p>
                </div>
                <div style={{ padding: "32px" }}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                    gap: "24px"
                  }}>
                    {Object.entries(hubsByDistrict).map(([district, districtHubs]) => (
                      <div
                        key={district}
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: "16px",
                          padding: "20px",
                          background: "var(--accent-soft)",
                          transition: "transform 0.2s ease, box-shadow 0.2s ease"
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = "translateY(-2px)";
                          e.target.style.boxShadow = "0 8px 16px rgba(63, 45, 35, 0.08)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = "translateY(0)";
                          e.target.style.boxShadow = "none";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                          <span style={{ fontSize: "32px" }}>{getDistrictIcon(district)}</span>
                          <div style={{ flex: 1 }}>
                            <h4 style={{
                              fontFamily: "var(--title-font)",
                              fontSize: "18px",
                              fontWeight: "700",
                              color: "var(--text)",
                              margin: "0 0 4px 0"
                            }}>
                              {district}
                            </h4>
                            <p style={{
                              fontSize: "14px",
                              color: "var(--text-muted)",
                              margin: 0
                            }}>
                              {districtHubs.length} hub{districtHubs.length > 1 ? 's' : ''}
                            </p>
                          </div>
                          {/* Show chevron if district has orders */}
                          {(() => {
                            const districtOrderCount = ordersByDistrict[district] ? ordersByDistrict[district].length : 0;
                            return districtOrderCount > 0 ? (
                              <button
                                onClick={() => toggleDistrictExpansion(district)}
                                style={{
                                  background: "var(--surface)",
                                  border: "1px solid var(--border)",
                                  borderRadius: "8px",
                                  padding: "8px",
                                  cursor: "pointer",
                                  color: "var(--brand)",
                                  transition: "all 0.2s ease"
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.background = "var(--brand)";
                                  e.target.style.color = "white";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.background = "var(--surface)";
                                  e.target.style.color = "var(--brand)";
                                }}
                                title={`${districtOrderCount} orders - Click to ${expandedDistricts[district] ? 'collapse' : 'expand'}`}
                              >
                                <FiChevronRight 
                                  size={16} 
                                  style={{
                                    transform: expandedDistricts[district] ? 'rotate(90deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease'
                                  }}
                                />
                              </button>
                            ) : null;
                          })()}
                        </div>

                        {/* Hub Information */}
                        {districtHubs.map((hub) => {
                          // Calculate actual orders for this specific hub
                          const hubOrders = hub.ordersAtSellerHub || 0;
                          const hubDispatched = hub.dispatchedToCustomerHub || 0;
                          
                          return (
                            <div
                              key={hub._id}
                              style={{
                                background: "var(--surface)",
                                borderRadius: "12px",
                                padding: "16px",
                                marginBottom: "12px",
                                border: "1px solid var(--border)"
                              }}
                            >
                              <p style={{
                                fontWeight: "700",
                                fontSize: "15px",
                                color: "var(--text)",
                                margin: "0 0 8px 0"
                              }}>
                                {hub.name}
                              </p>
                              <div style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "8px",
                                fontSize: "13px"
                              }}>
                                <div>
                                  <span style={{ color: "var(--text-muted)" }}>ID:</span>
                                  <span style={{ color: "var(--text)", fontWeight: "600", marginLeft: "4px" }}>
                                    {hub.hubId}
                                  </span>
                                </div>
                                <div>
                                  <span style={{ color: "var(--text-muted)" }}>Orders:</span>
                                  <span style={{ color: "var(--brand)", fontWeight: "700", marginLeft: "4px" }}>
                                    {hubOrders}
                                  </span>
                                </div>
                                <div style={{ gridColumn: "1 / -1" }}>
                                  <span style={{ color: "var(--text-muted)" }}>Dispatched:</span>
                                  <span style={{ color: "#d4a574", fontWeight: "700", marginLeft: "4px" }}>
                                    {hubDispatched}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Show orders only when expanded */}
                        {expandedDistricts[district] && ordersByDistrict[district] && ordersByDistrict[district].length > 0 && (
                          <div style={{ 
                            marginTop: "16px",
                            animation: "slideDown 0.3s ease-out"
                          }}>
                            <h5 style={{
                              fontFamily: "var(--title-font)",
                              fontSize: "16px",
                              fontWeight: "700",
                              color: "var(--brand)",
                              margin: "0 0 12px 0",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px"
                            }}>
                              <FiPackage size={16} />
                              Current Orders ({ordersByDistrict[district].length})
                            </h5>
                            {ordersByDistrict[district].map((order) => (
                              <div
                                key={order._id}
                                style={{
                                  background: "var(--surface)",
                                  borderRadius: "8px",
                                  padding: "12px",
                                  marginBottom: "8px",
                                  border: "1px solid var(--border)",
                                  borderLeft: `4px solid ${order.hubType === 'seller' ? 'var(--brand)' : 'var(--accent)'}`,
                                  transition: "transform 0.2s ease, box-shadow 0.2s ease"
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.transform = "translateX(4px)";
                                  e.target.style.boxShadow = "0 4px 8px rgba(63, 45, 35, 0.1)";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = "translateX(0)";
                                  e.target.style.boxShadow = "none";
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                                  <div>
                                    <p style={{
                                      fontWeight: "700",
                                      fontSize: "13px",
                                      color: "var(--text)",
                                      margin: "0 0 4px 0"
                                    }}>
                                      {order.orderNumber}
                                    </p>
                                    <p style={{
                                      fontSize: "12px",
                                      color: "var(--text-muted)",
                                      margin: "0 0 4px 0"
                                    }}>
                                      {order.hubName} • {order.hubType === 'seller' ? 'From Seller' : 'To Customer'}
                                    </p>
                                    <p style={{
                                      fontSize: "12px",
                                      color: "var(--brand)",
                                      fontWeight: "600",
                                      margin: 0
                                    }}>
                                      ₹{order.finalAmount} • {order.items.length} item(s)
                                    </p>
                                  </div>
                                  <span style={{
                                    fontSize: "10px",
                                    padding: "4px 8px",
                                    background: order.hubType === 'seller' ? "rgba(139, 94, 52, 0.1)" : "rgba(123, 46, 46, 0.1)",
                                    color: order.hubType === 'seller' ? "var(--brand)" : "var(--accent)",
                                    borderRadius: "12px",
                                    fontWeight: "600"
                                  }}>
                                    {order.orderStatus.replace(/_/g, ' ').toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other sections with CraftedByHer styling */}
          {activeSection === 'otp-verification' ? (
            <div style={{
              background: "var(--surface)",
              borderRadius: "16px",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow)"
            }}>
              <div style={{
                padding: "24px",
                borderBottom: "1px solid var(--border)"
              }}>
                <h3 style={{
                  fontFamily: "var(--title-font)",
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "var(--text)",
                  margin: 0
                }}>
                  OTP Verification for Order Delivery
                </h3>
                <p style={{
                  color: "var(--text-muted)",
                  fontSize: "14px",
                  margin: "8px 0 0 0"
                }}>
                  Verify customer OTP to complete order delivery
                </p>
              </div>

              <div style={{ padding: "32px" }}>
                <div style={{
                  maxWidth: "500px",
                  margin: "0 auto"
                }}>
                  {/* Step 1: Generate OTP */}
                  <div style={{
                    marginBottom: "32px",
                    padding: "20px",
                    background: "var(--accent-soft)",
                    borderRadius: "12px",
                    border: "1px solid var(--border)"
                  }}>
                    <h4 style={{
                      fontWeight: "700",
                      color: "var(--brand)",
                      margin: "0 0 16px 0",
                      fontSize: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <span style={{ fontSize: "20px" }}>1️⃣</span>
                      Generate & Send OTP
                    </h4>
                    
                    <div style={{ marginBottom: "16px" }}>
                      <label style={{
                        display: "block",
                        fontWeight: "600",
                        color: "var(--text)",
                        marginBottom: "8px",
                        fontSize: "14px"
                      }}>
                        Order ID (to generate OTP)
                      </label>
                      <input
                        type="text"
                        placeholder="Enter order ID (e.g., ORD123456789)"
                        value={selectedOrderId}
                        onChange={(e) => {
                          setSelectedOrderId(e.target.value.toUpperCase());
                          setOtpGenerated(false);
                        }}
                        disabled={generatingOTP}
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          border: "2px solid var(--border)",
                          borderRadius: "8px",
                          fontSize: "15px",
                          fontFamily: "monospace",
                          color: "var(--text)",
                          background: generatingOTP ? "var(--accent-soft)" : "var(--surface)",
                          transition: "border-color 0.2s",
                          opacity: generatingOTP ? 0.7 : 1
                        }}
                        onFocus={(e) => e.target.style.borderColor = "var(--brand)"}
                        onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                      />
                    </div>

                    <button
                      onClick={async () => {
                        if (!selectedOrderId) {
                          toast.error("Please enter Order ID");
                          return;
                        }

                        setGeneratingOTP(true);
                        try {
                          const response = await fetch(
                            `${import.meta.env.VITE_API_BASE_URL}/api/delivery-otp/generate-otp`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ orderNumber: selectedOrderId })
                            }
                          );

                          const data = await response.json();

                          if (data.success) {
                            toast.success("✅ OTP generated and sent to customer's email!");
                            setOtpGenerated(true);
                          } else {
                            toast.error(data.error || "Failed to generate OTP");
                          }
                        } catch (error) {
                          console.error("OTP generation error:", error);
                          toast.error("Failed to generate OTP. Please try again.");
                        } finally {
                          setGeneratingOTP(false);
                        }
                      }}
                      disabled={generatingOTP || !selectedOrderId}
                      style={{
                        width: "100%",
                        padding: "12px",
                        background: (generatingOTP || !selectedOrderId) ? "var(--text-muted)" : "var(--brand)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: (generatingOTP || !selectedOrderId) ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px"
                      }}
                    >
                      {generatingOTP ? (
                        <>
                          <div style={{
                            width: "16px",
                            height: "16px",
                            border: "2px solid rgba(255,255,255,0.3)",
                            borderTop: "2px solid white",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite"
                          }} />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FiKey size={16} />
                          Generate & Send OTP
                        </>
                      )}
                    </button>

                    {otpGenerated && (
                      <p style={{
                        color: "var(--brand)",
                        fontSize: "12px",
                        margin: "12px 0 0 0",
                        textAlign: "center",
                        fontWeight: "600"
                      }}>
                        ✅ OTP sent! Customer will receive it via email.
                      </p>
                    )}
                  </div>

                  {/* Step 2: Verify OTP */}
                  <div style={{
                    marginBottom: "24px",
                    padding: "20px",
                    background: "var(--surface)",
                    borderRadius: "12px",
                    border: "1px solid var(--border)"
                  }}>
                    <h4 style={{
                      fontWeight: "700",
                      color: "var(--brand)",
                      margin: "0 0 16px 0",
                      fontSize: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <span style={{ fontSize: "20px" }}>2️⃣</span>
                      Verify Customer OTP
                    </h4>

                    <div style={{ marginBottom: "16px" }}>
                      <label style={{
                        display: "block",
                        fontWeight: "600",
                        color: "var(--text)",
                        marginBottom: "8px",
                        fontSize: "14px"
                      }}>
                        Customer OTP
                      </label>
                      <input
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength="6"
                        style={{
                          width: "100%",
                          padding: "16px",
                          border: "2px solid var(--border)",
                          borderRadius: "8px",
                          fontSize: "24px",
                          fontFamily: "monospace",
                          textAlign: "center",
                          letterSpacing: "8px",
                          color: "var(--brand)",
                          fontWeight: "700",
                          background: "var(--background)",
                          transition: "border-color 0.2s"
                        }}
                        onFocus={(e) => e.target.style.borderColor = "var(--brand)"}
                        onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                      />
                      <p style={{
                        color: "var(--text-muted)",
                        fontSize: "12px",
                        margin: "8px 0 0 0",
                        textAlign: "center"
                      }}>
                        Customer will provide this OTP from their email. OTP is valid until used.
                      </p>
                    </div>

                    <button
                      onClick={async () => {
                        if (!otpInput) {
                          toast.error("Please enter OTP");
                          return;
                        }

                        if (otpInput.length !== 6) {
                          toast.error("OTP must be 6 digits");
                          return;
                        }

                        if (!selectedOrderId) {
                          toast.error("Please enter Order ID first and generate OTP");
                          return;
                        }

                        setVerifying(true);
                        try {
                          const response = await fetch(
                            `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/delivery-otp/orders/${selectedOrderId}/verify-otp`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ otp: otpInput })
                            }
                          );

                          if (!response.ok) {
                            const errorData = await response.json().catch(() => ({ error: "Network error occurred" }));
                            toast.error(errorData.error || `Failed to verify OTP. Status: ${response.status}`);
                            setVerifying(false);
                            return;
                          }

                          const data = await response.json();
                          console.log("OTP verification response:", data);

                          if (data.success) {
                            toast.success(data.message || "✅ Order verified and delivered successfully! 🎉", {
                              duration: 5000,
                              icon: '✅'
                            });
                            setSelectedOrderId("");
                            setOtpInput("");
                            setOtpGenerated(false);
                            // Refresh dashboard data
                            const token = localStorage.getItem("hubManagerToken");
                            if (token) {
                              fetchDashboardData(token);
                            }
                          } else {
                            toast.error(data.error || "OTP verification failed");
                          }
                        } catch (error) {
                          console.error("OTP verification error:", error);
                          toast.error(`Failed to verify OTP: ${error.message || "Please try again."}`);
                        } finally {
                          setVerifying(false);
                        }
                      }}
                      disabled={verifying || !otpInput || !selectedOrderId}
                      style={{
                        width: "100%",
                        padding: "14px",
                        background: (verifying || !otpInput || !selectedOrderId) ? "var(--text-muted)" : "var(--brand)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "16px",
                        fontWeight: "700",
                        cursor: (verifying || !otpInput || !selectedOrderId) ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px"
                      }}
                      onMouseEnter={(e) => {
                        if (!verifying && otpInput && selectedOrderId) {
                          e.target.style.transform = "translateY(-2px)";
                          e.target.style.boxShadow = "0 4px 12px rgba(139, 94, 52, 0.3)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow = "none";
                      }}
                    >
                      {verifying ? (
                        <>
                          <div style={{
                            width: "20px",
                            height: "20px",
                            border: "3px solid rgba(255,255,255,0.3)",
                            borderTop: "3px solid white",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite"
                          }} />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <FiCheckCircle size={20} />
                          Verify & Complete Delivery
                        </>
                      )}
                    </button>
                  </div>

                  {/* Instructions */}
                  <div style={{
                    marginTop: "32px",
                    padding: "20px",
                    background: "var(--accent-soft)",
                    borderRadius: "8px",
                    border: "1px solid var(--border)"
                  }}>
                    <h4 style={{
                      fontWeight: "700",
                      color: "var(--brand)",
                      margin: "0 0 12px 0",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <FiKey size={16} />
                      How to verify delivery:
                    </h4>
                    <ol style={{
                      margin: 0,
                      paddingLeft: "20px",
                      color: "var(--text-muted)",
                      fontSize: "13px",
                      lineHeight: "1.8"
                    }}>
                      <li>Ask customer for their Order ID</li>
                      <li>Request the 6-digit OTP from customer's email</li>
                      <li>Enter both Order ID and OTP above</li>
                      <li>Click verify to complete delivery</li>
                      <li>Order status will change to "Delivered"</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          ) : activeSection === 'seller-orders' ? (
            <div>
              <div style={{
                background: "var(--surface)",
                borderRadius: "16px",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow)",
                overflow: "hidden"
              }}>
                <div style={{
                  padding: "24px",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--accent-soft)"
                }}>
                  <h3 style={{
                    fontFamily: "var(--title-font)",
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "var(--text)",
                    margin: "0 0 8px 0"
                  }}>
                    Seller Hub Orders
                  </h3>
                  <p style={{
                    color: "var(--text-muted)",
                    margin: 0,
                    fontSize: "14px"
                  }}>
                    Orders that have arrived at seller district hubs ({sellerHubOrders.length} orders)
                  </p>
                </div>
                <div style={{ padding: "24px" }}>
                  {loadingOrders ? (
                    <div style={{ textAlign: "center", padding: "40px" }}>
                      <div style={{
                        width: "48px",
                        height: "48px",
                        border: "4px solid var(--border)",
                        borderTop: "4px solid var(--brand)",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        margin: "0 auto 16px"
                      }}></div>
                      <p style={{ color: "var(--text-muted)" }}>Loading orders...</p>
                    </div>
                  ) : sellerHubOrders.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                      <FiPackage size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
                      <p style={{ margin: 0, fontSize: "16px" }}>No orders at seller hubs yet</p>
                      <p style={{ margin: "8px 0 0 0", fontSize: "14px" }}>Orders will appear here when sellers move products to their district hub</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {sellerHubOrders.map((order) => (
                        <div
                          key={order._id}
                          style={{
                            background: "var(--accent-soft)",
                            borderRadius: "12px",
                            padding: "20px",
                            border: "1px solid var(--border)",
                            transition: "transform 0.2s ease, box-shadow 0.2s ease"
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = "translateY(-2px)";
                            e.target.style.boxShadow = "0 8px 16px rgba(63, 45, 35, 0.08)";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "none";
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                            <div>
                              <h4 style={{
                                fontFamily: "var(--title-font)",
                                fontSize: "18px",
                                fontWeight: "700",
                                color: "var(--brand)",
                                margin: "0 0 4px 0"
                              }}>
                                Order #{order.orderNumber}
                              </h4>
                              <p style={{
                                fontSize: "14px",
                                color: "var(--text-muted)",
                                margin: 0
                              }}>
                                {order.buyerDetails?.name || "Customer"}
                              </p>
                            </div>
                            <span style={{
                              padding: "6px 12px",
                              background: "var(--brand)",
                              color: "white",
                              borderRadius: "20px",
                              fontSize: "12px",
                              fontWeight: "600"
                            }}>
                              {order.orderStatus === 'awaiting_admin_approval' ? 'Awaiting Approval' : 'At Seller Hub'}
                            </span>
                          </div>
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: "12px",
                            fontSize: "14px",
                            marginTop: "12px"
                          }}>
                            <div>
                              <span style={{ color: "var(--text-muted)" }}>Hub: </span>
                              <span style={{ fontWeight: "600", color: "var(--text)" }}>
                                {order.hubTracking?.sellerHubName || order.hubName || "N/A"}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: "var(--text-muted)" }}>District: </span>
                              <span style={{ fontWeight: "600", color: "var(--text)" }}>
                                {order.hubTracking?.sellerHubDistrict || order.hubDistrict || "N/A"}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: "var(--text-muted)" }}>Items: </span>
                              <span style={{ fontWeight: "600", color: "var(--text)" }}>
                                {order.items?.length || 0} product{order.items?.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: "var(--text-muted)" }}>Amount: </span>
                              <span style={{ fontWeight: "700", color: "var(--brand)" }}>
                                ₹{(order.finalAmount || order.totalAmount || 0).toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                          <div style={{
                            marginTop: "12px",
                            paddingTop: "12px",
                            borderTop: "1px solid var(--border)",
                            fontSize: "12px",
                            color: "var(--text-muted)"
                          }}>
                            Arrived: {new Date(order.createdAt || order.updatedAt).toLocaleString('en-IN')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeSection === 'customer-orders' ? (
            <div>
              <div style={{
                background: "var(--surface)",
                borderRadius: "16px",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow)",
                overflow: "hidden"
              }}>
                <div style={{
                  padding: "24px",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--accent-soft)"
                }}>
                  <h3 style={{
                    fontFamily: "var(--title-font)",
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "var(--text)",
                    margin: "0 0 8px 0"
                  }}>
                    Customer Hub Orders
                  </h3>
                  <p style={{
                    color: "var(--text-muted)",
                    margin: 0,
                    fontSize: "14px"
                  }}>
                    Orders at customer district hubs ready for pickup ({customerHubOrders.length} orders)
                  </p>
                </div>
                <div style={{ padding: "24px" }}>
                  {loadingOrders ? (
                    <div style={{ textAlign: "center", padding: "40px" }}>
                      <div style={{
                        width: "48px",
                        height: "48px",
                        border: "4px solid var(--border)",
                        borderTop: "4px solid var(--brand)",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        margin: "0 auto 16px"
                      }}></div>
                      <p style={{ color: "var(--text-muted)" }}>Loading orders...</p>
                    </div>
                  ) : customerHubOrders.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                      <FiUsers size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
                      <p style={{ margin: 0, fontSize: "16px" }}>No orders at customer hubs yet</p>
                      <p style={{ margin: "8px 0 0 0", fontSize: "14px" }}>Orders will appear here after admin approval and dispatch</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {customerHubOrders.map((order) => (
                        <div
                          key={order._id}
                          style={{
                            background: "var(--accent-soft)",
                            borderRadius: "12px",
                            padding: "20px",
                            border: "1px solid var(--border)",
                            transition: "transform 0.2s ease, box-shadow 0.2s ease"
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = "translateY(-2px)";
                            e.target.style.boxShadow = "0 8px 16px rgba(63, 45, 35, 0.08)";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "none";
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                            <div>
                              <h4 style={{
                                fontFamily: "var(--title-font)",
                                fontSize: "18px",
                                fontWeight: "700",
                                color: "var(--brand)",
                                margin: "0 0 4px 0"
                              }}>
                                Order #{order.orderNumber}
                              </h4>
                              <p style={{
                                fontSize: "14px",
                                color: "var(--text-muted)",
                                margin: 0
                              }}>
                                {order.buyerDetails?.name || "Customer"}
                              </p>
                            </div>
                            <span style={{
                              padding: "6px 12px",
                              background: order.orderStatus === 'ready_for_pickup' ? "#d4a574" : "var(--brand)",
                              color: "white",
                              borderRadius: "20px",
                              fontSize: "12px",
                              fontWeight: "600"
                            }}>
                              {order.orderStatus === 'ready_for_pickup' ? 'Ready for Pickup' : 
                               order.orderStatus === 'out_for_delivery' ? 'Out for Delivery' : 
                               'At Customer Hub'}
                            </span>
                          </div>
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: "12px",
                            fontSize: "14px",
                            marginTop: "12px"
                          }}>
                            <div>
                              <span style={{ color: "var(--text-muted)" }}>Hub: </span>
                              <span style={{ fontWeight: "600", color: "var(--text)" }}>
                                {order.hubTracking?.customerHubName || order.hubName || "N/A"}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: "var(--text-muted)" }}>District: </span>
                              <span style={{ fontWeight: "600", color: "var(--text)" }}>
                                {order.hubTracking?.customerHubDistrict || order.hubDistrict || "N/A"}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: "var(--text-muted)" }}>Items: </span>
                              <span style={{ fontWeight: "600", color: "var(--text)" }}>
                                {order.items?.length || 0} product{order.items?.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: "var(--text-muted)" }}>Amount: </span>
                              <span style={{ fontWeight: "700", color: "var(--brand)" }}>
                                ₹{(order.finalAmount || order.totalAmount || 0).toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                          <div style={{
                            marginTop: "12px",
                            paddingTop: "12px",
                            borderTop: "1px solid var(--border)",
                            fontSize: "12px",
                            color: "var(--text-muted)"
                          }}>
                            Arrived: {new Date(order.hubTracking?.arrivedAtCustomerHub || order.updatedAt).toLocaleString('en-IN')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeSection === 'approved-orders' ? (
            <div>
              <div style={{
                background: "var(--surface)",
                borderRadius: "16px",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow)",
                overflow: "hidden"
              }}>
                <div style={{
                  padding: "24px",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--accent-soft)"
                }}>
                  <h3 style={{
                    fontFamily: "var(--title-font)",
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "var(--text)",
                    margin: "0 0 8px 0"
                  }}>
                    Approved Orders
                  </h3>
                  <p style={{
                    color: "var(--text-muted)",
                    margin: 0,
                    fontSize: "14px"
                  }}>
                    Orders approved by admin and dispatched to customer hubs ({approvedOrders.length} orders)
                  </p>
                </div>
                <div style={{ padding: "24px" }}>
                  {loadingOrders ? (
                    <div style={{ textAlign: "center", padding: "40px" }}>
                      <div style={{
                        width: "48px",
                        height: "48px",
                        border: "4px solid var(--border)",
                        borderTop: "4px solid var(--brand)",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        margin: "0 auto 16px"
                      }}></div>
                      <p style={{ color: "var(--text-muted)" }}>Loading orders...</p>
                    </div>
                  ) : approvedOrders.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                      <FiCheck size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
                      <p style={{ margin: 0, fontSize: "16px" }}>No approved orders yet</p>
                      <p style={{ margin: "8px 0 0 0", fontSize: "14px" }}>Orders will appear here after admin approves them for dispatch</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {approvedOrders.map((order) => (
                        <div
                          key={order._id}
                          style={{
                            background: "var(--accent-soft)",
                            borderRadius: "12px",
                            padding: "20px",
                            border: "1px solid var(--border)",
                            transition: "transform 0.2s ease, box-shadow 0.2s ease"
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = "translateY(-2px)";
                            e.target.style.boxShadow = "0 8px 16px rgba(63, 45, 35, 0.08)";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "none";
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                            <div>
                              <h4 style={{
                                fontFamily: "var(--title-font)",
                                fontSize: "18px",
                                fontWeight: "700",
                                color: "var(--brand)",
                                margin: "0 0 4px 0"
                              }}>
                                Order #{order.orderNumber}
                              </h4>
                              <p style={{
                                fontSize: "14px",
                                color: "var(--text-muted)",
                                margin: 0
                              }}>
                                {order.buyerDetails?.name || "Customer"}
                              </p>
                            </div>
                            <span style={{
                              padding: "6px 12px",
                              background: order.orderStatus === 'in_transit_to_customer_hub' ? "#17a2b8" : "#d4a574",
                              color: "white",
                              borderRadius: "20px",
                              fontSize: "12px",
                              fontWeight: "600"
                            }}>
                              {order.orderStatus === 'in_transit_to_customer_hub' ? 'In Transit' : 'Shipped'}
                            </span>
                          </div>
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: "12px",
                            fontSize: "14px",
                            marginTop: "12px"
                          }}>
                            <div>
                              <span style={{ color: "var(--text-muted)" }}>From: </span>
                              <span style={{ fontWeight: "600", color: "var(--text)" }}>
                                {order.hubTracking?.sellerHubName || order.sellerHubName || "N/A"}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: "var(--text-muted)" }}>To: </span>
                              <span style={{ fontWeight: "600", color: "var(--text)" }}>
                                {order.hubTracking?.customerHubName || order.customerHubName || "N/A"}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: "var(--text-muted)" }}>Items: </span>
                              <span style={{ fontWeight: "600", color: "var(--text)" }}>
                                {order.items?.length || 0} product{order.items?.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: "var(--text-muted)" }}>Amount: </span>
                              <span style={{ fontWeight: "700", color: "var(--brand)" }}>
                                ₹{(order.finalAmount || order.totalAmount || 0).toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                          <div style={{
                            marginTop: "12px",
                            paddingTop: "12px",
                            borderTop: "1px solid var(--border)",
                            fontSize: "12px",
                            color: "var(--text-muted)"
                          }}>
                            Approved: {new Date(order.hubTracking?.adminApprovedAt || order.approvedAt || order.updatedAt).toLocaleString('en-IN')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          padding: "20px"
        }}>
          <div style={{
            background: "var(--surface)",
            borderRadius: "20px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
            maxWidth: "600px",
            width: "100%",
            maxHeight: "90vh",
            overflow: "hidden",
            border: "1px solid var(--border)"
          }}>
            <div style={{
              padding: "24px",
              borderBottom: "1px solid var(--border)",
              background: "var(--accent-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <h3 style={{
                fontFamily: "var(--title-font)",
                fontSize: "20px",
                fontWeight: "700",
                color: "var(--text)",
                margin: 0
              }}>
                {selectedNotification.title}
              </h3>
              <button
                onClick={() => setSelectedNotification(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: "8px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  color: "var(--text)",
                  transition: "background 0.2s ease"
                }}
                onMouseEnter={(e) => e.target.style.background = "rgba(139, 94, 52, 0.1)"}
                onMouseLeave={(e) => e.target.style.background = "transparent"}
              >
                <FiX size={20} />
              </button>
            </div>

            <div style={{ padding: "24px", overflowY: "auto", maxHeight: "calc(90vh - 140px)" }}>
              <div style={{
                background: "var(--accent-soft)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "24px"
              }}>
                <p style={{
                  color: "var(--text)",
                  fontSize: "15px",
                  lineHeight: "1.6",
                  margin: "0 0 16px 0"
                }}>
                  {selectedNotification.message}
                </p>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  fontSize: "14px",
                  color: "var(--text-muted)"
                }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <FiClock size={14} />
                    {new Date(selectedNotification.createdAt).toLocaleString()}
                  </span>
                  {selectedNotification.orderNumber && (
                    <span style={{
                      background: "var(--surface)",
                      padding: "4px 12px",
                      borderRadius: "16px",
                      border: "1px solid var(--border)",
                      fontWeight: "600"
                    }}>
                      Order: {selectedNotification.orderNumber}
                    </span>
                  )}
                </div>
              </div>

              {selectedNotification.metadata && (
                <div>
                  <h4 style={{
                    fontFamily: "var(--title-font)",
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "var(--brand)",
                    margin: "0 0 16px 0"
                  }}>
                    Order Details
                  </h4>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "16px",
                    fontSize: "14px"
                  }}>
                    {selectedNotification.metadata.hubName && (
                      <div>
                        <span style={{ color: "var(--text-muted)", fontWeight: "600" }}>Hub:</span>
                        <p style={{ fontWeight: "700", color: "var(--text)", margin: "4px 0 0 0" }}>
                          {selectedNotification.metadata.hubName}
                        </p>
                      </div>
                    )}
                    {selectedNotification.metadata.customerName && (
                      <div>
                        <span style={{ color: "var(--text-muted)", fontWeight: "600" }}>Customer:</span>
                        <p style={{ fontWeight: "700", color: "var(--text)", margin: "4px 0 0 0" }}>
                          {selectedNotification.metadata.customerName}
                        </p>
                      </div>
                    )}
                    {selectedNotification.metadata.totalAmount && (
                      <div>
                        <span style={{ color: "var(--text-muted)", fontWeight: "600" }}>Amount:</span>
                        <p style={{ fontWeight: "700", color: "var(--brand)", margin: "4px 0 0 0" }}>
                          ₹{selectedNotification.metadata.totalAmount}
                        </p>
                      </div>
                    )}
                    {selectedNotification.metadata.itemCount && (
                      <div>
                        <span style={{ color: "var(--text-muted)", fontWeight: "600" }}>Items:</span>
                        <p style={{ fontWeight: "700", color: "var(--text)", margin: "4px 0 0 0" }}>
                          {selectedNotification.metadata.itemCount} item(s)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{
              padding: "24px",
              borderTop: "1px solid var(--border)",
              background: "var(--accent-soft)"
            }}>
              <button
                onClick={() => setSelectedNotification(null)}
                className="bk-btn bk-btn--primary"
                style={{
                  width: "100%",
                  padding: "12px 24px",
                  fontSize: "15px",
                  fontWeight: "700",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
            max-height: 0;
          }
          to {
            opacity: 1;
            transform: translateY(0);
            max-height: 500px;
          }
        }
      `}</style>
    </div>
  );
}