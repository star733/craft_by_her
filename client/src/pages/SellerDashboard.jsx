import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { signOut } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { useConfirm } from "../context/ConfirmContext";
import EnhancedSellerDashboard from "../components/EnhancedSellerDashboard";
import NotificationBell from "../components/NotificationBell";
import { MAIN_CATEGORIES } from "../data/categories";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function SellerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm } = useConfirm();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    activeOrders: 0,
    totalRevenue: 0,
    newThisWeek: 0
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
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sellerLocation, setSellerLocation] = useState(null);
  const [locationForm, setLocationForm] = useState({
    street: "",
    city: "",
    state: "",
    pincode: "",
    country: "India"
  });
  const [locationLoading, setLocationLoading] = useState(false);

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

  // ✅ Fetch products
  const fetchProducts = async (user) => {
    try {
      await user.reload();
      const token = await user.getIdToken(true);
      const res = await fetch(`${API_BASE}/api/seller/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        toast.error("Access denied: You are not a seller");
        return;
      }

      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch products error:", err);
    }
  };

  // ✅ Fetch orders
  const fetchOrders = async (user) => {
    try {
      await user.reload();
      const token = await user.getIdToken(true);
      const res = await fetch(`${API_BASE}/api/seller/orders`, {
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
      setStats(calculatedStats);
    } catch (err) {
      console.error("Fetch orders error:", err);
      setOrders([]);
      setStats({ activeOrders: 0, totalRevenue: 0, newThisWeek: 0 });
    }
  };

  // ✅ Fetch seller location
  const fetchSellerLocation = async (user) => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/seller/location`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.location) {
          setSellerLocation(data.location);
          // Populate form with existing location
          if (data.location.address) {
            setLocationForm({
              street: data.location.address.street || "",
              city: data.location.address.city || "",
              state: data.location.address.state || "",
              pincode: data.location.address.pincode || "",
              country: data.location.address.country || "India"
            });
          }
        } else {
          setSellerLocation(null);
        }
      }
    } catch (err) {
      console.error("Error fetching seller location:", err);
    }
  };

  // ✅ Update seller location
  const updateSellerLocation = async () => {
    if (!locationForm.pincode || locationForm.pincode.length !== 6) {
      toast.error("Please enter a valid 6-digit pincode");
      return;
    }

    if (!locationForm.street || !locationForm.city || !locationForm.state) {
      toast.error("Please fill in all address fields");
      return;
    }

    setLocationLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/seller/location`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          address: locationForm
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success("Location updated successfully!");
          setSellerLocation(data.location);
          await fetchSellerLocation(auth.currentUser);
        } else {
          toast.error(data.error || "Failed to update location");
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: "Failed to update location" }));
        toast.error(errorData.error || "Failed to update location");
      }
    } catch (err) {
      console.error("Error updating location:", err);
      toast.error("Failed to update location. Please try again.");
    } finally {
      setLocationLoading(false);
    }
  };

  // ✅ Fetch notifications
  const fetchNotifications = async (user) => {
    try {
      const token = await user.getIdToken(true);
      const res = await fetch(`${API_BASE}/api/seller/orders/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const notificationsList = data.success ? (data.notifications || []) : [];
        setNotifications(notificationsList);
        setUnreadCount(data.unreadCount || notificationsList.filter(n => !n.read).length);
      }
    } catch (err) {
      console.error("Fetch notifications error:", err);
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
      } else if (section === "notifications") {
        await fetchNotifications(user);
      }
    }
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // First check application status before fetching products and orders
        try {
          const token = await user.getIdToken(true);
          const response = await fetch(`${API_BASE}/api/seller/applications/my-application`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          console.log('Application check response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('Application data:', data);
            if (data.success) {
              setApplicationStatus(data.application);
              // If application is not approved, redirect to application page
              if (data.application.status !== 'approved') {
                console.log('Application not approved, redirecting to application page');
                navigate('/seller/application');
                return;
              }
              // If application is approved, fetch products and orders
              console.log('Application approved, fetching products and orders');
              await fetchProducts(user);
              await fetchOrders(user); // This will populate the stats
              await fetchNotifications(user); // Fetch notifications
              await fetchSellerLocation(user); // Fetch seller location
            } else {
              // If API call succeeded but data.success is false, still try to fetch products and orders
              console.log('API call succeeded but data.success is false, still fetching products and orders');
              await fetchProducts(user);
              await fetchOrders(user);
            }
          } else {
            // If API call failed, still try to fetch products and orders
            console.log('API call failed, still fetching products and orders');
            await fetchProducts(user);
            await fetchOrders(user);
          }
        } catch (err) {
          console.log("No existing application found or error checking status:", err);
          // Even if there's an error checking application status, still try to fetch products and orders
          console.log('Error checking application status, still fetching products and orders');
          await fetchProducts(user);
          await fetchOrders(user);
        }
      }
    });
    return () => unsub();
  }, [navigate]);

  // ✅ Add / Edit Product
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Comprehensive validation
    const trimmedTitle = (form.title || "").trim();
    let hasErrors = false;
    const newErrors = { ...errors };

    // Validate title
    if (!trimmedTitle) {
      newErrors.title = "Title is required";
      hasErrors = true;
    } else if (trimmedTitle.length < 3) {
      newErrors.title = "Title must be at least 3 characters";
      hasErrors = true;
    } else if (trimmedTitle.length > 100) {
      newErrors.title = "Title must not exceed 100 characters";
      hasErrors = true;
    } else if (!/^[A-Za-z\s]+$/.test(trimmedTitle)) {
      newErrors.title = "Title can contain letters and spaces only";
      hasErrors = true;
    } else {
      // Check for valid words (not random characters like "gyuguyhhhh")
      const words = trimmedTitle.split(/\s+/).filter(w => w.length > 0);
      if (words.length === 0) {
        newErrors.title = "Title must contain at least one word";
        hasErrors = true;
      } else {
        let hasInvalidWord = false;
        for (const word of words) {
          if (word.length < 2) {
            hasInvalidWord = true;
            break;
          }
          // Check for too many consecutive same characters (e.g., "gyuguyhhhh")
          if (/(.)\1{3,}/.test(word)) {
            hasInvalidWord = true;
            break;
          }
          // Check for at least one vowel
          if (!/[aeiouAEIOU]/.test(word)) {
            hasInvalidWord = true;
            break;
          }
          // Check for too many consecutive consonants (more than 4)
          if (/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]{5,}/.test(word)) {
            hasInvalidWord = true;
            break;
          }
        }
        if (hasInvalidWord) {
          newErrors.title = "Title must contain valid words (e.g., 'Homemade Pickle', not random characters)";
          hasErrors = true;
        } else {
          newErrors.title = "";
        }
      }
    }

    // Validate main category
    if (!form.mainCategory) {
      newErrors.mainCategory = "Main category is required";
      hasErrors = true;
    } else {
      newErrors.mainCategory = "";
    }

    // Validate sub category
    if (!form.subCategory) {
      newErrors.subCategory = "Sub category is required";
      hasErrors = true;
    } else {
      newErrors.subCategory = "";
    }

    // Validate stock
    if (!form.stock || form.stock.trim() === "") {
      newErrors.stock = "Stock quantity is required";
      hasErrors = true;
    } else {
      const stockNum = parseInt(form.stock);
      if (isNaN(stockNum) || stockNum < 0) {
        newErrors.stock = "Stock must be a positive number";
        hasErrors = true;
      } else if (stockNum > 999999) {
        newErrors.stock = "Stock cannot exceed 999,999 units";
        hasErrors = true;
      } else {
        newErrors.stock = "";
      }
    }

    // Validate variants
    if (form.variants.length === 0) {
      toast.error("At least one variant is required");
      hasErrors = true;
    } else {
      const variantErrors = [];
      for (let i = 0; i < form.variants.length; i++) {
        const variant = form.variants[i];
        const variantError = { weight: "", price: "" };
        
        if (!variant.weight || !variant.weight.trim()) {
          variantError.weight = "Variant name/weight is required";
          hasErrors = true;
        } else if (variant.weight.length > 50) {
          variantError.weight = "Variant name must not exceed 50 characters";
          hasErrors = true;
        }
        
        if (!variant.price || variant.price.trim() === "") {
          variantError.price = "Price is required";
          hasErrors = true;
        } else {
          const price = parseFloat(variant.price);
          if (isNaN(price)) {
            variantError.price = "Price must be a valid number";
            hasErrors = true;
          } else if (price < 1) {
            variantError.price = "Price must be at least ₹1";
            hasErrors = true;
          } else if (price > 2000) {
            variantError.price = "Price cannot exceed ₹2,000";
            hasErrors = true;
          }
        }
        
        variantErrors.push(variantError);
      }
      newErrors.variants = variantErrors;
    }

    setErrors(newErrors);

    if (hasErrors) {
      toast.error("Please fix all validation errors before submitting");
      return;
    }

    if (!selectedFile && !editingId) {
      toast.error("Please select an image");
      return;
    }

    try {
      setLoading(true);
      const token = await auth.currentUser.getIdToken();

      const url = editingId
        ? `${API_BASE}/api/seller/products/${editingId}`
        : `${API_BASE}/api/seller/products`;

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
      
      const res = await fetch(`${API_BASE}/api/seller/products/toggle-status/${id}`, {
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

  // ✅ Delete Product
  const handleDeleteProduct = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? This action cannot be undone.',
      type: 'warning',
      confirmText: 'Delete'
    });
    
    if (!confirmed) return;
    
    try {
      const token = await auth.currentUser.getIdToken(true);
      const res = await fetch(`${API_BASE}/api/seller/products/${id}`, {
        method: "DELETE",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });
      
      if (res.ok) {
        toast.success("Product deleted successfully");
        await fetchProducts(auth.currentUser);
      } else {
        const errorData = await res.json().catch(() => ({ error: "Failed to delete product" }));
        toast.error(errorData.error || "Failed to delete product");
      }
    } catch (err) {
      console.error("Delete product error:", err);
      toast.error("Failed to delete product. Please try again.");
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
      setCurrentImageUrl(`${API_BASE}/uploads/${p.image}`);
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

  // ✅ View Notification Details
  const viewNotificationDetails = async (notification) => {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/seller/orders/notifications/${notification._id}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.orderDetails) {
          // Mark notification as read
          if (!notification.read) {
            markAsRead(notification._id);
          }
          // Show order details
          setSelectedOrder(data.orderDetails);
          setShowOrderModal(true);
          // Switch to orders section to show context
          setActiveSection("orders");
        } else {
          toast.error("Could not load order details");
        }
      } else {
        toast.error("Failed to load notification details");
      }
    } catch (error) {
      console.error("Error fetching notification details:", error);
      toast.error("Error loading notification details");
    }
  };

  // ✅ Logout
  const handleLogout = async () => {
    setIsLoggingOut(true); // Allow navigation during logout
    await signOut(auth);
    // Clear browser history and navigate to login
    window.history.replaceState(null, '', '/login');
    navigate("/login", { replace: true });
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch(`${API_BASE}/api/notifications/${notificationId}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
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
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div style={{ 
            width: "60px", 
            height: "60px", 
            borderRadius: "50%", 
            background: "#f0f0f0", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            fontSize: "24px", 
            margin: "0 auto 10px", 
            border: "2px solid #5c4033" 
          }}>
            {auth.currentUser?.displayName?.charAt(0)?.toUpperCase() || "S"}
          </div>
          <h2 style={{ fontSize: "18px", margin: "0 0 5px 0", color: "#5c4033" }}>
            {auth.currentUser?.displayName || "Seller"}
          </h2>
          <div style={{ fontSize: "12px", color: "#666" }}>Professional Seller</div>
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
            📦 Product Management
          </button>
          <button 
            onClick={() => handleSectionClick("orders")} 
            style={{...linkStyle, ...(activeSection === "orders" ? activeLinkStyle : {})}}
          >
            🧾 Order Management
          </button>
          <button 
            onClick={() => handleSectionClick("analytics")} 
            style={{...linkStyle, ...(activeSection === "analytics" ? activeLinkStyle : {})}}
          >
            📈 Analytics
          </button>
          <button 
            onClick={() => handleSectionClick("reviews")} 
            style={{...linkStyle, ...(activeSection === "reviews" ? activeLinkStyle : {})}}
          >
            ⭐ Reviews
          </button>
          <button 
            onClick={() => handleSectionClick("settings")} 
            style={{...linkStyle, ...(activeSection === "settings" ? activeLinkStyle : {})}}
          >
            ⚙️ Account Settings
          </button>
          
          <hr />
          <button onClick={handleLogout} style={{ ...linkStyle, color: "red", fontWeight: "bold" }}>
            🚪 Logout
          </button>
        </nav>
        
        {/* Support Section */}
        <div style={{ 
          marginTop: "30px", 
          padding: "15px", 
          background: "#f8f9fa", 
          borderRadius: "8px", 
          textAlign: "center" 
        }}>
          <div style={{ fontSize: "24px", marginBottom: "10px" }}>❓</div>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#5c4033" }}>Need Help?</h3>
          <p style={{ fontSize: "12px", color: "#666", margin: "0 0 15px 0" }}>
            Our support team is here to assist you
          </p>
          <button 
            onClick={() => alert('Support will be contacted soon!')}
            style={{ 
              ...buttonPrimary, 
              background: "#5c4033", 
              padding: "8px 12px", 
              fontSize: "12px" 
            }}
          >
            Contact Support
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f8fafc" }}>
        {/* Main Content Area */}
        <div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
        
        {/* Dashboard Section */}
        {activeSection === "dashboard" && (
          <>
            {/* Welcome message with Notification Bell - Separate row at top */}
            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "12px",
              marginBottom: "30px",
            }}>
              <div style={{ fontSize: "16px", color: "#5c4033", fontWeight: "500" }}>
                Welcome back, Seller!
              </div>
              
              <button
                onClick={() => handleSectionClick("notifications")}
                style={{
                  background: "white",
                  border: "1px solid #eee",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  cursor: "pointer",
                  fontSize: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  color: "#5c4033",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow = "0 3px 10px rgba(0,0,0,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.08)";
                }}
                title="Notifications"
              >
                🔔
                {unreadCount > 0 && (
                  <span style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    background: "#dc3545",
                    color: "white",
                    borderRadius: "50%",
                    minWidth: "18px",
                    height: "18px",
                    fontSize: "10px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid white",
                    padding: "0 3px",
                  }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
            
            <EnhancedSellerDashboard 
              products={products} 
              orders={orders} 
              stats={stats} 
              onSectionClick={handleSectionClick} 
            />
          </>
        )}

        {/* Products Section */}
        {activeSection === "products" && (
          <>
            <h1 style={{ marginBottom: "20px" }}>Product Management</h1>
            
            {/* Info Message */}
            <div style={{ 
              background: "#e6f7ff", 
              border: "1px solid #91d5ff", 
              borderRadius: "8px",
              padding: "15px",
              marginBottom: "20px"
            }}>
              <p style={{ margin: 0, color: "#5c4033" }}>
                <strong>ℹ️ Your Personal Product Management Center:</strong> Add, edit, and manage all your products here. 
                Only you can see and manage these products. Customers will see your products in the marketplace.
              </p>
            </div>
            
            {/* Seller Exclusive Notice */}
            <div style={{ 
              background: "#f6ffed", 
              border: "1px solid #b7eb8f", 
              borderRadius: "8px",
              padding: "15px",
              marginBottom: "20px"
            }}>
              <p style={{ margin: 0, color: "#5c4033" }}>
                <strong>🔒 Seller Exclusive Feature:</strong> This product management system is exclusively for approved sellers. 
                All products you add here will be visible to customers in the marketplace.
              </p>
            </div>

            {/* Add/Edit Product Form */}
            <section id="product-form-section" style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "30px" }}>
              <h2 style={{ marginBottom: "20px" }}>{editingId ? "Edit Product" : "Add New Product"}</h2>
              <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    Product Title *
                  </label>
                  <input 
                    placeholder="Enter product title (e.g. Homemade Pickle, Traditional Spice Mix)" 
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
                            // Word should be at least 2 characters
                            if (word.length < 2) {
                              hasInvalidWord = true;
                              break;
                            }
                            // Check for too many consecutive same characters (e.g., "gyuguyhhhh")
                            if (/(.)\1{3,}/.test(word)) {
                              hasInvalidWord = true;
                              break;
                            }
                            // Check for at least one vowel in the word
                            if (!/[aeiouAEIOU]/.test(word)) {
                              hasInvalidWord = true;
                              break;
                            }
                            // Check for too many consecutive consonants (more than 4)
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
                    onChange={(e) => {
                      setForm({ ...form, mainCategory: e.target.value, subCategory: "" });
                      if (e.target.value) {
                        setErrors((prev) => ({ ...prev, mainCategory: "" }));
                      } else {
                        setErrors((prev) => ({ ...prev, mainCategory: "Main category is required" }));
                      }
                    }} 
                    style={{
                      ...inputStyle,
                      borderColor: errors.mainCategory ? "#d9534f" : inputStyle.borderColor
                    }}
                    required
                  >
                    <option value="">Select Main Category</option>
                    {Object.keys(MAIN_CATEGORIES).map((mainCat) => (
                      <option key={mainCat} value={mainCat}>
                        {mainCat}
                      </option>
                    ))}
                  </select>
                  {errors.mainCategory && (
                    <div style={{ color: "#d9534f", fontSize: "12px", marginTop: "6px" }}>{errors.mainCategory}</div>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    Sub Category *
                  </label>
                  <select 
                    value={form.subCategory} 
                    onChange={(e) => {
                      setForm({ ...form, subCategory: e.target.value });
                      if (e.target.value) {
                        setErrors((prev) => ({ ...prev, subCategory: "" }));
                      } else {
                        setErrors((prev) => ({ ...prev, subCategory: "Sub category is required" }));
                      }
                    }} 
                    style={{
                      ...inputStyle,
                      borderColor: errors.subCategory ? "#d9534f" : inputStyle.borderColor
                    }}
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
                  {errors.subCategory && (
                    <div style={{ color: "#d9534f", fontSize: "12px", marginTop: "6px" }}>{errors.subCategory}</div>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    Stock Available *
                  </label>
                  <input 
                    type="number"
                    min="0"
                    max="999999"
                    placeholder="Enter stock quantity" 
                    value={form.stock} 
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm({ ...form, stock: value });
                      // Validate stock
                      if (!value || value.trim() === "") {
                        setErrors((prev) => ({ ...prev, stock: "Stock quantity is required" }));
                      } else {
                        const stockNum = parseInt(value);
                        if (isNaN(stockNum) || stockNum < 0) {
                          setErrors((prev) => ({ ...prev, stock: "Stock must be a positive number" }));
                        } else if (stockNum > 999999) {
                          setErrors((prev) => ({ ...prev, stock: "Stock cannot exceed 999,999 units" }));
                        } else {
                          setErrors((prev) => ({ ...prev, stock: "" }));
                        }
                      }
                    }} 
                    style={{
                      ...inputStyle,
                      borderColor: errors.stock ? "#d9534f" : inputStyle.borderColor
                    }}
                    required
                  />
                  <p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
                    Enter the number of units currently available for sale
                  </p>
                  {errors.stock && (
                    <div style={{ color: "#d9534f", fontSize: "12px", marginTop: "6px" }}>{errors.stock}</div>
                  )}
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
                    <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
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
                          // Validate variant weight
                          const weightValue = e.target.value.trim();
                          const variantErrors = [...(errors.variants || [])];
                          if (!weightValue) {
                            variantErrors[i] = { ...variantErrors[i], weight: "Variant name/weight is required" };
                          } else if (weightValue.length < 1) {
                            variantErrors[i] = { ...variantErrors[i], weight: "Variant name must be at least 1 character" };
                          } else if (weightValue.length > 50) {
                            variantErrors[i] = { ...variantErrors[i], weight: "Variant name must not exceed 50 characters" };
                          } else {
                            variantErrors[i] = { ...variantErrors[i], weight: "" };
                          }
                          setErrors((prev) => ({ ...prev, variants: variantErrors }));
                        }}
                        style={{ 
                          ...inputStyle, 
                          flex: 1,
                          borderColor: errors.variants?.[i]?.weight ? "#d9534f" : inputStyle.borderColor
                        }}
                        required
                      />
                      {errors.variants?.[i]?.weight && (
                        <div style={{ color: "#d9534f", fontSize: "11px", marginTop: "2px", width: "100%" }}>
                          {errors.variants[i].weight}
                        </div>
                      )}
                      <span style={{ fontWeight: "600" }}>₹</span>
                      <input
                        type="number"
                        placeholder="Price"
                        min="1"
                        max="2000"
                        step="0.01"
                        value={v.price}
                        onChange={(e) => {
                          const updated = [...form.variants];
                          updated[i].price = e.target.value;
                          setForm({ ...form, variants: updated });
                          // Validate variant price
                          const priceValue = e.target.value;
                          const variantErrors = [...(errors.variants || [])];
                          if (!priceValue || priceValue.trim() === "") {
                            variantErrors[i] = { ...variantErrors[i], price: "Price is required" };
                          } else {
                            const priceNum = parseFloat(priceValue);
                            if (isNaN(priceNum)) {
                              variantErrors[i] = { ...variantErrors[i], price: "Price must be a valid number" };
                            } else if (priceNum < 1) {
                              variantErrors[i] = { ...variantErrors[i], price: "Price must be at least ₹1" };
                            } else if (priceNum > 2000) {
                              variantErrors[i] = { ...variantErrors[i], price: "Price cannot exceed ₹2,000" };
                            } else {
                              variantErrors[i] = { ...variantErrors[i], price: "" };
                            }
                          }
                          setErrors((prev) => ({ ...prev, variants: variantErrors }));
                        }}
                        style={{ 
                          ...inputStyle, 
                          flex: 1,
                          borderColor: errors.variants?.[i]?.price ? "#d9534f" : inputStyle.borderColor
                        }}
                        required
                      />
                      {errors.variants?.[i]?.price && (
                        <div style={{ color: "#d9534f", fontSize: "11px", marginTop: "2px", width: "100%" }}>
                          {errors.variants[i].price}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = form.variants.filter((_, idx) => idx !== i);
                          setForm({ ...form, variants: updated });
                          // Remove error for deleted variant
                          const variantErrors = [...(errors.variants || [])];
                          variantErrors.splice(i, 1);
                          setErrors((prev) => ({ ...prev, variants: variantErrors }));
                        }}
                        style={{ ...buttonPrimary, background: "#dc3545", padding: "8px 12px" }}
                        title="Remove this variant"
                      >
                        X
                      </button>
                    </div>
                  ))}
                  {form.variants.length === 0 && (
                    <div style={{ color: "#d9534f", fontSize: "12px", marginTop: "8px" }}>
                      At least one variant is required
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setForm({ ...form, variants: [...form.variants, { weight: "", price: "" }] });
                      // Initialize error for new variant
                      const variantErrors = [...(errors.variants || [])];
                      variantErrors.push({ weight: "", price: "" });
                      setErrors((prev) => ({ ...prev, variants: variantErrors }));
                    }}
                    style={{ ...buttonPrimary, background: "#5c4033", padding: "8px 16px", marginTop: "10px" }}
                  >
                    + Add Another Variant
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
                  
                  <div style={{ 
                    border: "2px dashed #ccc", 
                    borderRadius: "8px", 
                    padding: "20px", 
                    textAlign: "center", 
                    backgroundColor: "#f9f9f9",
                    cursor: "pointer",
                    transition: "border-color 0.3s"
                  }}
                  onClick={() => document.getElementById('product-image-upload')?.click()}>
                    <p style={{ margin: "0 0 10px 0", color: "#666" }}>📁 Click to upload product image</p>
                    <p style={{ margin: "0", fontSize: "12px", color: "#999" }}>Supports JPG, PNG, GIF (Max 5MB)</p>
                  </div>
                  
                  <input 
                    id="product-image-upload"
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
                        
                        // Validate file size (5MB max)
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error("Image size must be less than 5MB");
                          e.target.value = '';
                          return;
                        }
                        
                        setSelectedFile(file);
                        setCurrentImageUrl(null); // Clear current image when new one is selected
                        toast.success("Image selected successfully!");
                      }
                    }} 
                    style={{ display: "none" }} 
                    required={!editingId}
                  />
                  <p style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
                    {editingId ? "Select a new image to replace the current one (optional)" : "Upload a clear image of your product"}
                  </p>
                </div>
                <div>
                  <button disabled={loading} style={{...buttonPrimary, padding: "12px 24px", fontSize: "16px", fontWeight: "600"}}>
                    {loading ? "Saving Product..." : editingId ? "Update Product" : "Add New Product"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => { setEditingId(null); setForm({ title: "", mainCategory: "", subCategory: "", stock: "", price: "", variants: [{ weight: "", price: "" }], image: null }); setSelectedFile(null); setCurrentImageUrl(null); }}
                      style={{...buttonSecondary, marginLeft: "10px", padding: "12px 24px"}}
                    >
                      Cancel
                    </button>
                  )}
                  <p style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
                    {editingId ? "Update your product details and click 'Update Product'" : "Fill in all required fields and click 'Add New Product' to list your item"}
                  </p>
                </div>
              </form>
            </section>

            {/* Product List */}
            <section>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ margin: "0" }}>Your Products ({products.length})</h2>
                <div style={{ fontSize: "12px", color: "#666", fontStyle: "italic" }}>
                  These are your personal products only you can manage
                </div>
                <button 
                  onClick={() => {
                    const formSection = document.getElementById('product-form-section');
                    if (formSection) {
                      formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      formSection.style.transition = 'box-shadow 0.3s';
                      formSection.style.boxShadow = '0 0 0 3px #5c4033';
                      setTimeout(() => {
                        formSection.style.boxShadow = '';
                      }, 2000);
                    }
                  }}
                  style={{ ...buttonPrimary, padding: "10px 16px", fontSize: "14px" }}
                >
                  + Add New Product
                </button>
              </div>
              
              {/* Category Filter */}
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ marginBottom: "10px", fontSize: "16px", color: "#5c4033" }}>Filter by Category:</h3>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {['All', 'Snacks', 'Cakes', 'Pickles', 'Powders', 'Spices', 'Decor', 'Cards', 'Hangings'].map((category) => (
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
              
              {/* Info Box */}
              <div style={{ 
                background: "#e8f4f8", 
                border: "1px solid #bee5eb", 
                borderRadius: "8px", 
                padding: "15px", 
                marginBottom: "20px" 
              }}>
                <p style={{ margin: "0", fontSize: "14px", color: "#0c5460" }}>
                  💡 <strong>Tip:</strong> Keep your product listings updated with accurate stock levels and competitive pricing to maximize sales.
                </p>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: "20px" }}>
                {products.length === 0 ? (
                  <div style={{ 
                    gridColumn: "1 / -1", 
                    textAlign: "center", 
                    padding: "40px", 
                    background: "#fff", 
                    borderRadius: "8px" 
                  }}>
                    <div style={{ fontSize: "48px", marginBottom: "20px" }}>📦</div>
                    <h3 style={{ margin: "0 0 10px 0", color: "#5c4033" }}>No Products Listed Yet</h3>
                    <p style={{ color: "#666", marginBottom: "20px" }}>
                      Start selling by adding your first product!
                    </p>
                    <button
                      onClick={() => {
                        const formSection = document.getElementById('product-form-section');
                        if (formSection) {
                          formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          formSection.style.transition = 'box-shadow 0.3s';
                          formSection.style.boxShadow = '0 0 0 3px #5c4033';
                          setTimeout(() => {
                            formSection.style.boxShadow = '';
                          }, 2000);
                        }
                      }}
                      style={{ ...buttonPrimary, padding: "12px 24px" }}
                    >
                      + Add Your First Product
                    </button>
                  </div>
                ) : (
                  <>
                    {products
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
                      position: "relative",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      cursor: "pointer"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-5px)";
                      e.currentTarget.style.boxShadow = "0 5px 15px rgba(0,0,0,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
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
    src={`${API_BASE}/uploads/${p.image}`}
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
                      <h3 style={{ marginTop: "12px", marginBottom: "8px", fontSize: "16px" }}>{p.title}</h3>
                      <p style={{ fontSize: "14px", color: "#666", margin: "5px 0" }}>
                        Category: {p.mainCategory && p.subCategory 
                          ? `${p.mainCategory} > ${p.subCategory}`
                          : p.subCategory || p.category || "General"}
                      </p>
                      <p style={{ fontSize: "14px", color: "#5c4033", fontWeight: "600", margin: "5px 0" }}>Stock: {p.stock || "0"} units</p>
                      {p.variants && p.variants.length > 0 && (
                        <div style={{ marginTop: "8px" }}>
                          <h4 style={{ fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Variants:</h4>
                          {p.variants.map((v, idx) => (
                            <p key={idx} style={{ fontSize: "12px", color: "#555", margin: "2px 0" }}>
                              {v.weight} — ₹{v.price}
                            </p>
                          ))}
                        </div>
                      )}
                      
                      <div style={{ marginTop: "15px", display: "flex", gap: "8px", justifyContent: "center" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(p._id);
                            setForm({
                              title: p.title || "",
                              mainCategory: p.mainCategory || "",
                              subCategory: p.subCategory || "",
                              stock: p.stock || "",
                              variants: p.variants && p.variants.length > 0 
                                ? p.variants.map(v => ({ weight: v.weight || "", price: v.price || "" }))
                                : [{ weight: "", price: "" }],
                              image: null
                            });
                            setCurrentImageUrl(p.image ? `${API_BASE}/uploads/${p.image}` : (p.img ? `/images/products/${p.img}` : null));
                            setSelectedFile(null);
                            document.getElementById('product-form-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                          style={{
                            padding: "8px 16px",
                            background: "#5c4033",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: "600",
                            cursor: "pointer",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProduct(p._id);
                          }}
                          style={{
                            padding: "8px 16px",
                            background: "#dc3545",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: "600",
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    ))}
                  </>
                )}
              </div>
            </section>
          </>
        )}

        {/* Analytics Section */}
        {activeSection === "analytics" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h1 style={{ margin: 0, color: "#5c4033" }}>📈 Business Analytics</h1>
              <div style={{ fontSize: "14px", color: "#666" }}>
                Last updated: {new Date().toLocaleDateString('en-IN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>

            {/* Key Metrics Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "30px" }}>
              <div style={{
                background: "linear-gradient(135deg, #8b5e34 0%, #6f4518 100%)",
                padding: "24px",
                borderRadius: "12px",
                color: "white",
                boxShadow: "0 4px 12px rgba(92, 64, 51, 0.15)"
              }}>
                <div style={{ fontSize: "14px", opacity: "0.9", marginBottom: "8px" }}>💰 Total Revenue</div>
                <h2 style={{ margin: "0", fontSize: "32px", fontWeight: "bold" }}>
                  ₹{stats.totalRevenue.toLocaleString('en-IN')}
                </h2>
                <div style={{ fontSize: "12px", marginTop: "8px", opacity: "0.8" }}>
                  From all paid orders
                </div>
              </div>

              <div style={{
                background: "linear-gradient(135deg, #a67c52 0%, #8b5e34 100%)",
                padding: "24px",
                borderRadius: "12px",
                color: "white",
                boxShadow: "0 4px 12px rgba(92, 64, 51, 0.15)"
              }}>
                <div style={{ fontSize: "14px", opacity: "0.9", marginBottom: "8px" }}>📦 Active Orders</div>
                <h2 style={{ margin: "0", fontSize: "32px", fontWeight: "bold" }}>
                  {stats.activeOrders}
                </h2>
                <div style={{ fontSize: "12px", marginTop: "8px", opacity: "0.8" }}>
                  Currently processing
                </div>
              </div>

              <div style={{
                background: "linear-gradient(135deg, #c4a57b 0%, #a67c52 100%)",
                padding: "24px",
                borderRadius: "12px",
                color: "white",
                boxShadow: "0 4px 12px rgba(92, 64, 51, 0.15)"
              }}>
                <div style={{ fontSize: "14px", opacity: "0.9", marginBottom: "8px" }}>📅 New This Week</div>
                <h2 style={{ margin: "0", fontSize: "32px", fontWeight: "bold" }}>
                  {stats.newThisWeek}
                </h2>
                <div style={{ fontSize: "12px", marginTop: "8px", opacity: "0.8" }}>
                  Orders received
                </div>
              </div>

              <div style={{
                background: "linear-gradient(135deg, #d4a574 0%, #c4a57b 100%)",
                padding: "24px",
                borderRadius: "12px",
                color: "white",
                boxShadow: "0 4px 12px rgba(92, 64, 51, 0.15)"
              }}>
                <div style={{ fontSize: "14px", opacity: "0.9", marginBottom: "8px" }}>📦 Total Products</div>
                <h2 style={{ margin: "0", fontSize: "32px", fontWeight: "bold" }}>
                  {products.length}
                </h2>
                <div style={{ fontSize: "12px", marginTop: "8px", opacity: "0.8" }}>
                  Products listed
                </div>
              </div>
            </div>

            {/* Revenue Breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", marginBottom: "30px" }}>
              <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                <h2 style={{ margin: "0 0 20px 0", color: "#5c4033", fontSize: "20px" }}>Revenue Breakdown</h2>
                {(() => {
                  const paidOrders = orders.filter(order => 
                    order.paymentStatus === 'paid' && order.orderStatus !== 'cancelled'
                  );
                  const deliveredOrders = paidOrders.filter(order => order.orderStatus === 'delivered');
                  const pendingOrders = paidOrders.filter(order => order.orderStatus !== 'delivered');
                  
                  const deliveredRevenue = deliveredOrders.reduce((sum, order) => {
                    return sum + (Number(order.finalAmount ?? order.total ?? order.totalAmount ?? 0) || 0);
                  }, 0);
                  
                  const pendingRevenue = pendingOrders.reduce((sum, order) => {
                    return sum + (Number(order.finalAmount ?? order.total ?? order.totalAmount ?? 0) || 0);
                  }, 0);

                  return (
                    <div>
                      <div style={{ marginBottom: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <span style={{ color: "#666" }}>✅ Delivered Orders</span>
                          <span style={{ fontWeight: "600", color: "#5c4033" }}>
                            ₹{deliveredRevenue.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div style={{ 
                          height: "8px", 
                          background: "#e0e0e0", 
                          borderRadius: "4px",
                          overflow: "hidden"
                        }}>
                          <div style={{
                            height: "100%",
                            width: `${stats.totalRevenue > 0 ? (deliveredRevenue / stats.totalRevenue * 100) : 0}%`,
                            background: "linear-gradient(90deg, #8b5e34, #6f4518)",
                            transition: "width 0.3s ease"
                          }} />
                        </div>
                        <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
                          {deliveredOrders.length} orders
                        </div>
                      </div>

                      <div style={{ marginBottom: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <span style={{ color: "#666" }}>⏳ Pending Delivery</span>
                          <span style={{ fontWeight: "600", color: "#5c4033" }}>
                            ₹{pendingRevenue.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div style={{ 
                          height: "8px", 
                          background: "#e0e0e0", 
                          borderRadius: "4px",
                          overflow: "hidden"
                        }}>
                          <div style={{
                            height: "100%",
                            width: `${stats.totalRevenue > 0 ? (pendingRevenue / stats.totalRevenue * 100) : 0}%`,
                            background: "linear-gradient(90deg, #d4a574, #c4a57b)",
                            transition: "width 0.3s ease"
                          }} />
                        </div>
                        <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
                          {pendingOrders.length} orders
                        </div>
                      </div>

                      <div style={{ 
                        marginTop: "20px", 
                        padding: "16px", 
                        background: "#f8f9fa", 
                        borderRadius: "8px",
                        border: "1px solid #e0e0e0"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: "600", color: "#5c4033" }}>Total Revenue</span>
                          <span style={{ fontSize: "20px", fontWeight: "bold", color: "#5c4033" }}>
                            ₹{stats.totalRevenue.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                <h2 style={{ margin: "0 0 20px 0", color: "#5c4033", fontSize: "20px" }}>Order Status</h2>
                {(() => {
                  const statusCounts = {
                    pending: orders.filter(o => o.orderStatus === 'pending').length,
                    confirmed: orders.filter(o => o.orderStatus === 'confirmed').length,
                    shipped: orders.filter(o => o.orderStatus === 'shipped').length,
                    delivered: orders.filter(o => o.orderStatus === 'delivered').length,
                    cancelled: orders.filter(o => o.orderStatus === 'cancelled').length,
                  };
                  const totalOrders = orders.length;

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {Object.entries(statusCounts).map(([status, count]) => {
                        const percentage = totalOrders > 0 ? (count / totalOrders * 100) : 0;
                        const statusColors = {
                          pending: "#d4a574",
                          confirmed: "#a67c52",
                          shipped: "#8b5e34",
                          delivered: "#6f4518",
                          cancelled: "#5c4033"
                        };
                        return (
                          <div key={status}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <span style={{ 
                                color: "#666", 
                                textTransform: "capitalize",
                                fontSize: "14px"
                              }}>
                                {status}
                              </span>
                              <span style={{ fontWeight: "600", color: "#5c4033" }}>
                                {count} ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div style={{ 
                              height: "6px", 
                              background: "#e0e0e0", 
                              borderRadius: "3px",
                              overflow: "hidden"
                            }}>
                              <div style={{
                                height: "100%",
                                width: `${percentage}%`,
                                background: statusColors[status] || "#999",
                                transition: "width 0.3s ease"
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Recent Orders Performance */}
            <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", marginBottom: "30px" }}>
              <h2 style={{ margin: "0 0 20px 0", color: "#5c4033", fontSize: "20px" }}>Recent Orders Performance</h2>
              {orders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
                  <p>No orders yet. Start selling to see your analytics!</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
                        <th style={{ padding: "12px", textAlign: "left", color: "#5c4033", fontWeight: "600" }}>Order #</th>
                        <th style={{ padding: "12px", textAlign: "left", color: "#5c4033", fontWeight: "600" }}>Date</th>
                        <th style={{ padding: "12px", textAlign: "left", color: "#5c4033", fontWeight: "600" }}>Status</th>
                        <th style={{ padding: "12px", textAlign: "right", color: "#5c4033", fontWeight: "600" }}>Amount</th>
                        <th style={{ padding: "12px", textAlign: "left", color: "#5c4033", fontWeight: "600" }}>Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 10).map((order) => {
                        const statusColors = {
                          pending: "#d4a574",
                          confirmed: "#a67c52",
                          shipped: "#8b5e34",
                          delivered: "#6f4518",
                          cancelled: "#5c4033",
                          rejected: "#5c4033"
                        };
                        return (
                          <tr key={order._id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                            <td style={{ padding: "12px", color: "#666" }}>
                              #{order.orderNumber || order._id?.substring(0, 8)}
                            </td>
                            <td style={{ padding: "12px", color: "#666" }}>
                              {new Date(order.createdAt).toLocaleDateString('en-IN')}
                            </td>
                            <td style={{ padding: "12px" }}>
                              <span style={{
                                padding: "4px 12px",
                                borderRadius: "12px",
                                fontSize: "12px",
                                fontWeight: "600",
                                background: statusColors[order.orderStatus] || "#999",
                                color: "white",
                                textTransform: "capitalize"
                              }}>
                                {order.orderStatus}
                              </span>
                            </td>
                            <td style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: "#5c4033" }}>
                              ₹{(order.finalAmount || order.total || order.totalAmount || 0).toLocaleString('en-IN')}
                            </td>
                            <td style={{ padding: "12px" }}>
                              <span style={{
                                padding: "4px 12px",
                                borderRadius: "12px",
                                fontSize: "12px",
                                fontWeight: "600",
                                background: order.paymentStatus === 'paid' ? "#8b5e34" : "#d4a574",
                                color: "white",
                                textTransform: "capitalize"
                              }}>
                                {order.paymentStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Product Performance */}
            <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
              <h2 style={{ margin: "0 0 20px 0", color: "#5c4033", fontSize: "20px" }}>Product Performance</h2>
              {products.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>📦</div>
                  <p>No products yet. Add products to track their performance!</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
                  {products.slice(0, 6).map((product) => {
                    const productOrders = orders.filter(order => 
                      order.items?.some(item => item.productId === product._id || item.title === product.title)
                    );
                    const productRevenue = productOrders
                      .filter(order => order.paymentStatus === 'paid' && order.orderStatus !== 'cancelled')
                      .reduce((sum, order) => {
                        const item = order.items?.find(i => i.productId === product._id || i.title === product.title);
                        if (item) {
                          return sum + ((item.variant?.price || 0) * (item.quantity || 0));
                        }
                        return sum;
                      }, 0);

                    return (
                      <div key={product._id} style={{
                        padding: "16px",
                        border: "1px solid #e0e0e0",
                        borderRadius: "8px",
                        background: "#f8f9fa"
                      }}>
                        <div style={{ fontWeight: "600", color: "#5c4033", marginBottom: "8px", fontSize: "14px" }}>
                          {product.title}
                        </div>
                        <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
                          Orders: {productOrders.length}
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#5c4033" }}>
                          Revenue: ₹{productRevenue.toLocaleString('en-IN')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Reviews Section */}
        {activeSection === "reviews" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h1 style={{ margin: 0, color: "#5c4033" }}>⭐ Customer Reviews</h1>
              <div style={{ fontSize: "14px", color: "#666" }}>
                Reviews from your customers
              </div>
            </div>

            {(() => {
              // Get all reviews from orders
              const reviews = orders
                .filter(order => order.rating && order.rating.value)
                .map(order => ({
                  ...order.rating,
                  orderId: order._id,
                  orderNumber: order.orderNumber,
                  orderDate: order.createdAt,
                  customerName: order.buyerDetails?.name || "Customer",
                  customerEmail: order.buyerDetails?.email || "",
                  items: order.items || [],
                  totalAmount: order.finalAmount || order.total || order.totalAmount || 0
                }))
                .sort((a, b) => new Date(b.ratedAt || b.orderDate) - new Date(a.ratedAt || a.orderDate));

              const totalReviews = reviews.length;
              const averageRating = totalReviews > 0
                ? (reviews.reduce((sum, r) => sum + (r.value || 0), 0) / totalReviews).toFixed(1)
                : 0;
              
              const ratingDistribution = {
                5: reviews.filter(r => r.value === 5).length,
                4: reviews.filter(r => r.value === 4).length,
                3: reviews.filter(r => r.value === 3).length,
                2: reviews.filter(r => r.value === 2).length,
                1: reviews.filter(r => r.value === 1).length
              };

              return (
                <>
                  {/* Review Statistics */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "30px" }}>
                    <div style={{
                      background: "linear-gradient(135deg, #8b5e34 0%, #6f4518 100%)",
                      padding: "24px",
                      borderRadius: "12px",
                      color: "white",
                      boxShadow: "0 4px 12px rgba(92, 64, 51, 0.15)"
                    }}>
                      <div style={{ fontSize: "14px", opacity: "0.9", marginBottom: "8px" }}>⭐ Average Rating</div>
                      <h2 style={{ margin: "0", fontSize: "32px", fontWeight: "bold" }}>
                        {averageRating}
                      </h2>
                      <div style={{ fontSize: "12px", marginTop: "8px", opacity: "0.8" }}>
                        Out of 5.0 stars
                      </div>
                    </div>

                    <div style={{
                      background: "linear-gradient(135deg, #a67c52 0%, #8b5e34 100%)",
                      padding: "24px",
                      borderRadius: "12px",
                      color: "white",
                      boxShadow: "0 4px 12px rgba(92, 64, 51, 0.15)"
                    }}>
                      <div style={{ fontSize: "14px", opacity: "0.9", marginBottom: "8px" }}>📝 Total Reviews</div>
                      <h2 style={{ margin: "0", fontSize: "32px", fontWeight: "bold" }}>
                        {totalReviews}
                      </h2>
                      <div style={{ fontSize: "12px", marginTop: "8px", opacity: "0.8" }}>
                        Customer reviews received
                      </div>
                    </div>

                    <div style={{
                      background: "linear-gradient(135deg, #c4a57b 0%, #a67c52 100%)",
                      padding: "24px",
                      borderRadius: "12px",
                      color: "white",
                      boxShadow: "0 4px 12px rgba(92, 64, 51, 0.15)"
                    }}>
                      <div style={{ fontSize: "14px", opacity: "0.9", marginBottom: "8px" }}>⭐ 5-Star Reviews</div>
                      <h2 style={{ margin: "0", fontSize: "32px", fontWeight: "bold" }}>
                        {ratingDistribution[5]}
                      </h2>
                      <div style={{ fontSize: "12px", marginTop: "8px", opacity: "0.8" }}>
                        {totalReviews > 0 ? Math.round((ratingDistribution[5] / totalReviews) * 100) : 0}% of total
                      </div>
                    </div>
                  </div>

                  {/* Rating Distribution */}
                  <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", marginBottom: "30px" }}>
                    <h2 style={{ margin: "0 0 20px 0", color: "#5c4033", fontSize: "20px" }}>Rating Distribution</h2>
                    {totalReviews === 0 ? (
                      <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⭐</div>
                        <p>No reviews yet. Reviews will appear here once customers rate their orders.</p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {[5, 4, 3, 2, 1].map((rating) => {
                          const count = ratingDistribution[rating];
                          const percentage = totalReviews > 0 ? (count / totalReviews * 100) : 0;
                          return (
                            <div key={rating}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{ fontWeight: "600", color: "#5c4033", minWidth: "60px" }}>
                                    {rating} ⭐
                                  </span>
                                  <span style={{ fontSize: "12px", color: "#999" }}>
                                    {count} {count === 1 ? 'review' : 'reviews'}
                                  </span>
                                </div>
                                <span style={{ fontWeight: "600", color: "#5c4033" }}>
                                  {percentage.toFixed(1)}%
                                </span>
                              </div>
                              <div style={{ 
                                height: "8px", 
                                background: "#e0e0e0", 
                                borderRadius: "4px",
                                overflow: "hidden"
                              }}>
                                <div style={{
                                  height: "100%",
                                  width: `${percentage}%`,
                                  background: "linear-gradient(90deg, #d4a574, #8b5e34)",
                                  transition: "width 0.3s ease"
                                }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Reviews List */}
                  <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                    <h2 style={{ margin: "0 0 20px 0", color: "#5c4033", fontSize: "20px" }}>All Reviews</h2>
                    {totalReviews === 0 ? (
                      <div style={{ textAlign: "center", padding: "60px 20px", color: "#666" }}>
                        <div style={{ fontSize: "64px", marginBottom: "20px" }}>⭐</div>
                        <h3 style={{ color: "#5c4033", marginBottom: "10px" }}>No Reviews Yet</h3>
                        <p style={{ color: "#666", maxWidth: "400px", margin: "0 auto" }}>
                          You haven't received any customer reviews yet. Reviews will appear here once customers rate their delivered orders.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {reviews.map((review, index) => {
                          const order = orders.find(o => o._id === review.orderId);
                          return (
                            <div
                              key={review.orderId || index}
                              style={{
                                padding: "20px",
                                border: "1px solid #e0e0e0",
                                borderRadius: "12px",
                                background: "#f8f9fa",
                                transition: "all 0.2s"
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = "#8b5e34";
                                e.currentTarget.style.boxShadow = "0 4px 12px rgba(92, 64, 51, 0.1)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = "#e0e0e0";
                                e.currentTarget.style.boxShadow = "none";
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                                    <div style={{
                                      width: "40px",
                                      height: "40px",
                                      borderRadius: "50%",
                                      background: "linear-gradient(135deg, #d4a574, #8b5e34)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: "white",
                                      fontWeight: "bold",
                                      fontSize: "16px"
                                    }}>
                                      {review.customerName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: "600", color: "#5c4033", fontSize: "16px" }}>
                                        {review.customerName}
                                      </div>
                                      <div style={{ fontSize: "12px", color: "#999" }}>
                                        Order #{review.orderNumber || review.orderId?.substring(0, 8)}
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <span
                                        key={star}
                                        style={{
                                          fontSize: "20px",
                                          color: star <= (review.value || 0) ? "#d4a574" : "#e0e0e0"
                                        }}
                                      >
                                        ⭐
                                      </span>
                                    ))}
                                    <span style={{ marginLeft: "8px", fontSize: "14px", color: "#666", fontWeight: "600" }}>
                                      {review.value}/5
                                    </span>
                                  </div>
                                  {review.review && (
                                    <p style={{
                                      margin: "8px 0 0 0",
                                      color: "#666",
                                      lineHeight: "1.6",
                                      fontSize: "14px"
                                    }}>
                                      "{review.review}"
                                    </p>
                                  )}
                                </div>
                                <div style={{ textAlign: "right", fontSize: "12px", color: "#999" }}>
                                  {review.ratedAt
                                    ? new Date(review.ratedAt).toLocaleDateString('en-IN', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                      })
                                    : review.orderDate
                                    ? new Date(review.orderDate).toLocaleDateString('en-IN', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                      })
                                    : 'N/A'}
                                </div>
                              </div>
                              {order && order.items && order.items.length > 0 && (
                                <div style={{
                                  marginTop: "12px",
                                  padding: "12px",
                                  background: "#fff",
                                  borderRadius: "8px",
                                  border: "1px solid #e0e0e0"
                                }}>
                                  <div style={{ fontSize: "12px", color: "#999", marginBottom: "6px" }}>Ordered Items:</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                    {order.items.slice(0, 3).map((item, idx) => (
                                      <span
                                        key={idx}
                                        style={{
                                          padding: "4px 10px",
                                          background: "#f0f0f0",
                                          borderRadius: "12px",
                                          fontSize: "12px",
                                          color: "#666"
                                        }}
                                      >
                                        {item.title}
                                      </span>
                                    ))}
                                    {order.items.length > 3 && (
                                      <span style={{
                                        padding: "4px 10px",
                                        background: "#f0f0f0",
                                        borderRadius: "12px",
                                        fontSize: "12px",
                                        color: "#666"
                                      }}>
                                        +{order.items.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </>
        )}

        {/* Notifications Section */}
        {activeSection === "notifications" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h1 style={{ margin: 0, color: "#5c4033" }}>Notifications</h1>
              {unreadCount > 0 && (
                <button
                  onClick={async () => {
                    try {
                      const token = await auth.currentUser.getIdToken();
                      await fetch(`${API_BASE}/api/seller/orders/notifications/read-all`, {
                        method: "PATCH",
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      await fetchNotifications(auth.currentUser);
                      toast.success("All notifications marked as read");
                    } catch (error) {
                      console.error("Error marking all as read:", error);
                    }
                  }}
                  style={{
                    padding: "8px 16px",
                    background: "#5c4033",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  Mark All as Read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div style={{
                background: "#fff",
                padding: "60px 20px",
                borderRadius: "12px",
                textAlign: "center",
                border: "1px solid #ddd"
              }}>
                <div style={{ fontSize: "48px", marginBottom: "20px" }}>🔔</div>
                <h3 style={{ color: "#5c4033", marginBottom: "10px" }}>No Notifications</h3>
                <p style={{ color: "#666" }}>You don't have any notifications yet.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    onClick={() => viewNotificationDetails(notification)}
                    style={{
                      background: notification.read ? "#fff" : "#f0f8ff",
                      border: notification.read ? "1px solid #ddd" : "2px solid #5c4033",
                      borderRadius: "12px",
                      padding: "20px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      position: "relative"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {!notification.read && (
                      <div style={{
                        position: "absolute",
                        top: "12px",
                        right: "12px",
                        width: "12px",
                        height: "12px",
                        background: "#dc3545",
                        borderRadius: "50%"
                      }}></div>
                    )}
                    <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                      <div style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        background: notification.actionRequired ? "#fff3cd" : "#e6f4ea",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "24px",
                        flexShrink: 0
                      }}>
                        {notification.type === 'new_order' ? '🎉' : 
                         notification.type === 'order_moved_to_hub' ? '📦' : 
                         notification.type === 'order_approved' ? '✅' : '🔔'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                          <h3 style={{ 
                            margin: 0, 
                            color: "#5c4033", 
                            fontSize: "16px",
                            fontWeight: notification.read ? "500" : "600"
                          }}>
                            {notification.title}
                          </h3>
                          <span style={{ fontSize: "12px", color: "#999" }}>
                            {new Date(notification.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p style={{ 
                          margin: "8px 0", 
                          color: "#666", 
                          fontSize: "14px",
                          lineHeight: "1.5"
                        }}>
                          {notification.message}
                        </p>
                        {notification.actionRequired && (
                          <div style={{
                            marginTop: "12px",
                            padding: "8px 12px",
                            background: "#fff3cd",
                            borderRadius: "6px",
                            fontSize: "13px",
                            color: "#856404",
                            fontWeight: "500"
                          }}>
                            ⚠️ Action Required: {notification.actionType === 'move_to_hub' ? 'Move products to hub' : 'Review order'}
                          </div>
                        )}
                        {notification.metadata && (
                          <div style={{ marginTop: "12px", fontSize: "13px", color: "#666" }}>
                            {notification.metadata.orderAmount && (
                              <span style={{ marginRight: "16px" }}>
                                <strong>Amount:</strong> ₹{notification.metadata.orderAmount}
                              </span>
                            )}
                            {notification.metadata.itemCount && (
                              <span>
                                <strong>Items:</strong> {notification.metadata.itemCount}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Orders Section */}
        {activeSection === "orders" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h1 style={{ margin: 0, color: "#5c4033" }}>Order Management</h1>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <span style={{ fontSize: "14px", color: "#666" }}>
                  {orders.length} total orders
                </span>
                <button
                  onClick={() => fetchOrders(auth.currentUser)}
                  style={{
                    padding: "8px 16px",
                    background: "#5c4033",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            {orders.length === 0 ? (
              <div style={{
                background: "#fff",
                padding: "60px 20px",
                borderRadius: "12px",
                textAlign: "center",
                border: "2px dashed #ddd"
              }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📦</div>
                <h2 style={{ color: "#5c4033", marginBottom: "8px" }}>No Orders Yet</h2>
                <p style={{ color: "#666", marginBottom: "20px" }}>
                  Orders for your products will appear here. Make sure your products are active and visible to customers.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "16px" }}>
                {orders.map((order) => (
                  <div key={order._id} style={{
                    background: "#fff",
                    border: "1px solid #eee",
                    borderRadius: "12px",
                    padding: "20px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    transition: "transform 0.2s, box-shadow 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
                  }}>
                    
                    {/* Order Header */}
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "flex-start",
                      marginBottom: "16px",
                      paddingBottom: "16px",
                      borderBottom: "1px solid #f0f0f0"
                    }}>
                      <div>
                        <h3 style={{ margin: "0 0 8px 0", color: "#5c4033", fontSize: "18px" }}>
                          Order #{order.orderNumber}
                        </h3>
                        <div style={{ display: "flex", gap: "20px", fontSize: "14px", color: "#666" }}>
                          <span><strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</span>
                          <span><strong>Customer:</strong> {order.buyerDetails.name}</span>
                          <span><strong>Amount:</strong> ₹{order.finalAmount}</span>
                        </div>
                      </div>
                      
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                        {/* Order Status Badge */}
                        <span style={{
                          padding: "4px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "600",
                          background: order.orderStatus === 'delivered' ? '#d4edda' : 
                                     order.orderStatus === 'cancelled' ? '#f8d7da' :
                                     order.orderStatus === 'at_seller_hub' ? '#fff3cd' :
                                     order.orderStatus === 'pending' ? '#e2e3e5' : '#cce5ff',
                          color: order.orderStatus === 'delivered' ? '#155724' : 
                                order.orderStatus === 'cancelled' ? '#721c24' :
                                order.orderStatus === 'at_seller_hub' ? '#856404' :
                                order.orderStatus === 'pending' ? '#6c757d' : '#004085'
                        }}>
                          {order.orderStatus.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        
                        {/* Hub Status */}
                        {order.hubTracking?.sellerHubName && (
                          <span style={{
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            background: "#e3f2fd",
                            color: "#1976d2",
                            border: "1px solid #bbdefb"
                          }}>
                            📍 {order.hubTracking.sellerHubName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Order Items Preview */}
                    <div style={{ marginBottom: "16px" }}>
                      <h4 style={{ margin: "0 0 12px 0", color: "#5c4033", fontSize: "16px" }}>
                        Items ({order.items.length})
                      </h4>
                      <div style={{ display: "grid", gap: "12px" }}>
                        {order.items.slice(0, 2).map((item, index) => (
                          <div key={index} style={{
                            display: "flex",
                            gap: "12px",
                            alignItems: "center",
                            padding: "12px",
                            background: "#f8f9fa",
                            borderRadius: "8px",
                            border: "1px solid #e9ecef"
                          }}>
                            {/* Product Image */}
                            <div style={{ flexShrink: 0 }}>
                              {item.image ? (
                                <img
                                  src={item.image.startsWith('http') ? item.image : `${API_BASE}/uploads/${item.image}`}
                                  alt={item.title}
                                  style={{
                                    width: "50px",
                                    height: "50px",
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
                                width: "50px",
                                height: "50px",
                                backgroundColor: "#e9ecef",
                                display: item.image ? "none" : "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: "6px",
                                fontSize: "10px",
                                color: "#6c757d"
                              }}>
                                📦
                              </div>
                            </div>

                            {/* Product Details */}
                            <div style={{ flex: 1 }}>
                              <h5 style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#5c4033" }}>
                                {item.title}
                              </h5>
                              <div style={{ fontSize: "12px", color: "#666" }}>
                                <span>Qty: {item.quantity}</span>
                                {item.variant && (
                                  <span style={{ marginLeft: "12px" }}>
                                    {item.variant.weight} - ₹{item.variant.price}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Item Total */}
                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#5c4033" }}>
                              ₹{(item.variant?.price || 0) * item.quantity}
                            </div>
                          </div>
                        ))}
                        
                        {order.items.length > 2 && (
                          <div style={{
                            padding: "8px 12px",
                            background: "#f8f9fa",
                            borderRadius: "6px",
                            textAlign: "center",
                            fontSize: "12px",
                            color: "#666",
                            border: "1px dashed #dee2e6"
                          }}>
                            +{order.items.length - 2} more items
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Customer Details */}
                    <div style={{ 
                      marginBottom: "16px",
                      padding: "12px",
                      background: "#f8f9fa",
                      borderRadius: "8px",
                      border: "1px solid #e9ecef"
                    }}>
                      <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#5c4033" }}>
                        📍 Delivery Address
                      </h4>
                      <p style={{ margin: "0", fontSize: "13px", color: "#666" }}>
                        {order.buyerDetails.address.street}, {order.buyerDetails.address.city}, 
                        {order.buyerDetails.address.state} - {order.buyerDetails.address.pincode}
                      </p>
                      <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#666" }}>
                        📞 {order.buyerDetails.phone}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderModal(true);
                        }}
                        style={{
                          padding: "8px 16px",
                          background: "#6c757d",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "13px"
                        }}
                      >
                        👁️ View Details
                      </button>
                      
                      {/* Move to Hub Button */}
                      {order.orderStatus === 'pending' || order.orderStatus === 'confirmed' ? (
                        <button
                          onClick={async () => {
                            try {
                              const token = await auth.currentUser.getIdToken();
                              
                              // First get nearest hub
                              const hubResponse = await fetch(`${API_BASE}/api/seller/orders/nearest-hub`, {
                                headers: { Authorization: `Bearer ${token}` }
                              });
                              
                              if (!hubResponse.ok) {
                                const errorData = await hubResponse.json();
                                if (errorData.sellerLocationMissing) {
                                  toast.error("Please set your location first in Account Settings");
                                  setActiveSection("settings");
                                  return;
                                }
                                throw new Error(errorData.error || 'Failed to find nearest hub');
                              }
                              
                              const hubData = await hubResponse.json();
                              
                              if (!hubData.nearestHub) {
                                toast.error("No active hubs found in your area");
                                return;
                              }
                              
                              // Move order to hub
                              const moveResponse = await fetch(`${API_BASE}/api/seller/orders/${order._id}/move-to-hub`, {
                                method: "PATCH",
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                  "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                  hubId: hubData.nearestHub.hubId  // This should be the hub's hubId field (like "HUB0001")
                                })
                              });
                              
                              if (moveResponse.ok) {
                                toast.success(`Order moved to ${hubData.nearestHub.name} hub successfully!`);
                                await fetchOrders(auth.currentUser);
                              } else {
                                const errorData = await moveResponse.json();
                                toast.error(errorData.error || "Failed to move order to hub");
                              }
                            } catch (error) {
                              console.error("Error moving order to hub:", error);
                              toast.error("Failed to move order to hub");
                            }
                          }}
                          style={{
                            padding: "8px 16px",
                            background: "#28a745",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "600"
                          }}
                        >
                          🚚 Move to Hub
                        </button>
                      ) : order.hubTracking?.sellerHubName ? (
                        <span style={{
                          padding: "8px 16px",
                          background: "var(--accent-soft, #f3e7dc)",
                          color: "var(--brand, #8b5e34)",
                          border: "1px solid var(--border, #ead9c9)",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: "600"
                        }}>
                          ✅ At {order.hubTracking.sellerHubName}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Settings Section */}
        {activeSection === "settings" && (
          <>
            <h1 style={{ marginBottom: "20px", color: "#5c4033" }}>Account Settings</h1>
            
            {/* Location Management */}
            <section style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "30px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ margin: 0, color: "#5c4033" }}>📍 Seller Location</h2>
                {!sellerLocation && (
                  <div style={{
                    padding: "8px 16px",
                    background: "#fff3cd",
                    border: "1px solid #ffc107",
                    borderRadius: "6px",
                    fontSize: "14px",
                    color: "#856404",
                    fontWeight: "500"
                  }}>
                    ⚠️ Location Required
                  </div>
                )}
              </div>

              {!sellerLocation ? (
                <div style={{
                  padding: "20px",
                  background: "#fff8e6",
                  border: "1px solid #ffd54f",
                  borderRadius: "8px",
                  marginBottom: "20px"
                }}>
                  <p style={{ margin: "0 0 15px 0", color: "#856404", fontSize: "14px" }}>
                    <strong>⚠️ Location Not Set:</strong> Your location is required to find the nearest hub for order delivery. 
                    Please add your business address below.
                  </p>
                </div>
              ) : (
                <div style={{
                  padding: "20px",
                  background: "#e6f4ea",
                  border: "1px solid #4caf50",
                  borderRadius: "8px",
                  marginBottom: "20px"
                }}>
                  <h3 style={{ margin: "0 0 10px 0", color: "#1e7e34", fontSize: "16px" }}>✅ Current Location</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", fontSize: "14px" }}>
                    <div>
                      <strong>Address:</strong> {sellerLocation.address?.street}, {sellerLocation.address?.city}, {sellerLocation.address?.state} - {sellerLocation.address?.pincode}
                    </div>
                    <div>
                      <strong>District:</strong> {sellerLocation.district || "Not specified"}
                    </div>
                    {sellerLocation.coordinates && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <strong>Coordinates:</strong> {sellerLocation.coordinates.latitude?.toFixed(6)}, {sellerLocation.coordinates.longitude?.toFixed(6)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={async (e) => { 
                e.preventDefault(); 
                await updateSellerLocation();
              }} style={{ display: "grid", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={locationForm.street}
                    onChange={(e) => setLocationForm({ ...locationForm, street: e.target.value })}
                    placeholder="Enter your street address"
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                      City *
                    </label>
                    <input
                      type="text"
                      value={locationForm.city}
                      onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                      placeholder="City"
                      style={inputStyle}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                      State *
                    </label>
                    <input
                      type="text"
                      value={locationForm.state}
                      onChange={(e) => setLocationForm({ ...locationForm, state: e.target.value })}
                      placeholder="State"
                      style={inputStyle}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                      Pincode * (6 digits)
                    </label>
                    <input
                      type="text"
                      value={locationForm.pincode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setLocationForm({ ...locationForm, pincode: value });
                      }}
                      placeholder="6-digit pincode"
                      style={inputStyle}
                      maxLength="6"
                      required
                    />
                    <p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
                      Your location will be automatically determined from the pincode
                    </p>
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                      Country
                    </label>
                    <input
                      type="text"
                      value={locationForm.country}
                      readOnly
                      style={{ ...inputStyle, background: "#f5f5f5", cursor: "not-allowed" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <button
                    type="submit"
                    disabled={locationLoading}
                    style={{
                      ...buttonPrimary,
                      padding: "12px 24px",
                      fontSize: "16px",
                      opacity: locationLoading ? 0.6 : 1,
                      cursor: locationLoading ? "not-allowed" : "pointer"
                    }}
                  >
                    {locationLoading ? "Updating..." : sellerLocation ? "Update Location" : "Save Location"}
                  </button>
                </div>
              </form>

              <div style={{
                marginTop: "20px",
                padding: "15px",
                background: "#e3f2fd",
                border: "1px solid #2196f3",
                borderRadius: "8px",
                fontSize: "14px",
                color: "#1976d2"
              }}>
                <strong>💡 Why is location important?</strong>
                <p style={{ margin: "8px 0 0 0" }}>
                  Your location helps us find the nearest district hub for order delivery. 
                  This ensures faster and more efficient order processing.
                </p>
              </div>
            </section>

            {/* Other Settings */}
            <section style={{ background: "#fff", padding: "24px", borderRadius: "12px" }}>
              <h2 style={{ marginBottom: "20px", color: "#5c4033" }}>Other Settings</h2>
              <div style={{ display: "grid", gap: "15px" }}>
                <button style={{ ...buttonPrimary, background: "#5c4033", textAlign: "left", padding: "12px 16px" }}>
                  🔐 Change Password
                </button>
                <button style={{ ...buttonPrimary, background: "#dc3545", textAlign: "left", padding: "12px 16px" }}>
                  🗑️ Deactivate Account
                </button>
              </div>
            </section>
          </>
        )}

        </div>
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
                          src={item.image.startsWith('http') ? item.image : `${API_BASE}/uploads/${item.image}`}
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

            {/* Hub Tracking Information */}
            {selectedOrder.hubTracking && (
              <div style={{ marginTop: "20px" }}>
                <h3 style={{ marginBottom: "15px", color: "#5c4033" }}>🚚 Hub Tracking</h3>
                <div style={{
                  padding: "16px",
                  background: "#e3f2fd",
                  border: "1px solid #2196f3",
                  borderRadius: "8px"
                }}>
                  {selectedOrder.hubTracking.sellerHubName && (
                    <div style={{ marginBottom: "8px" }}>
                      <strong>Current Hub:</strong> {selectedOrder.hubTracking.sellerHubName}
                      <span style={{ marginLeft: "8px", fontSize: "12px", color: "#666" }}>
                        ({selectedOrder.hubTracking.sellerHubDistrict})
                      </span>
                    </div>
                  )}
                  {selectedOrder.hubTracking.arrivedAtSellerHub && (
                    <div style={{ marginBottom: "8px", fontSize: "14px", color: "#666" }}>
                      <strong>Arrived at Hub:</strong> {new Date(selectedOrder.hubTracking.arrivedAtSellerHub).toLocaleString()}
                    </div>
                  )}
                  <div style={{ fontSize: "14px", color: "#666" }}>
                    <strong>Status:</strong> 
                    <span style={{
                      marginLeft: "8px",
                      padding: "4px 8px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      background: selectedOrder.hubTracking.currentLocation === 'seller_hub' ? '#fff3cd' : 'var(--accent-soft, #f3e7dc)',
                      color: selectedOrder.hubTracking.currentLocation === 'seller_hub' ? '#856404' : 'var(--brand, #8b5e34)'
                    }}>
                      {selectedOrder.hubTracking.currentLocation?.replace(/_/g, ' ').toUpperCase() || 'PROCESSING'}
                    </span>
                  </div>
                </div>
              </div>
            )}

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
            <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "space-between" }}>
              <div>
                {/* Move to Hub Button */}
                {(selectedOrder.orderStatus === 'pending' || selectedOrder.orderStatus === 'confirmed') && !selectedOrder.hubTracking?.sellerHubId && (
                  <button
                    onClick={async () => {
                      try {
                        const token = await auth.currentUser.getIdToken();
                        
                        // First get nearest hub
                        const hubResponse = await fetch(`${API_BASE}/api/seller/orders/nearest-hub`, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        
                        if (!hubResponse.ok) {
                          const errorData = await hubResponse.json();
                          if (errorData.sellerLocationMissing) {
                            toast.error("Please set your location first in Account Settings");
                            closeOrderModal();
                            setActiveSection("settings");
                            return;
                          }
                          throw new Error(errorData.error || 'Failed to find nearest hub');
                        }
                        
                        const hubData = await hubResponse.json();
                        
                        if (!hubData.nearestHub) {
                          toast.error("No active hubs found in your area");
                          return;
                        }
                        
                        // Confirm with user
                        if (!confirm(`Move this order to ${hubData.nearestHub.name} hub (${hubData.nearestHub.distance} km away)?`)) {
                          return;
                        }
                        
                        // Move order to hub
                        const moveResponse = await fetch(`${API_BASE}/api/seller/orders/${selectedOrder._id}/move-to-hub`, {
                          method: "PATCH",
                          headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json"
                          },
                          body: JSON.stringify({
                            hubId: hubData.nearestHub.hubId  // This should be the hub's hubId field (like "HUB0001")
                          })
                        });
                        
                        if (moveResponse.ok) {
                          toast.success(`Order moved to ${hubData.nearestHub.name} hub successfully!`);
                          closeOrderModal();
                          await fetchOrders(auth.currentUser);
                        } else {
                          const errorData = await moveResponse.json();
                          toast.error(errorData.error || "Failed to move order to hub");
                        }
                      } catch (error) {
                        console.error("Error moving order to hub:", error);
                        toast.error("Failed to move order to hub");
                      }
                    }}
                    style={{
                      padding: "10px 20px",
                      background: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600"
                    }}
                  >
                    🚚 Move to Nearest Hub
                  </button>
                )}
                
                {/* Hub Status Display */}
                {selectedOrder.hubTracking?.sellerHubName && (
                  <span style={{
                    padding: "10px 20px",
                    background: "var(--accent-soft, #f3e7dc)",
                    color: "var(--brand, #8b5e34)",
                    border: "1px solid var(--border, #ead9c9)",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "600"
                  }}>
                    ✅ At {selectedOrder.hubTracking.sellerHubName} Hub
                  </span>
                )}
              </div>
              
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
