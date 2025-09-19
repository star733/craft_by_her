import React, { useEffect, useState, useRef } from "react";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { signOut } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
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
  const [activeSection, setActiveSection] = useState("dashboard");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
      const token = await user.getIdToken();
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

  // ✅ Fetch orders (placeholder - you'll need to implement this endpoint)
  const fetchOrders = async (user) => {
    try {
      const token = await user.getIdToken();
      // This is a placeholder - you'll need to create this endpoint
      const res = await fetch("http://localhost:5000/api/admin/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        toast.error("Access denied: You are not an admin");
        return;
      }

      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch orders error:", err);
      setOrders([]);
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
      }
    }
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchProducts(user);
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
      if (isNaN(price) || price < 1 || price > 1000) {
        toast.error(`Price for variant ${i + 1} must be between ₹1 and ₹1,000`);
        return;
      }
    }

    if (!editingId && !selectedFile) {
      toast.error("Please select an image file");
      return;
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

  // ✅ Delete Product
  const deleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`http://localhost:5000/api/admin/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Product deleted!");
        fetchProducts(auth.currentUser);
      } else toast.error("Failed to delete product");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete product");
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
              <div style={statCard}>Total Products <h3>{products.length}</h3></div>
              <div style={statCard}>Active Orders <h3>{orders.length}</h3></div>
              <div style={statCard}>Revenue <h3>₹45,600</h3></div>
              <div style={statCard}>New This Week <h3>3</h3></div>
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
                <h2>Quick Stats</h2>
                <p>Orders This Week: <b>5</b></p>
                <p>Goals Completed: <b>8</b></p>
                <p>System Uptime: <b style={{ color: "green" }}>99.9%</b></p>
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
                    💡 Price must be between ₹1 and ₹1,000. Use decimal values for precise pricing (e.g., 299.99)
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
                        max="1000"
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
                    Product Image *
                  </label>
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
                        toast.success("Image selected successfully!");
                      }
                    }} 
                    style={{ ...inputStyle, padding: "10px", border: "1px dashed #ccc" }} 
                    required
                  />
                  <p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
                    Only image files allowed (JPG, PNG, GIF, etc.)
                  </p>
                </div>
                <div>
                  <button disabled={loading} style={buttonPrimary}>
                    {loading ? "Saving..." : editingId ? "Update Product" : "Add Product"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => { setEditingId(null); setForm({ title: "", category: "", stock: "", price: "", variants: [{ weight: "", price: "" }], image: null }); setSelectedFile(null); }}
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
                    <div key={p._id} style={{ background: "#fff", padding: "16px", borderRadius: "8px", textAlign: "center" }}>
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
                        <button onClick={() => deleteProduct(p._id)} style={{ ...buttonPrimary, background: "#543737" }}>Delete</button>
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
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #eee" }}>
                      <th style={{ padding: "12px", textAlign: "left" }}>Order ID</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Customer</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Total</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Status</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Date</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: "40px", textAlign: "center", color: "#666" }}>
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
                      orders.map((order) => (
                        <tr key={order.id} style={{ borderBottom: "1px solid #eee" }}>
                          <td style={{ padding: "12px" }}>#{order.id}</td>
                          <td style={{ padding: "12px" }}>{order.customer}</td>
                          <td style={{ padding: "12px" }}>₹{order.total}</td>
                          <td style={{ padding: "12px" }}>
                            <span style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              backgroundColor: order.status === "completed" ? "#d4edda" : 
                                               order.status === "pending" ? "#fff3cd" : "#cce5ff",
                              color: order.status === "completed" ? "#155724" : 
                                     order.status === "pending" ? "#856404" : "#004085"
                            }}>
                              {order.status}
                            </span>
                          </td>
                          <td style={{ padding: "12px" }}>{order.date}</td>
                          <td style={{ padding: "12px" }}>
                            <button style={{ ...buttonPrimary, padding: "6px 12px", fontSize: "12px" }}>
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Settings Section */}
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
  background: "transparent",
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

