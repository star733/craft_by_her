import React, { useEffect, useState, useRef } from "react";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { signOut } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { useConfirm } from "../context/ConfirmContext";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm } = useConfirm();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    activeOrders: 0,
    totalRevenue: 0,
    grossRevenue: 0,
    deliveryCommission: 0,
    newThisWeek: 0
  });
  const [form, setForm] = useState({
    title: "",
    category: "",
    stock: "",
    price: "",
    variants: [{ weight: "", price: "" }],
    image: null,
  });
  const [errors, setErrors] = useState({ title: "" });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Delivery Management State
  const [deliveryAgents, setDeliveryAgents] = useState([]);
  const [deliveryForm, setDeliveryForm] = useState({
    name: "",
    phone: "",
    email: "",
    username: "",
    password: "",
    address: {
      street: "",
      city: "",
      state: "",
      pincode: ""
    },
    vehicleInfo: {
      type: "",
      number: ""
    }
  });
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [editingDeliveryId, setEditingDeliveryId] = useState(null);
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [availableAgents, setAvailableAgents] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrderForAssignment, setSelectedOrderForAssignment] = useState(null);

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
        // Push the admin dashboard back to history
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

  // ✅ Fetch products
  const fetchProducts = async (user) => {
    try {
      await user.reload();
      const token = await user.getIdToken(true);
      const res = await fetch("http://localhost:5000/api/admin/products", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        toast.error("Access denied: You are not an admin");
        return;
      }

      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch products error:", err);
    }
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("category", form.category);
      fd.append("stock", form.stock);
      fd.append("variants", JSON.stringify(form.variants));
      if (form.image) fd.append("image", form.image);

      const res = await fetch("http://localhost:5000/api/admin/products", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (!res.ok) throw new Error("Failed to save product");

      toast.success("Product added!");
      setForm({ title: "", category: "", stock: "", variants: [{ weight: "", price: "" }], image: null });
      fetchProducts(user);
    } catch (err) {
      console.error(err);
      toast.error("Error saving product");
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
    
    console.log('=== REVENUE CALCULATION (CASH FLOW LOGIC) ===');
    
    // Step 1: Calculate revenue from PAID orders (money received from customers)
    const paidOrders = ordersData.filter(order => 
      order.paymentStatus === 'paid' && order.orderStatus !== 'cancelled'
    );
    
    const grossRevenue = paidOrders.reduce((sum, order) => {
      const amountRaw = (order.finalAmount ?? order.total ?? order.totalAmount ?? 0);
      const amount = Number(amountRaw) || 0;
      return sum + amount;
    }, 0);
    
    console.log('📥 MONEY IN: Paid orders count:', paidOrders.length);
    console.log('📥 MONEY IN: Gross revenue (from paid orders):', grossRevenue);
    
    // Step 2: Calculate delivery commission from DELIVERED orders (money paid to delivery boys)
    const deliveredOrders = ordersData.filter(order => order.orderStatus === 'delivered');
    const deliveryCommission = deliveredOrders.length * 50;
    
    console.log('📤 MONEY OUT: Delivered orders count:', deliveredOrders.length);
    console.log('📤 MONEY OUT: Delivery commission (₹50 × ' + deliveredOrders.length + '):', deliveryCommission);
    
    // Step 3: Net revenue = Money received - Money paid to delivery boys
    const netRevenue = grossRevenue - deliveryCommission;
    
    console.log('💰 NET REVENUE:', netRevenue);
    console.log('Formula: ₹' + grossRevenue + ' (paid) - ₹' + deliveryCommission + ' (delivery commission) = ₹' + netRevenue);
    
    // New orders this week
    const newThisWeek = ordersData.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= oneWeekAgo;
    }).length;
    
    return {
      activeOrders,
      totalRevenue: netRevenue, // Admin's net revenue after delivery commission
      grossRevenue: grossRevenue, // Total from paid orders (money received)
      deliveryCommission: deliveryCommission, // Total paid to delivery boys
      newThisWeek
    };
  };

  // ✅ Fetch orders (placeholder - you'll need to implement this endpoint)
  const fetchOrders = async (user) => {
    try {
      await user.reload();
      const token = await user.getIdToken(true);
      const res = await fetch("http://localhost:5000/api/admin/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        toast.error("Access denied: You are not an admin");
        return;
      }

      const data = await res.json();
      console.log("=== FETCHED ORDERS ===");
      console.log("Orders data:", data);
      console.log("Sample order deliveryInfo:", data[0]?.deliveryInfo);
      
      const ordersArray = Array.isArray(data) ? data : [];
      setOrders(ordersArray);
      
      // Calculate and set stats
      const calculatedStats = calculateStats(ordersArray);
      setStats(calculatedStats);
    } catch (err) {
      console.error("Fetch orders error:", err);
      setOrders([]);
      setStats({ activeOrders: 0, totalRevenue: 0, grossRevenue: 0, deliveryCommission: 0, newThisWeek: 0 });
    }
  };

  const fetchDeliveryAgents = async (user, filterStatus = "all") => {
    try {
      await user.reload();
      const token = await user.getIdToken(true);
      const res = await fetch(`http://localhost:5000/api/delivery?status=${filterStatus}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        toast.error("Access denied: You are not an admin");
        return;
      }

      const data = await res.json();
      if (data.success) {
        setDeliveryAgents(data.agents || []);
      } else {
        console.error("Fetch delivery agents error:", data.error);
        setDeliveryAgents([]);
      }
    } catch (err) {
      console.error("Fetch delivery agents error:", err);
      setDeliveryAgents([]);
    }
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
      } else if (section === "delivery") {
        await fetchDeliveryAgents(user, deliveryFilter);
      }
    }
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Fetch both products and orders on initial load
        await fetchProducts(user);
        await fetchOrders(user); // This will populate the stats
      }
    });
    return () => unsub();
  }, []);

  // ✅ Add / Edit Product
  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedTitle = (form.title || "").trim();
    if (!trimmedTitle || !form.category || !form.stock) {
      setErrors((prev) => ({ ...prev, title: !trimmedTitle ? "Title is required" : prev.title }));
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
        ? `http://localhost:5000/api/admin/products/${editingId}`
        : "http://localhost:5000/api/admin/products";

      const method = editingId ? "PUT" : "POST";

      const formData = new FormData();
      formData.append("title", trimmedTitle);
      formData.append("category", form.category);
      formData.append("stock", form.stock);
      formData.append("variants", JSON.stringify(form.variants));

      if (selectedFile) {
        formData.append("image", selectedFile);
      }

      // Debug logging
      console.log("Form data being sent:");
      console.log("Title:", form.title);
      console.log("Variants:", form.variants);
      console.log("Selected file:", selectedFile?.name);

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        toast.success(editingId ? "Product updated!" : "Product added!");
        setForm({ title: "", category: "", stock: "", price: "", variants: [{ weight: "", price: "" }], image: null });
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
      
      const res = await fetch(`http://localhost:5000/api/admin/products/toggle-status/${id}`, {
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
      category: p.category || "", 
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

  // Delivery Management Functions
  const handleDeliverySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("=== SUBMITTING DELIVERY FORM ===");
      console.log("Form data:", deliveryForm);
      
      const user = auth.currentUser;
      const token = await user.getIdToken();

      const url = editingDeliveryId 
        ? `http://localhost:5000/api/delivery/${editingDeliveryId}`
        : "http://localhost:5000/api/delivery";
      
      const method = editingDeliveryId ? "PUT" : "POST";

      console.log("Request URL:", url);
      console.log("Request method:", method);

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(deliveryForm),
      });

      console.log("Response status:", res.status);
      const data = await res.json();
      console.log("Response data:", data);

      if (res.ok && data.success) {
        toast.success(editingDeliveryId ? "Delivery agent updated!" : "Delivery agent created!");
        setShowDeliveryModal(false);
        setEditingDeliveryId(null);
        setDeliveryForm({
          name: "",
          phone: "",
          email: "",
          username: "",
          password: "",
          address: { street: "", city: "", state: "", pincode: "" },
          vehicleInfo: { type: "", number: "" }
        });
        await fetchDeliveryAgents(user, deliveryFilter);
      } else {
        toast.error(data.error || "Failed to save delivery agent");
      }
    } catch (err) {
      console.error("Delivery agent save error:", err);
      toast.error("Error saving delivery agent");
    } finally {
      setLoading(false);
    }
  };

  const handleDeliveryStatusUpdate = async (agentId, newStatus) => {
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();

      const res = await fetch(`http://localhost:5000/api/delivery/${agentId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`Agent ${newStatus}!`);
        await fetchDeliveryAgents(user, deliveryFilter);
      } else {
        toast.error(data.error || "Failed to update status");
      }
    } catch (err) {
      console.error("Status update error:", err);
      toast.error("Error updating status");
    }
  };

  const deleteDeliveryAgent = async (agentId) => {
    const confirmed = await confirm({
      title: 'Delete Delivery Agent',
      message: 'Are you sure you want to delete this delivery agent? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete'
    });
    
    if (!confirmed) return;
    
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();

      const res = await fetch(`http://localhost:5000/api/delivery/${agentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("Delivery agent deleted!");
        await fetchDeliveryAgents(user, deliveryFilter);
      } else {
        toast.error(data.error || "Failed to delete agent");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Error deleting agent");
    }
  };

  const editDeliveryAgent = (agent) => {
    setDeliveryForm({
      name: agent.name,
      phone: agent.phone,
      email: agent.email,
      username: agent.username,
      password: "", // Don't pre-fill password
      address: agent.address || { street: "", city: "", state: "", pincode: "" },
      vehicleInfo: agent.vehicleInfo || { type: "", number: "" }
    });
    setEditingDeliveryId(agent.agentId);
    setShowDeliveryModal(true);
  };

  // Fetch available delivery agents for assignment
  const fetchAvailableAgents = async () => {
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();
      
      const res = await fetch("http://localhost:5000/api/admin/orders/delivery-agents/available", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAvailableAgents(data.agents || []);
        }
      }
    } catch (err) {
      console.error("Error fetching available agents:", err);
    }
  };

  // Assign delivery agent to order
  const handleAssignDelivery = async (orderId, agentId) => {
    try {
      console.log("=== ASSIGNING DELIVERY ===");
      console.log("Order ID:", orderId);
      console.log("Agent ID:", agentId);
      
      const user = auth.currentUser;
      const token = await user.getIdToken();

      const res = await fetch(`http://localhost:5000/api/admin/orders/${orderId}/assign-delivery`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ agentId }),
      });

      console.log("Assignment response status:", res.status);
      const data = await res.json();
      console.log("Assignment response data:", data);

      if (res.ok && data.success) {
        toast.success(`Order assigned to ${agentId}!`);
        setShowAssignModal(false);
        setSelectedOrderForAssignment(null);
        await fetchOrders(user); // Refresh orders
      } else {
        toast.error(data.error || "Failed to assign delivery agent");
      }
    } catch (err) {
      console.error("Assignment error:", err);
      toast.error("Error assigning delivery agent");
    }
  };

  // Open assignment modal
  const openAssignModal = async (order) => {
    setSelectedOrderForAssignment(order);
    await fetchAvailableAgents();
    setShowAssignModal(true);
  };

  return (
    <div style={{ 
      display: "flex", 
      minHeight: "100vh", 
      fontFamily: "Inter, sans-serif",
      background: "linear-gradient(135deg, #f5f1eb 0%, #e8dcc6 100%)"
    }}>
      {/* Sidebar */}
      <aside style={{ width: "240px", background: "#fff", borderRight: "1px solid #eee", padding: "20px" }}>
        <h2 style={{ fontSize: "20px", marginBottom: "30px", color: "#5c4033" }}>CraftedByHer</h2>
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
            onClick={() => handleSectionClick("delivery")} 
            style={{...linkStyle, ...(activeSection === "delivery" ? activeLinkStyle : {})}}
          >
            🚚 Delivery Boys
          </button>
          <button 
            onClick={() => handleSectionClick("settings")} 
            style={{...linkStyle, ...(activeSection === "settings" ? activeLinkStyle : {})}}
          >
            ⚙️ Settings
          </button>
          <hr />
          <button onClick={handleLogout} style={{ ...linkStyle, color: "red", fontWeight: "bold" }}>
            🚪 Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "24px", background: "#f8fafc" }}>
        
        {/* Dashboard Section */}
        {activeSection === "dashboard" && (
          <>
            <h1 style={{ marginBottom: "20px" }}>Admin Dashboard</h1>

            {/* Top Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "20px", marginBottom: "30px" }}>
              <div style={{...statCard, borderLeft: "4px solid #5c4033"}}>
                <div style={{fontSize: "13px", color: "#666", marginBottom: "8px"}}>📦 Total Products</div>
                <h3 style={{fontSize: "32px", margin: "0", color: "#5c4033"}}>{products.length}</h3>
                <small style={{color: '#999', fontSize: '12px'}}>In inventory</small>
              </div>
              <div style={{...statCard, borderLeft: "4px solid #FF6B6B"}}>
                <div style={{fontSize: "13px", color: "#666", marginBottom: "8px"}}>🚀 Active Orders</div>
                <h3 style={{fontSize: "32px", margin: "0", color: "#FF6B6B"}}>{stats.activeOrders}</h3>
                <small style={{color: '#999', fontSize: '12px'}}>Currently processing</small>
              </div>
              <div style={{...statCard, borderLeft: "4px solid #4ECDC4"}}>
                <div style={{fontSize: "13px", color: "#666", marginBottom: "8px"}}>💰 Net Revenue (Cash Flow)</div>
                <h3 style={{fontSize: "32px", margin: "0", color: "#4ECDC4"}}>₹{stats.totalRevenue.toLocaleString('en-IN')}</h3>
                <small style={{color: '#999', fontSize: '11px', display: 'block', marginTop: '4px'}}>
                  📥 Paid: ₹{stats.grossRevenue.toLocaleString('en-IN')} - 📤 Delivered: ₹{stats.deliveryCommission.toLocaleString('en-IN')}
                </small>
              </div>
              <div style={{...statCard, borderLeft: "4px solid #95E1D3"}}>
                <div style={{fontSize: "13px", color: "#666", marginBottom: "8px"}}>🆕 New This Week</div>
                <h3 style={{fontSize: "32px", margin: "0", color: "#95E1D3"}}>{stats.newThisWeek}</h3>
                <small style={{color: '#999', fontSize: '12px'}}>Last 7 days</small>
              </div>
            </div>

            {/* System Controls + Quick Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", marginBottom: "30px" }}>
              <div style={{ background: "#fff", padding: "20px", borderRadius: "12px" }}>
                <h2>System Controls</h2>
                <ul style={{ listStyle: "none", padding: 0, marginTop: "10px" }}>
                  <li style={controlItem} onClick={() => handleSectionClick("settings")}>⚙️ Manage Settings</li>
                  <li style={controlItem} onClick={() => handleSectionClick("products")}>📦 Manage Products</li>
                  <li style={controlItem} onClick={() => handleSectionClick("orders")}>🧾 View Orders</li>
                  <li style={controlItem} onClick={() => window.location.href = '/admin/users'}>👥 User Management</li>
                  <li style={controlItem}>📊 Generate Reports</li>
                </ul>
              </div>

              <div style={{ background: "#fff", padding: "20px", borderRadius: "12px" }}>
                <h2 style={{ marginBottom: "20px", fontSize: "18px", color: "#5c4033" }}>Quick Stats</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#f8f9fa", borderRadius: "8px" }}>
                    <span style={{ fontSize: "14px", color: "#666" }}>📋 Orders This Week</span>
                    <b style={{ fontSize: "20px", color: "#5c4033" }}>{stats.newThisWeek}</b>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#f8f9fa", borderRadius: "8px" }}>
                    <span style={{ fontSize: "14px", color: "#666" }}>✅ Delivered Orders</span>
                    <b style={{ fontSize: "20px", color: "#28a745" }}>{orders.filter(o => o.orderStatus === 'delivered').length}</b>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#f8f9fa", borderRadius: "8px" }}>
                    <span style={{ fontSize: "14px", color: "#666" }}>🔄 Pending Orders</span>
                    <b style={{ fontSize: "20px", color: "#ffc107" }}>{orders.filter(o => ['pending', 'confirmed'].includes(o.orderStatus)).length}</b>
                  </div>
                  
                  {/* Revenue Breakdown */}
                  <div style={{ marginTop: "10px", padding: "12px", background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)", borderRadius: "8px" }}>
                    <h3 style={{ fontSize: "13px", color: "#5c4033", marginBottom: "10px", fontWeight: "700" }}>💰 Revenue Breakdown (Cash Flow)</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                        <span style={{ color: "#666" }}>📥 Money Received (Paid Orders):</span>
                        <b style={{ color: "#28a745" }}>₹{stats.grossRevenue.toLocaleString('en-IN')}</b>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                        <span style={{ color: "#666" }}>📤 Delivery Commission (Delivered):</span>
                        <b style={{ color: "#dc3545" }}>-₹{stats.deliveryCommission.toLocaleString('en-IN')}</b>
                      </div>
                      <div style={{ 
                        borderTop: "2px dashed #999", 
                        paddingTop: "8px", 
                        marginTop: "4px",
                        display: "flex", 
                        justifyContent: "space-between",
                        fontSize: "14px"
                      }}>
                        <span style={{ color: "#5c4033", fontWeight: "700" }}>Net Revenue:</span>
                        <b style={{ color: "#4ECDC4", fontSize: "16px" }}>₹{stats.totalRevenue.toLocaleString('en-IN')}</b>
                      </div>
                      <small style={{ color: "#666", fontSize: "11px", marginTop: "4px" }}>
                        ₹50 per delivery × {orders.filter(o => o.orderStatus === 'delivered').length} deliveries
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Products Section */}
        {activeSection === "products" && (
          <>
            <h1 style={{ marginBottom: "20px" }}>Product Management</h1>

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
                      // Live validation feedback
                      const t = (value || '').trim();
                      if (!t) {
                        setErrors((prev) => ({ ...prev, title: "Title is required" }));
                      } else if (t.length < 3) {
                        setErrors((prev) => ({ ...prev, title: "Title must be at least 3 characters" }));
                      } else if (!/^[A-Za-z\s]+$/.test(t)) {
                        setErrors((prev) => ({ ...prev, title: "Title can contain letters and spaces only" }));
                      } else {
                        setErrors((prev) => ({ ...prev, title: "" }));
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
                    Category *
                  </label>
                  <select 
                    value={form.category} 
                    onChange={(e) => setForm({ ...form, category: e.target.value })} 
                    style={inputStyle}
                    required
                  >
                    <option value="">Select Category</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Cakes">Cakes</option>
                    <option value="Pickles">Pickles</option>
                    <option value="Powders">Powders</option>
                    <option value="Spices">Spices</option>
                  </select>
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
                  <h4 style={{ marginBottom: "10px", fontWeight: "600" }}>Variants (Weight + Price)</h4>
                  <p style={{ fontSize: "12px", color: "#666", marginBottom: "15px" }}>
                    💡 Price must be between ₹1 and ₹2,000. Use decimal values for precise pricing (e.g., 299.99)
                  </p>
                  {form.variants.map((v, i) => (
                    <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                      <input
                        type="text"
                        placeholder="Weight (e.g. 100g)"
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
                      onClick={() => { setEditingId(null); setForm({ title: "", category: "", stock: "", price: "", variants: [{ weight: "", price: "" }], image: null }); setSelectedFile(null); setCurrentImageUrl(null); }}
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
                  {["All", "Snacks", "Cakes", "Pickles", "Powders", "Spices"].map((category) => (
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
                    .filter((p) => selectedCategory === "All" || p.category === selectedCategory)
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
                      <p style={{ fontSize: "14px", color: "#666" }}>Category: {p.category || "General"}</p>
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
                      <th style={{ padding: "14px", textAlign: "left", fontSize: "13px", letterSpacing: ".02em", color: "#6b4f3a" }}>Delivery Agent</th>
                      <th style={{ padding: "14px", textAlign: "left", fontSize: "13px", letterSpacing: ".02em", color: "#6b4f3a" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ padding: "40px", textAlign: "center", color: "#666" }}>
                          <div style={{ fontSize: "18px", marginBottom: "10px" }}>📦</div>
                          <div style={{ fontSize: "16px", fontWeight: "500", marginBottom: "5px" }}>
                            No users have orders yet
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
                                    backgroundColor: order.refundDetails.refundStatus === "completed" ? "#d4edda" : 
                                                     order.refundDetails.refundStatus === "pending" ? "#fff3cd" : "#d1ecf1",
                                    color: order.refundDetails.refundStatus === "completed" ? "#155724" : 
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
                                  backgroundColor: order.paymentStatus === "paid" ? "#d4edda" : "#fff7e6",
                                  color: order.paymentStatus === "paid" ? "#155724" : "#856404",
                                  fontWeight: 600
                                }}>
                                  {order.paymentStatus === "paid" ? "💳 Paid" : "💰 COD"}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "14px", color: "#6f5b4a" }}>{createdDate}</td>
                            <td style={{ padding: "14px" }}>
                              {orderStatus === "delivered" ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                  <span style={{
                                    padding: "6px 10px",
                                    borderRadius: "999px",
                                    fontSize: "12px",
                                    backgroundColor: "#d4edda",
                                    color: "#155724",
                                    fontWeight: 600
                                  }}>
                                    ✅ Delivered
                                  </span>
                                  {order?.deliveryInfo?.agentId && (
                                    <span style={{ fontSize: "10px", color: "#666" }}>
                                      {order.deliveryInfo.agentId}
                                    </span>
                                  )}
                                </div>
                              ) : orderStatus === "out_for_delivery" || orderStatus === "in_transit" ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                  <span style={{
                                    padding: "6px 10px",
                                    borderRadius: "999px",
                                    fontSize: "12px",
                                    backgroundColor: "#fff3cd",
                                    color: "#856404",
                                    fontWeight: 600
                                  }}>
                                    🚚 Out for Delivery
                                  </span>
                                  {order?.deliveryInfo?.agentId && (
                                    <span style={{ fontSize: "10px", color: "#666" }}>
                                      {order.deliveryInfo.agentId}
                                    </span>
                                  )}
                                </div>
                              ) : orderStatus === "picked_up" || orderStatus === "shipped" ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                  <span style={{
                                    padding: "6px 10px",
                                    borderRadius: "999px",
                                    fontSize: "12px",
                                    backgroundColor: "#cfe2ff",
                                    color: "#084298",
                                    fontWeight: 600
                                  }}>
                                    📦 Picked Up
                                  </span>
                                  {order?.deliveryInfo?.agentId && (
                                    <span style={{ fontSize: "10px", color: "#666" }}>
                                      {order.deliveryInfo.agentId}
                                    </span>
                                  )}
                                </div>
                              ) : orderStatus === "accepted" ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                  <span style={{
                                    padding: "6px 10px",
                                    borderRadius: "999px",
                                    fontSize: "12px",
                                    backgroundColor: "#e7f3ff",
                                    color: "#0a58ca",
                                    fontWeight: 600
                                  }}>
                                    ✓ Accepted
                                  </span>
                                  {order?.deliveryInfo?.agentId && (
                                    <span style={{ fontSize: "10px", color: "#666" }}>
                                      {order.deliveryInfo.agentId}
                                    </span>
                                  )}
                                </div>
                              ) : orderStatus === "assigned" ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                  <span style={{
                                    padding: "6px 10px",
                                    borderRadius: "999px",
                                    fontSize: "12px",
                                    backgroundColor: "#e6f4ea",
                                    color: "#1e7e34",
                                    fontWeight: 600
                                  }}>
                                    📋 Assigned
                                  </span>
                                  {order?.deliveryInfo?.agentId && (
                                    <span style={{ fontSize: "10px", color: "#666" }}>
                                      {order.deliveryInfo.agentId}
                                    </span>
                                  )}
                                </div>
                              ) : orderStatus === "confirmed" ? (
                                <button
                                  onClick={() => openAssignModal(order)}
                                  style={{
                                    background: "#5c4033",
                                    color: "white",
                                    border: "none",
                                    padding: "8px 12px",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    boxShadow: "0 2px 6px rgba(92,64,51,0.15)"
                                  }}
                                >
                                  🚚 Assign
                                </button>
                              ) : (
                                <span style={{
                                  padding: "6px 10px",
                                  borderRadius: "999px",
                                  fontSize: "12px",
                                  backgroundColor: "#f8f9fa",
                                  color: "#6c757d",
                                  fontWeight: 600
                                }}>
                                  -
                                </span>
                              )}
                            </td>
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

        {/* Settings Section */}
        {activeSection === "delivery" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h1>Delivery Boys Management</h1>
              <button
                onClick={() => {
                  setDeliveryForm({
                    name: "",
                    phone: "",
                    email: "",
                    username: "",
                    password: "",
                    address: { street: "", city: "", state: "", pincode: "" },
                    vehicleInfo: { type: "", number: "" }
                  });
                  setEditingDeliveryId(null);
                  setShowDeliveryModal(true);
                }}
                style={{
                  background: "#5c4033",
                  color: "white",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "500"
                }}
              >
                + Add Delivery Boy
              </button>
            </div>

            {/* Filter Tabs */}
            <div style={{ marginBottom: "20px" }}>
              {["all", "active", "inactive", "pending"].map(status => (
                <button
                  key={status}
                  onClick={() => {
                    setDeliveryFilter(status);
                    fetchDeliveryAgents(auth.currentUser, status);
                  }}
                  style={{
                    padding: "8px 16px",
                    margin: "0 8px 0 0",
                    border: "1px solid #ddd",
                    background: deliveryFilter === status ? "#5c4033" : "white",
                    color: deliveryFilter === status ? "white" : "#333",
                    borderRadius: "6px",
                    cursor: "pointer",
                    textTransform: "capitalize"
                  }}
                >
                  {status} ({deliveryAgents.filter(agent => status === "all" || agent.status === status).length})
                </button>
              ))}
            </div>

            {/* Delivery Agents List */}
            <div style={{ background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8f9fa" }}>
                    <th style={{ padding: "16px", textAlign: "left", borderBottom: "1px solid #eee" }}>Agent ID</th>
                    <th style={{ padding: "16px", textAlign: "left", borderBottom: "1px solid #eee" }}>Name</th>
                    <th style={{ padding: "16px", textAlign: "left", borderBottom: "1px solid #eee" }}>Contact</th>
                    <th style={{ padding: "16px", textAlign: "left", borderBottom: "1px solid #eee" }}>Status</th>
                    <th style={{ padding: "16px", textAlign: "left", borderBottom: "1px solid #eee" }}>Vehicle</th>
                    <th style={{ padding: "16px", textAlign: "left", borderBottom: "1px solid #eee" }}>Deliveries</th>
                    <th style={{ padding: "16px", textAlign: "left", borderBottom: "1px solid #eee" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryAgents
                    .filter(agent => deliveryFilter === "all" || agent.status === deliveryFilter)
                    .map((agent) => (
                    <tr key={agent.agentId} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "16px" }}>
                        <strong>{agent.agentId}</strong>
                      </td>
                      <td style={{ padding: "16px" }}>
                        <div>
                          <div style={{ fontWeight: "500" }}>{agent.name}</div>
                          <div style={{ fontSize: "12px", color: "#666" }}>@{agent.username}</div>
                        </div>
                      </td>
                      <td style={{ padding: "16px" }}>
                        <div style={{ fontSize: "14px" }}>
                          <div>{agent.phone}</div>
                          <div style={{ color: "#666", fontSize: "12px" }}>{agent.email}</div>
                        </div>
                      </td>
                      <td style={{ padding: "16px" }}>
                        <span style={{
                          padding: "4px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "500",
                          background: agent.status === "active" ? "#d4edda" : 
                                     agent.status === "inactive" ? "#f8d7da" : "#fff3cd",
                          color: agent.status === "active" ? "#155724" : 
                                 agent.status === "inactive" ? "#721c24" : "#856404"
                        }}>
                          {agent.status}
                        </span>
                        {agent.isOnline && (
                          <span style={{
                            marginLeft: "8px",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            fontSize: "10px",
                            background: "#28a745",
                            color: "white"
                          }}>
                            ONLINE
                          </span>
                        )}
                        {agent.readyForDelivery && (
                          <span style={{
                            marginLeft: "8px",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            fontSize: "10px",
                            background: "#17a2b8",
                            color: "white"
                          }}>
                            ✓ READY
                          </span>
                        )}
                        {agent.isBusy && (
                          <span style={{
                            marginLeft: "8px",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            fontSize: "10px",
                            background: "#ffc107",
                            color: "#212529"
                          }}>
                            BUSY
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "16px" }}>
                        <div style={{ fontSize: "14px" }}>
                          <div>{agent.vehicleInfo?.type || "Not specified"}</div>
                          <div style={{ color: "#666", fontSize: "12px" }}>{agent.vehicleInfo?.number || ""}</div>
                        </div>
                      </td>
                      <td style={{ padding: "16px" }}>
                        <div style={{ fontSize: "14px" }}>
                          <div>{agent.totalDeliveries || 0}</div>
                          <div style={{ color: "#666", fontSize: "12px" }}>
                            ⭐ {agent.rating ? agent.rating.toFixed(1) : "0.0"}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "16px" }}>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button
                            onClick={() => editDeliveryAgent(agent)}
                            style={{
                              padding: "6px 12px",
                              border: "1px solid #007bff",
                              background: "white",
                              color: "#007bff",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px"
                            }}
                          >
                            Edit
                          </button>
                          
                          {agent.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleDeliveryStatusUpdate(agent.agentId, "active")}
                                style={{
                                  padding: "6px 12px",
                                  border: "none",
                                  background: "#28a745",
                                  color: "white",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontSize: "12px"
                                }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleDeliveryStatusUpdate(agent.agentId, "inactive")}
                                style={{
                                  padding: "6px 12px",
                                  border: "none",
                                  background: "#dc3545",
                                  color: "white",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontSize: "12px"
                                }}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          
                          {agent.status === "active" && (
                            <button
                              onClick={() => handleDeliveryStatusUpdate(agent.agentId, "inactive")}
                              style={{
                                padding: "6px 12px",
                                border: "none",
                                background: "#ffc107",
                                color: "white",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px"
                              }}
                            >
                              Deactivate
                            </button>
                          )}
                          
                          {agent.status === "inactive" && (
                            <button
                              onClick={() => handleDeliveryStatusUpdate(agent.agentId, "active")}
                              style={{
                                padding: "6px 12px",
                                border: "none",
                                background: "#28a745",
                                color: "white",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px"
                              }}
                            >
                              Activate
                            </button>
                          )}
                          
                          <button
                            onClick={() => deleteDeliveryAgent(agent.agentId)}
                            style={{
                              padding: "6px 12px",
                              border: "none",
                              background: "#dc3545",
                              color: "white",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px"
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {deliveryAgents.length === 0 && (
                <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
                  No delivery agents found. Click "Add Delivery Boy" to get started.
                </div>
              )}
            </div>
          </>
        )}

        {activeSection === "settings" && (
          <>
            <h1 style={{ marginBottom: "20px" }}>Settings</h1>
            
            <div style={{ background: "#fff", padding: "24px", borderRadius: "12px" }}>
              <h2 style={{ marginBottom: "20px" }}>System Settings</h2>
              <p>Settings panel will be implemented here.</p>
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

            {/* Delivery Status - moved from list into details */}
            {/* Compute current status inline for coloring */}
            {(() => {
              const currentStatus = selectedOrder?.orderStatus || selectedOrder?.status;
              return (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: "12px",
              background: "#faf7f2",
              border: "1px solid #f0e6da",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "16px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: (
                    selectedOrder?.deliveryStatus?.assigned ||
                    [
                      'assigned','accepted','picked_up','shipped','in_transit','out_for_delivery','delivered'
                    ].includes(currentStatus)
                  ) ? "#28a745" : "#dc3545",
                  display: "inline-block"
                }}></span>
                <span style={{ fontSize: "12px", color: "#5c4033" }}>Assigned</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: (
                    selectedOrder?.deliveryStatus?.accepted ||
                    [
                      'accepted','picked_up','shipped','in_transit','out_for_delivery','delivered'
                    ].includes(currentStatus)
                  ) ? "#28a745" : "#dc3545",
                  display: "inline-block"
                }}></span>
                <span style={{ fontSize: "12px", color: "#5c4033" }}>Accepted</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: (
                    selectedOrder?.deliveryStatus?.pickedUp ||
                    [
                      'picked_up','shipped','in_transit','out_for_delivery','delivered'
                    ].includes(currentStatus)
                  ) ? "#28a745" : "#dc3545",
                  display: "inline-block"
                }}></span>
                <span style={{ fontSize: "12px", color: "#5c4033" }}>Picked Up</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: (selectedOrder?.deliveryStatus?.delivered || currentStatus === 'delivered') ? "#28a745" : "#dc3545",
                  display: "inline-block"
                }}></span>
                <span style={{ fontSize: "12px", color: "#5c4033" }}>Delivered</span>
              </div>
            </div>
              );
            })()}

            {selectedOrder?.deliveryInfo?.agentId && (
              <div style={{ marginBottom: "16px", fontSize: "13px", color: "#6b4f3a" }}>
                <strong>Delivery Agent:</strong> {selectedOrder.deliveryInfo.agentId}
              </div>
            )}

            {/* Order Timeline removed as requested */}

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

      {/* Delivery Agent Modal */}
      {showDeliveryModal && (
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
            maxWidth: "600px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            position: "relative"
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowDeliveryModal(false)}
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
              {editingDeliveryId ? "Edit Delivery Agent" : "Add New Delivery Agent"}
            </h2>

            <form onSubmit={handleDeliverySubmit}>
              {/* Basic Information */}
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ marginBottom: "15px", color: "#5c4033", fontSize: "16px" }}>Basic Information</h3>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Name *</label>
                    <input
                      type="text"
                      value={deliveryForm.name}
                      onChange={(e) => setDeliveryForm({...deliveryForm, name: e.target.value})}
                      style={inputStyle}
                      required
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Phone *</label>
                    <input
                      type="tel"
                      value={deliveryForm.phone}
                      onChange={(e) => setDeliveryForm({...deliveryForm, phone: e.target.value})}
                      style={inputStyle}
                      required
                      placeholder="10-digit mobile number"
                      pattern="[6-9][0-9]{9}"
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Email *</label>
                    <input
                      type="email"
                      value={deliveryForm.email}
                      onChange={(e) => setDeliveryForm({...deliveryForm, email: e.target.value})}
                      style={inputStyle}
                      required
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Username *</label>
                    <input
                      type="text"
                      value={deliveryForm.username}
                      onChange={(e) => setDeliveryForm({...deliveryForm, username: e.target.value})}
                      style={inputStyle}
                      required
                      placeholder="Unique username"
                      pattern="[a-zA-Z0-9_]+"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                    Password {editingDeliveryId ? "(Leave blank to keep current)" : "*"}
                  </label>
                  <input
                    type="password"
                    value={deliveryForm.password}
                    onChange={(e) => setDeliveryForm({...deliveryForm, password: e.target.value})}
                    style={inputStyle}
                    required={!editingDeliveryId}
                    placeholder="Minimum 6 characters"
                    minLength="6"
                  />
                </div>
              </div>

              {/* Address Information */}
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ marginBottom: "15px", color: "#5c4033", fontSize: "16px" }}>Address</h3>
                
                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Street Address</label>
                  <input
                    type="text"
                    value={deliveryForm.address.street}
                    onChange={(e) => setDeliveryForm({
                      ...deliveryForm, 
                      address: {...deliveryForm.address, street: e.target.value}
                    })}
                    style={inputStyle}
                    placeholder="House no, Street name"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>City</label>
                    <input
                      type="text"
                      value={deliveryForm.address.city}
                      onChange={(e) => setDeliveryForm({
                        ...deliveryForm, 
                        address: {...deliveryForm.address, city: e.target.value}
                      })}
                      style={inputStyle}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>State</label>
                    <input
                      type="text"
                      value={deliveryForm.address.state}
                      onChange={(e) => setDeliveryForm({
                        ...deliveryForm, 
                        address: {...deliveryForm.address, state: e.target.value}
                      })}
                      style={inputStyle}
                      placeholder="State"
                    />
                  </div>
                </div>

                <div style={{ marginTop: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Pincode</label>
                  <input
                    type="text"
                    value={deliveryForm.address.pincode}
                    onChange={(e) => setDeliveryForm({
                      ...deliveryForm, 
                      address: {...deliveryForm.address, pincode: e.target.value}
                    })}
                    style={{...inputStyle, width: "200px"}}
                    placeholder="6-digit pincode"
                    pattern="[0-9]{6}"
                  />
                </div>
              </div>

              {/* Vehicle Information */}
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ marginBottom: "15px", color: "#5c4033", fontSize: "16px" }}>Vehicle Information</h3>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Vehicle Type</label>
                    <select
                      value={deliveryForm.vehicleInfo.type}
                      onChange={(e) => setDeliveryForm({
                        ...deliveryForm, 
                        vehicleInfo: {...deliveryForm.vehicleInfo, type: e.target.value}
                      })}
                      style={inputStyle}
                    >
                      <option value="">Select vehicle type</option>
                      <option value="bicycle">Bicycle</option>
                      <option value="bike">Motorcycle</option>
                      <option value="scooter">Scooter</option>
                      <option value="car">Car</option>
                      <option value="van">Van</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Vehicle Number</label>
                    <input
                      type="text"
                      value={deliveryForm.vehicleInfo.number}
                      onChange={(e) => setDeliveryForm({
                        ...deliveryForm, 
                        vehicleInfo: {...deliveryForm.vehicleInfo, number: e.target.value}
                      })}
                      style={inputStyle}
                      placeholder="Vehicle registration number"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "30px" }}>
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
                  style={buttonSecondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    ...buttonPrimary,
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? "not-allowed" : "pointer"
                  }}
                >
                  {loading ? "Saving..." : (editingDeliveryId ? "Update Agent" : "Create Agent")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery Assignment Modal */}
      {showAssignModal && selectedOrderForAssignment && (
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
              onClick={() => setShowAssignModal(false)}
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
              Assign Delivery Agent
            </h2>

            <div style={{ marginBottom: "20px" }}>
              <p><strong>Order:</strong> #{selectedOrderForAssignment.orderNumber || selectedOrderForAssignment.id}</p>
              <p><strong>Customer:</strong> {selectedOrderForAssignment.customer}</p>
              <p><strong>Total:</strong> ₹{selectedOrderForAssignment.total}</p>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ marginBottom: "15px", color: "#5c4033" }}>Select Delivery Agent:</h3>
              
              {availableAgents.length === 0 ? (
                <p style={{ color: "#666", fontStyle: "italic" }}>
                  No active delivery agents available. Please activate some agents first.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {availableAgents.map((agent) => {
                    const canAssign = agent.readyForDelivery && agent.isAvailable;
                    return (
                    <div key={agent.agentId} style={{
                      padding: "15px",
                      border: canAssign ? "2px solid #28a745" : "1px solid #ddd",
                      borderRadius: "8px",
                      cursor: canAssign ? "pointer" : "not-allowed",
                      transition: "all 0.2s",
                      opacity: canAssign ? 1 : 0.5,
                      background: canAssign ? "#f8fff8" : "#f8f8f8",
                      position: "relative"
                    }}
                    onMouseOver={(e) => {
                      if (canAssign) e.currentTarget.style.borderColor = "#5c4033";
                    }}
                    onMouseOut={(e) => {
                      if (canAssign) e.currentTarget.style.borderColor = "#28a745";
                    }}
                    onClick={() => canAssign && handleAssignDelivery(selectedOrderForAssignment.id, agent.agentId)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: "0 0 5px 0" }}>{agent.name}</h4>
                          <p style={{ margin: "0", fontSize: "14px", color: "#666" }}>
                            {agent.agentId} • {agent.phone}
                          </p>
                          <p style={{ margin: "0", fontSize: "12px", color: "#999" }}>
                            {agent.vehicleInfo?.type} {agent.vehicleInfo?.number}
                          </p>
                          <div style={{ marginTop: "5px", display: "flex", gap: "10px", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", color: "#666" }}>
                              ⭐ {agent.rating?.toFixed(1) || "0.0"}
                            </span>
                            <span style={{ fontSize: "12px", color: "#666" }}>
                              📦 {agent.activeOrdersCount} active orders
                            </span>
                            {agent.pendingAcceptanceCount > 0 && (
                              <span style={{ fontSize: "12px", color: "#ffc107" }}>
                                ⏳ {agent.pendingAcceptanceCount} pending
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "flex-end" }}>
                            {agent.readyForDelivery ? (
                              <span style={{
                                padding: "4px 10px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                background: "#28a745",
                                color: "white",
                                fontWeight: "bold"
                              }}>
                                ✅ READY FOR DELIVERY
                              </span>
                            ) : (
                              <span style={{
                                padding: "4px 10px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                background: "#ffc107",
                                color: "#212529",
                                fontWeight: "bold"
                              }}>
                                ⏸ NOT READY
                              </span>
                            )}
                            <span style={{
                              padding: "2px 8px",
                              borderRadius: "10px",
                              fontSize: "10px",
                              background: agent.availability === 'available' ? "#17a2b8" : 
                                         agent.availability === 'busy' ? "#ffc107" : "#6c757d",
                              color: "white",
                              fontWeight: "bold"
                            }}>
                              {agent.availability === 'available' ? 'AVAILABLE' :
                               agent.availability === 'busy' ? 'BUSY' : 'OFFLINE'}
                            </span>
                            {agent.isOnline && (
                              <span style={{
                                padding: "1px 6px",
                                borderRadius: "8px",
                                fontSize: "9px",
                                background: "#28a745",
                                color: "white"
                              }}>
                                🟢 ONLINE
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {!agent.readyForDelivery && (
                        <div style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          background: "rgba(0, 0, 0, 0.85)",
                          color: "white",
                          padding: "10px 20px",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontWeight: "bold",
                          pointerEvents: "none",
                          zIndex: 10
                        }}>
                          🚫 Agent Not Ready
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setShowAssignModal(false)}
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
  padding: "8px",
  cursor: "pointer",
  color: "#444",
  fontSize: "14px",
};

const activeLinkStyle = {
  backgroundColor: "#f0f0f0",
  borderRadius: "6px",
  fontWeight: "bold",
  color: "#5c4033",
};

const controlItem = {
  padding: "10px",
  borderBottom: "1px solid #eee",
  cursor: "pointer",
};

