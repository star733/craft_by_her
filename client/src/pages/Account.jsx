import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiGrid,
  FiBox,
  FiHeart,
  FiShoppingCart,
  FiUser,
  FiHome,
  FiHelpCircle,
  FiLogOut,
  FiEdit3,
  FiTrash2,
  FiEye,
} from "react-icons/fi";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Account() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState({ items: [], totalAmount: 0 });
  const [wishlist, setWishlist] = useState({ products: [] });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  // Listen for tab change requests from Overview quick actions
  useEffect(() => {
    const handler = (e) => {
      if (e?.detail) setTab(e.detail);
    };
    window.addEventListener("acct:setTab", handler);
    return () => window.removeEventListener("acct:setTab", handler);
  }, []);

  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }

    setUser(auth.currentUser);
    fetchUserData();
  }, [navigate]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const token = await auth.currentUser.getIdToken();

      // Fetch cart, wishlist, and orders in parallel
      const [cartResponse, wishlistResponse, ordersResponse] = await Promise.all([
        fetch("http://localhost:5000/api/cart", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("http://localhost:5000/api/wishlist", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("http://localhost:5000/api/orders", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (cartResponse.ok) {
        const cartData = await cartResponse.json();
        setCart(cartData);
      }

      if (wishlistResponse.ok) {
        const wishlistData = await wishlistResponse.json();
        setWishlist(wishlistData);
      }

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setOrders(ordersData);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Failed to load account data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("craftedbyher_user");
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const NavItem = ({ k, icon: Icon, children, count }) => (
    <button
      className={`acct-nav__item ${tab === k ? "active" : ""}`}
      onClick={() => setTab(k)}
    >
      <Icon size={18} />
      <span>{children}</span>
      {count > 0 && <span className="acct-nav__count">{count}</span>}
    </button>
  );

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <div style={{ fontSize: "24px", marginBottom: "16px" }}>⏳</div>
        <h2>Loading your account...</h2>
      </div>
    );
  }

  return (
    <main className="acct-shell">
      {/* Sidebar */}
      <aside className="acct-sidebar">
        <div className="acct-user">
          <div className="acct-avatar">
            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
          </div>
          <div className="acct-user__meta">
            <div className="acct-user__name">
              {user?.displayName || user?.email?.split("@")[0] || "User"}
            </div>
            <div className="acct-user__email">{user?.email}</div>
          </div>
        </div>

        <nav className="acct-nav">
          <NavItem k="overview" icon={FiGrid}>
            Dashboard
          </NavItem>
          <NavItem k="orders" icon={FiBox} count={orders.length}>
            Orders
          </NavItem>
          <NavItem k="cart" icon={FiShoppingCart} count={cart.items?.length || 0}>
            Cart
          </NavItem>
          <NavItem k="wishlist" icon={FiHeart} count={wishlist.products?.length || 0}>
            Wishlist
          </NavItem>
          <NavItem k="profile" icon={FiUser}>
            Profile
          </NavItem>
          <NavItem k="addresses" icon={FiHome}>
            Addresses
          </NavItem>
          <NavItem k="support" icon={FiHelpCircle}>
            Support
          </NavItem>
          <button className="acct-nav__item acct-nav__item--danger" onClick={handleLogout}>
            <FiLogOut size={18} />
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <section className="acct-main">
        {tab === "overview" && (
          <Overview
            user={user}
            cart={cart}
            wishlist={wishlist}
            orders={orders}
            onBrowse={() => navigate("/products")}
          />
        )}
        {tab === "orders" && <OrdersSection orders={orders} />}
        {tab === "cart" && <CartSection cart={cart} onRefresh={fetchUserData} />}
        {tab === "wishlist" && <WishlistSection wishlist={wishlist} onRefresh={fetchUserData} />}
        {tab === "profile" && <ProfileSection user={user} />}
        {tab === "addresses" && <Addresses />}
        {tab === "support" && <Support />}
      </section>
    </main>
  );
}

/* --- Sections --- */

function Overview({ user, cart, wishlist, orders, onBrowse }) {
  // helper to switch tabs without leaving account
  const goto = (tabKey) => {
    const ev = new CustomEvent("acct:setTab", { detail: tabKey });
    window.dispatchEvent(ev);
  };
  return (
    <>
      <h1 className="acct-title">Welcome back, {user?.displayName || user?.email?.split("@")[0]}! 👋</h1>
      
      <div className="acct-grid">
        {/* Quick Stats */}
        <div className="acct-card">
          <div className="acct-card__title">Your Activity</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ textAlign: "center", padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
              <div style={{ fontSize: "24px", fontWeight: "600", color: "#5c4033" }}>
                {orders.length}
              </div>
              <div style={{ fontSize: "14px", color: "#666" }}>Orders</div>
            </div>
            <div style={{ textAlign: "center", padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
              <div style={{ fontSize: "24px", fontWeight: "600", color: "#5c4033" }}>
                {cart.items?.length || 0}
              </div>
              <div style={{ fontSize: "14px", color: "#666" }}>Cart Items</div>
            </div>
            <div style={{ textAlign: "center", padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
              <div style={{ fontSize: "24px", fontWeight: "600", color: "#5c4033" }}>
                {wishlist.products?.length || 0}
              </div>
              <div style={{ fontSize: "14px", color: "#666" }}>Wishlist</div>
            </div>
            <div style={{ textAlign: "center", padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
              <div style={{ fontSize: "24px", fontWeight: "600", color: "#5c4033" }}>
                ₹{cart.totalAmount || 0}
              </div>
              <div style={{ fontSize: "14px", color: "#666" }}>Cart Total</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="acct-card">
          <div className="acct-card__title">Quick Actions</div>
          <div className="acct-actions">
            <button className="bk-btn bk-btn--pill bk-btn--primary" onClick={onBrowse}>
              Browse Products
            </button>
            {cart.items?.length > 0 && (
              <button 
                className="bk-btn bk-btn--pill bk-btn--ghost" 
                onClick={() => goto("cart")}
              >
                View Cart ({cart.items.length})
              </button>
            )}
            {wishlist.products?.length > 0 && (
              <button 
                className="bk-btn bk-btn--pill bk-btn--ghost" 
                onClick={() => goto("wishlist")}
              >
                View Wishlist ({wishlist.products.length})
              </button>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="acct-card">
          <div className="acct-card__title">Recent Orders</div>
          {orders.length === 0 ? (
            <p className="acct-muted">You don't have any orders yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {orders.slice(0, 3).map((order) => (
                <div key={order._id} style={{ 
                  padding: "12px", 
                  border: "1px solid #e0e0e0", 
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div>
                    <div style={{ fontWeight: "600" }}>Order #{order.orderNumber}</div>
                    <div style={{ fontSize: "14px", color: "#666" }}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: "600", color: "#5c4033" }}>₹{order.finalAmount}</div>
                    <div style={{ 
                      fontSize: "12px", 
                      color: order.orderStatus === "delivered" ? "#28a745" : "#ffc107",
                      fontWeight: "600"
                    }}>
                      {order.orderStatus}
                    </div>
                  </div>
                </div>
              ))}
              {orders.length > 3 && (
                <button 
                  className="bk-btn bk-btn--pill bk-btn--ghost"
                  onClick={() => window.location.href = "/orders"}
                >
                  View All Orders
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function OrdersSection({ orders }) {
  return (
    <>
      <h1 className="acct-title">Your Orders</h1>
      {orders.length === 0 ? (
        <div className="acct-empty">
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>📦</div>
          <h3>No orders yet</h3>
          <p className="acct-muted">When you place an order, it will show up here.</p>
          <button 
            className="bk-btn bk-btn--pill bk-btn--primary" 
            onClick={() => window.location.href = "/products"}
          >
            Browse products
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {orders.map((order) => (
            <div key={order._id} style={{ 
              background: "#fff", 
              padding: "20px", 
              borderRadius: "12px", 
              border: "1px solid #e0e0e0",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: "0 0 8px 0", color: "#5c4033" }}>
                    Order #{order.orderNumber}
                  </h3>
                  <div style={{ fontSize: "14px", color: "#666" }}>
                    Placed on {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "18px", fontWeight: "600", color: "#5c4033" }}>
                    ₹{order.finalAmount}
                  </div>
                  <div style={{ 
                    fontSize: "12px", 
                    color: order.orderStatus === "delivered" ? "#28a745" : "#ffc107",
                    fontWeight: "600"
                  }}>
                    {order.orderStatus}
                  </div>
                </div>
              </div>
              
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>
                  Items ({order.items.length}):
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {order.items.map((item, index) => (
                    <div key={index} style={{ 
                      fontSize: "12px", 
                      background: "#f8f9fa", 
                      padding: "4px 8px", 
                      borderRadius: "4px" 
                    }}>
                      {item.title} × {item.quantity}
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ display: "flex", gap: "8px" }}>
                <button 
                  className="bk-btn bk-btn--pill bk-btn--ghost"
                  onClick={() => window.location.href = `/order-confirmation?orderId=${order._id}`}
                >
                  <FiEye size={16} />
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function CartSection({ cart, onRefresh }) {
  const navigate = useNavigate();
  
  const removeFromCart = async (itemId) => {
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`http://localhost:5000/api/cart/remove/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("Item removed from cart!");
        onRefresh();
      }
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("Failed to remove item");
    }
  };

  return (
    <>
      <h1 className="acct-title">Your Cart</h1>
      {cart.items?.length === 0 ? (
        <div className="acct-empty">
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>🛒</div>
          <h3>Your cart is empty</h3>
          <p className="acct-muted">Add some delicious items to your cart!</p>
          <button 
            className="bk-btn bk-btn--pill bk-btn--primary" 
            onClick={() => window.location.href = "/products"}
          >
            Browse products
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {(() => {
            const groups = new Map();
            for (const item of cart.items) {
              const pid = (item && item.productId && item.productId._id) ? item.productId._id : item.productId;
              const weight = item.variant?.weight;
              const price = String(item.variant?.price);
              const key = `${pid}__${weight}__${price}`;
              if (!groups.has(key)) {
                groups.set(key, {
                  baseIds: [item._id],
                  productId: pid,
                  title: item.title || item?.productId?.title,
                  image: item.image || item?.productId?.image,
                  variant: { weight, price: Number(price) },
                  quantity: item.quantity || 1,
                });
              } else {
                const g = groups.get(key);
                g.baseIds.push(item._id);
                g.quantity += item.quantity || 1;
              }
            }
            const aggregated = Array.from(groups.values());
            return aggregated.map((item, index) => (
            <div key={index} style={{ 
              background: "#fff", 
              padding: "20px", 
              borderRadius: "12px", 
              border: "1px solid #e0e0e0",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              display: "flex",
              gap: "16px",
              alignItems: "center"
            }}>
              <div style={{ width: "100px", height: "100px", background: "#fff", border: "1px solid #eee", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {item.image ? (
                  <img
                    src={`http://localhost:5000/uploads/${item.image}`}
                    alt={item.title || "Product"}
                    style={{ width: "100%", height: "100%", objectFit: "contain", padding: "6px" }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div style={{ 
                  display: item.image ? 'none' : 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: '100%', 
                  height: '100%',
                  fontSize: '12px', 
                  color: '#999' 
                }}>
                  No Image
                </div>
              </div>
              
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>{item.title}</h4>
                <div style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>
                  {item.variant.weight}
                </div>
                <div style={{ fontSize: "16px", color: "#5c4033", fontWeight: "600" }}>
                  ₹{item.variant.price} × {item.quantity} = ₹{item.variant.price * item.quantity}
                </div>
              </div>
              
              <div style={{ display: "flex", gap: "8px" }}>
                <button 
                  className="bk-btn bk-btn--icon"
                  onClick={() => {
                    const pid = item.productId;
                    if (!pid) {
                      toast.error("Product not available");
                      return;
                    }
                    navigate(`/products/${pid}`);
                  }}
                  title="View"
                  aria-label="View"
                >
                  <FiEye size={16} />
                </button>
                <button 
                  className="bk-btn bk-btn--icon bk-btn--danger"
                  onClick={async () => {
                    const token = await auth.currentUser.getIdToken();
                    for (const id of item.baseIds) {
                      await fetch(`http://localhost:5000/api/cart/remove/${id}`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` },
                      });
                    }
                    toast.success("Item removed from cart!");
                    onRefresh();
                  }}
                  title="Remove"
                  aria-label="Remove"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))})()}
          
          <div style={{ 
            background: "#fff", 
            padding: "20px", 
            borderRadius: "12px", 
            border: "1px solid #e0e0e0",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "18px", fontWeight: "600", color: "#5c4033", marginBottom: "16px" }}>
              Total: ₹{cart.totalAmount || 0}
            </div>
            <button 
              className="bk-btn bk-btn--pill bk-btn--primary"
              onClick={() => navigate("/checkout", { state: { cartItems: cart.items } })}
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function WishlistSection({ wishlist, onRefresh }) {
  const navigate = useNavigate();
  
  const addToCart = async (product) => {
    try {
      if (!product?.variants || product.variants.length === 0) {
        toast.error("No variants available for this product");
        return;
      }
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("http://localhost:5000/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: product._id,
          variant: product.variants[0],
          quantity: 1,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to add to cart");
      }
      toast.success("Added to cart");
    } catch (err) {
      console.error("addToCart error:", err);
      toast.error("Failed to add to cart");
    }
  };
  
  const removeFromWishlist = async (productId) => {
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`http://localhost:5000/api/wishlist/remove/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("Removed from wishlist!");
        onRefresh();
      }
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      toast.error("Failed to remove from wishlist");
    }
  };

  return (
    <>
      <h1 className="acct-title">Your Wishlist</h1>
      {wishlist.products?.length === 0 ? (
        <div className="acct-empty">
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>❤️</div>
          <h3>Nothing in wishlist</h3>
          <p className="acct-muted">
            Save your favourite snacks, cakes, and pickles to find them faster later.
          </p>
          <button 
            className="bk-btn bk-btn--pill bk-btn--primary" 
            onClick={() => window.location.href = "/products"}
          >
            Browse products
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "16px" }}>
          {wishlist.products.map((product) => (
            <div key={product._id} style={{ 
              background: "#fff", 
              padding: "16px", 
              borderRadius: "12px", 
              border: "1px solid #e0e0e0",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              textAlign: "center"
            }}>
              <div style={{ width: "100%", height: "120px", background: "#f5f5f5", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                {product.image ? (
                  <img
                    src={`http://localhost:5000/uploads/${product.image}`}
                    alt={product.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }}
                  />
                ) : product.img ? (
                  <img
                    src={`/images/products/${product.img}`}
                    alt={product.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }}
                  />
                ) : (
                  <span style={{ fontSize: "12px", color: "#999" }}>No Image</span>
                )}
              </div>
              
              <h4 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>{product.title}</h4>
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "12px" }}>
                {product.category}
              </div>
              
              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                <button 
                  className="bk-btn bk-btn--icon"
                  onClick={() => navigate(`/products/${product._id}`)}
                  title="View"
                  aria-label="View"
                >
                  <FiEye size={16} />
                </button>
                <button 
                  className="bk-btn bk-btn--icon"
                  onClick={() => addToCart(product)}
                  title="Add to cart"
                  aria-label="Add to cart"
                >
                  <FiShoppingCart size={16} />
                </button>
                <button 
                  className="bk-btn bk-btn--icon bk-btn--danger"
                  onClick={() => removeFromWishlist(product._id)}
                  title="Remove"
                  aria-label="Remove"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ProfileSection({ user }) {
  return (
    <>
      <h1 className="acct-title">Profile Information</h1>
      <div className="acct-card">
        <div className="acct-card__title">Personal Details</div>
        <div style={{ display: "grid", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
              Display Name
            </label>
            <div style={{ padding: "12px", background: "#f8f9fa", borderRadius: "8px", fontSize: "16px" }}>
              {user?.displayName || "Not set"}
            </div>
          </div>
          
          <div>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
              Email Address
            </label>
            <div style={{ padding: "12px", background: "#f8f9fa", borderRadius: "8px", fontSize: "16px" }}>
              {user?.email}
            </div>
          </div>
          
          <div>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
              User ID
            </label>
            <div style={{ padding: "12px", background: "#f8f9fa", borderRadius: "8px", fontSize: "14px", fontFamily: "monospace", wordBreak: "break-all" }}>
              {user?.uid}
            </div>
          </div>
          
          <div>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
              Account Created
            </label>
            <div style={{ padding: "12px", background: "#f8f9fa", borderRadius: "8px", fontSize: "16px" }}>
              {user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : "Unknown"}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Addresses() {
  return (
    <>
      <h1 className="acct-title">Addresses</h1>
      <div className="acct-card">
        <div className="acct-card__title">Saved Addresses</div>
        <p className="acct-muted">Add your delivery address to checkout faster.</p>
        <button className="bk-btn bk-btn--pill bk-btn--ghost">Add Address</button>
      </div>
    </>
  );
}

function Support() {
  return (
    <>
      <h1 className="acct-title">Support</h1>
      <div className="acct-card">
        <div className="acct-card__title">How can we help?</div>
        <p className="acct-muted">
          Have a question about an order, ingredients, or delivery? Send us a message.
        </p>
        <a href="/contact" className="bk-btn bk-btn--pill bk-btn--ghost">Contact Us</a>
      </div>
    </>
  );
}