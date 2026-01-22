import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import "../styles/HubManagerDashboard.css";
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
  FiBarChart2,
  FiGrid,
  FiShoppingCart,
  FiCheck,
  FiUsers,
  FiKey,
  FiSettings,
  FiChevronRight
} from "react-icons/fi";

export default function NewHubManagerDashboard() {
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
  const [hubs, setHubs] = useState([]);
  const [hubsByDistrict, setHubsByDistrict] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
      
      const managerData = localStorage.getItem("hubManager");
      const manager = managerData ? JSON.parse(managerData) : null;
      const managerId = manager?.managerId;
      
      if (!managerId) {
        console.error("❌ No manager ID found in localStorage");
        toast.error("Manager ID not found. Please login again.");
        navigate("/hub-manager/login");
        return;
      }

      // Fetch all data in parallel
      const [statsRes, hubsRes, notificationsRes, ordersRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/hub-managers/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ ok: false })),
        
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/hubs/all-with-stats`).catch(() => ({ ok: false })),
        
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/hub-notifications?managerId=${managerId}`).catch(() => ({ ok: false })),
        
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/hub-managers/orders/hub`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ ok: false }))
      ]);

      // Process responses
      if (hubsRes.ok) {
        const hubsData = await hubsRes.json();
        if (hubsData.success && hubsData.hubs) {
          setHubs(hubsData.hubs);
          
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
          const ordersAtSellerHubs = hubsData.hubs.reduce((sum, hub) => sum + (hub.ordersAtHub || 0), 0);
          
          setStats(prev => ({
            ...prev,
            totalHubs,
            ordersAtSellerHubs,
            ordersInTransit: Math.floor(ordersAtSellerHubs * 0.3), // Simulated
            ordersAtCustomerHubs: Math.floor(ordersAtSellerHubs * 0.2), // Simulated
            ordersAwaitingPickup: Math.floor(ordersAtSellerHubs * 0.15), // Simulated
            deliveredOrders: Math.floor(ordersAtSellerHubs * 2.5) // Simulated
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
          setOrders(ordersData.orders || []);
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
      toast.success("Dashboard refreshed");
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
      color: "blue",
      description: "Active hubs across Kerala"
    },
    {
      title: "Orders at Seller Hubs",
      value: stats.ordersAtSellerHubs,
      icon: FiPackage,
      color: "orange",
      description: "Orders waiting at seller hubs"
    },
    {
      title: "Orders in Transit",
      value: stats.ordersInTransit,
      icon: FiTruck,
      color: "purple",
      description: "Orders being transported"
    },
    {
      title: "Orders at Customer Hubs",
      value: stats.ordersAtCustomerHubs,
      icon: FiBox,
      color: "green",
      description: "Orders at customer hubs"
    },
    {
      title: "Orders Awaiting Pickup",
      value: stats.ordersAwaitingPickup,
      icon: FiClock,
      color: "yellow",
      description: "Ready for customer pickup"
    },
    {
      title: "Delivered Orders",
      value: stats.deliveredOrders,
      icon: FiCheckCircle,
      color: "emerald",
      description: "Successfully delivered"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`bg-white shadow-lg transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-xl font-bold text-gray-800">Hub Manager</h1>
                <p className="text-sm text-gray-500">Central Portal</p>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <FiMenu size={20} />
            </button>
          </div>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    activeSection === item.id
                      ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon size={20} />
                  {!sidebarCollapsed && (
                    <>
                      <span className="font-medium">{item.label}</span>
                      <FiChevronRight size={16} className="ml-auto" />
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {!sidebarCollapsed && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FiUser size={16} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {manager?.name || 'Central Hub Manager'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {manager?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <FiLogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {sidebarItems.find(item => item.id === activeSection)?.label || 'Dashboard'}
              </h2>
              <p className="text-gray-600">
                {activeSection === 'dashboard' && 'Overview of all hub operations'}
                {activeSection === 'hubs' && 'Manage hubs across all districts'}
                {activeSection === 'seller-orders' && 'Orders at seller hubs'}
                {activeSection === 'approved-orders' && 'Approved orders for delivery'}
                {activeSection === 'customer-orders' && 'Orders at customer hubs'}
                {activeSection === 'otp-verification' && 'Verify delivery OTPs'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleRefresh}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Refresh"
              >
                <FiRefreshCw size={20} />
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Notifications"
                >
                  <FiBell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800">Notifications</h3>
                        {unreadCount > 0 && (
                          <span className="text-sm text-blue-600">{unreadCount} unread</span>
                        )}
                      </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <FiBell size={40} className="mx-auto mb-3 opacity-30" />
                          <p>No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification._id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                              !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-full ${!notification.read ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                <FiPackage size={16} className={!notification.read ? 'text-blue-600' : 'text-gray-600'} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800 text-sm mb-1">
                                  {notification.title}
                                </p>
                                <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                                  {notification.message}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <FiClock size={12} />
                                    {new Date(notification.createdAt).toLocaleDateString()}
                                  </span>
                                  {notification.orderNumber && (
                                    <span className="bg-gray-100 px-2 py-1 rounded">
                                      {notification.orderNumber}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
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
        <main className="flex-1 p-6">
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {overviewCards.map((card, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                        <p className="text-3xl font-bold text-gray-800">{card.value}</p>
                        <p className="text-sm text-gray-500 mt-1">{card.description}</p>
                      </div>
                      <div className={`p-3 rounded-full bg-${card.color}-100`}>
                        <card.icon size={24} className={`text-${card.color}-600`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3>
                </div>
                <div className="p-6">
                  {notifications.slice(0, 5).map((notification, index) => (
                    <div key={index} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <FiPackage size={16} className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{notification.title}</p>
                        <p className="text-sm text-gray-600">{notification.message}</p>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'hubs' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">District-wise Hub Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(hubsByDistrict).map(([district, districtHubs]) => (
                    <div key={district} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-2">{district}</h4>
                      <p className="text-sm text-gray-600 mb-3">{districtHubs.length} hub(s)</p>
                      {districtHubs.map((hub) => (
                        <div key={hub._id} className="bg-gray-50 rounded p-3 mb-2 last:mb-0">
                          <p className="font-medium text-sm">{hub.name}</p>
                          <p className="text-xs text-gray-600">ID: {hub.hubId}</p>
                          <p className="text-xs text-gray-600">Orders: {hub.ordersAtHub || 0}</p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'seller-orders' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">Orders at Seller Hubs</h3>
                  <p className="text-gray-600">Manage orders currently at seller hubs</p>
                </div>
                <div className="p-6">
                  {orders.length === 0 ? (
                    <div className="text-center py-12">
                      <FiPackage size={48} className="mx-auto text-gray-400 mb-4" />
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">No Orders Found</h4>
                      <p className="text-gray-600">There are no orders at seller hubs currently.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div key={order._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-800">Order #{order.orderNumber}</h4>
                              <p className="text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</p>
                            </div>
                            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                              At Seller Hub
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Customer:</span>
                              <p className="font-medium">{order.buyerDetails?.name || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Amount:</span>
                              <p className="font-medium">₹{order.totalAmount}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Items:</span>
                              <p className="font-medium">{order.items?.length || 0} item(s)</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Hub:</span>
                              <p className="font-medium">{order.hubTracking?.sellerHubName || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'approved-orders' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">Approved Orders</h3>
                  <p className="text-gray-600">Orders approved for delivery to customers</p>
                </div>
                <div className="p-6">
                  <div className="text-center py-12">
                    <FiCheck size={48} className="mx-auto text-green-400 mb-4" />
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Approved Orders</h4>
                    <p className="text-gray-600">Orders that have been approved for delivery will appear here.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'customer-orders' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">Customer Hub Orders</h3>
                  <p className="text-gray-600">Orders at customer hubs awaiting pickup</p>
                </div>
                <div className="p-6">
                  <div className="text-center py-12">
                    <FiUsers size={48} className="mx-auto text-blue-400 mb-4" />
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Customer Hub Orders</h4>
                    <p className="text-gray-600">Orders at customer hubs will be displayed here.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'otp-verification' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">OTP Verification</h3>
                  <p className="text-gray-600">Verify delivery OTPs for order completion</p>
                </div>
                <div className="p-6">
                  <div className="max-w-md mx-auto">
                    <div className="text-center mb-6">
                      <FiKey size={48} className="mx-auto text-yellow-400 mb-4" />
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">OTP Verification</h4>
                      <p className="text-gray-600">Enter the OTP to verify order delivery</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Order Number
                        </label>
                        <input
                          type="text"
                          placeholder="Enter order number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          OTP Code
                        </label>
                        <input
                          type="text"
                          placeholder="Enter 6-digit OTP"
                          maxLength="6"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono"
                        />
                      </div>
                      
                      <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                        Verify OTP
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other sections fallback */}
          {!['dashboard', 'hubs', 'seller-orders', 'approved-orders', 'customer-orders', 'otp-verification'].includes(activeSection) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center py-12">
                <FiSettings size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {sidebarItems.find(item => item.id === activeSection)?.label}
                </h3>
                <p className="text-gray-600">This section is under development.</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-800">
                  {selectedNotification.title}
                </h3>
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-gray-800">{selectedNotification.message}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <FiClock size={14} />
                    {new Date(selectedNotification.createdAt).toLocaleString()}
                  </span>
                  {selectedNotification.orderNumber && (
                    <span className="bg-white px-2 py-1 rounded border">
                      Order: {selectedNotification.orderNumber}
                    </span>
                  )}
                </div>
              </div>

              {selectedNotification.metadata && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800">Order Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedNotification.metadata.hubName && (
                      <div>
                        <span className="text-gray-600">Hub:</span>
                        <p className="font-medium">{selectedNotification.metadata.hubName}</p>
                      </div>
                    )}
                    {selectedNotification.metadata.customerName && (
                      <div>
                        <span className="text-gray-600">Customer:</span>
                        <p className="font-medium">{selectedNotification.metadata.customerName}</p>
                      </div>
                    )}
                    {selectedNotification.metadata.totalAmount && (
                      <div>
                        <span className="text-gray-600">Amount:</span>
                        <p className="font-medium">₹{selectedNotification.metadata.totalAmount}</p>
                      </div>
                    )}
                    {selectedNotification.metadata.itemCount && (
                      <div>
                        <span className="text-gray-600">Items:</span>
                        <p className="font-medium">{selectedNotification.metadata.itemCount} item(s)</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setSelectedNotification(null)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
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