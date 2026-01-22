import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { signOut } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { useConfirm } from "../context/ConfirmContext";
import { MAIN_CATEGORIES } from "../data/categories";

export default function EnhancedSellerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm } = useConfirm();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    activeOrders: 0,
    totalRevenue: 0,
    newThisWeek: 0,
    totalProducts: 0
  });
  const [form, setForm] = useState({
    title: "",
    mainCategory: "",
    subCategory: "",
    stock: "",
    variants: [{ weight: "", price: "" }],
    image: null,
  });
  const [errors, setErrors] = useState({ 
    title: "", 
    mainCategory: "", 
    subCategory: "", 
    stock: "",
    variants: []
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [sellerInfo, setSellerInfo] = useState(null);

  // ✅ Handle browser navigation properly - Block all navigation except logout
  useEffect(() => {
    // Replace current history entry to prevent back button issues
    window.history.replaceState(null, '', location.pathname);
    
    // Add a dummy history entry to prevent back navigation
    window.history.pushState(null, '', location.pathname);
    
    // Handle browser back/forward buttons
    const handlePopState = (event) => {
      // Only allow navigation if logging out
      if (!isLoggingOut) {
        event.preventDefault();
        // Push the seller dashboard back to history
        window.history.pushState(null, '', location.pathname);
      }
    };

    // Add event listener for browser navigation
    window.addEventListener('popstate', handlePopState);
    
    // Also prevent page refresh/close attempts
    const handleBeforeUnload = (event) => {
      // Only allow navigation if it's a logout action
      if (!event.target.activeElement?.textContent?.includes('Logout')) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [navigate, location.pathname, isLoggingOut]);

  // ✅ Fetch seller info
  const fetchSellerInfo = async (user) => {
    try {
      await user.reload();
      const token = await user.getIdToken(true);
      const res = await fetch("http://localhost:5000/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSellerInfo(data.user);
      }
    } catch (err) {
      console.error("Fetch seller info error:", err);
    }
  };

  // ✅ Fetch products
  const fetchProducts = async (user) => {
    try {
      await user.reload();
      const token = await user.getIdToken(true);
      const res = await fetch("http://localhost:5000/api/seller/products", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        toast.error("Access denied: You are not a seller");
        return;
      }

      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalProducts: Array.isArray(data) ? data.length : 0
      }));
    } catch (err) {
      console.error("Fetch products error:", err);
    }
  };

  // ✅ Fetch orders
  const fetchOrders = async (user) => {
    try {
      await user.reload();
      const token = await user.getIdToken(true);
      const res = await fetch("http://localhost:5000/api/seller/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        toast.error("Access denied: You are not a seller");
        return;
      }

      const data = await res.json();
      const ordersArray = Array.isArray(data) ? data : [];
      setOrders(ordersArray);
      
      // Calculate and set stats
      const calculatedStats = calculateStats(ordersArray);
      setStats(prev => ({
        ...prev,
        ...calculatedStats
      }));
    } catch (err) {
      console.error("Fetch orders error:", err);
      setOrders([]);
      setStats(prev => ({
        ...prev,
        activeOrders: 0,
        totalRevenue: 0,
        newThisWeek: 0
      }));
    }
  };

  // Calculate stats from orders
  const calculateStats = (ordersData) => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Active orders (not delivered, not cancelled)
    const activeOrders = ordersData.filter(order => 
      !['delivered', 'cancelled', 'rejected', 'failed'].includes(order.orderStatus)
    ).length;
    
    // Step 1: Calculate revenue from PAID orders (money received from customers)
    const paidOrders = ordersData.filter(order => 
      order.paymentStatus === 'paid' && order.orderStatus !== 'cancelled'
    );
    
    const totalRevenue = paidOrders.reduce((sum, order) => {
      const amountRaw = (order.finalAmount ?? order.total ?? order.totalAmount ?? 0);
      const amount = Number(amountRaw) || 0;
      return sum + amount;
    }, 0);
    
    // New orders this week
    const newThisWeek = ordersData.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= oneWeekAgo;
    }).length;
    
    return {
      activeOrders,
      totalRevenue,
      newThisWeek
    };
  };

  // ✅ Handle section navigation
  const handleSectionClick = async (section) => {
    setActiveSection(section);
    const user = auth.currentUser;
    
    if (user) {
      if (section === "products") {
        await fetchProducts(user);
      } else if (section === "orders") {
        await fetchOrders(user);
      } else if (section === "profile") {
        await fetchSellerInfo(user);
      }
    }
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Fetch all data on initial load
        await fetchSellerInfo(user);
        await fetchProducts(user);
        await fetchOrders(user);
      }
    });
    return () => unsub();
  }, []);

  // ✅ Add / Edit Product
  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedTitle = (form.title || "").trim();
    if (!trimmedTitle || !form.mainCategory || !form.subCategory || !form.stock) {
      setErrors((prev) => ({ ...prev, title: !trimmedTitle ? "Title is required" : prev.title }));
      if (!form.mainCategory) toast.error("Please select a main category");
      if (!form.subCategory) toast.error("Please select a subcategory");
      return;
    }

    if (trimmedTitle.length < 3) {
      setErrors((prev) => ({ ...prev, title: "Title must be at least 3 characters" }));
      return;
    }

    // Letters and spaces only
    if (!/^[A-Za-z\s]+$/.test(trimmedTitle)) {
      setErrors((prev) => ({ ...prev, title: "Title can contain letters and spaces only" }));
      return;
    }

    // Clear title error if valid
    if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));

    if (!selectedFile && !editingId) {
      toast.error("Please select an image");
      return;
    }

    // Validate variants
    for (let i = 0; i < form.variants.length; i++) {
      const variant = form.variants[i];
      if (!variant.weight || !variant.price) {
        toast.error(`Please fill in weight and price for variant ${i + 1}`);
        return;
      }
      
      const price = parseFloat(variant.price);
      if (isNaN(price) || price < 1 || price > 2000) {
        toast.error(`Price for variant ${i + 1} must be between ₹1 and ₹2,000`);
        return;
      }
    }

    try {
      setLoading(true);
      const token = await auth.currentUser.getIdToken();

      const url = editingId
        ? `http://localhost:5000/api/seller/products/${editingId}`
        : "http://localhost:5000/api/seller/products";

      const method = editingId ? "PUT" : "POST";

      const formData = new FormData();
      formData.append("title", trimmedTitle);
      formData.append("mainCategory", form.mainCategory);
      formData.append("subCategory", form.subCategory);
      formData.append("stock", form.stock);
      formData.append("variants", JSON.stringify(form.variants));

      if (selectedFile) {
        formData.append("image", selectedFile);
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        toast.success(editingId ? "Product updated!" : "Product added!");
        setForm({ title: "", mainCategory: "", subCategory: "", stock: "", price: "", variants: [{ weight: "", price: "" }], image: null });
        setSelectedFile(null);
        setCurrentImageUrl(null);
        setEditingId(null);
        fetchProducts(auth.currentUser);
      } else {
        let errorMessage = "Failed to save product";
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
          console.error("Server error:", error);
        } catch (parseError) {
          console.error("Could not parse error response:", parseError);
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        console.error("Response status:", response.status);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Toggle Product Status (Disable/Enable)
  const toggleProductStatus = async (id, isCurrentlyActive) => {
    const action = isCurrentlyActive ? "disable" : "enable";
    
    const confirmed = await confirm({
      title: `${action === 'disable' ? 'Disable' : 'Enable'} Product`,
      message: `Are you sure you want to ${action} this product? ${action === 'disable' ? 'It will be hidden from customers.' : 'It will be visible to customers again.'}`,
      type: action === 'disable' ? 'warning' : 'success',
      confirmText: action === 'disable' ? 'Disable' : 'Enable'
    });
    
    if (!confirmed) return;
    
    try {
      console.log("🔄 Toggling product:", id, "Currently active:", isCurrentlyActive);
      
      // Force refresh token to ensure it's valid
      const token = await auth.currentUser.getIdToken(true);
      
      const res = await fetch(`http://localhost:5000/api/seller/products/toggle-status/${id}`, {
        method: "PATCH",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });
      
      console.log("Response status:", res.status);
      
      if (res.status === 401) {
        toast.error("Your session expired. Please logout and login again.");
        return;
      }
      
      if (res.ok) {
        const data = await res.json();
        console.log("✅ Success:", data);
        toast.success(data.message);
        await fetchProducts(auth.currentUser);
      } else {
        const errorText = await res.text();
        console.error("❌ Error response:", errorText);
        toast.error(`Failed to ${action} product`);
      }
    } catch (err) {
      console.error("❌ Toggle status error:", err);
      
      if (err.message && err.message.includes('network')) {
        toast.error("Network error. Please check your internet connection.");
      } else {
        toast.error("Failed to update product status. Please try again.");
      }
    }
  };

  // ✅ Edit Product
  const startEdit = (p) => {
    setForm({ 
      title: p.title, 
      mainCategory: p.mainCategory || "",
      subCategory: p.subCategory || "", 
      stock: p.stock || "",
      price: p.price || "", 
      variants: p.variants || [{ weight: "", price: "" }],
      image: null
    });
    setSelectedFile(null);
    setEditingId(p._id);
    
    // Set current image URL for display
    if (p.image) {
      setCurrentImageUrl(`http://localhost:5000/uploads/${p.image}`);
    } else if (p.img) {
      setCurrentImageUrl(`/images/products/${p.img}`);
    } else {
      setCurrentImageUrl(null);
    }
  };

  // ✅ View Order Details
  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  // ✅ Close Order Modal
  const closeOrderModal = () => {
    setSelectedOrder(null);
    setShowOrderModal(false);
  };

  // ✅ Logout
  const handleLogout = async () => {
    setIsLoggingOut(true); // Allow navigation during logout
    await signOut(auth);
    // Clear browser history and navigate to login
    window.history.replaceState(null, '', '/login');
    navigate("/login", { replace: true });
  };

  return (
    <div style={{ 
      display: "flex", 
      minHeight: "100vh", 
      fontFamily: "Inter, sans-serif",
      background: "linear-gradient(135deg, #f5f1eb 0%, #e8dcc6 100%)"
    }}>
      {/* Sidebar */}
      <aside style={{ width: "260px", background: "#fff", borderRight: "1px solid #eee", padding: "20px" }}>
        <div style={{ marginBottom: "30px" }}>
          <h2 style={{ fontSize: "22px", marginBottom: "5px", color: "#5c4033" }}>Seller Dashboard</h2>
          {sellerInfo && (
            <div style={{ fontSize: "14px", color: "#666" }}>
              Welcome, {sellerInfo.name}
            </div>
          )}
        </div>
        
        <nav style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <button 
            onClick={() => handleSectionClick("dashboard")} 
            style={{...linkStyle, ...(activeSection === "dashboard" ? activeLinkStyle : {})}}
          >
            📊 Dashboard
          </button>
          <button 
            onClick={() => handleSectionClick("products")} 
            style={{...linkStyle, ...(activeSection === "products" ? activeLinkStyle : {})}}
          >
            📦 Products
          </button>
          <button 
            onClick={() => handleSectionClick("orders")} 
            style={{...linkStyle, ...(activeSection === "orders" ? activeLinkStyle : {})}}
          >
            🧾 Orders
          </button>
          <button 
            onClick={() => handleSectionClick("profile")} 
            style={{...linkStyle, ...(activeSection === "profile" ? activeLinkStyle : {})}}
          >
            👤 My Profile
          </button>
          <hr />
          <button onClick={handleLogout} style={{ ...linkStyle, color: "red", fontWeight: "bold" }}>
            🚪 Logout
          </button>
        </nav>
        
        {/* Help Section */}
        <div style={{ 
          marginTop: "30px", 
          padding: "15px", 
          background: "#f8f9fa", 
          borderRadius: "8px",
          border: "1px solid #eee"
        }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "15px", color: "#5c4033" }}>Need Help?</h4>
          <p style={{ fontSize: "13px", color: "#666", margin: "0 0 10px 0" }}>
            For assistance with your seller account, contact our support team.
          </p>
          <button style={{ 
            ...buttonPrimary, 
            background: "#5c4033", 
            fontSize: "13px",
            padding: "8px 12px"
          }}>
            Contact Support
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "24px", background: "#f8fafc" }}>
        
        {/* Dashboard Section */}
        {activeSection === "dashboard" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h1 style={{ margin: 0 }}>Dashboard Overview</h1>
              <div style={{ fontSize: "14px", color: "#666" }}>
                Last updated: {new Date().toLocaleDateString()}
              </div>
            </div>

            {/* Top Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "20px", marginBottom: "30px" }}>
              <div style={{...statCard, borderLeft: "4px solid #5c4033"}}>
                <div style={{fontSize: "13px", color: "#666", marginBottom: "8px"}}>📦 Total Products</div>
                <h3 style={{fontSize: "32px", margin: "0", color: "#5c4033"}}>{stats.totalProducts}</h3>
              </div>
              <div style={{...statCard, borderLeft: "4px solid #FF6B6B"}}>
                <div style={{fontSize: "13px", color: "#666", marginBottom: "8px"}}>🚀 Active Orders</div>
                <h3 style={{fontSize: "32px", margin: "0", color: "#FF6B6B"}}>{stats.activeOrders}</h3>
              </div>
              <div style={{...statCard, borderLeft: "4px solid #4ECDC4"}}>
                <div style={{fontSize: "13px", color: "#666", marginBottom: "8px"}}>💰 Total Revenue</div>
                <h3 style={{fontSize: "32px", margin: "0", color: "#4ECDC4"}}>₹{stats.totalRevenue.toLocaleString('en-IN')}</h3>
              </div>
              <div style={{...statCard, borderLeft: "4px solid #FFD166"}}>
                <div style={{fontSize: "13px", color: "#666", marginBottom: "8px"}}>📅 New This Week</div>
                <h3 style={{fontSize: "32px", margin: "0", color: "#FFD166"}}>{stats.newThisWeek}</h3>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", marginBottom: "30px" }}>
              <div style={{ background: "#fff", padding: "20px", borderRadius: "12px" }}>
                <h2 style={{ marginBottom: "20px", fontSize: "18px", color: "#5c4033" }}>Quick Actions</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "15px" }}>
                  <button 
                    onClick={() => handleSectionClick("products")}
                    style={{ ...quickActionCard, borderColor: "#5c4033" }}
                  >
                    <div style={{ fontSize: "24px", marginBottom: "10px" }}>📦</div>
                    <div style={{ fontWeight: "600", color: "#5c4033" }}>Add Product</div>
                  </button>
                  <button 
                    onClick={() => handleSectionClick("orders")}
                    style={{ ...quickActionCard, borderColor: "#4ECDC4" }}
                  >
                    <div style={{ fontSize: "24px", marginBottom: "10px" }}>🧾</div>
                    <div style={{ fontWeight: "600", color: "#4ECDC4" }}>View Orders</div>
                  </button>
                  <button 
                    onClick={() => handleSectionClick("profile")}
                    style={{ ...quickActionCard, borderColor: "#FF6B6B" }}
                  >
                    <div style={{ fontSize: "24px", marginBottom: "10px" }}>👤</div>
                    <div style={{ fontWeight: "600", color: "#FF6B6B" }}>My Profile</div>
                  </button>
                </div>
              </div>

              <div style={{ background: "#fff", padding: "20px", borderRadius: "12px" }}>
                <h2 style={{ marginBottom: "20px", fontSize: "18px", color: "#5c4033" }}>Recent Activity</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  <div style={{ display: "flex", alignItems: "center", padding: "10px", background: "#f8f9fa", borderRadius: "8px" }}>
                    <div style={{ fontSize: "20px", marginRight: "10px" }}>📦</div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "500" }}>New product added</div>
                      <div style={{ fontSize: "12px", color: "#666" }}>2 hours ago</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", padding: "10px", background: "#f8f9fa", borderRadius: "8px" }}>
                    <div style={{ fontSize: "20px", marginRight: "10px" }}>🧾</div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "500" }}>Order received</div>
                      <div style={{ fontSize: "12px", color: "#666" }}>5 hours ago</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Getting Started Guide */}
            <div style={{ background: "#fff", padding: "20px", borderRadius: "12px" }}>
              <h2 style={{ marginBottom: "20px", fontSize: "18px", color: "#5c4033" }}>Getting Started Guide</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "20px" }}>
                <div style={{ padding: "15px", border: "1px solid #eee", borderRadius: "8px" }}>
                  <div style={{ fontSize: "24px", marginBottom: "10px" }}>1️⃣</div>
                  <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>Add Your Products</h3>
                  <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
                    Upload your products with images, descriptions, and pricing.
                  </p>
                </div>
                <div style={{ padding: "15px", border: "1px solid #eee", borderRadius: "8px" }}>
                  <div style={{ fontSize: "24px", marginBottom: "10px" }}>2️⃣</div>
                  <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>Manage Orders</h3>
                  <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
                    View and fulfill customer orders efficiently.
                  </p>
                </div>
                <div style={{ padding: "15px", border: "1px solid #eee", borderRadius: "8px" }}>
                  <div style={{ fontSize: "24px", marginBottom: "10px" }}>3️⃣</div>
                  <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>Track Performance</h3>
                  <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
                    Monitor your sales and revenue through analytics.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Products Section */}
        {activeSection === "products" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h1 style={{ margin: 0 }}>Product Management</h1>
              <button 
                onClick={() => {
                  setEditingId(null);
                  setForm({ title: "", mainCategory: "", subCategory: "", stock: "", price: "", variants: [{ weight: "", price: "" }], image: null });
                  setSelectedFile(null);
                  setCurrentImageUrl(null);
                }}
                style={{ ...buttonPrimary, background: "#5c4033" }}
              >
                + Add New Product
              </button>
            </div>

            {/* Add/Edit Product Form */}
            <section style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "30px" }}>
              <h2 style={{ marginBottom: "20px" }}>{editingId ? "Edit Product" : "Add New Product"}</h2>
              <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    Product Title *
                  </label>
                  <input 
                    placeholder="Enter product title" 
                    value={form.title} 
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm({ ...form, title: value });
                      // Comprehensive title validation
                      const t = (value || '').trim();
                      if (!t) {
                        setErrors((prev) => ({ ...prev, title: "Title is required" }));
                      } else if (t.length < 3) {
                        setErrors((prev) => ({ ...prev, title: "Title must be at least 3 characters" }));
                      } else if (t.length > 100) {
                        setErrors((prev) => ({ ...prev, title: "Title must not exceed 100 characters" }));
                      } else if (!/^[A-Za-z\s]+$/.test(t)) {
                        setErrors((prev) => ({ ...prev, title: "Title can contain letters and spaces only" }));
                      } else {
                        // Check for valid words (not random characters)
                        const words = t.split(/\s+/).filter(w => w.length > 0);
                        if (words.length === 0) {
                          setErrors((prev) => ({ ...prev, title: "Title must contain at least one word" }));
                        } else {
                          // Check each word for validity
                          let hasInvalidWord = false;
                          for (const word of words) {
                            if (word.length < 2) {
                              hasInvalidWord = true;
                              break;
                            }
                            if (/(.)\1{3,}/.test(word)) {
                              hasInvalidWord = true;
                              break;
                            }
                            if (!/[aeiouAEIOU]/.test(word)) {
                              hasInvalidWord = true;
                              break;
                            }
                            if (/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]{5,}/.test(word)) {
                              hasInvalidWord = true;
                              break;
                            }
                          }
                          if (hasInvalidWord) {
                            setErrors((prev) => ({ ...prev, title: "Title must contain valid words (e.g., 'Homemade Pickle', not random characters)" }));
                          } else {
                            setErrors((prev) => ({ ...prev, title: "" }));
                          }
                        }
                      }
                    }} 
                    style={inputStyle}
                    required
                  />
                  {errors.title && (
                    <div style={{ color: "#d9534f", fontSize: "12px", marginTop: "6px" }}>{errors.title}</div>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    Main Category *
                  </label>
                  <select 
                    value={form.mainCategory} 
                    onChange={(e) => setForm({ ...form, mainCategory: e.target.value, subCategory: "" })} 
                    style={inputStyle}
                    required
                  >
                    <option value="">Select Main Category</option>
                    {Object.keys(MAIN_CATEGORIES).map((mainCat) => (
                      <option key={mainCat} value={mainCat}>
                        {mainCat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    Sub Category *
                  </label>
                  <select 
                    value={form.subCategory} 
                    onChange={(e) => setForm({ ...form, subCategory: e.target.value })} 
                    style={inputStyle}
                    required
                    disabled={!form.mainCategory}
                  >
                    <option value="">Select Sub Category</option>
                    {form.mainCategory && MAIN_CATEGORIES[form.mainCategory]?.subcategories.map((subCat) => (
                      <option key={subCat} value={subCat}>
                        {subCat}
                      </option>
                    ))}
                  </select>
                  <p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
                    {!form.mainCategory ? "Select a main category first" : "Select the most appropriate subcategory for your product"}
                  </p>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    Stock Available *
                  </label>
                  <input 
                    type="number"
                    min="0"
                    placeholder="Enter stock quantity" 
                    value={form.stock} 
                    onChange={(e) => setForm({ ...form, stock: e.target.value })} 
                    style={inputStyle}
                    required
                  />
                </div>

                {/* Variants */}
                <div>
                  <h4 style={{ marginBottom: "10px", fontWeight: "600" }}>Product Variants</h4>
                  <p style={{ fontSize: "12px", color: "#666", marginBottom: "15px" }}>
                    💡 Add different variants of your product {
                      (form.subCategory === "Snacks" || form.subCategory === "Cakes") 
                        ? "(e.g., 100g for ₹99, 500g for ₹399, 1kg for ₹750)" 
                        : form.mainCategory === "Food" 
                        ? "(e.g., 50g for ₹49, 100g for ₹89)" 
                        : form.mainCategory === "Crafts"
                        ? "(e.g., Small for ₹199, Medium for ₹299, Large for ₹499)"
                        : "(e.g., Small for ₹199, Medium for ₹299, Large for ₹499)"
                    }. Price must be between ₹1 and ₹2,000.
                  </p>
                  {form.variants.map((v, i) => (
                    <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                      <input
                        type="text"
                        placeholder={
                          (form.subCategory === "Snacks" || form.subCategory === "Cakes")
                            ? "Weight (e.g. 100g, 500g, 1kg)"
                            : form.mainCategory === "Food" 
                            ? "Weight (e.g. 50g, 100g)" 
                            : form.mainCategory === "Crafts"
                            ? "Size/Variant (e.g. Small, Medium, Large)"
                            : "Variant (e.g. Small, Medium, Large)"
                        }
                        value={v.weight}
                        onChange={(e) => {
                          const updated = [...form.variants];
                          updated[i].weight = e.target.value;
                          setForm({ ...form, variants: updated });
                        }}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <input
                        type="number"
                        placeholder="Price (₹)"
                        min="1"
                        max="2000"
                        step="0.01"
                        value={v.price}
                        onChange={(e) => {
                          const updated = [...form.variants];
                          updated[i].price = e.target.value;
                          setForm({ ...form, variants: updated });
                        }}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setForm({
                            ...form,
                            variants: form.variants.filter((_, idx) => idx !== i),
                          });
                        }}
                        style={{ ...buttonPrimary, background: "#dc3545", padding: "8px 12px" }}
                      >
                        X
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setForm({ ...form, variants: [...form.variants, { weight: "", price: "" }] })
                    }
                    style={{ ...buttonPrimary, background: "#5c4033", padding: "8px 16px" }}
                  >
                    + Add Variant
                  </button>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    Product Image {!editingId ? "*" : ""}
                  </label>
                  
                  {/* Current Image Display (when editing) */}
                  {editingId && currentImageUrl && (
                    <div style={{ marginBottom: "15px" }}>
                      <p style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>Current Image:</p>
                      <img 
                        src={currentImageUrl} 
                        alt="Current product" 
                        style={{ 
                          maxHeight: "150px", 
                          maxWidth: "200px", 
                          objectFit: "cover", 
                          borderRadius: "6px",
                          border: "1px solid #ddd"
                        }} 
                      />
                    </div>
                  )}
                  
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        // Validate file type only
                        if (!file.type.startsWith('image/')) {
                          toast.error("Please select only image files (JPG, PNG, GIF, etc.)");
                          e.target.value = '';
                          return;
                        }
                        setSelectedFile(file);
                        setCurrentImageUrl(null); // Clear current image when new one is selected
                        toast.success("Image selected successfully!");
                      }
                    }} 
                    style={{ ...inputStyle, padding: "10px", border: "1px dashed #ccc" }} 
                    required={!editingId}
                  />
                  <p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
                    {editingId ? "Select a new image to replace the current one (optional)" : "Only image files allowed (JPG, PNG, GIF, etc.)"}
                  </p>
                </div>
                <div>
                  <button disabled={loading} style={buttonPrimary}>
                    {loading ? "Saving..." : editingId ? "Update Product" : "Add Product"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => { setEditingId(null); setForm({ title: "", mainCategory: "", subCategory: "", stock: "", price: "", variants: [{ weight: "", price: "" }], image: null }); setSelectedFile(null); setCurrentImageUrl(null); }}
                      style={buttonSecondary}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </section>

            {/* Product List */}
            <section>
              <h2 style={{ marginBottom: "20px" }}>Products ({products.length})</h2>
              
              {/* Category Filter */}
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ marginBottom: "10px", fontSize: "16px", color: "#5c4033" }}>Filter by Category:</h3>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {["All", "Snacks", "Cakes", "Pickles", "Powders", "Spices", "Decor", "Cards", "Hangings"].map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "20px",
                        border: "2px solid #5c4033",
                        background: selectedCategory === category ? "#5c4033" : "white",
                        color: selectedCategory === category ? "white" : "#5c4033",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                        transition: "all 0.3s ease"
                      }}
                      onMouseEnter={(e) => {
                        if (selectedCategory !== category) {
                          e.target.style.background = "#f5f5f5";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedCategory !== category) {
                          e.target.style.background = "white";
                        }
                      }}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: "20px" }}>
                {products.length === 0 ? (
                  <p>No products found. Add your first product!</p>
                ) : (
                  products
                    .filter((p) => {
                      // Exclude test products
                      if (p.title && p.title.toLowerCase().includes("test product")) return false;
                      if (selectedCategory === "All") return true;
                      // Check both old category field and new subCategory field
                      return p.category === selectedCategory || p.subCategory === selectedCategory;
                    })
                    .map((p) => (
                    <div key={p._id} style={{ 
                      background: "#fff", 
                      padding: "16px", 
                      borderRadius: "8px", 
                      textAlign: "center",
                      opacity: p.isActive === false ? 0.6 : 1,
                      border: p.isActive === false ? "2px solid #dc3545" : "1px solid #eee",
                      position: "relative"
                    }}>
                      {/* Disabled Badge */}
                      {p.isActive === false && (
                        <div style={{
                          position: "absolute",
                          top: "8px",
                          right: "8px",
                          background: "#dc3545",
                          color: "white",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          fontWeight: "bold"
                        }}>
                          DISABLED
                        </div>
                      )}
                      
                      {p.image ? (
  // For new products uploaded via multer
  <img
    src={`http://localhost:5000/uploads/${p.image}`}
    alt={p.title}
    style={{ maxHeight: "120px", width: "100%", objectFit: "cover", borderRadius: "6px" }}
  />
) : p.img ? (
  // For old products already in DB
  <img
    src={`/images/products/${p.img}`}
    alt={p.title}
    style={{ maxHeight: "120px", width: "100%", objectFit: "cover", borderRadius: "6px" }}
  />
) : (
  // If no image at all
  <div
    style={{
      height: "120px",
      background: "#f0f0f0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "6px",
    }}
  >
    No Image
  </div>
)}
                      <h3>{p.title}</h3>
                      <p style={{ fontSize: "14px", color: "#666" }}>
                        Category: {p.mainCategory && p.subCategory 
                          ? `${p.mainCategory} > ${p.subCategory}`
                          : p.subCategory || p.category || "General"}
                      </p>
                      <p style={{ fontSize: "14px", color: "#5c4033", fontWeight: "600" }}>Stock: {p.stock || "0"}</p>
                      {p.variants && p.variants.length > 0 && (
                        <div style={{ marginTop: "8px" }}>
                          <h4 style={{ fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Variants:</h4>
                          {p.variants.map((v, idx) => (
                            <p key={idx} style={{ fontSize: "12px", color: "#555" }}>
                              {v.weight} — ₹{v.price}
                            </p>
                          ))}
                        </div>
                      )}
                      
                      <div style={{ marginTop: "10px", display: "flex", gap: "10px", justifyContent: "center" }}>
                        <button onClick={() => startEdit(p)} style={{ ...buttonPrimary, background: "#543737" }}>Edit</button>
                        <button 
                          onClick={() => toggleProductStatus(p._id, p.isActive !== false)} 
                          style={{ 
                            ...buttonPrimary, 
                            background: p.isActive === false ? "#28a745" : "#ffc107",
                            color: p.isActive === false ? "#fff" : "#000"
                          }}
                        >
                          {p.isActive === false ? "Enable" : "Disable"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}

        {/* Orders Section */}
        {activeSection === "orders" && (
          <>
            <h1 style={{ marginBottom: "20px" }}>Order Management</h1>
            
            <div style={{ background: "#fff", padding: "24px", borderRadius: "12px" }}>
              <h2 style={{ marginBottom: "20px" }}>All Orders ({orders.length})</h2>
              
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #eee", background: "#faf7f2" }}>
                      <th style={{ padding: "14px", textAlign: "left", fontSize: "13px", letterSpacing: ".02em", color: "#6b4f3a" }}>Order</th>
                      <th style={{ padding: "14px", textAlign: "left", fontSize: "13px", letterSpacing: ".02em", color: "#6b4f3a" }}>Customer</th>
                      <th style={{ padding: "14px", textAlign: "left", fontSize: "13px", letterSpacing: ".02em", color: "#6b4f3a" }}>Total</th>
                      <th style={{ padding: "14px", textAlign: "left", fontSize: "13px", letterSpacing: ".02em", color: "#6b4f3a" }}>Status</th>
                      <th style={{ padding: "14px", textAlign: "left", fontSize: "13px", letterSpacing: ".02em", color: "#6b4f3a" }}>Payment/Refund</th>
                      <th style={{ padding: "14px", textAlign: "left", fontSize: "13px", letterSpacing: ".02em", color: "#6b4f3a" }}>Date</th>
                      <th style={{ padding: "14px", textAlign: "left", fontSize: "13px", letterSpacing: ".02em", color: "#6b4f3a" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ padding: "40px", textAlign: "center", color: "#666" }}>
                          <div style={{ fontSize: "18px", marginBottom: "10px" }}>📦</div>
                          <div style={{ fontSize: "16px", fontWeight: "500", marginBottom: "5px" }}>
                            No orders yet
                          </div>
                          <div style={{ fontSize: "14px", color: "#999" }}>
                            Orders will appear here once customers start placing them
                          </div>
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => {
                        const firstItemTitle = order?.items?.[0]?.title 
                          || order?.items?.[0]?.productId?.title 
                          || order?.productTitle 
                          || "Order";
                        const additionalCount = (order?.items?.length || 0) > 1 ? ` +${order.items.length - 1} more` : "";
                        const customerName = order?.customer || order?.buyerDetails?.name || order?.userName || "-";
                        const totalAmount = order?.finalAmount ?? order?.total ?? order?.totalAmount ?? 0;
                        const orderStatus = order?.orderStatus || order?.status || "pending";
                        const createdDate = order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : (order?.date || "-");
                        return (
                          <tr key={order.id || order._id} style={{ borderBottom: "1px solid #f1e9e1" }}>
                            <td style={{ padding: "14px" }}>
                              <div style={{ fontWeight: 600, color: "#3f2d23" }}>{firstItemTitle}<span style={{ color: "#8c6f5a" }}>{additionalCount}</span></div>
                            </td>
                            <td style={{ padding: "14px", color: "#4b3a2f" }}>{customerName}</td>
                            <td style={{ padding: "14px", fontWeight: 700, color: "#5c4033" }}>₹{totalAmount}</td>
                            <td style={{ padding: "14px" }}>
                              <span style={{
                                padding: "6px 10px",
                                borderRadius: "999px",
                                fontSize: "12px",
                                backgroundColor: orderStatus === "completed" || orderStatus === "delivered" ? "#e6f4ea" : 
                                                 orderStatus === "pending" ? "#fff7e6" : "#e6f0ff",
                                color: orderStatus === "completed" || orderStatus === "delivered" ? "#1e7e34" : 
                                       orderStatus === "pending" ? "#a87300" : "#21409a",
                                fontWeight: 600
                              }}>
                                {orderStatus}
                              </span>
                            </td>
                            {/* Payment/Refund Column */}
                            <td style={{ padding: "14px" }}>
                              {order.paymentStatus === "refunded" && order.refundDetails ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                  <span style={{
                                    padding: "4px 8px",
                                    borderRadius: "6px",
                                    fontSize: "11px",
                                    backgroundColor: order.refundDetails.refundStatus === "completed" ? "var(--accent-soft, #f3e7dc)" : 
                                                     order.refundDetails.refundStatus === "pending" ? "#fff3cd" : "#d1ecf1",
                                    color: order.refundDetails.refundStatus === "completed" ? "var(--brand, #8b5e34)" : 
                                           order.refundDetails.refundStatus === "pending" ? "#856404" : "#0c5460",
                                    fontWeight: 600
                                  }}>
                                    {order.refundDetails.refundStatus === "completed" ? "✅ Refunded" :
                                     order.refundDetails.refundStatus === "pending" ? "⏳ Pending" :
                                     "🔄 Processing"}
                                  </span>
                                  <span style={{ fontSize: "10px", color: "#666" }}>
                                    ₹{order.refundDetails.refundAmount}
                                  </span>
                                </div>
                              ) : (
                                <span style={{
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  backgroundColor: order.paymentStatus === "paid" ? "var(--accent-soft, #f3e7dc)" : "#fff7e6",
                                  color: order.paymentStatus === "paid" ? "var(--brand, #8b5e34)" : "#856404",
                                  fontWeight: 600
                                }}>
                                  {order.paymentStatus === "paid" ? "💳 Paid" : "💰 COD"}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "14px", color: "#6f5b4a" }}>{createdDate}</td>
                            <td style={{ padding: "14px" }}>
                              <button 
                                onClick={() => viewOrderDetails(order)}
                                style={{ ...buttonPrimary, padding: "8px 14px", fontSize: "12px", borderRadius: "8px", boxShadow: "0 2px 6px rgba(92,64,51,0.15)" }}
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Profile Section */}
        {activeSection === "profile" && (
          <>
            <h1 style={{ marginBottom: "20px" }}>My Profile</h1>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div style={{ background: "#fff", padding: "24px", borderRadius: "12px" }}>
                <h2 style={{ marginBottom: "20px" }}>Seller Information</h2>
                {sellerInfo ? (
                  <div style={{ display: "grid", gap: "15px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "14px", color: "#666", marginBottom: "5px" }}>Name</label>
                      <div style={{ padding: "12px", background: "#f8f9fa", borderRadius: "6px" }}>
                        {sellerInfo.name}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "14px", color: "#666", marginBottom: "5px" }}>Email</label>
                      <div style={{ padding: "12px", background: "#f8f9fa", borderRadius: "6px" }}>
                        {sellerInfo.email}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "14px", color: "#666", marginBottom: "5px" }}>Role</label>
                      <div style={{ padding: "12px", background: "#f8f9fa", borderRadius: "6px" }}>
                        <span style={{
                          padding: "6px 10px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          backgroundColor: "#5c4033",
                          color: "white",
                          fontWeight: 600
                        }}>
                          {sellerInfo.role}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "14px", color: "#666", marginBottom: "5px" }}>Member Since</label>
                      <div style={{ padding: "12px", background: "#f8f9fa", borderRadius: "6px" }}>
                        {new Date(sellerInfo.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p>Loading profile information...</p>
                )}
              </div>
              
              <div style={{ background: "#fff", padding: "24px", borderRadius: "12px" }}>
                <h2 style={{ marginBottom: "20px" }}>Account Settings</h2>
                <div style={{ display: "grid", gap: "15px" }}>
                  <button style={{ ...buttonPrimary, background: "#5c4033" }}>
                    Change Password
                  </button>
                  <button style={{ ...buttonPrimary, background: "#dc3545" }}>
                    Deactivate Account
                  </button>
                  <div style={{ 
                    padding: "15px", 
                    background: "#fff8e6", 
                    border: "1px solid #ffd54f", 
                    borderRadius: "6px",
                    marginTop: "20px"
                  }}>
                    <h4 style={{ margin: "0 0 10px 0", color: "#5c4033" }}>Need Help?</h4>
                    <p style={{ fontSize: "14px", color: "#666", margin: "0 0 15px 0" }}>
                      If you need assistance with your seller account, our support team is ready to help.
                    </p>
                    <button style={{ ...buttonPrimary, background: "#5c4033", fontSize: "14px" }}>
                      Contact Support
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
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
            maxWidth: "800px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            position: "relative"
          }}>
            {/* Close Button */}
            <button
              onClick={closeOrderModal}
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

            <h2 style={{ marginBottom: "20px", color: "#5c4033" }}>Order Details</h2>
            
            {/* Order Information */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <div>
                <h3 style={{ marginBottom: "10px", color: "#5c4033" }}>Order Information</h3>
                <p><strong>Order ID:</strong> #{selectedOrder.orderNumber || selectedOrder.id || selectedOrder._id}</p>
                <p><strong>Date:</strong> {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : (selectedOrder.date || "-")}</p>
                <p><strong>Status:</strong> 
                  <span style={{
                    padding: "6px 10px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    marginLeft: "8px",
                    backgroundColor: (selectedOrder.orderStatus || selectedOrder.status) === "completed" || (selectedOrder.orderStatus || selectedOrder.status) === "delivered" ? "#e6f4ea" : 
                                     (selectedOrder.orderStatus || selectedOrder.status) === "pending" ? "#fff7e6" : "#e6f0ff",
                    color: (selectedOrder.orderStatus || selectedOrder.status) === "completed" || (selectedOrder.orderStatus || selectedOrder.status) === "delivered" ? "#1e7e34" : 
                           (selectedOrder.orderStatus || selectedOrder.status) === "pending" ? "#a87300" : "#21409a",
                    fontWeight: 600
                  }}>
                    {selectedOrder.orderStatus || selectedOrder.status}
                  </span>
                </p>
                <p><strong>Payment Status:</strong> {selectedOrder.paymentStatus || '-'}</p>
                <p><strong>Payment Method:</strong> {(selectedOrder.paymentMethod || '').toString().toUpperCase() || '-'}</p>
                <p><strong>Total Amount:</strong> ₹{selectedOrder.finalAmount ?? selectedOrder.total ?? selectedOrder.totalAmount ?? 0}</p>
              </div>

              <div>
                <h3 style={{ marginBottom: "10px", color: "#5c4033" }}>Customer Information</h3>
                <p><strong>Name:</strong> {selectedOrder.customer || selectedOrder?.buyerDetails?.name || '-'}</p>
                <p><strong>Email:</strong> {selectedOrder.email || '-'}</p>
                <p><strong>Phone:</strong> {selectedOrder.phone || selectedOrder?.buyerDetails?.phone || '-'}</p>
                {(selectedOrder.address || selectedOrder?.buyerDetails?.address) && (
                  <div>
                    <p><strong>Address:</strong></p>
                    <div style={{ marginLeft: "10px", fontSize: "14px", color: "#666" }}>
                      {(selectedOrder.address?.street || selectedOrder?.buyerDetails?.address?.street) && <p>{selectedOrder.address?.street || selectedOrder?.buyerDetails?.address?.street}</p>}
                      {(selectedOrder.address?.city || selectedOrder?.buyerDetails?.address?.city) && <p>{selectedOrder.address?.city || selectedOrder?.buyerDetails?.address?.city}</p>}
                      {(selectedOrder.address?.state || selectedOrder?.buyerDetails?.address?.state) && <p>{selectedOrder.address?.state || selectedOrder?.buyerDetails?.address?.state}</p>}
                      {(selectedOrder.address?.pincode || selectedOrder?.buyerDetails?.address?.pincode) && <p>PIN: {selectedOrder.address?.pincode || selectedOrder?.buyerDetails?.address?.pincode}</p>}
                      {(selectedOrder.address?.landmark || selectedOrder?.buyerDetails?.address?.landmark) && <p>Landmark: {selectedOrder.address?.landmark || selectedOrder?.buyerDetails?.address?.landmark}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h3 style={{ marginBottom: "15px", color: "#5c4033" }}>Order Items</h3>
              <div style={{ display: "grid", gap: "15px" }}>
                {selectedOrder.items && selectedOrder.items.map((item, index) => (
                  <div key={index} style={{
                    border: "1px solid #eee",
                    borderRadius: "8px",
                    padding: "15px",
                    display: "flex",
                    gap: "15px",
                    alignItems: "center"
                  }}>
                    {/* Product Image */}
                    <div style={{ flexShrink: 0 }}>
                      {item.image ? (
                        <img
                          src={item.image.startsWith('http') ? item.image : `http://localhost:5000/uploads/${item.image}`}
                          alt={item.title}
                          style={{
                            width: "80px",
                            height: "80px",
                            objectFit: "cover",
                            borderRadius: "6px",
                            border: "1px solid #ddd"
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div style={{
                        width: "80px",
                        height: "80px",
                        backgroundColor: "#f0f0f0",
                        display: "none",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "6px",
                        border: "1px solid #ddd",
                        fontSize: "12px",
                        color: "#666"
                      }}>
                        No Image
                      </div>
                    </div>

                    {/* Product Details */}
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: "0 0 8px 0", color: "#5c4033" }}>{item.title || item?.productId?.title || 'Product'}</h4>
                      <p style={{ margin: "4px 0", fontSize: "14px", color: "#666" }}>
                        <strong>Quantity:</strong> {item.quantity}
                      </p>
                      {item.variant && (
                        <p style={{ margin: "4px 0", fontSize: "14px", color: "#666" }}>
                          <strong>Variant:</strong> {item.variant.weight} - ₹{item.variant.price}
                        </p>
                      )}
                      <p style={{ margin: "4px 0", fontSize: "14px", color: "#5c4033", fontWeight: "600" }}>
                        <strong>Total:</strong> ₹{(item.variant?.price || 0) * item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {selectedOrder.notes && (
              <div style={{ marginTop: "20px" }}>
                <h3 style={{ marginBottom: "10px", color: "#5c4033" }}>Notes</h3>
                <p style={{ 
                  padding: "10px", 
                  backgroundColor: "#f8f9fa", 
                  borderRadius: "6px", 
                  border: "1px solid #e9ecef",
                  fontSize: "14px"
                }}>
                  {selectedOrder.notes}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={closeOrderModal}
                style={{ ...buttonSecondary }}
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

/* 🎨 Styles */
const statCard = {
  background: "#fff",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  fontSize: "14px",
  color: "#444",
};

const inputStyle = {
  padding: "12px 16px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  outline: "none",
  fontSize: "14px",
  width: "100%"
};

const buttonPrimary = {
  background: "#5c4033",
  color: "#fff",
  border: "none",
  padding: "10px 20px",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "14px",
};

const buttonSecondary = {
  background: "#ccc",
  color: "#333",
  border: "none",
  padding: "10px 20px",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "14px",
  marginLeft: "10px",
};

const linkStyle = {
  backgroundColor: "transparent",
  border: "none",
  textAlign: "left",
  padding: "12px 16px",
  cursor: "pointer",
  color: "#444",
  fontSize: "15px",
  borderRadius: "6px",
  transition: "all 0.2s ease",
  display: "flex",
  alignItems: "center"
};

const activeLinkStyle = {
  backgroundColor: "#f0f0f0",
  fontWeight: "bold",
  color: "#5c4033",
};

const quickActionCard = {
  padding: "20px",
  border: "1px solid #eee",
  borderRadius: "8px",
  textAlign: "center",
  cursor: "pointer",
  transition: "all 0.2s ease",
  background: "#fff"
};