import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function CentralHubManagerDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("overview");
  const [hubs, setHubs] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalHubs: 0,
    activeHubs: 0,
    pendingOrders: 0,
    completedOrders: 0
  });
  const [loading, setLoading] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState("all");

  const keralaDistricts = [
    "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", "Kottayam",
    "Idukki", "Ernakulam", "Thrissur", "Palakkad", "Malappuram", "Kozhikode",
    "Wayanad", "Kannur", "Kasaragod"
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Get hub manager token (you'll need to implement this)
      const token = localStorage.getItem('hubManagerToken');
      
      // Fetch hubs
      const hubsRes = await fetch(`${API_BASE}/api/hub-manager/hubs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (hubsRes.ok) {
        const hubsData = await hubsRes.json();
        setHubs(hubsData);
        
        // Calculate stats
        const totalHubs = hubsData.length;
        const activeHubs = hubsData.filter(h => h.status === 'active').length;
        
        setStats(prev => ({
          ...prev,
          totalHubs,
          activeHubs
        }));
      }
      
      // Fetch orders
      const ordersRes = await fetch(`${API_BASE}/api/hub-manager/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
        
        const pendingOrders = ordersData.filter(o => 
          ['at_seller_hub', 'pending_approval'].includes(o.orderStatus)
        ).length;
        const completedOrders = ordersData.filter(o => 
          o.orderStatus === 'delivered'
        ).length;
        
        setStats(prev => ({
          ...prev,
          pendingOrders,
          completedOrders
        }));
      }
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hubManagerToken');
    navigate('/hub-manager/login');
  };

  const filteredHubs = selectedDistrict === 'all' 
    ? hubs 
    : hubs.filter(h => h.district === selectedDistrict);

  const filteredOrders = selectedDistrict === 'all'
    ? orders
    : orders.filter(o => {
        const hubId = o.hubTracking?.sellerHubId || o.hubTracking?.customerHubId;
        const hub = hubs.find(h => h._id === hubId);
        return hub?.district === selectedDistrict;
      });

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      fontFamily: "Inter, sans-serif",
      background: "linear-gradient(135deg, #f5f1eb 0%, #e8dcc6 100%)"
    }}>
      {/* Sidebar */}
      <aside style={{
        width: "280px",
        background: "#fff",
        borderRight: "1px solid #eee",
        padding: "24px"
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #5c4033 0%, #8b5e34 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "32px",
            margin: "0 auto 16px",
            color: "white",
            fontWeight: "bold"
          }}>
            🏢
          </div>
          <h2 style={{ fontSize: "20px", margin: "0 0 8px 0", color: "#5c4033" }}>
            Central Hub Manager
          </h2>
          <div style={{ fontSize: "14px", color: "#666" }}>Kerala State Operations</div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button
            onClick={() => setActiveSection("overview")}
            style={{
              ...navButtonStyle,
              ...(activeSection === "overview" ? activeNavStyle : {})
            }}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveSection("hubs")}
            style={{
              ...navButtonStyle,
              ...(activeSection === "hubs" ? activeNavStyle : {})
            }}
          >
            🏪 Hub Management
          </button>
          <button
            onClick={() => setActiveSection("orders")}
            style={{
              ...navButtonStyle,
              ...(activeSection === "orders" ? activeNavStyle : {})
            }}
          >
            📦 Order Tracking
          </button>
          <button
            onClick={() => setActiveSection("inventory")}
            style={{
              ...navButtonStyle,
              ...(activeSection === "inventory" ? activeNavStyle : {})
            }}
          >
            📋 Inventory Status
          </button>
          <button
            onClick={() => setActiveSection("analytics")}
            style={{
              ...navButtonStyle,
              ...(activeSection === "analytics" ? activeNavStyle : {})
            }}
          >
            📈 Analytics
          </button>
          
          <hr style={{ margin: "24px 0", border: "none", borderTop: "1px solid #eee" }} />
          
          <button
            onClick={handleLogout}
            style={{
              ...navButtonStyle,
              color: "#dc3545",
              fontWeight: "600"
            }}
          >
            🚪 Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "32px"
        }}>
          <div>
            <h1 style={{ margin: "0 0 8px 0", color: "#5c4033", fontSize: "28px" }}>
              {activeSection === "overview" && "Dashboard Overview"}
              {activeSection === "hubs" && "Hub Management"}
              {activeSection === "orders" && "Order Tracking"}
              {activeSection === "inventory" && "Inventory Status"}
              {activeSection === "analytics" && "Analytics"}
            </h1>
            <p style={{ margin: 0, color: "#666" }}>
              Manage all Kerala district hubs from one central location
            </p>
          </div>
          
          {/* District Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <label style={{ fontSize: "14px", color: "#666" }}>Filter by District:</label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              style={{
                padding: "8px 16px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
                background: "white"
              }}
            >
              <option value="all">All Districts</option>
              {keralaDistricts.map(district => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Overview Section */}
        {activeSection === "overview" && (
          <div>
            {/* Stats Cards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "24px",
              marginBottom: "32px"
            }}>
              <div style={statsCardStyle}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏪</div>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "32px", color: "#5c4033" }}>
                  {stats.totalHubs}
                </h3>
                <p style={{ margin: 0, color: "#666" }}>Total Hubs</p>
                <div style={{ fontSize: "12px", color: "#28a745", marginTop: "8px" }}>
                  {stats.activeHubs} Active
                </div>
              </div>

              <div style={statsCardStyle}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>⏳</div>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "32px", color: "#ffc107" }}>
                  {stats.pendingOrders}
                </h3>
                <p style={{ margin: 0, color: "#666" }}>Pending Orders</p>
                <div style={{ fontSize: "12px", color: "#ffc107", marginTop: "8px" }}>
                  Awaiting Processing
                </div>
              </div>

              <div style={statsCardStyle}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "32px", color: "#28a745" }}>
                  {stats.completedOrders}
                </h3>
                <p style={{ margin: 0, color: "#666" }}>Completed Orders</p>
                <div style={{ fontSize: "12px", color: "#28a745", marginTop: "8px" }}>
                  Successfully Delivered
                </div>
              </div>

              <div style={statsCardStyle}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "32px", color: "#17a2b8" }}>
                  {Math.round((stats.completedOrders / (stats.pendingOrders + stats.completedOrders) * 100) || 0)}%
                </h3>
                <p style={{ margin: 0, color: "#666" }}>Success Rate</p>
                <div style={{ fontSize: "12px", color: "#17a2b8", marginTop: "8px" }}>
                  Order Completion
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              marginBottom: "32px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
            }}>
              <h2 style={{ margin: "0 0 20px 0", color: "#5c4033" }}>Quick Actions</h2>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px"
              }}>
                <button
                  onClick={() => setActiveSection("hubs")}
                  style={quickActionStyle}
                >
                  <div style={{ fontSize: "24px", marginBottom: "8px" }}>🏪</div>
                  <div>Manage Hubs</div>
                </button>
                <button
                  onClick={() => setActiveSection("orders")}
                  style={quickActionStyle}
                >
                  <div style={{ fontSize: "24px", marginBottom: "8px" }}>📦</div>
                  <div>Track Orders</div>
                </button>
                <button
                  onClick={() => setActiveSection("inventory")}
                  style={quickActionStyle}
                >
                  <div style={{ fontSize: "24px", marginBottom: "8px" }}>📋</div>
                  <div>Check Inventory</div>
                </button>
                <button
                  onClick={() => setActiveSection("analytics")}
                  style={quickActionStyle}
                >
                  <div style={{ fontSize: "24px", marginBottom: "8px" }}>📈</div>
                  <div>View Analytics</div>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
            }}>
              <h2 style={{ margin: "0 0 20px 0", color: "#5c4033" }}>Recent Activity</h2>
              <div style={{ color: "#666", textAlign: "center", padding: "40px" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
                <p>Recent hub activities will appear here</p>
              </div>
            </div>
          </div>
        )}

        {/* Hub Management Section */}
        {activeSection === "hubs" && (
          <div>
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
            }}>
              <h2 style={{ margin: "0 0 20px 0", color: "#5c4033" }}>
                District Hubs {selectedDistrict !== 'all' && `- ${selectedDistrict}`}
              </h2>
              
              {loading ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>⏳</div>
                  <p>Loading hubs...</p>
                </div>
              ) : filteredHubs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏪</div>
                  <p>No hubs found for the selected district</p>
                </div>
              ) : (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: "20px"
                }}>
                  {filteredHubs.map((hub) => (
                    <div
                      key={hub._id}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: "8px",
                        padding: "20px",
                        background: hub.status === 'active' ? "#f8fff8" : "#fff8f8"
                      }}
                    >
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "12px"
                      }}>
                        <h3 style={{ margin: 0, color: "#5c4033" }}>{hub.name}</h3>
                        <span style={{
                          padding: "4px 12px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "600",
                          background: hub.status === 'active' ? "#d4edda" : "#f8d7da",
                          color: hub.status === 'active' ? "#155724" : "#721c24"
                        }}>
                          {hub.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <p style={{ margin: "8px 0", color: "#666", fontSize: "14px" }}>
                        📍 {hub.district}, Kerala
                      </p>
                      <p style={{ margin: "8px 0", color: "#666", fontSize: "14px" }}>
                        📞 {hub.contactNumber}
                      </p>
                      <p style={{ margin: "8px 0", color: "#666", fontSize: "14px" }}>
                        📧 {hub.email}
                      </p>
                      
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "16px",
                        paddingTop: "16px",
                        borderTop: "1px solid #eee"
                      }}>
                        <div style={{ fontSize: "12px", color: "#666" }}>
                          Capacity: {hub.capacity || 'N/A'}
                        </div>
                        <button
                          onClick={() => toast.info(`Managing ${hub.name} hub`)}
                          style={{
                            padding: "6px 12px",
                            background: "#5c4033",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "12px",
                            cursor: "pointer"
                          }}
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Tracking Section */}
        {activeSection === "orders" && (
          <div>
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
            }}>
              <h2 style={{ margin: "0 0 20px 0", color: "#5c4033" }}>
                Order Tracking {selectedDistrict !== 'all' && `- ${selectedDistrict}`}
              </h2>
              
              {loading ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>⏳</div>
                  <p>Loading orders...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>📦</div>
                  <p>No orders found for the selected district</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {filteredOrders.map((order) => (
                    <div
                      key={order._id}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: "8px",
                        padding: "20px",
                        background: "white"
                      }}
                    >
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "12px"
                      }}>
                        <div>
                          <h3 style={{ margin: "0 0 8px 0", color: "#5c4033" }}>
                            Order #{order.orderNumber}
                          </h3>
                          <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>
                            Customer: {order.buyerDetails?.name}
                          </p>
                          <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>
                            Amount: ₹{order.finalAmount}
                          </p>
                        </div>
                        
                        <span style={{
                          padding: "6px 12px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "600",
                          background: getOrderStatusColor(order.orderStatus).bg,
                          color: getOrderStatusColor(order.orderStatus).text
                        }}>
                          {order.orderStatus.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingTop: "12px",
                        borderTop: "1px solid #eee"
                      }}>
                        <div style={{ fontSize: "12px", color: "#666" }}>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                        <button
                          onClick={() => toast.info(`Viewing order ${order.orderNumber}`)}
                          style={{
                            padding: "6px 12px",
                            background: "#5c4033",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "12px",
                            cursor: "pointer"
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
          </div>
        )}

        {/* Inventory Status Section */}
        {activeSection === "inventory" && (
          <div>
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
            }}>
              <h2 style={{ margin: "0 0 20px 0", color: "#5c4033" }}>Inventory Status</h2>
              <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
                <p>Inventory tracking system will be implemented here</p>
                <p style={{ fontSize: "14px" }}>
                  This will show incoming/outgoing products for each hub
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Section */}
        {activeSection === "analytics" && (
          <div>
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
            }}>
              <h2 style={{ margin: "0 0 20px 0", color: "#5c4033" }}>Analytics Dashboard</h2>
              <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📈</div>
                <p>Analytics and reporting system will be implemented here</p>
                <p style={{ fontSize: "14px" }}>
                  This will show performance metrics, trends, and insights
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Helper function for order status colors
function getOrderStatusColor(status) {
  const colors = {
    'pending': { bg: '#fff3cd', text: '#856404' },
    'confirmed': { bg: '#d4edda', text: '#155724' },
    'at_seller_hub': { bg: '#cce5ff', text: '#004085' },
    'pending_approval': { bg: '#fff3cd', text: '#856404' },
    'approved': { bg: '#d4edda', text: '#155724' },
    'shipped': { bg: '#e2e3e5', text: '#383d41' },
    'delivered': { bg: '#d4edda', text: '#155724' },
    'cancelled': { bg: '#f8d7da', text: '#721c24' }
  };
  return colors[status] || { bg: '#e9ecef', text: '#495057' };
}

// Styles
const navButtonStyle = {
  padding: "12px 16px",
  background: "transparent",
  border: "none",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: "500",
  cursor: "pointer",
  textAlign: "left",
  color: "#666",
  transition: "all 0.2s"
};

const activeNavStyle = {
  background: "#5c4033",
  color: "white"
};

const statsCardStyle = {
  background: "white",
  borderRadius: "12px",
  padding: "24px",
  textAlign: "center",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
};

const quickActionStyle = {
  padding: "20px",
  background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
  border: "1px solid #dee2e6",
  borderRadius: "8px",
  cursor: "pointer",
  textAlign: "center",
  fontSize: "14px",
  fontWeight: "500",
  color: "#5c4033",
  transition: "all 0.2s"
};