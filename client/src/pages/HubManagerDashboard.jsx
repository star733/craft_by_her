import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { 
  FiBell, 
  FiPackage, 
  FiTruck, 
  FiMapPin, 
  FiUser, 
  FiHome, 
  FiLogOut,
  FiRefreshCw,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiMenu,
  FiX,
  FiBox,
  FiBarChart2
} from "react-icons/fi";

export default function HubManagerDashboard() {
  const navigate = useNavigate();
  const [manager, setManager] = useState(null);
  const [stats, setStats] = useState({
    pending: 0,
    atHub: 0,
    outForDelivery: 0,
    delivered: 0
  });
  const [hubs, setHubs] = useState([]);
  const [hubsByDistrict, setHubsByDistrict] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("hubs");
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

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
      console.log("🔍 Fetching dashboard data...");
      console.log("API Base URL:", import.meta.env.VITE_API_BASE_URL);
      
      // Get manager data from localStorage to get managerId
      const managerData = localStorage.getItem("hubManager");
      const manager = managerData ? JSON.parse(managerData) : null;
      const managerId = manager?.managerId;
      
      console.log("Manager ID for notifications:", managerId);
      
      if (!managerId) {
        console.error("❌ No manager ID found in localStorage");
        toast.error("Manager ID not found. Please login again.");
        navigate("/hub-manager/login");
        return;
      }
      
      // Test each API endpoint individually to identify the failing one
      console.log("Testing stats endpoint...");
      const statsRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/hub-managers/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(err => {
        console.error("Stats API error:", err);
        return { ok: false, json: () => Promise.resolve({ success: false }) };
      });
      
      console.log("Stats response status:", statsRes.status);
      
      console.log("Testing hubs endpoint...");
      const hubsRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/hubs/all-with-stats`).catch(err => {
        console.error("Hubs API error:", err);
        return { ok: false, json: () => Promise.resolve({ success: false }) };
      });
      
      console.log("Hubs response status:", hubsRes.status);
      
      console.log("Testing notifications endpoint...");
      // Use the working hub-notifications endpoint with managerId as query param
      let notificationsRes;
      try {
        notificationsRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/hub-notifications?managerId=${managerId}`);
        console.log("Notifications response status:", notificationsRes.status);
        console.log("Notifications response headers:", notificationsRes.headers.get('content-type'));
      } catch (err) {
        console.error("Notifications API error:", err);
        notificationsRes = { ok: false, json: () => Promise.resolve({ success: false, notifications: [], unreadCount: 0 }) };
      }
      
      console.log("Testing orders endpoint...");
      const ordersRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/hub-managers/orders/hub`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(err => {
        console.error("Orders API error:", err);
        return { ok: false, json: () => Promise.resolve({ success: false }) };
      });
      
      console.log("Orders response status:", ordersRes.status);

      // Parse responses safely
      console.log("Parsing responses...");
      
      let statsData = { success: false };
      if (statsRes.ok) {
        try {
          statsData = await statsRes.json();
        } catch (e) {
          console.error("Error parsing stats response:", e);
        }
      }
      
      let hubsData = { success: false };
      if (hubsRes.ok) {
        try {
          hubsData = await hubsRes.json();
        } catch (e) {
          console.error("Error parsing hubs response:", e);
        }
      }
      
      let notificationsData = { success: false };
      if (notificationsRes.ok) {
        try {
          const contentType = notificationsRes.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            notificationsData = await notificationsRes.json();
          } else {
            console.error("❌ Notifications response is not JSON:", contentType);
            const textResponse = await notificationsRes.text();
            console.error("Response text:", textResponse.substring(0, 200));
            notificationsData = { success: false, error: "Invalid response format" };
          }
        } catch (e) {
          console.error("Error parsing notifications response:", e);
          const textResponse = await notificationsRes.text();
          console.error("Response text:", textResponse.substring(0, 200));
          notificationsData = { success: false, error: "JSON parse error" };
        }
      }
      
      let ordersData = { success: false };
      if (ordersRes.ok) {
        try {
          ordersData = await ordersRes.json();
        } catch (e) {
          console.error("Error parsing orders response:", e);
        }
      }

      console.log("📊 Hub Data:", hubsData);
      console.log("📊 Hubs array:", hubsData.hubs);
      console.log("📊 Hubs count:", hubsData.hubs?.length);

      if (statsData.success) {
        console.log("✅ Stats data loaded");
        setStats(statsData.stats);
      }
      
      if (hubsData.success && hubsData.hubs) {
        console.log("✅ Setting hubs:", hubsData.hubs.length);
        setHubs(hubsData.hubs);
        // Group hubs by district
        const grouped = {};
        hubsData.hubs.forEach(hub => {
          const district = hub.district || "N/A";
          if (!grouped[district]) grouped[district] = [];
          grouped[district].push(hub);
        });
        console.log("✅ Grouped by district:", Object.keys(grouped));
        setHubsByDistrict(grouped);
      } else {
        console.error("❌ Hub data error:", hubsData);
        // Set empty data to avoid crashes
        setHubs([]);
        setHubsByDistrict({});
      }

      if (notificationsData.success) {
        console.log("✅ Notifications data loaded");
        console.log("📊 Notifications details:", {
          count: notificationsData.notifications?.length || 0,
          unreadCount: notificationsData.unreadCount || 0,
          notifications: notificationsData.notifications?.map(n => ({
            title: n.title,
            read: n.read,
            createdAt: n.createdAt
          })) || []
        });
        setNotifications(notificationsData.notifications || []);
        setUnreadCount(notificationsData.unreadCount || 0);
      } else {
        console.log("⚠️ Notifications not loaded, using empty array");
        console.log("❌ Notifications error:", notificationsData.error || 'Unknown error');
        setNotifications([]);
        setUnreadCount(0);
      }

      if (ordersData.success) {
        console.log("✅ Orders data loaded");
        setOrders(ordersData.orders || []);
      } else {
        console.log("⚠️ Orders not loaded, using empty array");
        setOrders([]);
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
      toast.success("Dashboard refreshed");
    }
  };

  const debugNotifications = async () => {
    const managerData = localStorage.getItem("hubManager");
    const manager = managerData ? JSON.parse(managerData) : null;
    const managerId = manager?.managerId;
    
    console.log("🐛 DEBUG: Manual notification test");
    console.log("Manager ID:", managerId);
    console.log("API URL:", `${import.meta.env.VITE_API_BASE_URL}/api/hub-notifications?managerId=${managerId}`);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/hub-notifications?managerId=${managerId}`);
      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers.get('content-type'));
      
      const data = await response.json();
      console.log("Response data:", data);
      
      if (data.success) {
        console.log(`✅ Manual test: ${data.notifications.length} notifications, ${data.unreadCount} unread`);
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        toast.success(`Loaded ${data.notifications.length} notifications manually`);
      } else {
        console.log("❌ Manual test failed:", data.error);
        toast.error("Manual notification test failed");
      }
    } catch (error) {
      console.error("❌ Manual test error:", error);
      toast.error("Manual notification test error");
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    const token = localStorage.getItem("hubManagerToken");
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/hub-managers/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n._id === notificationId ? { ...n, read: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleNotificationClick = async (notification) => {
    const token = localStorage.getItem("hubManagerToken");
    
    try {
      // Fetch full notification details with order information
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/hub-managers/notifications/${notification._id}/details`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSelectedNotification({
            ...data.notification,
            orderDetails: data.orderDetails
          });
        } else {
          setSelectedNotification(notification);
        }
      } else {
        setSelectedNotification(notification);
      }
    } catch (error) {
      console.error("Error fetching notification details:", error);
      setSelectedNotification(notification);
    }
    
    setShowNotifications(false);
  };

  const markAllAsRead = async () => {
    const token = localStorage.getItem("hubManagerToken");
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/hub-managers/notifications/read-all`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        toast.success("All notifications marked as read");
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const getUtilizationColor = (utilization) => {
    if (utilization >= 90) return "text-red-700";
    if (utilization >= 80) return "text-red-600";
    if (utilization >= 60) return "text-yellow-600";
    if (utilization >= 40) return "text-amber-600";
    return "text-green-600";
  };

  const getUtilizationBgColor = (utilization) => {
    if (utilization >= 90) return "bg-red-100 border-red-300";
    if (utilization >= 80) return "bg-red-50 border-red-200";
    if (utilization >= 60) return "bg-yellow-100 border-yellow-300";
    if (utilization >= 40) return "bg-amber-50 border-amber-200";
    return "bg-green-100 border-green-300";
  };

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
      <div className="bk-dashboard-wrapper">
        <div className="bk-dashboard-container">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="bk-spinner"></div>
              <p className="mt-4 text-lg" style={{ color: "var(--text-muted)" }}>Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bk-dashboard-wrapper">
      {/* Header */}
      <header className="bk-dashboard-header">
        <div className="bk-dashboard-container">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <Link to="/" className="text-2xl">
                <FiHome className="hover:opacity-70 transition-opacity" style={{ color: "var(--brand)" }} />
              </Link>
              <h1 className="bk-dashboard-title">Hub Manager Portal</h1>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-4">
              <button onClick={handleRefresh} className="bk-icon-btn" title="Refresh">
                <FiRefreshCw size={20} />
              </button>
              
              <button onClick={debugNotifications} className="bk-icon-btn" title="Debug Notifications" style={{ background: '#ff6b6b', color: 'white' }}>
                🐛
              </button>

              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="bk-icon-btn relative"
                  title="Notifications"
                >
                  <FiBell size={20} />
                  {unreadCount > 0 && (
                    <span className="bk-notification-badge">{unreadCount}</span>
                  )}
                </button>

                {showNotifications && (
                  <div className="bk-notification-dropdown">
                    <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border)" }}>
                      <h3 className="font-semibold" style={{ color: "var(--text)" }}>Notifications</h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className="text-sm hover:underline"
                          style={{ color: "var(--brand)" }}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>
                          <FiBell size={40} className="mx-auto mb-3 opacity-30" />
                          <p>No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification._id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`bk-notification-item ${!notification.read ? "unread" : ""}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`bk-notification-icon ${!notification.read ? "active" : ""}`}>
                                <FiPackage size={18} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm mb-1" style={{ color: "var(--text)" }}>
                                  {notification.title}
                                </p>
                                <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                                  {notification.message}
                                </p>
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                  <FiClock size={12} className="inline mr-1" />
                                  {new Date(notification.createdAt).toLocaleString()}
                                </p>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1"></div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleLogout} className="bk-btn-secondary">
                <FiLogOut size={18} className="mr-2" />
                Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden bk-icon-btn"
            >
              {showMobileMenu ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="bk-mobile-menu">
          <button onClick={handleRefresh} className="bk-mobile-menu-item">
            <FiRefreshCw size={20} />
            <span>Refresh</span>
          </button>
          <button onClick={handleLogout} className="bk-mobile-menu-item">
            <FiLogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="bk-dashboard-container py-8">
        {/* Manager Info Card */}
        <div className="bk-info-card mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="bk-avatar">
                <FiUser size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>
                  Welcome back! 👋
                </h2>
                <p className="text-base mb-3" style={{ color: "var(--text-muted)" }}>
                  {manager?.email}
                </p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ 
                    background: "rgba(139, 94, 52, 0.1)",
                    color: "var(--brand)",
                    fontWeight: "600"
                  }}>
                    <FiMapPin size={14} />
                    <strong>ID:</strong> {manager?.managerId || "N/A"}
                  </span>
                  <span className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ 
                    background: "rgba(139, 94, 52, 0.1)",
                    color: "var(--brand)",
                    fontWeight: "600"
                  }}>
                    <FiMapPin size={14} />
                    <strong>District:</strong> {manager?.district || "N/A"}
                  </span>
                  <span className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ 
                    background: manager?.isActive ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                    color: manager?.isActive ? "#16a34a" : "#dc2626",
                    fontWeight: "700"
                  }}>
                    <FiCheckCircle size={14} />
                    <strong>Status:</strong> {manager?.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="flex gap-6 md:flex-col md:items-end">
              <div className="text-center md:text-right">
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Total Hubs</p>
                <p className="text-3xl font-bold" style={{ color: "var(--brand)" }}>{hubs.length}</p>
              </div>
              <div className="text-center md:text-right">
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Districts</p>
                <p className="text-3xl font-bold" style={{ color: "var(--brand)" }}>{Object.keys(hubsByDistrict).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bk-stat-card" data-color="blue">
            <div className="bk-stat-icon">
              <FiClock size={28} />
            </div>
            <div>
              <p className="bk-stat-label">Pending Orders</p>
              <p className="bk-stat-value">{stats.pending}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Awaiting processing</p>
            </div>
          </div>

          <div className="bk-stat-card" data-color="green">
            <div className="bk-stat-icon">
              <FiBox size={28} />
            </div>
            <div>
              <p className="bk-stat-label">At Hub</p>
              <p className="bk-stat-value">{stats.atHub}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Ready for dispatch</p>
            </div>
          </div>

          <div className="bk-stat-card" data-color="purple">
            <div className="bk-stat-icon">
              <FiTruck size={28} />
            </div>
            <div>
              <p className="bk-stat-label">Out for Delivery</p>
              <p className="bk-stat-value">{stats.outForDelivery}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>In transit</p>
            </div>
          </div>

          <div className="bk-stat-card" data-color="indigo">
            <div className="bk-stat-icon">
              <FiCheckCircle size={28} />
            </div>
            <div>
              <p className="bk-stat-label">Delivered</p>
              <p className="bk-stat-value">{stats.delivered}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Successfully completed</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bk-tabs mb-6">
          <button
            onClick={() => setActiveTab("hubs")}
            className={`bk-tab ${activeTab === "hubs" ? "active" : ""}`}
          >
            <FiMapPin size={18} />
            <span>All Hubs</span>
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`bk-tab ${activeTab === "orders" ? "active" : ""}`}
          >
            <FiPackage size={18} />
            <span>Orders ({orders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`bk-tab ${activeTab === "profile" ? "active" : ""}`}
          >
            <FiUser size={18} />
            <span>Profile</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="bk-tab-content">
          {/* All Hubs Tab */}
          {activeTab === "hubs" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>Hub Directory</h2>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Complete list of all hubs across Kerala districts
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 rounded-full" style={{ 
                    background: "linear-gradient(135deg, rgba(139, 94, 52, 0.15) 0%, rgba(111, 69, 24, 0.1) 100%)",
                    border: "1px solid rgba(139, 94, 52, 0.2)"
                  }}>
                    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--brand)" }}>
                      <FiBarChart2 size={18} />
                      <span>{hubs.length} Total Hubs</span>
                    </div>
                  </div>
                </div>
              </div>

              {Object.keys(hubsByDistrict).length === 0 ? (
                <div className="bk-empty-state">
                  <FiMapPin size={64} className="mb-4 opacity-20" />
                  <h3 className="text-xl font-semibold mb-2">No Hubs Found</h3>
                  <p>There are no hubs registered in the system yet.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(hubsByDistrict)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([district, districtHubs]) => {
                      const totalCapacity = districtHubs.reduce((sum, hub) => sum + (hub.capacity || 0), 0);
                      const totalStock = districtHubs.reduce((sum, hub) => sum + (hub.currentStock || 0), 0);
                      const avgUtilization = totalCapacity > 0 ? (totalStock / totalCapacity * 100) : 0;
                      
                      return (
                        <div key={district} className="bk-district-section">
                          <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">{getDistrictIcon(district)}</span>
                              <div>
                                <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
                                  {district}
                                  <span className="bk-district-badge">{districtHubs.length} hub{districtHubs.length > 1 ? 's' : ''}</span>
                                </h3>
                                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                                  Total Capacity: <strong>{totalCapacity}</strong> | 
                                  Current Stock: <strong>{totalStock}</strong> | 
                                  Utilization: <strong className={getUtilizationColor(avgUtilization)}>{avgUtilization.toFixed(1)}%</strong>
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {districtHubs.map((hub, index) => (
                              <div key={hub._id} className="bk-hub-card" style={{ animationDelay: `${index * 0.1}s` }}>
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex-1">
                                    <h4 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>
                                      {hub.name}
                                    </h4>
                                    <p className="text-sm flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                                      <FiMapPin size={14} />
                                      ID: {hub.hubId}
                                    </p>
                                  </div>
                                  <span 
                                    className={`bk-utilization-badge ${getUtilizationBgColor(hub.utilization)} border`}
                                  >
                                    <span className={`font-bold ${getUtilizationColor(hub.utilization)}`}>
                                      {hub.utilization.toFixed(0)}%
                                    </span>
                                  </span>
                                </div>

                                <div className="space-y-3">
                                  <div className="flex justify-between items-center text-sm p-3 rounded-lg" style={{ background: "rgba(248, 243, 238, 0.5)" }}>
                                    <span style={{ color: "var(--text-muted)" }}>📦 Current Stock</span>
                                    <span className="font-bold text-lg" style={{ color: "var(--text)" }}>
                                      {hub.currentStock || 0}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm p-3 rounded-lg" style={{ background: "rgba(248, 243, 238, 0.5)" }}>
                                    <span style={{ color: "var(--text-muted)" }}>🏢 Capacity</span>
                                    <span className="font-bold text-lg" style={{ color: "var(--text)" }}>
                                      {hub.capacity || 0}
                                    </span>
                                  </div>

                                  {/* Enhanced Progress Bar */}
                                  <div>
                                    <div className="flex justify-between text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                                      <span>Utilization</span>
                                      <span className="font-semibold">{hub.utilization.toFixed(1)}%</span>
                                    </div>
                                    <div className="bk-progress-bar" style={{ height: "10px" }}>
                                      <div 
                                        className={`bk-progress-fill ${
                                          hub.utilization >= 90 ? "bg-red-600" :
                                          hub.utilization >= 80 ? "bg-red-500" :
                                          hub.utilization >= 60 ? "bg-yellow-500" :
                                          hub.utilization >= 40 ? "bg-amber-500" :
                                          "bg-green-500"
                                        }`}
                                        style={{ 
                                          width: `${Math.min(hub.utilization, 100)}%`,
                                          boxShadow: hub.utilization > 0 ? "0 2px 8px rgba(139, 94, 52, 0.2)" : "none"
                                        }}
                                      ></div>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "rgba(234, 217, 201, 0.3)" }}>
                                    <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                                      <FiPackage size={14} />
                                      <span>{hub.ordersAtHub || 0} orders</span>
                                    </div>
                                    <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                      (hub.ordersAtHub || 0) > 5 ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                                    }`}>
                                      {(hub.ordersAtHub || 0) > 5 ? "🔥 Active" : "⚡ Ready"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <div>
              <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--text)" }}>Orders at Your Hub</h2>

              {orders.length === 0 ? (
                <div className="bk-empty-state">
                  <FiPackage size={64} className="mb-4 opacity-20" />
                  <h3 className="text-xl font-semibold mb-2">No Orders Yet</h3>
                  <p>There are no orders at your hub currently.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order._id} className="bk-order-card">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-lg font-bold" style={{ color: "var(--text)" }}>
                            Order #{order.orderId}
                          </h4>
                          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`bk-status-badge ${order.status}`}>
                          {order.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p style={{ color: "var(--text-muted)" }}>Customer:</p>
                          <p className="font-semibold" style={{ color: "var(--text)" }}>
                            {order.userId?.name || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p style={{ color: "var(--text-muted)" }}>Total Amount:</p>
                          <p className="font-semibold" style={{ color: "var(--text)" }}>
                            ₹{order.totalAmount?.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div>
              <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--text)" }}>Manager Profile</h2>

              <div className="bk-profile-card">
                <div className="bk-profile-header">
                  <div className="bk-profile-avatar">
                    <FiUser size={40} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>
                      {manager?.email}
                    </h3>
                    <span className={`bk-status-badge ${manager?.isActive ? "active" : "inactive"}`}>
                      {manager?.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="bk-profile-details">
                  <div className="bk-profile-field">
                    <label>Manager ID</label>
                    <p>{manager?.managerId || "N/A"}</p>
                  </div>
                  <div className="bk-profile-field">
                    <label>Email Address</label>
                    <p>{manager?.email}</p>
                  </div>
                  <div className="bk-profile-field">
                    <label>Assigned District</label>
                    <p>{manager?.district || "N/A"}</p>
                  </div>
                  <div className="bk-profile-field">
                    <label>Hub Assignment</label>
                    <p>{manager?.hubId || "No hub assigned"}</p>
                  </div>
                  <div className="bk-profile-field">
                    <label>Account Created</label>
                    <p>{manager?.createdAt ? new Date(manager.createdAt).toLocaleDateString() : "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <div className="bk-modal-overlay" onClick={() => setSelectedNotification(null)}>
          <div className="bk-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="bk-modal-header">
              <h3 className="text-xl font-bold" style={{ color: "var(--text)" }}>
                {selectedNotification.title}
              </h3>
              <button 
                onClick={() => setSelectedNotification(null)}
                className="bk-icon-btn"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="bk-modal-body">
              {/* Notification Info */}
              <div className="mb-6 p-4 rounded-xl" style={{
                background: "linear-gradient(135deg, rgba(139, 94, 52, 0.08) 0%, rgba(111, 69, 24, 0.05) 100%)",
                border: "1px solid rgba(139, 94, 52, 0.2)"
              }}>
                <p className="text-sm mb-2 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                  <FiClock size={14} />
                  {new Date(selectedNotification.createdAt).toLocaleString()}
                </p>
                <p className="text-base" style={{ color: "var(--text)" }}>{selectedNotification.message}</p>
              </div>

              {/* Order Details */}
              {selectedNotification.orderDetails && (
                <div className="space-y-6">
                  {/* Order Summary */}
                  <div>
                    <h4 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: "var(--brand)" }}>
                      <FiPackage size={20} />
                      Order Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-gray-50">
                      <div>
                        <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Order Number</p>
                        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                          #{selectedNotification.orderDetails.orderNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Total Amount</p>
                        <p className="text-sm font-semibold" style={{ color: "var(--brand)" }}>
                          ₹{selectedNotification.orderDetails.totalAmount}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Order Status</p>
                        <p className="text-sm font-semibold capitalize" style={{ color: "var(--text)" }}>
                          {selectedNotification.orderDetails.orderStatus?.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Items</p>
                        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                          {selectedNotification.orderDetails.items.length} item(s)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Customer Details */}
                  <div>
                    <h4 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: "var(--brand)" }}>
                      <FiMapPin size={20} />
                      Customer Details
                    </h4>
                    <div className="p-4 rounded-lg bg-gray-50">
                      <p className="font-semibold mb-2" style={{ color: "var(--text)" }}>
                        {selectedNotification.orderDetails.buyerDetails.name}
                      </p>
                      <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                        📧 {selectedNotification.orderDetails.buyerDetails.email}
                      </p>
                      <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                        📱 {selectedNotification.orderDetails.buyerDetails.phone}
                      </p>
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Delivery Address:</p>
                        <p className="text-sm" style={{ color: "var(--text)" }}>
                          {selectedNotification.orderDetails.buyerDetails.address.street}, {selectedNotification.orderDetails.buyerDetails.address.city}, {selectedNotification.orderDetails.buyerDetails.address.state} - {selectedNotification.orderDetails.buyerDetails.address.pincode}
                        </p>
                        <div className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-semibold" style={{
                          background: "linear-gradient(135deg, rgba(139, 94, 52, 0.15) 0%, rgba(111, 69, 24, 0.1) 100%)",
                          color: "var(--brand)"
                        }}>
                          📍 {selectedNotification.orderDetails.buyerDetails.address.city || 'City not specified'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div>
                    <h4 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: "var(--brand)" }}>
                      <FiBox size={20} />
                      Products
                    </h4>
                    <div className="space-y-3">
                      {selectedNotification.orderDetails.items.map((item, index) => (
                        <div key={index} className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                          <div className="flex gap-3">
                            {item.image && (
                              <img 
                                src={item.image} 
                                alt={item.title} 
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            )}
                            <div className="flex-1">
                              <p className="font-semibold mb-1" style={{ color: "var(--text)" }}>
                                {item.title}
                              </p>
                              <div className="flex gap-4 text-sm" style={{ color: "var(--text-muted)" }}>
                                <span>Qty: {item.quantity}</span>
                                {item.variant?.weight && <span>Weight: {item.variant.weight}</span>}
                                {item.variant?.price && <span className="font-semibold" style={{ color: "var(--brand)" }}>₹{item.variant.price}</span>}
                              </div>
                              {item.sellerDetails && (
                                <p className="text-xs mt-2 px-2 py-1 rounded inline-block" style={{
                                  background: "rgba(139, 94, 52, 0.1)",
                                  color: "var(--brand)"
                                }}>
                                  👨‍🍳 {item.sellerDetails.businessName || item.sellerDetails.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hub Tracking Info */}
                  {selectedNotification.orderDetails.hubTracking && (
                    <div>
                      <h4 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: "var(--brand)" }}>
                        <FiTruck size={20} />
                        Hub Tracking
                      </h4>
                      <div className="p-4 rounded-lg" style={{
                        background: "linear-gradient(135deg, rgba(139, 94, 52, 0.08) 0%, rgba(111, 69, 24, 0.05) 100%)",
                        border: "1px solid rgba(139, 94, 52, 0.2)"
                      }}>
                        <div className="grid grid-cols-2 gap-4">
                          {selectedNotification.orderDetails.hubTracking.sellerHubName && (
                            <div>
                              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Seller Hub</p>
                              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                                {selectedNotification.orderDetails.hubTracking.sellerHubName}
                              </p>
                              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                {selectedNotification.orderDetails.hubTracking.sellerHubDistrict}
                              </p>
                            </div>
                          )}
                          {selectedNotification.orderDetails.hubTracking.arrivedAtSellerHub && (
                            <div>
                              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Arrived At</p>
                              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                                {new Date(selectedNotification.orderDetails.hubTracking.arrivedAtSellerHub).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Fallback if no order details */}
              {!selectedNotification.orderDetails && selectedNotification.metadata?.items && (
                <div>
                  <h4 className="text-lg font-bold mb-4" style={{ color: "var(--text)" }}>
                    Product Details
                  </h4>
                  <div className="space-y-3">
                    {selectedNotification.metadata.items.map((item, index) => (
                      <div key={index} className="bk-product-item">
                        <div className="flex items-center gap-3">
                          <div className="bk-product-icon">
                            <FiPackage size={20} />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold" style={{ color: "var(--text)" }}>
                              {item.title || item.productName || "Product"}
                            </p>
                            <div className="flex gap-4 text-sm" style={{ color: "var(--text-muted)" }}>
                              <span>Quantity: {item.quantity}</span>
                              {item.variant && <span>Variant: {item.variant.weight}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bk-modal-footer">
              <button 
                onClick={() => setSelectedNotification(null)}
                className="bk-btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
