import React, { useEffect, useState, useRef } from "react";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { signOut } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { useConfirm } from "../context/ConfirmContext";
import SalesPredictionDashboard from "../components/SalesPredictionDashboard";
import SellerApplications from "../components/SellerApplications";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function UpdatedAdminDashboard() {
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
  const [errors, setErrors] = useState({ title: "" });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
    
    // Seller Management State
    const [pendingApplications, setPendingApplications] = useState([]);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [showApplicationModal, setShowApplicationModal] = useState(false);
    const [approvedSellers, setApprovedSellers] = useState([]);
    const [sellerProducts, setSellerProducts] = useState({});
    const [loadingSellers, setLoadingSellers] = useState(false);
    const [expandedSeller, setExpandedSeller] = useState(null);
  
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

  // Hub Management State
  const [hubs, setHubs] = useState([]);
  const [hubManagers, setHubManagers] = useState([]);
  const [activeHubTab, setActiveHubTab] = useState("pending");
  const [showCreateManager, setShowCreateManager] = useState(false);
  const [newManager, setNewManager] = useState({
    name: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    hubId: ""
  });

  // Hub Orders Management State
  const [pendingHubOrders, setPendingHubOrders] = useState([]);
  const [approvedHubOrders, setApprovedHubOrders] = useState([]);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedHubOrder, setSelectedHubOrder] = useState(null);
  const [showHubOrderModal, setShowHubOrderModal] = useState(false);

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

  // Note: Seller management functions removed - sellers register themselves

  // ✅ Fetch seller applications with status filter
  const fetchSellerApplications = async (user, status = null) => {
    try {
      await user.reload();
      const token = await user.getIdToken(true);
      let url = `${API_BASE}/api/seller/applications`;
      if (status) {
        url += `?status=${status}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        toast.error("Access denied: You are not an admin");
        return;
      }

      const data = await res.json();
      if (data.success) {
        setPendingApplications(data.applications || []);
      }
    } catch (err) {
      console.error("Fetch seller applications error:", err);
      toast.error("Failed to fetch seller applications");
    }
  };
  
  // ✅ Fetch pending seller applications (wrapper for backward compatibility)
  const fetchPendingApplications = async (user) => {
    await fetchSellerApplications(user, 'submitted');
  };

  // ✅ Approve seller application
  const approveApplication = async (applicationId) => {
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken(true);
      
      const res = await fetch(`${API_BASE}/api/seller/applications/${applicationId}/status`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: 'approved' })
      });
      
      if (res.status === 403) {
        toast.error("Access denied: You are not an admin");
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        toast.success("Seller application approved successfully");
        // Refresh the list
        fetchPendingApplications(user);
      } else {
        toast.error(data.error || "Failed to approve application");
      }
    } catch (err) {
      console.error("Approve application error:", err);
      toast.error("Failed to approve application");
    }
  };

  // ✅ Reject seller application
  const rejectApplication = async (applicationId, rejectionReason) => {
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken(true);
      
      const res = await fetch(`${API_BASE}/api/seller/applications/${applicationId}/status`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: 'rejected', rejectionReason })
      });
      
      if (res.status === 403) {
        toast.error("Access denied: You are not an admin");
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        toast.success("Seller application rejected");
        // Refresh the list
        fetchPendingApplications(user);
      } else {
        toast.error(data.error || "Failed to reject application");
      }
    } catch (err) {
      console.error("Reject application error:", err);
      toast.error("Failed to reject application");
    }
  };

  // ✅ View application details
  const viewApplicationDetails = (application) => {
    setSelectedApplication(application);
    setShowApplicationModal(true);
  };

  // ✅ Close application modal
  const closeApplicationModal = () => {
    setSelectedApplication(null);
    setShowApplicationModal(false);
  };

  // ✅ Fetch all approved sellers with their details
  const fetchApprovedSellers = async (user) => {
    try {
      setLoadingSellers(true);
      await user.reload();
      const token = await user.getIdToken(true);
      
      // Fetch approved seller applications
      const res = await fetch(`${API_BASE}/api/seller/applications?status=approved`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        toast.error("Access denied: You are not an admin");
        return;
      }

      const data = await res.json();
      if (data.success) {
        const sellers = data.applications || [];
        setApprovedSellers(sellers);
        
        // Fetch products for each seller
        const productsMap = {};
        for (const seller of sellers) {
          try {
            const productsRes = await fetch(`${API_BASE}/api/admin/products`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (productsRes.ok) {
              const allProducts = await productsRes.json();
              // Filter products by seller email or userId
              const sellerProducts = Array.isArray(allProducts) 
                ? allProducts.filter(p => {
                    // Exclude test products
                    if (p.title && p.title.toLowerCase().includes("test product")) return false;
                    return p.sellerEmail === seller.email || 
                           p.sellerId === seller.userId ||
                           (p.seller && (p.seller.email === seller.email || p.seller.uid === seller.userId));
                  })
                : [];
              productsMap[seller._id] = sellerProducts;
            }
          } catch (err) {
            console.error(`Error fetching products for seller ${seller.email}:`, err);
            productsMap[seller._id] = [];
          }
        }
        setSellerProducts(productsMap);
      }
    } catch (err) {
      console.error("Fetch approved sellers error:", err);
      toast.error("Failed to fetch approved sellers");
    } finally {
      setLoadingSellers(false);
    }
  };

  // ✅ Fetch products
  const fetchProducts = async (user) => {
    try {
      console.log("🔍 Fetching products...");
      await user.reload();
      const token = await user.getIdToken(true);
      console.log("Token obtained:", token ? "✅" : "❌");
      
      const res = await fetch(`${API_BASE}/api/admin/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Response status:", res.status);

      if (res.status === 403) {
        toast.error("Access denied: You are not an admin");
        return;
      }

      const data = await res.json();
      console.log("Products received:", data);
      console.log("Products count:", Array.isArray(data) ? data.length : 0);
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Fetch products error:", err);
      toast.error("Failed to load products");
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

  // ✅ Fetch delivery agents
  const fetchDeliveryAgents = async (user) => {
    try {
      await user.reload();
      const token = await user.getIdToken(true);
      const res = await fetch(`${API_BASE}/api/delivery-agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        toast.error("Access denied: You are not an admin");
        return;
      }

      const data = await res.json();
      console.log("Delivery agents received:", data);
      setDeliveryAgents(Array.isArray(data.agents) ? data.agents : []);
    } catch (err) {
      console.error("❌ Fetch delivery agents error:", err);
      toast.error("Failed to load delivery agents");
    }
  };

  // ✅ Fetch hubs
  const fetchHubs = async (user) => {
    try {
      await user.reload();
      const token = await user.getIdToken(true);
      const [hubsRes, managersRes] = await Promise.all([
        fetch(`${API_BASE}/api/hubs`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/hub-managers`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (hubsRes.ok) {
        const hubsData = await hubsRes.json();
        setHubs(hubsData.hubs || []);
      }

      if (managersRes.ok) {
        const managersData = await managersRes.json();
        setHubManagers(managersData.managers || []);
      }
    } catch (err) {
      console.error("❌ Fetch hubs error:", err);
      toast.error("Failed to load hubs");
    }
  };

  // ✅ Fetch orders (placeholder - you'll need to implement this endpoint)
  const fetchOrders = async (user) => {
    try {
      await user.reload();
      const token = await user.getIdToken(true);
      const res = await fetch(`${API_BASE}/api/admin/orders`, {
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

  // ✅ Fetch pending hub orders for admin approval
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
        console.log(`✅ Fetched ${data.orders.length} pending hub orders`);
      }
    } catch (err) {
      console.error("Fetch pending hub orders error:", err);
      setPendingHubOrders([]);
    }
  };

  // ✅ Fetch approved hub orders
  const fetchApprovedHubOrders = async (user) => {
    try {
      await user.reload();
      const token = await user.getIdToken(true);
      const res = await fetch(`${API_BASE}/api/admin/orders/approved-hub-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        toast.error("Access denied: You are not an admin");
        return;
      }

      const data = await res.json();
      if (data.success) {
        setApprovedHubOrders(data.orders || []);
        console.log(`✅ Fetched ${data.orders.length} approved hub orders`);
      }
    } catch (err) {
      console.error("Fetch approved hub orders error:", err);
      setApprovedHubOrders([]);
    }
  };

  // ✅ Fetch admin notifications
  const fetchAdminNotifications = async (user) => {
    try {
      await user.reload();
      const token = await user.getIdToken(true);
      const res = await fetch(`${API_BASE}/api/admin/orders/notifications?unreadOnly=true`, {
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
        console.log(`✅ Fetched ${data.notifications.length} admin notifications`);
      }
    } catch (err) {
      console.error("Fetch admin notifications error:", err);
      setAdminNotifications([]);
      setUnreadNotificationCount(0);
    }
  };

  // ✅ Approve hub order for delivery
  const approveHubOrder = async (orderId) => {
    const confirmed = await confirm({
      title: 'Approve Hub Order',
      message: 'Are you sure you want to approve this order for delivery to customer hub?',
      type: 'success',
      confirmText: 'Approve & Dispatch'
    });
    
    if (!confirmed) return;
    
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken(true);
      
      const res = await fetch(`${API_BASE}/api/admin/orders/${orderId}/approve-hub-delivery`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
      });
      
      if (res.status === 403) {
        toast.error("Access denied: You are not an admin");
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        toast.success(`Order approved and dispatched to ${data.order.toHub}`);
        // Refresh pending orders and approved orders
        fetchPendingHubOrders(user);
        fetchApprovedHubOrders(user);
        fetchAdminNotifications(user);
      } else {
        toast.error(data.error || "Failed to approve order");
      }
    } catch (err) {
      console.error("Approve hub order error:", err);
      toast.error("Failed to approve order");
    }
  };

  // ✅ Mark admin notification as read
  const markAdminNotificationAsRead = async (notificationId) => {
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken(true);
      
      const res = await fetch(`${API_BASE}/api/admin/orders/notifications/${notificationId}/read`, {
        method: "PATCH",
        headers: { 
          Authorization: `Bearer ${token}` 
        },
      });
      
      if (res.ok) {
        // Remove from unread notifications
        setAdminNotifications(prev => prev.filter(n => n._id !== notificationId));
        setUnreadNotificationCount(prev => Math.max(0, prev - 1));
        toast.success("Notification marked as read");
      }
    } catch (err) {
      console.error("Mark notification as read error:", err);
    }
  };

  // ✅ View hub order details
  const viewHubOrderDetails = (order) => {
    setSelectedHubOrder(order);
    setShowHubOrderModal(true);
  };

  // ✅ Close hub order modal
  const closeHubOrderModal = () => {
    setSelectedHubOrder(null);
    setShowHubOrderModal(false);
  };

  // Note: Seller management functions removed - sellers register themselves

  // ✅ Toggle product status (disable/enable)
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
      const user = auth.currentUser;
      const token = await user.getIdToken(true);
      
      const res = await fetch(`http://localhost:5000/api/admin/products/toggle-status/${id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
      });
      
      if (res.status === 403) {
        toast.error("Access denied: You are not an admin");
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchProducts(user);
      } else {
        toast.error(data.error || `Failed to ${action} product`);
      }
    } catch (err) {
      console.error(`Toggle product status error:`, err);
      toast.error(`Failed to ${action} product`);
    }
  };

  // ✅ Approve product
  const approveProduct = async (id) => {
    const confirmed = await confirm({
      title: 'Approve Product',
      message: 'Are you sure you want to approve this product? It will be visible to customers.',
      type: 'success',
      confirmText: 'Approve'
    });
    
    if (!confirmed) return;
    
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken(true);
      
      const res = await fetch(`http://localhost:5000/api/admin/products/approve/${id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
      });
      
      if (res.status === 403) {
        toast.error("Access denied: You are not an admin");
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        toast.success("Product approved successfully!");
        fetchProducts(user);
      } else {
        toast.error(data.error || "Failed to approve product");
      }
    } catch (err) {
      console.error("Approve product error:", err);
      toast.error("Failed to approve product");
    }
  };

  // ✅ Reject product
  const rejectProduct = async (id) => {
    const confirmed = await confirm({
      title: 'Reject Product',
      message: 'Are you sure you want to reject this product? It will not be visible to customers.',
      type: 'warning',
      confirmText: 'Reject'
    });
    
    if (!confirmed) return;
    
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken(true);
      
      const res = await fetch(`http://localhost:5000/api/admin/products/reject/${id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ reason: "Product does not meet quality standards" })
      });
      
      if (res.status === 403) {
        toast.error("Access denied: You are not an admin");
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        toast.success("Product rejected successfully!");
        fetchProducts(user);
      } else {
        toast.error(data.error || "Failed to reject product");
      }
    } catch (err) {
      console.error("Reject product error:", err);
      toast.error("Failed to reject product");
    }
  };

  // ✅ Start editing a product
  const startEdit = (p) => {
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

  // ✅ View order details
  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  // ✅ Close order modal
  const closeOrderModal = () => {
    setSelectedOrder(null);
    setShowOrderModal(false);
  };

  // ✅ Handle section navigation
  const handleSectionClick = async (section) => {
    setActiveSection(section);
    const user = auth.currentUser;
    
    if (user) {
      if (section === "sellers") {
        await fetchApprovedSellers(user);
      }
      if (section === "products") {
        await fetchProducts(user);
      } else if (section === "orders") {
        await fetchOrders(user);
      } else       if (section === "sellers") {
        await fetchApprovedSellers(user);
      } else if (section === "hubs") {
        await fetchHubs(user);
      } else if (section === "hub-orders") {
        await fetchPendingHubOrders(user);
        await fetchApprovedHubOrders(user);
        await fetchAdminNotifications(user);
      }
    }
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Fetch initial data
        await fetchOrders(user);
        await fetchProducts(user);
        await fetchPendingApplications(user);
        await fetchDeliveryAgents(user);
        await fetchAdminNotifications(user);
      }
    });
    return () => unsub();
  }, []);

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
            onClick={() => handleSectionClick("sellers")} 
            style={{...linkStyle, ...(activeSection === "sellers" ? activeLinkStyle : {})}}
          >
            🛍️ Sellers
          </button>
          <button 
            onClick={() => handleSectionClick("delivery")} 
            style={{...linkStyle, ...(activeSection === "delivery" ? activeLinkStyle : {})}}
          >
            🚚 Delivery Boys
          </button>
          <button 
            onClick={() => navigate("/admin/hub-management")} 
            style={{...linkStyle, ...(activeSection === "hubs" ? activeLinkStyle : {})}}
          >
            🏢 Hubs
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

            <SalesPredictionDashboard />
          </>
        )}

        {/* Products Section */}
        {activeSection === "products" && (
          <>
            <h1 style={{ marginBottom: "20px" }}>Product Management & Approval</h1>
            
            {/* Info Message */}
            <div style={{ 
              background: "#fff8e6", 
              border: "1px solid #ffd54f", 
              borderRadius: "8px",
              padding: "15px",
              marginBottom: "20px"
            }}>
              <p style={{ margin: 0, color: "#5c4033" }}>
                <strong>ℹ️ Admin Product Controls:</strong> Review and approve/reject products added by sellers. 
                Monitor product details, stock levels, and enable/disable products as needed.
              </p>
            </div>

            {/* Filter Tabs */}
            <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
              {["All", "Pending", "Approved", "Rejected"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedCategory(filter)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "2px solid #5c4033",
                    background: selectedCategory === filter ? "#5c4033" : "white",
                    color: selectedCategory === filter ? "white" : "#5c4033",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    transition: "all 0.3s ease"
                  }}
                >
                  {filter} {filter === "Pending" && products.filter(p => p.approvalStatus === "pending").length > 0 && 
                    `(${products.filter(p => p.approvalStatus === "pending").length})`}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            <div style={{ background: "#fff", padding: "24px", borderRadius: "12px" }}>
              <h2 style={{ marginBottom: "20px" }}>
                All Products ({products.filter(p => {
                  if (selectedCategory === "All") return true;
                  if (selectedCategory === "Pending") return p.approvalStatus === "pending";
                  if (selectedCategory === "Approved") return p.approvalStatus === "approved";
                  if (selectedCategory === "Rejected") return p.approvalStatus === "rejected";
                  return true;
                }).length})
              </h2>
              
              {products.length === 0 ? (
                <p style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                  No products found. Sellers have not added any products yet.
                </p>
              ) : (
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
                  gap: "20px" 
                }}>
                  {products
                    .filter(p => {
                      // Exclude test products
                      if (p.title && p.title.toLowerCase().includes("test product")) return false;
                      if (selectedCategory === "All") return true;
                      if (selectedCategory === "Pending") return p.approvalStatus === "pending";
                      if (selectedCategory === "Approved") return p.approvalStatus === "approved";
                      if (selectedCategory === "Rejected") return p.approvalStatus === "rejected";
                      return true;
                    })
                    .map((p) => {
                      const priceRange = p.variants && p.variants.length > 0
                        ? `₹${Math.min(...p.variants.map(v => v.price))} - ₹${Math.max(...p.variants.map(v => v.price))}`
                        : "N/A";
                      const dateAdded = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : "N/A";
                      
                      return (
                        <div 
                          key={p._id} 
                          onClick={() => setSelectedOrder(p)}
                          style={{
                            border: "1px solid #ddd",
                            borderRadius: "12px",
                            overflow: "hidden",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            background: "#fff"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-4px)";
                            e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.1)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          {/* Product Image */}
                          <div style={{ position: "relative", paddingTop: "100%", background: "#f5f5f5" }}>
                            {p.image ? (
                              <img
                                src={`http://localhost:5000/uploads/${p.image}`}
                                alt={p.title}
                                style={{ 
                                  position: "absolute", 
                                  top: 0, 
                                  left: 0, 
                                  width: "100%", 
                                  height: "100%", 
                                  objectFit: "cover" 
                                }}
                              />
                            ) : p.img ? (
                              <img
                                src={`/images/products/${p.img}`}
                                alt={p.title}
                                style={{ 
                                  position: "absolute", 
                                  top: 0, 
                                  left: 0, 
                                  width: "100%", 
                                  height: "100%", 
                                  objectFit: "cover" 
                                }}
                              />
                            ) : (
                              <div style={{ 
                                position: "absolute", 
                                top: 0, 
                                left: 0, 
                                width: "100%", 
                                height: "100%", 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center",
                                fontSize: "14px",
                                color: "#999"
                              }}>
                                No Image
                              </div>
                            )}
                            
                            {/* Approval Badge */}
                            <div style={{ position: "absolute", top: "10px", right: "10px" }}>
                              <span style={{
                                padding: "6px 12px",
                                borderRadius: "20px",
                                fontSize: "11px",
                                fontWeight: "600",
                                background: 
                                  p.approvalStatus === "approved" ? "#28a745" :
                                  p.approvalStatus === "rejected" ? "#dc3545" :
                                  "#ffc107",
                                color: "white",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                              }}>
                                {p.approvalStatus === "approved" ? "✓ Approved" :
                                 p.approvalStatus === "rejected" ? "✗ Rejected" :
                                 "⏳ Pending"}
                              </span>
                            </div>
                            
                            {/* Stock Badge */}
                            <div style={{ position: "absolute", top: "10px", left: "10px" }}>
                              <span style={{
                                padding: "6px 12px",
                                borderRadius: "20px",
                                fontSize: "11px",
                                fontWeight: "600",
                                background: p.stock > 10 ? "#28a745" : p.stock > 0 ? "#ffc107" : "#dc3545",
                                color: "white",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                              }}>
                                Stock: {p.stock || 0}
                              </span>
                            </div>
                          </div>
                          
                          {/* Product Info */}
                          <div style={{ padding: "16px" }}>
                            {/* Product Name */}
                            <h3 style={{ 
                              margin: "0 0 8px 0", 
                              fontSize: "16px", 
                              fontWeight: "600", 
                              color: "#5c4033",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}>
                              {p.title}
                            </h3>
                            
                            {/* Seller */}
                            <div style={{ marginBottom: "8px" }}>
                              <div style={{ fontSize: "13px", color: "#666", fontWeight: "500" }}>
                                🏪 {p.sellerName || "Unknown"}
                              </div>
                            </div>
                            
                            {/* Category & Price */}
                            <div style={{ 
                              display: "flex", 
                              justifyContent: "space-between", 
                              alignItems: "center",
                              marginBottom: "12px"
                            }}>
                              <span style={{ fontSize: "12px", color: "#666" }}>
                                {p.mainCategory || p.category || "N/A"}
                              </span>
                              <span style={{ fontSize: "14px", fontWeight: "700", color: "#5c4033" }}>
                                {priceRange}
                              </span>
                            </div>
                            
                            {/* Status Badge */}
                            <div style={{ marginBottom: "12px" }}>
                              <span style={{
                                padding: "4px 10px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: "600",
                                background: p.isActive === false ? "#ffebee" : "#e8f5e9",
                                color: p.isActive === false ? "#c62828" : "#2e7d32"
                              }}>
                                {p.isActive === false ? "🔴 Disabled" : "🟢 Active"}
                              </span>
                            </div>
                            
                            {/* Date */}
                            <div style={{ fontSize: "11px", color: "#999", marginBottom: "12px" }}>
                              Added: {dateAdded}
                            </div>
                            
                            {/* Action Buttons */}
                            <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                              {p.approvalStatus === "pending" && (
                                <div style={{ display: "flex", gap: "8px" }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      approveProduct(p._id);
                                    }}
                                    style={{
                                      flex: 1,
                                      padding: "8px",
                                      fontSize: "12px",
                                      fontWeight: "600",
                                      border: "none",
                                      borderRadius: "6px",
                                      cursor: "pointer",
                                      background: "#28a745",
                                      color: "white"
                                    }}
                                  >
                                    ✓ Approve
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      rejectProduct(p._id);
                                    }}
                                    style={{
                                      flex: 1,
                                      padding: "8px",
                                      fontSize: "12px",
                                      fontWeight: "600",
                                      border: "none",
                                      borderRadius: "6px",
                                      cursor: "pointer",
                                      background: "#dc3545",
                                      color: "white"
                                    }}
                                  >
                                    ✗ Reject
                                  </button>
                                </div>
                              )}
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleProductStatus(p._id, p.isActive !== false);
                                }}
                                style={{
                                  padding: "8px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  background: p.isActive === false ? "#6c757d" : "#ffc107",
                                  color: "white"
                                }}
                              >
                                {p.isActive === false ? "Enable Product" : "Disable Product"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Product Details Modal */}
            {selectedOrder && (
              <div 
                onClick={() => setSelectedOrder(null)}
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0,0,0,0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 9999,
                  padding: "20px"
                }}
              >
                <div 
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: "#fff",
                    borderRadius: "16px",
                    maxWidth: "900px",
                    width: "100%",
                    maxHeight: "90vh",
                    overflow: "auto",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
                  }}
                >
                  {/* Modal Header */}
                  <div style={{
                    padding: "24px",
                    borderBottom: "1px solid #eee",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    position: "sticky",
                    top: 0,
                    background: "#fff",
                    zIndex: 1
                  }}>
                    <h2 style={{ margin: 0, color: "#5c4033" }}>Product Details</h2>
                    <button
                      onClick={() => setSelectedOrder(null)}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "24px",
                        cursor: "pointer",
                        color: "#666",
                        padding: "0",
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      ×
                    </button>
                  </div>
                  
                  {/* Modal Content */}
                  <div style={{ padding: "24px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
                      {/* Left Column - Image */}
                      <div>
                        <div style={{ 
                          width: "100%", 
                          paddingTop: "100%", 
                          position: "relative", 
                          background: "#f5f5f5",
                          borderRadius: "12px",
                          overflow: "hidden"
                        }}>
                          {selectedOrder.image ? (
                            <img
                              src={`http://localhost:5000/uploads/${selectedOrder.image}`}
                              alt={selectedOrder.title}
                              style={{ 
                                position: "absolute", 
                                top: 0, 
                                left: 0, 
                                width: "100%", 
                                height: "100%", 
                                objectFit: "cover" 
                              }}
                            />
                          ) : selectedOrder.img ? (
                            <img
                              src={`/images/products/${selectedOrder.img}`}
                              alt={selectedOrder.title}
                              style={{ 
                                position: "absolute", 
                                top: 0, 
                                left: 0, 
                                width: "100%", 
                                height: "100%", 
                                objectFit: "cover" 
                              }}
                            />
                          ) : (
                            <div style={{ 
                              position: "absolute", 
                              top: 0, 
                              left: 0, 
                              width: "100%", 
                              height: "100%", 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center",
                              fontSize: "16px",
                              color: "#999"
                            }}>
                              No Image Available
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Right Column - Details */}
                      <div>
                        <h1 style={{ fontSize: "24px", marginBottom: "16px", color: "#5c4033" }}>
                          {selectedOrder.title}
                        </h1>
                        
                        {/* Seller Info */}
                        <div style={{ 
                          padding: "16px", 
                          background: "#f9f9f9", 
                          borderRadius: "8px",
                          marginBottom: "20px"
                        }}>
                          <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#666" }}>Seller Information</h4>
                          <div style={{ fontSize: "16px", fontWeight: "600", color: "#5c4033" }}>
                            {selectedOrder.sellerName || "Unknown"}
                          </div>
                          <div style={{ fontSize: "13px", color: "#666" }}>
                            {selectedOrder.sellerEmail || ""}
                          </div>
                        </div>
                        
                        {/* Details Grid */}
                        <div style={{ display: "grid", gap: "16px" }}>
                          <div>
                            <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Category</div>
                            <div style={{ fontSize: "15px", fontWeight: "600" }}>
                              {selectedOrder.mainCategory || selectedOrder.category || "N/A"}
                              {selectedOrder.subCategory && ` / ${selectedOrder.subCategory}`}
                            </div>
                          </div>
                          
                          <div>
                            <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Price Range</div>
                            <div style={{ fontSize: "18px", fontWeight: "700", color: "#5c4033" }}>
                              {selectedOrder.variants && selectedOrder.variants.length > 0
                                ? `₹${Math.min(...selectedOrder.variants.map(v => v.price))} - ₹${Math.max(...selectedOrder.variants.map(v => v.price))}`
                                : "N/A"}
                            </div>
                          </div>
                          
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                            <div>
                              <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Stock Quantity</div>
                              <div style={{ 
                                fontSize: "16px", 
                                fontWeight: "600",
                                color: selectedOrder.stock > 10 ? "#28a745" : selectedOrder.stock > 0 ? "#ffc107" : "#dc3545"
                              }}>
                                {selectedOrder.stock || 0} units
                              </div>
                            </div>
                            
                            <div>
                              <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Product Status</div>
                              <span style={{
                                padding: "6px 12px",
                                borderRadius: "12px",
                                fontSize: "12px",
                                fontWeight: "600",
                                background: selectedOrder.isActive === false ? "#ffebee" : "#e8f5e9",
                                color: selectedOrder.isActive === false ? "#c62828" : "#2e7d32",
                                display: "inline-block"
                              }}>
                                {selectedOrder.isActive === false ? "Disabled" : "Active"}
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Approval Status</div>
                            <span style={{
                              padding: "8px 16px",
                              borderRadius: "12px",
                              fontSize: "13px",
                              fontWeight: "600",
                              background: 
                                selectedOrder.approvalStatus === "approved" ? "#e8f5e9" :
                                selectedOrder.approvalStatus === "rejected" ? "#ffebee" :
                                "#fff3e0",
                              color:
                                selectedOrder.approvalStatus === "approved" ? "#2e7d32" :
                                selectedOrder.approvalStatus === "rejected" ? "#c62828" :
                                "#f57c00",
                              display: "inline-block"
                            }}>
                              {selectedOrder.approvalStatus === "approved" ? "✓ Approved" :
                               selectedOrder.approvalStatus === "rejected" ? "✗ Rejected" :
                               "⏳ Pending Approval"}
                            </span>
                          </div>
                          
                          <div>
                            <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Date Added</div>
                            <div style={{ fontSize: "14px" }}>
                              {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleDateString('en-IN', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              }) : "N/A"}
                            </div>
                          </div>
                          
                          {selectedOrder.variants && selectedOrder.variants.length > 0 && (
                            <div>
                              <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>Variants</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {selectedOrder.variants.map((variant, idx) => (
                                  <div key={idx} style={{ 
                                    padding: "10px", 
                                    background: "#f9f9f9", 
                                    borderRadius: "6px",
                                    display: "flex",
                                    justifyContent: "space-between"
                                  }}>
                                    <span style={{ fontSize: "13px" }}>{variant.name}</span>
                                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#5c4033" }}>
                                      ₹{variant.price}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div style={{ marginTop: "24px", display: "flex", gap: "12px", flexDirection: "column" }}>
                          {selectedOrder.approvalStatus === "pending" && (
                            <div style={{ display: "flex", gap: "12px" }}>
                              <button
                                onClick={() => {
                                  approveProduct(selectedOrder._id);
                                  setSelectedOrder(null);
                                }}
                                style={{
                                  flex: 1,
                                  padding: "12px",
                                  fontSize: "14px",
                                  fontWeight: "600",
                                  border: "none",
                                  borderRadius: "8px",
                                  cursor: "pointer",
                                  background: "#28a745",
                                  color: "white"
                                }}
                              >
                                ✓ Approve Product
                              </button>
                              <button
                                onClick={() => {
                                  rejectProduct(selectedOrder._id);
                                  setSelectedOrder(null);
                                }}
                                style={{
                                  flex: 1,
                                  padding: "12px",
                                  fontSize: "14px",
                                  fontWeight: "600",
                                  border: "none",
                                  borderRadius: "8px",
                                  cursor: "pointer",
                                  background: "#dc3545",
                                  color: "white"
                                }}
                              >
                                ✗ Reject Product
                              </button>
                            </div>
                          )}
                          
                          <button
                            onClick={() => {
                              toggleProductStatus(selectedOrder._id, selectedOrder.isActive !== false);
                              setSelectedOrder(null);
                            }}
                            style={{
                              padding: "12px",
                              fontSize: "14px",
                              fontWeight: "600",
                              border: "none",
                              borderRadius: "8px",
                              cursor: "pointer",
                              background: selectedOrder.isActive === false ? "#6c757d" : "#ffc107",
                              color: "white"
                            }}
                          >
                            {selectedOrder.isActive === false ? "Enable Product" : "Disable Product"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                              {order.deliveryAgent ? (
                                <span style={{ fontSize: "12px", color: "#5c4033" }}>
                                  {order.deliveryAgent.name}
                                </span>
                              ) : (
                                <span style={{ fontSize: "12px", color: "#999" }}>
                                  Not Assigned
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
        
        {activeSection === "sellers" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
              <div>
                <h1 style={{ 
                  margin: "0 0 8px 0", 
                  color: "var(--brand-strong, #6f4518)", 
                  fontFamily: "var(--title-font, 'Playfair Display', serif)",
                  fontSize: "36px",
                  fontWeight: "900"
                }}>
                  Seller Management
                </h1>
                <p style={{ 
                  margin: 0, 
                  color: "var(--text-muted, #7b6457)", 
                  fontSize: "15px" 
                }}>
                  Manage approved sellers and their products
                </p>
              </div>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <button
                  onClick={() => navigate("/admin/applications")}
                  style={{
                    padding: "12px 24px",
                    background: "var(--accent-soft, #f3e7dc)",
                    color: "var(--brand, #8b5e34)",
                    border: "2px solid var(--brand, #8b5e34)",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "15px",
                    fontWeight: "700",
                    transition: "all 0.2s ease",
                    boxShadow: "0 4px 12px rgba(139, 94, 52, 0.2)"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "var(--brand, #8b5e34)";
                    e.target.style.color = "white";
                    e.target.style.transform = "translateY(-2px)";
                    e.target.style.boxShadow = "0 6px 16px rgba(139, 94, 52, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "var(--accent-soft, #f3e7dc)";
                    e.target.style.color = "var(--brand, #8b5e34)";
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 4px 12px rgba(139, 94, 52, 0.2)";
                  }}
                >
                  📋 Applications
                </button>
                <button
                  onClick={() => {
                    const user = auth.currentUser;
                    if (user) {
                      fetchApprovedSellers(user);
                    }
                  }}
                  style={{
                    padding: "12px 24px",
                    background: "var(--brand, #8b5e34)",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "15px",
                    fontWeight: "700",
                    transition: "all 0.2s ease",
                    boxShadow: "0 4px 12px rgba(139, 94, 52, 0.3)"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "var(--brand-strong, #6f4518)";
                    e.target.style.transform = "translateY(-2px)";
                    e.target.style.boxShadow = "0 6px 16px rgba(139, 94, 52, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "var(--brand, #8b5e34)";
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 4px 12px rgba(139, 94, 52, 0.3)";
                  }}
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            {/* Approved Sellers Section - COMPACT */}
            <div style={{ 
              background: "linear-gradient(135deg, var(--surface, #ffffff) 0%, var(--accent-soft, #f3e7dc) 100%)", 
              padding: "20px", 
              borderRadius: "16px", 
              border: "2px solid var(--brand, #8b5e34)",
              boxShadow: "0 8px 20px rgba(139, 94, 52, 0.15)",
              marginBottom: "24px"
            }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                marginBottom: "20px"
              }}>
                <div>
                  <h2 style={{ 
                    margin: "0 0 4px 0", 
                    color: "var(--brand-strong, #6f4518)", 
                    fontFamily: "var(--title-font, 'Playfair Display', serif)",
                    fontSize: "22px",
                    fontWeight: "700"
                  }}>
                    Approved Sellers & Their Products
                  </h2>
                  <p style={{
                    margin: 0,
                    color: "var(--text-muted, #7b6457)",
                    fontSize: "13px"
                  }}>
                    {approvedSellers.length} {approvedSellers.length === 1 ? 'Seller' : 'Sellers'} Active
                  </p>
                </div>
              </div>

              {loadingSellers ? (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    border: "4px solid var(--border, #ead9c9)",
                    borderTop: "4px solid var(--brand, #8b5e34)",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    margin: "0 auto 16px"
                  }}></div>
                  <p style={{ color: "var(--text-muted, #7b6457)", fontSize: "16px" }}>Loading sellers...</p>
                </div>
              ) : approvedSellers.length === 0 ? (
                <div style={{ 
                  textAlign: "center", 
                  padding: "60px 20px",
                  background: "var(--accent-soft, #f3e7dc)",
                  borderRadius: "12px",
                  border: "1px solid var(--border, #ead9c9)"
                }}>
                  <div style={{ fontSize: "64px", marginBottom: "16px" }}>👥</div>
                  <h3 style={{ 
                    margin: "0 0 12px 0", 
                    color: "var(--text, #3f2d23)",
                    fontFamily: "var(--title-font, 'Playfair Display', serif)"
                  }}>
                    No Approved Sellers Yet
                  </h3>
                  <p style={{ color: "var(--text-muted, #7b6457)", margin: 0, fontSize: "14px" }}>
                    Approved sellers will appear here once their applications are approved.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {approvedSellers.map((seller) => {
                    const sellerProds = sellerProducts[seller._id] || [];
                    const isExpanded = expandedSeller === seller._id;
                    
                    return (
                      <div
                        key={seller._id}
                        style={{
                          background: "var(--accent-soft, #f3e7dc)",
                          borderRadius: "16px",
                          padding: "24px",
                          border: "2px solid var(--border, #ead9c9)",
                          boxShadow: "var(--shadow, 0 10px 24px rgba(63,45,35,.10))",
                          transition: "all 0.3s ease"
                        }}
                      >
                        {/* Seller Header */}
                        <div style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "start",
                          marginBottom: "20px"
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                              <div style={{
                                width: "56px",
                                height: "56px",
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, var(--brand, #8b5e34) 0%, var(--brand-strong, #6f4518) 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontSize: "24px",
                                fontWeight: "700",
                                fontFamily: "var(--title-font, 'Playfair Display', serif)"
                              }}>
                                {seller.businessName?.charAt(0)?.toUpperCase() || seller.email?.charAt(0)?.toUpperCase() || "S"}
                              </div>
                              <div>
                                <h3 style={{
                                  margin: "0 0 4px 0",
                                  color: "var(--brand-strong, #6f4518)",
                                  fontSize: "20px",
                                  fontFamily: "var(--title-font, 'Playfair Display', serif)",
                                  fontWeight: "700"
                                }}>
                                  {seller.businessName || seller.userInfo?.name || "Seller"}
                                </h3>
                                <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted, #7b6457)" }}>
                                  {seller.email || seller.userInfo?.email}
                                </p>
                              </div>
                            </div>

                            {/* Seller Details Grid */}
                            <div style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                              gap: "16px",
                              marginTop: "16px"
                            }}>
                              <div>
                                <p style={{ 
                                  margin: "0 0 4px 0", 
                                  fontSize: "12px", 
                                  color: "var(--text-muted, #7b6457)",
                                  textTransform: "uppercase",
                                  fontWeight: "600",
                                  letterSpacing: "0.5px"
                                }}>
                                  Phone
                                </p>
                                <p style={{ margin: 0, fontSize: "15px", color: "var(--text, #3f2d23)", fontWeight: "600" }}>
                                  {seller.phone || seller.userInfo?.phone || "N/A"}
                                </p>
                              </div>
                              <div>
                                <p style={{ 
                                  margin: "0 0 4px 0", 
                                  fontSize: "12px", 
                                  color: "var(--text-muted, #7b6457)",
                                  textTransform: "uppercase",
                                  fontWeight: "600",
                                  letterSpacing: "0.5px"
                                }}>
                                  Products
                                </p>
                                <p style={{ margin: 0, fontSize: "15px", color: "var(--brand, #8b5e34)", fontWeight: "700" }}>
                                  {sellerProds.length} {sellerProds.length === 1 ? 'Product' : 'Products'}
                                </p>
                              </div>
                              <div>
                                <p style={{ 
                                  margin: "0 0 4px 0", 
                                  fontSize: "12px", 
                                  color: "var(--text-muted, #7b6457)",
                                  textTransform: "uppercase",
                                  fontWeight: "600",
                                  letterSpacing: "0.5px"
                                }}>
                                  Approved Date
                                </p>
                                <p style={{ margin: 0, fontSize: "15px", color: "var(--text, #3f2d23)", fontWeight: "600" }}>
                                  {seller.approvedAt 
                                    ? new Date(seller.approvedAt).toLocaleDateString('en-IN')
                                    : seller.updatedAt 
                                    ? new Date(seller.updatedAt).toLocaleDateString('en-IN')
                                    : "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Expand/Collapse Button */}
                          <button
                            onClick={() => setExpandedSeller(isExpanded ? null : seller._id)}
                            style={{
                              padding: "6px 14px",
                              background: "var(--brand, #8b5e34)",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "13px",
                              fontWeight: "600",
                              transition: "all 0.2s ease",
                              whiteSpace: "nowrap"
                            }}
                            onMouseEnter={(e) => e.target.style.background = "var(--brand-strong, #6f4518)"}
                            onMouseLeave={(e) => e.target.style.background = "var(--brand, #8b5e34)"}
                          >
                            {isExpanded ? "▲ Hide" : "▼ View"}
                          </button>
                        </div>

                        {/* Expanded Products Section */}
                        {isExpanded && (
                          <div style={{
                            marginTop: "16px",
                            paddingTop: "16px",
                            borderTop: "1px solid var(--border, #ead9c9)"
                          }}>
                            <h4 style={{
                              margin: "0 0 12px 0",
                              color: "var(--brand, #8b5e34)",
                              fontSize: "16px",
                              fontFamily: "var(--title-font, 'Playfair Display', serif)"
                            }}>
                              Products ({sellerProds.length})
                            </h4>

                            {sellerProds.length === 0 ? (
                              <div style={{
                                textAlign: "center",
                                padding: "40px 20px",
                                background: "var(--surface, #ffffff)",
                                borderRadius: "12px",
                                border: "1px solid var(--border, #ead9c9)"
                              }}>
                                <div style={{ fontSize: "48px", marginBottom: "12px" }}>📦</div>
                                <p style={{ margin: 0, color: "var(--text-muted, #7b6457)", fontSize: "14px" }}>
                                  This seller hasn't added any products yet.
                                </p>
                              </div>
                            ) : (
                              <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                                gap: "16px"
                              }}>
                                {sellerProds.map((product) => (
                                  <div
                                    key={product._id}
                                    style={{
                                      background: "var(--surface, #ffffff)",
                                      borderRadius: "14px",
                                      padding: "0",
                                      border: "2px solid var(--border, #ead9c9)",
                                      overflow: "hidden",
                                      transition: "all 0.3s ease",
                                      boxShadow: "0 4px 12px rgba(63, 45, 35, 0.08)"
                                    }}
                                    onMouseEnter={(e) => {
                                      e.target.style.transform = "translateY(-6px)";
                                      e.target.style.boxShadow = "0 12px 24px rgba(63, 45, 35, 0.2)";
                                      e.target.style.borderColor = "var(--brand, #8b5e34)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.transform = "translateY(0)";
                                      e.target.style.boxShadow = "0 4px 12px rgba(63, 45, 35, 0.08)";
                                      e.target.style.borderColor = "var(--border, #ead9c9)";
                                    }}
                                  >
                                    {/* Product Image - Always Shown */}
                                    <div style={{
                                      width: "100%",
                                      height: "180px",
                                      background: "var(--accent-soft, #f3e7dc)",
                                      position: "relative",
                                      overflow: "hidden"
                                    }}>
                                      {(() => {
                                        const imageUrl = product.image 
                                          ? `${API_BASE}/uploads/${product.image}`
                                          : product.img
                                          ? `${API_BASE}/uploads/${product.img}`
                                          : null;
                                        
                                        return imageUrl ? (
                                          <img
                                            src={imageUrl}
                                            alt={product.title || "Product"}
                                            style={{
                                              width: "100%",
                                              height: "100%",
                                              objectFit: "cover"
                                            }}
                                            onError={(e) => {
                                              e.target.style.display = "none";
                                              const parent = e.target.parentElement;
                                              if (parent && !parent.querySelector('.fallback-icon')) {
                                                const fallback = document.createElement('div');
                                                fallback.className = 'fallback-icon';
                                                fallback.style.cssText = 'display: flex; align-items: center; justify-content: center; height: 100%; font-size: 48px; color: var(--text-muted, #7b6457);';
                                                fallback.textContent = '📦';
                                                parent.appendChild(fallback);
                                              }
                                            }}
                                          />
                                        ) : (
                                          <div style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            height: "100%",
                                            fontSize: "48px",
                                            color: "var(--text-muted, #7b6457)"
                                          }}>
                                            📦
                                          </div>
                                        );
                                      })()}
                                    </div>
                                    
                                    {/* Product Info */}
                                    <div style={{ padding: "16px" }}>
                                      <h5 style={{
                                      margin: "0 0 8px 0",
                                      color: "var(--text, #3f2d23)",
                                      fontSize: "17px",
                                      fontWeight: "700",
                                      fontFamily: "var(--title-font, 'Playfair Display', serif)",
                                      lineHeight: "1.3"
                                    }}>
                                      {product.title}
                                    </h5>
                                    {product.description && (
                                      <p style={{
                                        margin: "0 0 12px 0",
                                        fontSize: "13px",
                                        color: "var(--text-muted, #7b6457)",
                                        lineHeight: "1.5",
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden"
                                      }}>
                                        {product.description}
                                      </p>
                                    )}
                                    <div style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      marginTop: "12px",
                                      paddingTop: "12px",
                                      borderTop: "1px solid var(--border, #ead9c9)"
                                    }}>
                                      <span style={{
                                        fontSize: "20px",
                                        fontWeight: "700",
                                        color: "var(--brand, #8b5e34)",
                                        fontFamily: "var(--title-font, 'Playfair Display', serif)"
                                      }}>
                                        {(() => {
                                          // Get price from variants array
                                          let price = 0;
                                          if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
                                            // Get the minimum price from variants
                                            const prices = product.variants
                                              .map(v => Number(v.price) || 0)
                                              .filter(p => p > 0);
                                            if (prices.length > 0) {
                                              price = Math.min(...prices);
                                            }
                                          } else if (product.price) {
                                            // Fallback to direct price field if variants don't exist
                                            price = Number(product.price) || 0;
                                          }
                                          return price > 0 ? `₹${price.toLocaleString("en-IN")}` : "₹0";
                                        })()}
                                      </span>
                                      <span style={{
                                        padding: "6px 12px",
                                        borderRadius: "20px",
                                        fontSize: "12px",
                                        fontWeight: "700",
                                        background: product.isActive !== false 
                                          ? "linear-gradient(135deg, var(--accent-soft, #f3e7dc) 0%, #f8f2ea 100%)" 
                                          : "#f8d7da",
                                        color: product.isActive !== false ? "var(--brand, #8b5e34)" : "#721c24",
                                        border: `1px solid ${product.isActive !== false ? "var(--border, #ead9c9)" : "#721c24"}`
                                      }}>
                                        {product.isActive !== false ? "✓ Active" : "✗ Inactive"}
                                      </span>
                                    </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </>
        )}

        {/* Hub Orders Section - Enhanced Product Movement Control */}
        {activeSection === "hub-orders" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h1 style={{ margin: 0 }}>Product Movement Control & Approvals</h1>
              
              {/* Status Summary */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {unreadNotificationCount > 0 && (
                  <div style={{
                    background: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    fontSize: "14px",
                    fontWeight: "600",
                    boxShadow: "0 2px 8px rgba(220, 53, 69, 0.3)"
                  }}>
                    🚨 {unreadNotificationCount} Pending Approval{unreadNotificationCount > 1 ? 's' : ''}
                  </div>
                )}
                
                {/* Notifications Bell */}
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    style={{
                      background: "#fff",
                      border: "2px solid #5c4033",
                      borderRadius: "50%",
                      width: "48px",
                      height: "48px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      position: "relative"
                    }}
                  >
                    🔔
                    {unreadNotificationCount > 0 && (
                      <span style={{
                        position: "absolute",
                        top: "-5px",
                        right: "-5px",
                        background: "#dc3545",
                        color: "white",
                        borderRadius: "50%",
                        width: "20px",
                        height: "20px",
                        fontSize: "11px",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        {unreadNotificationCount}
                      </span>
                    )}
                  </button>
                  
                  {/* Notifications Dropdown */}
                  {showNotifications && (
                  <div style={{
                    position: "absolute",
                    top: "55px",
                    right: "0",
                    background: "#fff",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    width: "350px",
                    maxHeight: "400px",
                    overflow: "auto",
                    zIndex: 1000
                  }}>
                    <div style={{ padding: "15px", borderBottom: "1px solid #eee" }}>
                      <h3 style={{ margin: 0, fontSize: "16px", color: "#5c4033" }}>
                        Admin Notifications ({unreadNotificationCount})
                      </h3>
                    </div>
                    
                    {adminNotifications.length === 0 ? (
                      <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                        No new notifications
                      </div>
                    ) : (
                      adminNotifications.map((notification) => (
                        <div
                          key={notification._id}
                          style={{
                            padding: "15px",
                            borderBottom: "1px solid #f0f0f0",
                            cursor: "pointer",
                            background: "#fff"
                          }}
                          onClick={() => markAdminNotificationAsRead(notification._id)}
                        >
                          <div style={{ fontWeight: "600", fontSize: "14px", marginBottom: "5px", color: "#5c4033" }}>
                            {notification.title}
                          </div>
                          <div style={{ fontSize: "13px", color: "#666", marginBottom: "8px" }}>
                            {notification.message}
                          </div>
                          <div style={{ fontSize: "11px", color: "#999" }}>
                            {new Date(notification.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Info Message */}
            <div style={{ 
              background: "#fff3cd", 
              border: "1px solid #ffeaa7", 
              borderRadius: "8px",
              padding: "15px",
              marginBottom: "20px"
            }}>
              <p style={{ margin: 0, color: "#5c4033" }}>
                <strong>⚠️ Admin Approval Required:</strong> Orders at seller hubs need your approval before they can be dispatched to customer hubs. 
                Orders labeled as "Order" are at seller hubs, once approved they become "Dispatch" to customer hubs.
              </p>
            </div>

            {/* Tab Navigation */}
            <div style={{ 
              display: "flex", 
              marginBottom: "20px",
              borderBottom: "2px solid #e9ecef"
            }}>
              <button
                onClick={() => setActiveHubTab("pending")}
                style={{
                  padding: "12px 24px",
                  background: activeHubTab === "pending" ? "#5c4033" : "transparent",
                  color: activeHubTab === "pending" ? "#fff" : "#5c4033",
                  border: "none",
                  borderRadius: "8px 8px 0 0",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  marginRight: "4px"
                }}
              >
                🚨 Pending Approvals ({pendingHubOrders.length})
              </button>
              <button
                onClick={() => setActiveHubTab("approved")}
                style={{
                  padding: "12px 24px",
                  background: activeHubTab === "approved" ? "#5c4033" : "transparent",
                  color: activeHubTab === "approved" ? "#fff" : "#5c4033",
                  border: "none",
                  borderRadius: "8px 8px 0 0",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600"
                }}
              >
                ✅ Approved Orders ({approvedHubOrders.length})
              </button>
            </div>

            {/* Pending Orders Tab */}
            {activeHubTab === "pending" && (
              <>
                {/* Urgent: Product Movement Approvals */}
                {pendingHubOrders.length > 0 && (
              <div style={{ 
                background: "linear-gradient(135deg, #fff5f5 0%, #ffe6e6 100%)", 
                padding: "24px", 
                borderRadius: "12px", 
                marginBottom: "20px",
                border: "2px solid #dc3545"
              }}>
                <h2 style={{ marginBottom: "20px", color: "#dc3545", display: "flex", alignItems: "center", gap: "8px" }}>
                  ⚠️ Urgent: Orders Awaiting Your Approval ({pendingHubOrders.length})
                </h2>
                <p style={{ marginBottom: "20px", color: "#666", fontSize: "14px" }}>
                  These orders have arrived at seller district hubs and require your approval before they can be dispatched to customer district hubs.
                </p>
                
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", 
                  gap: "15px" 
                }}>
                  {pendingHubOrders.map((order) => (
                    <div 
                      key={order._id} 
                      style={{
                        background: "#fff",
                        border: "2px solid #dc3545",
                        borderRadius: "12px",
                        padding: "16px",
                        boxShadow: "0 4px 12px rgba(220, 53, 69, 0.1)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                        <h4 style={{ margin: 0, color: "#dc3545", fontSize: "16px" }}>
                          Order #{order.orderNumber}
                        </h4>
                        <span style={{
                          padding: "4px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: "600",
                          background: "#dc3545",
                          color: "white"
                        }}>
                          APPROVAL REQUIRED
                        </span>
                      </div>
                      
                      <div style={{ marginBottom: "12px", fontSize: "14px", color: "#666" }}>
                        <div style={{ marginBottom: "4px" }}>
                          👤 <strong>{order.buyerDetails?.name || order.customer}</strong>
                        </div>
                        <div style={{ marginBottom: "4px" }}>
                          📞 {order.buyerDetails?.phone || order.customerPhone}
                        </div>
                        <div style={{ marginBottom: "4px" }}>
                          💰 ₹{order.finalAmount?.toLocaleString('en-IN') || order.amount?.toLocaleString('en-IN')}
                        </div>
                        <div style={{ marginBottom: "4px" }}>
                          🏢 From: <strong>{order.hubTracking?.sellerHubName || order.hubInfo?.hubName}</strong>
                        </div>
                        <div style={{ marginBottom: "4px" }}>
                          📦 Items: {order.items?.length || order.itemCount} products
                        </div>
                        <div style={{ fontSize: "12px", color: "#999" }}>
                          Arrived: {order.hubTracking?.arrivedAtSellerHub ? 
                            new Date(order.hubTracking.arrivedAtSellerHub).toLocaleString('en-IN') : 
                            new Date(order.arrivedAt || order.createdAt).toLocaleString('en-IN')}
                        </div>
                      </div>
                      
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => viewHubOrderDetails(order)}
                          style={{
                            flex: 1,
                            padding: "8px",
                            background: "#17a2b8",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "600"
                          }}
                        >
                          👁️ View Details
                        </button>
                        <button
                          onClick={() => approveHubOrder(order._id)}
                          style={{
                            flex: 1,
                            padding: "8px",
                            background: "#28a745",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "600"
                          }}
                        >
                          ✅ Approve & Dispatch
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Pending Orders Message */}
            {pendingHubOrders.length === 0 && (
              <div style={{ 
                background: "#d4edda", 
                border: "1px solid #c3e6cb", 
                borderRadius: "8px", 
                padding: "20px", 
                textAlign: "center",
                color: "#155724"
              }}>
                <h3 style={{ margin: "0 0 8px 0" }}>✅ All Clear!</h3>
                <p style={{ margin: 0 }}>No orders are currently waiting for your approval.</p>
              </div>
            )}
              </>
            )}

            {/* Approved Orders Tab */}
            {activeHubTab === "approved" && (
              <>
                {approvedHubOrders.length > 0 ? (
                  <div style={{ 
                    background: "linear-gradient(135deg, #f8fff8 0%, #e6ffe6 100%)", 
                    padding: "24px", 
                    borderRadius: "12px", 
                    marginBottom: "20px",
                    border: "2px solid #28a745"
                  }}>
                    <h2 style={{ marginBottom: "20px", color: "#28a745", display: "flex", alignItems: "center", gap: "8px" }}>
                      ✅ Approved Orders ({approvedHubOrders.length})
                    </h2>
                    <p style={{ marginBottom: "20px", color: "#666", fontSize: "14px" }}>
                      These orders have been approved by you and are either in transit or delivered to customer district hubs.
                    </p>
                    
                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", 
                      gap: "15px" 
                    }}>
                      {approvedHubOrders.map((order) => (
                        <div 
                          key={order._id} 
                          style={{
                            background: "#fff",
                            border: "2px solid #28a745",
                            borderRadius: "12px",
                            padding: "16px",
                            boxShadow: "0 4px 12px rgba(40, 167, 69, 0.1)"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                            <h4 style={{ margin: 0, color: "#28a745", fontSize: "16px" }}>
                              Order #{order.orderNumber}
                            </h4>
                            <span style={{
                              padding: "4px 8px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: "600",
                              background: order.hubTracking?.status === "delivered" ? "#17a2b8" : "#28a745",
                              color: "white"
                            }}>
                              {order.hubTracking?.status === "delivered" ? "DELIVERED" : 
                               order.hubTracking?.status === "in_transit_to_customer" ? "IN TRANSIT" : "APPROVED"}
                            </span>
                          </div>
                          
                          <div style={{ marginBottom: "12px", fontSize: "14px", color: "#666" }}>
                            <div style={{ marginBottom: "4px" }}>
                              👤 <strong>{order.buyerDetails?.name || order.customer}</strong>
                            </div>
                            <div style={{ marginBottom: "4px" }}>
                              📞 {order.buyerDetails?.phone || order.customerPhone}
                            </div>
                            <div style={{ marginBottom: "4px" }}>
                              💰 ₹{order.finalAmount?.toLocaleString('en-IN') || order.amount?.toLocaleString('en-IN')}
                            </div>
                            <div style={{ marginBottom: "4px" }}>
                              🏢 Route: <strong>{order.hubTracking?.sellerHubName || order.hubInfo?.hubName}</strong> → <strong>{order.hubTracking?.customerHubName || "Customer Hub"}</strong>
                            </div>
                            <div style={{ marginBottom: "4px" }}>
                              📦 Items: {order.items?.length || order.itemCount} products
                            </div>
                            <div style={{ fontSize: "12px", color: "#999" }}>
                              Approved: {order.hubTracking?.approvedAt ? 
                                new Date(order.hubTracking.approvedAt).toLocaleString('en-IN') : 
                                new Date(order.updatedAt).toLocaleString('en-IN')}
                            </div>
                            {order.hubTracking?.deliveredAt && (
                              <div style={{ fontSize: "12px", color: "#28a745", fontWeight: "600" }}>
                                Delivered: {new Date(order.hubTracking.deliveredAt).toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>
                          
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => viewHubOrderDetails(order)}
                              style={{
                                flex: 1,
                                padding: "8px",
                                background: "#17a2b8",
                                color: "#fff",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "13px",
                                fontWeight: "600"
                              }}
                            >
                              👁️ View Details
                            </button>
                            <button
                              onClick={() => {
                                // Track order functionality
                                toast.info(`Tracking Order #${order.orderNumber}`);
                              }}
                              style={{
                                flex: 1,
                                padding: "8px",
                                background: "#6c757d",
                                color: "#fff",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "13px",
                                fontWeight: "600"
                              }}
                            >
                              📍 Track Order
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    background: "#f8f9fa", 
                    border: "1px solid #dee2e6", 
                    borderRadius: "8px", 
                    padding: "20px", 
                    textAlign: "center",
                    color: "#6c757d"
                  }}>
                    <h3 style={{ margin: "0 0 8px 0" }}>📋 No Approved Orders</h3>
                    <p style={{ margin: 0 }}>You haven't approved any orders yet. Approved orders will appear here.</p>
                  </div>
                )}
              </>
            )}

            {/* All Hub Orders - Order Tracking System */}
            <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ margin: 0, color: "#5c4033" }}>
                  🏢 All Hub Orders - Order Tracking
                </h2>
                <div style={{ display: "flex", gap: "10px" }}>
                  <select
                    style={{
                      padding: "8px 12px",
                      border: "2px solid #5c4033",
                      borderRadius: "6px",
                      fontSize: "14px",
                      cursor: "pointer",
                      background: "#fff",
                      color: "#5c4033"
                    }}
                  >
                    <option value="all">All Orders</option>
                    <option value="at_seller_hub">At Seller Hub</option>
                    <option value="in_transit">In Transit</option>
                    <option value="at_customer_hub">At Customer Hub</option>
                    <option value="delivered">Delivered</option>
                  </select>
                  <button
                    onClick={() => {
                      const user = auth.currentUser;
                      if (user) {
                        fetchPendingHubOrders(user);
                        fetchApprovedHubOrders(user);
                        fetchAdminNotifications(user);
                        fetchOrders(user);
                      }
                    }}
                    style={{
                      padding: "8px 16px",
                      background: "#28a745",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600"
                    }}
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>

              {/* Order Tracking Table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #eee", background: "#faf7f2" }}>
                      <th style={{ padding: "16px", textAlign: "left", fontSize: "14px", color: "#5c4033", fontWeight: "600" }}>Order ID</th>
                      <th style={{ padding: "16px", textAlign: "left", fontSize: "14px", color: "#5c4033", fontWeight: "600" }}>Customer</th>
                      <th style={{ padding: "16px", textAlign: "left", fontSize: "14px", color: "#5c4033", fontWeight: "600" }}>Current Stage</th>
                      <th style={{ padding: "16px", textAlign: "left", fontSize: "14px", color: "#5c4033", fontWeight: "600" }}>Hub Route</th>
                      <th style={{ padding: "16px", textAlign: "left", fontSize: "14px", color: "#5c4033", fontWeight: "600" }}>Amount</th>
                      <th style={{ padding: "16px", textAlign: "left", fontSize: "14px", color: "#5c4033", fontWeight: "600" }}>Overall Status</th>
                      <th style={{ padding: "16px", textAlign: "left", fontSize: "14px", color: "#5c4033", fontWeight: "600" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Pending Hub Orders */}
                    {pendingHubOrders.map((order) => (
                      <tr key={`pending-${order._id}`} style={{ borderBottom: "1px solid #f1e9e1", background: "#fff5f5" }}>
                        <td style={{ padding: "16px" }}>
                          <div style={{ fontWeight: "600", color: "#dc3545", marginBottom: "4px" }}>
                            #{order.orderNumber}
                          </div>
                          <div style={{ fontSize: "12px", color: "#666" }}>
                            {new Date(order.createdAt || order.arrivedAt).toLocaleDateString('en-IN')}
                          </div>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <div style={{ fontWeight: "500", color: "#5c4033", marginBottom: "2px" }}>
                            {order.buyerDetails?.name || order.customer}
                          </div>
                          <div style={{ fontSize: "12px", color: "#666" }}>
                            📞 {order.buyerDetails?.phone || order.customerPhone}
                          </div>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <span style={{
                            padding: "6px 12px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "600",
                            background: "#dc3545",
                            color: "white"
                          }}>
                            🏢 At Seller Hub
                          </span>
                          <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
                            ⚠️ Awaiting Approval
                          </div>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <div style={{ fontSize: "13px", color: "#666" }}>
                            <div><strong>From:</strong> {order.hubTracking?.sellerHubName || order.hubInfo?.hubName}</div>
                            <div><strong>To:</strong> Customer Hub</div>
                          </div>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <div style={{ fontWeight: "700", color: "#5c4033", fontSize: "16px" }}>
                            ₹{(order.finalAmount || order.totalAmount || order.amount || 0).toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <span style={{
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "600",
                            background: "#ffc107",
                            color: "#000"
                          }}>
                            PENDING APPROVAL
                          </span>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => viewHubOrderDetails(order)}
                              style={{
                                padding: "6px 12px",
                                fontSize: "12px",
                                border: "1px solid #17a2b8",
                                background: "transparent",
                                color: "#17a2b8",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontWeight: "500"
                              }}
                            >
                              👁️ View
                            </button>
                            <button
                              onClick={() => approveHubOrder(order._id)}
                              style={{
                                padding: "6px 12px",
                                fontSize: "12px",
                                border: "none",
                                background: "#28a745",
                                color: "white",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontWeight: "600"
                              }}
                            >
                              ✅ Approve
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* All Other Orders with Hub Tracking */}
                    {orders
                      .filter(order => order.hubTracking || order.orderStatus === 'in_transit_to_customer_hub' || order.orderStatus === 'at_customer_hub')
                      .map((order) => {
                        const hubStatus = order.hubTracking?.currentLocation || order.orderStatus;
                        const isApproved = order.hubTracking?.approvedByAdmin;
                        
                        let stageInfo = {
                          stage: "🏢 At Seller Hub",
                          stageColor: "#ffc107",
                          statusText: "PROCESSING",
                          statusColor: "#ffc107"
                        };

                        if (hubStatus === 'in_transit_to_customer_hub' || order.orderStatus === 'in_transit_to_customer_hub') {
                          stageInfo = {
                            stage: "🚚 In Transit",
                            stageColor: "#17a2b8",
                            statusText: "APPROVED & DISPATCHED",
                            statusColor: "#28a745"
                          };
                        } else if (hubStatus === 'customer_hub' || hubStatus === 'at_customer_hub' || order.orderStatus === 'at_customer_hub') {
                          stageInfo = {
                            stage: "📦 At Customer Hub",
                            stageColor: "#28a745",
                            statusText: "READY FOR PICKUP",
                            statusColor: "#28a745"
                          };
                        } else if (order.orderStatus === 'delivered') {
                          stageInfo = {
                            stage: "✅ Delivered",
                            stageColor: "#28a745",
                            statusText: "COMPLETED",
                            statusColor: "#28a745"
                          };
                        }

                        return (
                          <tr key={`order-${order._id}`} style={{ borderBottom: "1px solid #f1e9e1" }}>
                            <td style={{ padding: "16px" }}>
                              <div style={{ fontWeight: "600", color: "#5c4033", marginBottom: "4px" }}>
                                #{order.orderNumber}
                              </div>
                              <div style={{ fontSize: "12px", color: "#666" }}>
                                {new Date(order.createdAt).toLocaleDateString('en-IN')}
                              </div>
                            </td>
                            <td style={{ padding: "16px" }}>
                              <div style={{ fontWeight: "500", color: "#5c4033", marginBottom: "2px" }}>
                                {order.buyerDetails?.name}
                              </div>
                              <div style={{ fontSize: "12px", color: "#666" }}>
                                📞 {order.buyerDetails?.phone}
                              </div>
                            </td>
                            <td style={{ padding: "16px" }}>
                              <span style={{
                                padding: "6px 12px",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: "600",
                                background: stageInfo.stageColor,
                                color: "white"
                              }}>
                                {stageInfo.stage}
                              </span>
                              {isApproved && (
                                <div style={{ fontSize: "11px", color: "#28a745", marginTop: "4px" }}>
                                  ✅ Admin Approved
                                </div>
                              )}
                            </td>
                            <td style={{ padding: "16px" }}>
                              <div style={{ fontSize: "13px", color: "#666" }}>
                                {order.hubTracking ? (
                                  <>
                                    <div><strong>From:</strong> {order.hubTracking.sellerHubName}</div>
                                    <div><strong>To:</strong> {order.hubTracking.customerHubName || 'Customer Hub'}</div>
                                  </>
                                ) : (
                                  <div>Hub tracking not available</div>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: "16px" }}>
                              <div style={{ fontWeight: "700", color: "#5c4033", fontSize: "16px" }}>
                                ₹{(order.finalAmount || order.total || order.totalAmount || 0).toLocaleString('en-IN')}
                              </div>
                            </td>
                            <td style={{ padding: "16px" }}>
                              <span style={{
                                padding: "4px 8px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: "600",
                                background: stageInfo.statusColor,
                                color: "white"
                              }}>
                                {stageInfo.statusText}
                              </span>
                            </td>
                            <td style={{ padding: "16px" }}>
                              <button
                                onClick={() => viewOrderDetails(order)}
                                style={{
                                  padding: "6px 12px",
                                  fontSize: "12px",
                                  border: "1px solid #17a2b8",
                                  background: "transparent",
                                  color: "#17a2b8",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontWeight: "500"
                                }}
                              >
                                👁️ View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>

                {/* Empty State */}
                {pendingHubOrders.length === 0 && orders.filter(order => order.hubTracking).length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>📦</div>
                    <div style={{ fontSize: "18px", fontWeight: "500", marginBottom: "8px" }}>
                      No hub orders found
                    </div>
                    <div style={{ fontSize: "14px" }}>
                      Orders will appear here when they move through the hub system
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Notifications Summary */}
            <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "20px" }}>
              <h3 style={{ marginBottom: "16px", color: "#5c4033" }}>
                📋 Recent Notifications ({adminNotifications.length})
              </h3>
              
              {adminNotifications.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px", color: "#666", background: "#f8f9fa", borderRadius: "8px" }}>
                  <div style={{ fontSize: "24px", marginBottom: "8px" }}>📭</div>
                  <div>No recent notifications</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto" }}>
                  {adminNotifications.slice(0, 5).map((notification) => (
                    <div 
                      key={notification._id} 
                      style={{
                        border: `1px solid ${notification.read ? "#e9ecef" : "#ffc107"}`,
                        borderRadius: "6px",
                        padding: "12px",
                        background: notification.read ? "#f8f9fa" : "#fffbf0",
                        fontSize: "14px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "4px" }}>
                        <span style={{ fontWeight: "600", color: notification.read ? "#666" : "#5c4033" }}>
                          {notification.title}
                        </span>
                        <span style={{ fontSize: "11px", color: "#999" }}>
                          {new Date(notification.createdAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <div style={{ color: "#666", fontSize: "13px" }}>
                        {notification.message}
                      </div>
                      {!notification.read && (
                        <button
                          onClick={() => markAdminNotificationAsRead(notification._id)}
                          style={{
                            marginTop: "8px",
                            padding: "4px 8px",
                            background: "#28a745",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "11px"
                          }}
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  ))}
                  {adminNotifications.length > 5 && (
                    <div style={{ textAlign: "center", padding: "8px", color: "#666", fontSize: "13px" }}>
                      ... and {adminNotifications.length - 5} more notifications
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hub Order Details Modal */}
            {showHubOrderModal && selectedHubOrder && (
              <div 
                onClick={closeHubOrderModal}
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0,0,0,0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 9999,
                  padding: "20px"
                }}
              >
                <div 
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: "#fff",
                    borderRadius: "16px",
                    maxWidth: "800px",
                    width: "100%",
                    maxHeight: "90vh",
                    overflow: "auto",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
                  }}
                >
                  {/* Modal Header */}
                  <div style={{
                    padding: "24px",
                    borderBottom: "1px solid #eee",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    position: "sticky",
                    top: 0,
                    background: "#fff",
                    zIndex: 1
                  }}>
                    <div>
                      <h2 style={{ margin: 0, color: "#5c4033" }}>Hub Order Details</h2>
                      <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: "14px" }}>
                        Order #{selectedHubOrder.orderNumber}
                      </p>
                    </div>
                    <button
                      onClick={closeHubOrderModal}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "24px",
                        cursor: "pointer",
                        color: "#666",
                        padding: "0",
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      ×
                    </button>
                  </div>
                  
                  {/* Modal Content */}
                  <div style={{ padding: "24px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", marginBottom: "24px" }}>
                      {/* Customer Information */}
                      <div>
                        <h3 style={{ marginBottom: "16px", color: "#5c4033" }}>Customer Information</h3>
                        <div style={{ background: "#f9f9f9", padding: "16px", borderRadius: "8px" }}>
                          <div style={{ marginBottom: "8px" }}>
                            <strong>Name:</strong> {selectedHubOrder.customer}
                          </div>
                          <div style={{ marginBottom: "8px" }}>
                            <strong>Email:</strong> {selectedHubOrder.customerEmail}
                          </div>
                          <div style={{ marginBottom: "8px" }}>
                            <strong>Phone:</strong> {selectedHubOrder.customerPhone}
                          </div>
                          <div>
                            <strong>Address:</strong><br />
                            {selectedHubOrder.customerAddress.street && `${selectedHubOrder.customerAddress.street}, `}
                            {selectedHubOrder.customerAddress.city}, {selectedHubOrder.customerAddress.state} - {selectedHubOrder.customerAddress.pincode}
                          </div>
                        </div>
                      </div>
                      
                      {/* Hub Information */}
                      <div>
                        <h3 style={{ marginBottom: "16px", color: "#5c4033" }}>Hub Information</h3>
                        <div style={{ background: "#f9f9f9", padding: "16px", borderRadius: "8px" }}>
                          <div style={{ marginBottom: "8px" }}>
                            <strong>Hub Name:</strong> {selectedHubOrder.hubInfo.hubName}
                          </div>
                          <div style={{ marginBottom: "8px" }}>
                            <strong>District:</strong> {selectedHubOrder.hubInfo.hubDistrict}
                          </div>
                          <div style={{ marginBottom: "8px" }}>
                            <strong>Arrived At:</strong> {new Date(selectedHubOrder.arrivedAt).toLocaleString('en-IN')}
                          </div>
                          <div>
                            <span style={{
                              background: "#e3f2fd",
                              color: "#1976d2",
                              padding: "4px 12px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: "600"
                            }}>
                              Order (At Seller Hub)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Order Items */}
                    <div style={{ marginBottom: "24px" }}>
                      <h3 style={{ marginBottom: "16px", color: "#5c4033" }}>Order Items</h3>
                      <div style={{ background: "#f9f9f9", padding: "16px", borderRadius: "8px" }}>
                        {selectedHubOrder.items.map((item, index) => (
                          <div key={index} style={{ 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "center",
                            padding: "12px 0",
                            borderBottom: index < selectedHubOrder.items.length - 1 ? "1px solid #eee" : "none"
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              {item.image && (
                                <img 
                                  src={`http://localhost:5000/uploads/${item.image}`}
                                  alt={item.title}
                                  style={{ 
                                    width: "40px", 
                                    height: "40px", 
                                    objectFit: "cover", 
                                    borderRadius: "6px" 
                                  }}
                                />
                              )}
                              <div>
                                <div style={{ fontWeight: "500", color: "#5c4033" }}>{item.title}</div>
                                {item.variant && (
                                  <div style={{ fontSize: "12px", color: "#666" }}>
                                    {item.variant.name}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontWeight: "600", color: "#5c4033" }}>
                                ₹{(item.variant?.price || 0).toLocaleString('en-IN')}
                              </div>
                              <div style={{ fontSize: "12px", color: "#666" }}>
                                Qty: {item.quantity}
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Total */}
                        <div style={{ 
                          marginTop: "16px", 
                          paddingTop: "16px", 
                          borderTop: "2px solid #ddd",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}>
                          <div style={{ fontSize: "16px", fontWeight: "600", color: "#5c4033" }}>
                            Total Amount:
                          </div>
                          <div style={{ fontSize: "20px", fontWeight: "700", color: "#5c4033" }}>
                            ₹{selectedHubOrder.totalAmount.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                      <button
                        onClick={closeHubOrderModal}
                        style={{
                          padding: "12px 24px",
                          fontSize: "14px",
                          border: "1px solid #ddd",
                          background: "#fff",
                          color: "#666",
                          borderRadius: "8px",
                          cursor: "pointer"
                        }}
                      >
                        Close
                      </button>
                      <button
                        onClick={() => {
                          approveHubOrder(selectedHubOrder._id);
                          closeHubOrderModal();
                        }}
                        style={{
                          padding: "12px 24px",
                          fontSize: "14px",
                          border: "none",
                          background: "#28a745",
                          color: "white",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: "600"
                        }}
                      >
                        ✓ Approve & Dispatch to Customer Hub
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
          </>
        )}

        {activeSection === "delivery" && (
          <>
            <h1 style={{ marginBottom: "20px" }}>Delivery Boys Management</h1>
            
            {/* Stats Cards */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
              gap: "20px", 
              marginBottom: "30px" 
            }}>
              <div style={{
                background: "#fff",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
              }}>
                <h3 style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>Total Agents</h3>
                <p style={{ fontSize: "28px", fontWeight: "bold", color: "#5c4033", margin: 0 }}>
                  {deliveryAgents.length}
                </p>
              </div>
              
              <div style={{
                background: "#fff",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
              }}>
                <h3 style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>Active Agents</h3>
                <p style={{ fontSize: "28px", fontWeight: "bold", color: "#2ecc71", margin: 0 }}>
                  {deliveryAgents.filter(a => a.status === 'active').length}
                </p>
              </div>
              
              <div style={{
                background: "#fff",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
              }}>
                <h3 style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>Online Now</h3>
                <p style={{ fontSize: "28px", fontWeight: "bold", color: "#3498db", margin: 0 }}>
                  {deliveryAgents.filter(a => a.isOnline).length}
                </p>
              </div>
              
              <div style={{
                background: "#fff",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
              }}>
                <h3 style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>Total Deliveries</h3>
                <p style={{ fontSize: "28px", fontWeight: "bold", color: "#9b59b6", margin: 0 }}>
                  {deliveryAgents.reduce((sum, a) => sum + (a.totalDeliveries || 0), 0)}
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div style={{ 
              display: "flex", 
              gap: "10px", 
              marginBottom: "20px",
              flexWrap: "wrap"
            }}>
              {['all', 'active', 'inactive', 'suspended'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setDeliveryFilter(filter)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "none",
                    background: deliveryFilter === filter ? "#5c4033" : "#fff",
                    color: deliveryFilter === filter ? "#fff" : "#5c4033",
                    cursor: "pointer",
                    fontWeight: 500,
                    textTransform: "capitalize",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                    transition: "all 0.2s"
                  }}
                >
                  {filter === 'all' ? 'All Agents' : `${filter}`}
                </button>
              ))}
            </div>

            {/* Delivery Agents Table */}
            <div style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
            }}>
              {deliveryAgents.length === 0 ? (
                <p style={{ textAlign: "center", color: "#666", padding: "40px" }}>
                  No delivery agents found. Register agents to get started.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #eee" }}>
                        <th style={{ padding: "12px", textAlign: "left", fontWeight: 600, color: "#5c4033" }}>Agent ID</th>
                        <th style={{ padding: "12px", textAlign: "left", fontWeight: 600, color: "#5c4033" }}>Name</th>
                        <th style={{ padding: "12px", textAlign: "left", fontWeight: 600, color: "#5c4033" }}>Phone</th>
                        <th style={{ padding: "12px", textAlign: "left", fontWeight: 600, color: "#5c4033" }}>Email</th>
                        <th style={{ padding: "12px", textAlign: "left", fontWeight: 600, color: "#5c4033" }}>Status</th>
                        <th style={{ padding: "12px", textAlign: "left", fontWeight: 600, color: "#5c4033" }}>Online</th>
                        <th style={{ padding: "12px", textAlign: "left", fontWeight: 600, color: "#5c4033" }}>Completed</th>
                        <th style={{ padding: "12px", textAlign: "left", fontWeight: 600, color: "#5c4033" }}>Rating</th>
                        <th style={{ padding: "12px", textAlign: "left", fontWeight: 600, color: "#5c4033" }}>Earnings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveryAgents
                        .filter(agent => deliveryFilter === 'all' || agent.status === deliveryFilter)
                        .map((agent) => (
                          <tr key={agent._id} style={{ borderBottom: "1px solid #eee" }}>
                            <td style={{ padding: "12px", color: "#666" }}>{agent.agentId}</td>
                            <td style={{ padding: "12px", color: "#333", fontWeight: 500 }}>{agent.name}</td>
                            <td style={{ padding: "12px", color: "#666" }}>{agent.phone}</td>
                            <td style={{ padding: "12px", color: "#666" }}>{agent.email}</td>
                            <td style={{ padding: "12px" }}>
                              <span style={{
                                padding: "4px 12px",
                                borderRadius: "12px",
                                fontSize: "12px",
                                fontWeight: 600,
                                background: agent.status === 'active' ? '#e6f4ea' : 
                                           agent.status === 'inactive' ? '#fff4e6' : '#fee',
                                color: agent.status === 'active' ? '#1e7e34' : 
                                       agent.status === 'inactive' ? '#a87300' : '#c0392b'
                              }}>
                                {agent.status}
                              </span>
                            </td>
                            <td style={{ padding: "12px" }}>
                              <span style={{
                                display: "inline-block",
                                width: "10px",
                                height: "10px",
                                borderRadius: "50%",
                                background: agent.isOnline ? "#2ecc71" : "#95a5a6",
                                marginRight: "8px"
                              }}></span>
                              {agent.isOnline ? "Online" : "Offline"}
                            </td>
                            <td style={{ padding: "12px", color: "#666" }}>{agent.totalDeliveries || 0}</td>
                            <td style={{ padding: "12px", color: "#666" }}>
                              {agent.rating ? `⭐ ${agent.rating.toFixed(1)}` : 'N/A'}
                            </td>
                            <td style={{ padding: "12px", color: "#666", fontWeight: 500 }}>
                              ₹{agent.earnings?.total || agent.earnings || 0}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Hubs Section */}
        {activeSection === "hubs" && (
          <>
            <h1 style={{ marginBottom: "20px" }}>Hub Management</h1>

            {/* Filter Tabs */}
            <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
              <button
                onClick={() => setActiveHubTab("hubs")}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "2px solid #5c4033",
                  background: activeHubTab === "hubs" ? "#5c4033" : "white",
                  color: activeHubTab === "hubs" ? "white" : "#5c4033",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  transition: "all 0.3s ease"
                }}
              >
                Hubs ({hubs.length})
              </button>
              <button
                onClick={() => setActiveHubTab("managers")}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "2px solid #5c4033",
                  background: activeHubTab === "managers" ? "#5c4033" : "white",
                  color: activeHubTab === "managers" ? "white" : "#5c4033",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  transition: "all 0.3s ease"
                }}
              >
                Hub Managers ({hubManagers.length})
              </button>
            </div>

            {/* Hubs Tab */}
            {activeHubTab === "hubs" && (
              <div style={{ background: "#fff", padding: "24px", borderRadius: "12px" }}>
                <h2 style={{ marginBottom: "20px" }}>
                  All Hubs ({hubs.length})
                </h2>
                
                {hubs.length === 0 ? (
                  <p style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                    No hubs found. Please seed hubs using the setup script.
                  </p>
                ) : (
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
                    gap: "20px" 
                  }}>
                    {hubs.map((hub) => (
                      <div 
                        key={hub.hubId} 
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: "12px",
                          overflow: "hidden",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          background: "#fff"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-4px)";
                          e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.1)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        {/* Hub Header */}
                        <div style={{ 
                          background: "linear-gradient(135deg, #5c4033 0%, #7d5a47 100%)",
                          padding: "20px",
                          color: "white"
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                            <h3 style={{ 
                              margin: 0, 
                              fontSize: "18px", 
                              fontWeight: "600"
                            }}>
                              {hub.name}
                            </h3>
                            <span style={{
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: "600",
                              background: hub.status === 'active' ? "#28a745" : "#ffc107",
                              color: "white"
                            }}>
                              {hub.status === 'active' ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p style={{ margin: "0", fontSize: "14px", opacity: 0.9 }}>
                            {hub.district}
                          </p>
                          <p style={{ margin: "4px 0 0 0", fontSize: "12px", opacity: 0.7, fontFamily: "monospace" }}>
                            {hub.hubId}
                          </p>
                        </div>
                        
                        {/* Hub Info */}
                        <div style={{ padding: "16px" }}>
                          <div style={{ marginBottom: "12px" }}>
                            <div style={{ fontSize: "13px", color: "#666", marginBottom: "6px" }}>
                              📞 {hub.contactInfo?.phone || 'N/A'}
                            </div>
                            <div style={{ fontSize: "13px", color: "#666", marginBottom: "6px", wordBreak: "break-all" }}>
                              📧 {hub.contactInfo?.email || 'N/A'}
                            </div>
                            <div style={{ fontSize: "13px", color: "#666" }}>
                              📦 <strong>{hub.capacity?.currentOrders || 0}</strong>/{hub.capacity?.maxOrders || 500} orders
                            </div>
                          </div>

                          {hub.managerId ? (
                            <div style={{ 
                              background: "#f8f9fa",
                              padding: "12px",
                              borderRadius: "8px",
                              marginTop: "12px"
                            }}>
                              <p style={{ fontSize: "11px", color: "#999", margin: "0 0 4px 0" }}>Manager:</p>
                              <p style={{ fontSize: "14px", fontWeight: "600", color: "#5c4033", margin: "0 0 2px 0" }}>
                                {hub.managerName || 'Unknown'}
                              </p>
                              <p style={{ fontSize: "12px", color: "#666", margin: 0, fontFamily: "monospace" }}>
                                {hub.managerId}
                              </p>
                            </div>
                          ) : (
                            <select
                              style={{
                                width: "100%",
                                padding: "10px",
                                border: "2px solid #5c4033",
                                borderRadius: "8px",
                                fontSize: "14px",
                                cursor: "pointer",
                                background: "#fff",
                                color: "#5c4033",
                                fontWeight: "500",
                                marginTop: "12px"
                              }}
                              defaultValue=""
                            >
                              <option value="">Assign Manager</option>
                              {hubManagers.filter(m => !m.hubId).map(manager => (
                                <option key={manager.managerId} value={manager.managerId}>
                                  {manager.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Managers Tab */}
            {activeHubTab === "managers" && (
              <div style={{ background: "#fff", padding: "24px", borderRadius: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h2 style={{ margin: 0 }}>
                    Hub Managers ({hubManagers.length})
                  </h2>
                  <button
                    onClick={() => setShowCreateManager(true)}
                    style={{
                      padding: "10px 20px",
                      background: "#5c4033",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "14px"
                    }}
                  >
                    + Create Hub Manager
                  </button>
                </div>

                {hubManagers.length === 0 ? (
                  <p style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                    No hub managers found. Create a manager to get started.
                  </p>
                ) : (
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", 
                    gap: "20px" 
                  }}>
                    {hubManagers.map((manager) => (
                      <div 
                        key={manager.managerId} 
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: "12px",
                          overflow: "hidden",
                          transition: "all 0.3s ease",
                          background: "#fff"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-4px)";
                          e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.1)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        {/* Manager Header */}
                        <div style={{ 
                          background: "linear-gradient(135deg, #3498db 0%, #5dade2 100%)",
                          padding: "20px",
                          color: "white"
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                            <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "600" }}>
                              {manager.name}
                            </h3>
                            <span style={{
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: "600",
                              background: manager.status === 'active' ? "#28a745" : 
                                         manager.status === 'inactive' ? "#dc3545" : "#ffc107",
                              color: "white"
                            }}>
                              {manager.status}
                            </span>
                          </div>
                          <p style={{ margin: "0", fontSize: "12px", opacity: 0.9, fontFamily: "monospace" }}>
                            {manager.managerId}
                          </p>
                        </div>
                        
                        {/* Manager Info */}
                        <div style={{ padding: "16px" }}>
                          <div style={{ marginBottom: "12px" }}>
                            <div style={{ fontSize: "13px", color: "#666", marginBottom: "6px" }}>
                              📧 {manager.email}
                            </div>
                            <div style={{ fontSize: "13px", color: "#666", marginBottom: "6px" }}>
                              📞 {manager.phone}
                            </div>
                            {manager.hubName && (
                              <div style={{ 
                                fontSize: "13px", 
                                color: "#5c4033",
                                background: "#f8f9fa",
                                padding: "8px",
                                borderRadius: "6px",
                                marginTop: "8px"
                              }}>
                                🏢 {manager.hubName} ({manager.district})
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
                    selectedOrder?.deliveryStatus?.picked_up ||
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
                  backgroundColor: (
                    selectedOrder?.deliveryStatus?.delivered ||
                    currentStatus === 'delivered'
                  ) ? "#28a745" : "#dc3545",
                  display: "inline-block"
                }}></span>
                <span style={{ fontSize: "12px", color: "#5c4033" }}>Delivered</span>
              </div>
            </div>
            )})()}

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
      
      {/* Seller Application Details Modal */}
      {showApplicationModal && selectedApplication && (
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
              onClick={closeApplicationModal}
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

            <h2 style={{ marginBottom: "20px", color: "#5c4033" }}>Seller Application Details</h2>
            
            {/* Business Information */}
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ marginBottom: "15px", color: "#5c4033" }}>Business Information</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <div>
                  <p><strong>Business Name:</strong> {selectedApplication.businessName}</p>
                  <p><strong>Business Type:</strong> {selectedApplication.businessType}</p>
                  <p><strong>Registration Number:</strong> {selectedApplication.businessRegistrationNumber || 'N/A'}</p>
                  <p><strong>GSTIN:</strong> {selectedApplication.gstin || 'N/A'}</p>
                </div>
                <div>
                  <p><strong>Phone:</strong> {selectedApplication.phone}</p>
                  <p><strong>Submitted:</strong> {new Date(selectedApplication.submittedAt).toLocaleString()}</p>
                  <p><strong>Status:</strong> 
                    <span style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      backgroundColor: selectedApplication.status === 'submitted' ? "#fff3cd" : 
                                      selectedApplication.status === 'approved' ? "#d4edda" : 
                                      "#f8d7da",
                      color: selectedApplication.status === 'submitted' ? "#856404" : 
                             selectedApplication.status === 'approved' ? "#155724" : 
                             "#721c24",
                      fontWeight: "600"
                    }}>
                      {selectedApplication.displayStatus}
                    </span>
                  </p>
                  {selectedApplication.rejectionReason && (
                    <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#f8d7da", borderRadius: "4px" }}>
                      <strong>Rejection Reason:</strong> {selectedApplication.rejectionReason}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Address Information */}
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ marginBottom: "15px", color: "#5c4033" }}>Business Address</h3>
              <div style={{ padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                <p><strong>Street:</strong> {selectedApplication.address?.street}</p>
                <p><strong>City:</strong> {selectedApplication.address?.city}</p>
                <p><strong>State:</strong> {selectedApplication.address?.state}</p>
                <p><strong>Pincode:</strong> {selectedApplication.address?.pincode}</p>
                <p><strong>Country:</strong> {selectedApplication.address?.country}</p>
              </div>
            </div>
            
            {/* Document Previews */}
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ marginBottom: "15px", color: "#5c4033" }}>Uploaded Documents</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "15px" }}>
                <div style={{ textAlign: "center" }}>
                  <h4>ID Proof</h4>
                  {selectedApplication.documents && selectedApplication.documents.find(doc => doc.type === 'id_proof') ? (
                    <div>
                      <p style={{ fontSize: "14px", color: "#666" }}>{selectedApplication.documents.find(doc => doc.type === 'id_proof').fileName}</p>
                      <a 
                        href={`http://localhost:5000${selectedApplication.documents.find(doc => doc.type === 'id_proof').filePath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ ...buttonPrimary, padding: "8px 16px", fontSize: "14px", textDecoration: "none", display: "inline-block" }}
                      >
                        View Document
                      </a>
                    </div>
                  ) : (
                    <p>No document uploaded</p>
                  )}
                </div>
                <div style={{ textAlign: "center" }}>
                  <h4>Business License</h4>
                  {selectedApplication.documents && selectedApplication.documents.find(doc => doc.type === 'business_license') ? (
                    <div>
                      <p style={{ fontSize: "14px", color: "#666" }}>{selectedApplication.documents.find(doc => doc.type === 'business_license').fileName}</p>
                      <a 
                        href={`http://localhost:5000${selectedApplication.documents.find(doc => doc.type === 'business_license').filePath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ ...buttonPrimary, padding: "8px 16px", fontSize: "14px", textDecoration: "none", display: "inline-block" }}
                      >
                        View Document
                      </a>
                    </div>
                  ) : (
                    <p>No document uploaded</p>
                  )}
                </div>
                <div style={{ textAlign: "center" }}>
                  <h4>Bank Proof</h4>
                  {selectedApplication.documents && selectedApplication.documents.find(doc => doc.type === 'bank_proof') ? (
                    <div>
                      <p style={{ fontSize: "14px", color: "#666" }}>{selectedApplication.documents.find(doc => doc.type === 'bank_proof').fileName}</p>
                      <a 
                        href={`http://localhost:5000${selectedApplication.documents.find(doc => doc.type === 'bank_proof').filePath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ ...buttonPrimary, padding: "8px 16px", fontSize: "14px", textDecoration: "none", display: "inline-block" }}
                      >
                        View Document
                      </a>
                    </div>
                  ) : (
                    <p>No document uploaded</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={closeApplicationModal}
                style={{ ...buttonSecondary }}
              >
                Close
              </button>
              {selectedApplication.status === 'submitted' && (
                <>
                  <button
                    onClick={() => {
                      closeApplicationModal();
                      approveApplication(selectedApplication._id);
                    }}
                    style={{ ...buttonPrimary, background: "#28a745" }}
                  >
                    Approve Application
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt("Enter rejection reason:");
                      if (reason !== null) {
                        closeApplicationModal();
                        rejectApplication(selectedApplication._id, reason);
                      }
                    }}
                    style={{ ...buttonPrimary, background: "#dc3545" }}
                  >
                    Reject Application
                  </button>
                </>
              )}
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

const controlItem = {
  padding: "10px",
  borderBottom: "1px solid #eee",
  cursor: "pointer",
};