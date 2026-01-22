import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { 
  FiArrowLeft, 
  FiMapPin, 
  FiPackage, 
  FiTruck, 
  FiClock,
  FiCheckCircle,
  FiBox,
  FiShoppingCart,
  FiPhone,
  FiMail,
  FiHome
} from "react-icons/fi";

export default function HubDetails() {
  const { hubId } = useParams();
  const navigate = useNavigate();
  const [hub, setHub] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchHubDetails();
  }, [hubId]);

  const fetchHubDetails = async () => {
    setLoading(true);
    try {
      // Fetch hub information
      const hubRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/public-hubs`);
      const hubData = await hubRes.json();
      
      if (hubData.success) {
        const foundHub = hubData.hubs.find(h => h.hubId === hubId);
        if (foundHub) {
          setHub(foundHub);
        } else {
          toast.error("Hub not found");
          navigate("/hub-manager/dashboard");
        }
      }

      // Fetch orders for this hub (you can add authentication if needed)
      // For now, we'll show sample data
      setOrders([]);
      
    } catch (error) {
      console.error("Error fetching hub details:", error);
      toast.error("Failed to load hub details");
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="bk-dashboard-wrapper">
        <div className="bk-dashboard-container">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="bk-spinner"></div>
              <p className="mt-4 text-lg" style={{ color: "var(--text-muted)" }}>Loading hub details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hub) {
    return (
      <div className="bk-dashboard-wrapper">
        <div className="bk-dashboard-container">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text)" }}>Hub Not Found</h2>
              <Link to="/hub-manager/dashboard" className="bk-btn-primary">
                <FiArrowLeft className="mr-2" />
                Back to Dashboard
              </Link>
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
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate("/hub-manager/dashboard")}
                className="bk-icon-btn"
                title="Back to Dashboard"
              >
                <FiArrowLeft size={20} />
              </button>
              <Link to="/" className="text-2xl">
                <FiHome className="hover:opacity-70 transition-opacity" style={{ color: "var(--brand)" }} />
              </Link>
              <h1 className="bk-dashboard-title">Hub Details</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="bk-dashboard-container py-8">
        {/* Hub Header */}
        <div className="bk-info-card mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">
                {getDistrictIcon(hub.district)}
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-2" style={{ color: "var(--text)" }}>
                  {hub.name}
                </h2>
                <p className="text-base mb-3" style={{ color: "var(--text-muted)" }}>
                  {hub.district} District Central Hub
                </p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ 
                    background: "rgba(139, 94, 52, 0.1)",
                    color: "var(--brand)",
                    fontWeight: "600"
                  }}>
                    <FiMapPin size={14} />
                    <strong>ID:</strong> {hub.hubId}
                  </span>
                  <span className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ 
                    background: "rgba(34, 197, 94, 0.15)",
                    color: "#16a34a",
                    fontWeight: "700"
                  }}>
                    <FiCheckCircle size={14} />
                    <strong>Status:</strong> ACTIVE
                  </span>
                </div>
              </div>
            </div>
            
            {/* Hub Stats */}
            <div className="flex gap-6 md:flex-col md:items-end">
              <div className="text-center md:text-right">
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Capacity</p>
                <p className="text-3xl font-bold" style={{ color: "var(--brand)" }}>{hub.capacity}</p>
              </div>
              <div className="text-center md:text-right">
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Current Stock</p>
                <p className="text-3xl font-bold" style={{ color: "var(--brand)" }}>{hub.currentStock}</p>
              </div>
              <div className="text-center md:text-right">
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Utilization</p>
                <p className={`text-3xl font-bold ${getUtilizationColor(hub.utilization)}`}>
                  {hub.utilization.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bk-stat-card" data-color="blue">
            <div className="bk-stat-icon">
              <FiBox size={28} />
            </div>
            <div>
              <p className="bk-stat-label">Orders at Hub</p>
              <p className="bk-stat-value">{hub.ordersAtHub}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Total orders</p>
            </div>
          </div>

          <div className="bk-stat-card" data-color="green">
            <div className="bk-stat-icon">
              <FiPackage size={28} />
            </div>
            <div>
              <p className="bk-stat-label">Storage Used</p>
              <p className="bk-stat-value">{hub.currentStock}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Items in storage</p>
            </div>
          </div>

          <div className="bk-stat-card" data-color="orange">
            <div className="bk-stat-icon">
              <FiTruck size={28} />
            </div>
            <div>
              <p className="bk-stat-label">Capacity</p>
              <p className="bk-stat-value">{hub.capacity}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Maximum capacity</p>
            </div>
          </div>

          <div className="bk-stat-card" data-color="purple">
            <div className="bk-stat-icon">
              <FiCheckCircle size={28} />
            </div>
            <div>
              <p className="bk-stat-label">Efficiency</p>
              <p className={`bk-stat-value ${getUtilizationColor(hub.utilization)}`}>
                {hub.utilization.toFixed(0)}%
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Utilization rate</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bk-tabs mb-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`bk-tab ${activeTab === "overview" ? "active" : ""}`}
          >
            <FiMapPin size={18} />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab("contact")}
            className={`bk-tab ${activeTab === "contact" ? "active" : ""}`}
          >
            <FiPhone size={18} />
            <span>Contact Info</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="bk-tab-content">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div>
              <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--text)" }}>Hub Overview</h2>
              
              {/* Utilization Progress */}
              <div className="bk-info-card mb-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text)" }}>Storage Utilization</h3>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                    <span>Current Usage</span>
                    <span className="font-semibold">{hub.currentStock} / {hub.capacity} ({hub.utilization.toFixed(1)}%)</span>
                  </div>
                  <div className="bk-progress-bar" style={{ height: "12px" }}>
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
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Available space: <strong>{hub.capacity - hub.currentStock}</strong> units
                </p>
              </div>

              {/* Location Info */}
              <div className="bk-info-card">
                <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text)" }}>Location Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>District</p>
                    <p className="text-base font-semibold" style={{ color: "var(--text)" }}>{hub.district}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>Hub ID</p>
                    <p className="text-base font-semibold" style={{ color: "var(--text)" }}>{hub.hubId}</p>
                  </div>
                  {hub.location?.address && (
                    <>
                      <div>
                        <p className="text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>City</p>
                        <p className="text-base font-semibold" style={{ color: "var(--text)" }}>{hub.location.address.city}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>Pincode</p>
                        <p className="text-base font-semibold" style={{ color: "var(--text)" }}>{hub.location.address.pincode}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Contact Tab */}
          {activeTab === "contact" && (
            <div>
              <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--text)" }}>Contact Information</h2>
              
              <div className="bk-info-card">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {hub.contactInfo?.phone && (
                    <div className="flex items-center gap-3">
                      <div className="bk-stat-icon" data-color="blue" style={{ width: "48px", height: "48px" }}>
                        <FiPhone size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>Phone</p>
                        <p className="text-base font-semibold" style={{ color: "var(--text)" }}>{hub.contactInfo.phone}</p>
                      </div>
                    </div>
                  )}
                  
                  {hub.contactInfo?.email && (
                    <div className="flex items-center gap-3">
                      <div className="bk-stat-icon" data-color="green" style={{ width: "48px", height: "48px" }}>
                        <FiMail size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>Email</p>
                        <p className="text-base font-semibold" style={{ color: "var(--text)" }}>{hub.contactInfo.email}</p>
                      </div>
                    </div>
                  )}
                  
                  {hub.contactInfo?.whatsapp && (
                    <div className="flex items-center gap-3">
                      <div className="bk-stat-icon" data-color="green" style={{ width: "48px", height: "48px" }}>
                        <FiPhone size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>WhatsApp</p>
                        <p className="text-base font-semibold" style={{ color: "var(--text)" }}>{hub.contactInfo.whatsapp}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <div className="bk-stat-icon" data-color="orange" style={{ width: "48px", height: "48px" }}>
                      <FiMapPin size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>Address</p>
                      <p className="text-base font-semibold" style={{ color: "var(--text)" }}>
                        {hub.location?.address ? 
                          `${hub.location.address.street}, ${hub.location.address.city}, ${hub.location.address.state} - ${hub.location.address.pincode}` :
                          "Address not available"
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}