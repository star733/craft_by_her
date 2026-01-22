import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch user info
  const fetchUserInfo = async (user) => {
    try {
      await user.reload();
      const token = await user.getIdToken(true);
      
      // Fetch user profile
      const profileRes = await fetch("http://localhost:5000/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setUserInfo(profileData.user);
      }
      
      // Fetch orders
      const ordersRes = await fetch("http://localhost:5000/api/orders/my-orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(Array.isArray(ordersData) ? ordersData : []);
      }
      
      // Fetch wishlist
      const wishlistRes = await fetch("http://localhost:5000/api/wishlist", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (wishlistRes.ok) {
        const wishlistData = await wishlistRes.json();
        setWishlist(Array.isArray(wishlistData) ? wishlistData : []);
      }
      
      // Fetch recommendations
      const recRes = await fetch("http://localhost:5000/api/recommendations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (recRes.ok) {
        const recData = await recRes.json();
        // Exclude test products from recommendations
        const filteredRecs = Array.isArray(recData) 
          ? recData.filter(p => {
              if (p.title && p.title.toLowerCase().includes("test product")) return false;
              return true;
            }).slice(0, 6)
          : [];
        setRecommendations(filteredRecs);
      }
      
      // Fetch buyer notifications
      const notificationsRes = await fetch("http://localhost:5000/api/notifications/buyer", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (notificationsRes.ok) {
        const notificationsData = await notificationsRes.json();
        if (notificationsData.success) {
          setNotifications(notificationsData.notifications || []);
          setUnreadCount(notificationsData.unreadCount || 0);
        }
      }
    } catch (err) {
      console.error("Fetch user info error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        await fetchUserInfo(user);
      } else {
        navigate("/login");
      }
    });
    return () => unsub();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  if (loading) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh" 
      }}>
        <div>Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: "1200px", 
      margin: "0 auto", 
      padding: "20px",
      fontFamily: "Inter, sans-serif"
    }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "30px" 
      }}>
        <div>
          <h1 style={{ 
            margin: 0, 
            color: "#5c4033" 
          }}>
            Welcome back, {userInfo?.name || "Customer"}!
          </h1>
          <p style={{ 
            color: "#666", 
            margin: "5px 0 0 0" 
          }}>
            Here's what's happening with your account today
          </p>
        </div>
        <button 
          onClick={handleLogout}
          style={{
            background: "#dc3545",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "600"
          }}
        >
          Logout
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
        gap: "20px", 
        marginBottom: "30px" 
      }}>
        <div style={{ 
          background: "#fff", 
          padding: "20px", 
          borderRadius: "12px", 
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          borderLeft: "4px solid #5c4033"
        }}>
          <div style={{ 
            fontSize: "14px", 
            color: "#666", 
            marginBottom: "8px" 
          }}>
            Total Orders
          </div>
          <h3 style={{ 
            fontSize: "32px", 
            margin: "0", 
            color: "#5c4033" 
          }}>
            {orders.length}
          </h3>
        </div>
        
        <div style={{ 
          background: "#fff", 
          padding: "20px", 
          borderRadius: "12px", 
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          borderLeft: "4px solid #4ECDC4"
        }}>
          <div style={{ 
            fontSize: "14px", 
            color: "#666", 
            marginBottom: "8px" 
          }}>
            Wishlist Items
          </div>
          <h3 style={{ 
            fontSize: "32px", 
            margin: "0", 
            color: "#4ECDC4" 
          }}>
            {wishlist.length}
          </h3>
        </div>
        
        <div style={{ 
          background: "#fff", 
          padding: "20px", 
          borderRadius: "12px", 
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          borderLeft: "4px solid #FF6B6B"
        }}>
          <div style={{ 
            fontSize: "14px", 
            color: "#666", 
            marginBottom: "8px" 
          }}>
            Account Status
          </div>
          <h3 style={{ 
            fontSize: "32px", 
            margin: "0", 
            color: "#FF6B6B" 
          }}>
            Active
          </h3>
        </div>
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "2fr 1fr", 
        gap: "20px" 
      }}>
        {/* Left Column */}
        <div>
          {/* Notifications */}
          <div style={{ 
            background: "#fff", 
            padding: "24px", 
            borderRadius: "12px", 
            marginBottom: "20px" 
          }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              marginBottom: "20px" 
            }}>
              <h2 style={{ 
                margin: 0, 
                color: "#5c4033",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                🔔 Notifications
                {unreadCount > 0 && (
                  <span style={{
                    background: "#dc3545",
                    color: "white",
                    borderRadius: "50%",
                    width: "24px",
                    height: "24px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {unreadCount}
                  </span>
                )}
              </h2>
            </div>
            
            {notifications.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "20px 0",
                color: "#666"
              }}>
                <div style={{ fontSize: "48px", marginBottom: "10px" }}>📭</div>
                <p>No notifications yet</p>
              </div>
            ) : (
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {notifications.slice(0, 5).map((notification) => (
                  <div 
                    key={notification._id}
                    style={{
                      border: `1px solid ${notification.read ? "#e9ecef" : "#ffc107"}`,
                      borderRadius: "8px",
                      padding: "16px",
                      marginBottom: "12px",
                      background: notification.read ? "#f8f9fa" : "#fffbf0",
                      cursor: "pointer"
                    }}
                    onClick={async () => {
                      if (!notification.read) {
                        try {
                          const user = auth.currentUser;
                          const token = await user.getIdToken();
                          await fetch(`http://localhost:5000/api/notifications/${notification._id}/read`, {
                            method: "PATCH",
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          // Refresh notifications
                          await fetchUserInfo(user);
                        } catch (error) {
                          console.error("Error marking notification as read:", error);
                        }
                      }
                    }}
                  >
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "start",
                      marginBottom: "8px"
                    }}>
                      <h4 style={{ 
                        margin: 0, 
                        fontSize: "16px",
                        color: notification.read ? "#666" : "#5c4033",
                        fontWeight: notification.read ? "normal" : "600"
                      }}>
                        {notification.title}
                      </h4>
                      <span style={{ 
                        fontSize: "12px", 
                        color: "#999" 
                      }}>
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <p style={{ 
                      margin: "0 0 8px 0", 
                      color: notification.read ? "#666" : "#333",
                      fontSize: "14px",
                      lineHeight: "1.4"
                    }}>
                      {notification.message}
                    </p>
                    
                    {notification.metadata && notification.metadata.otp && (
                      <div style={{
                        background: "#e8f5e8",
                        border: "1px solid #28a745",
                        borderRadius: "6px",
                        padding: "12px",
                        marginTop: "8px"
                      }}>
                        <div style={{ 
                          fontSize: "12px", 
                          color: "#28a745", 
                          fontWeight: "600",
                          marginBottom: "4px"
                        }}>
                          🔐 Your Pickup OTP:
                        </div>
                        <div style={{ 
                          fontSize: "20px", 
                          fontWeight: "bold", 
                          color: "#28a745",
                          letterSpacing: "2px"
                        }}>
                          {notification.metadata.otp}
                        </div>
                      </div>
                    )}
                    
                    {!notification.read && (
                      <div style={{
                        fontSize: "12px",
                        color: "#ffc107",
                        fontWeight: "600",
                        marginTop: "8px"
                      }}>
                        ● New
                      </div>
                    )}
                  </div>
                ))}
                
                {notifications.length > 5 && (
                  <div style={{ 
                    textAlign: "center", 
                    padding: "10px",
                    color: "#666",
                    fontSize: "14px"
                  }}>
                    ... and {notifications.length - 5} more notifications
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent Orders */}
          <div style={{ 
            background: "#fff", 
            padding: "24px", 
            borderRadius: "12px", 
            marginBottom: "20px" 
          }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              marginBottom: "20px" 
            }}>
              <h2 style={{ 
                margin: 0, 
                color: "#5c4033" 
              }}>
                Recent Orders
              </h2>
              <button 
                onClick={() => navigate("/orders")}
                style={{
                  background: "transparent",
                  color: "#5c4033",
                  border: "1px solid #5c4033",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600"
                }}
              >
                View All
              </button>
            </div>
            
            {orders.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "40px 0" 
              }}>
                <div style={{ 
                  fontSize: "48px", 
                  marginBottom: "15px" 
                }}>
                  📦
                </div>
                <h3 style={{ 
                  margin: "0 0 10px 0", 
                  color: "#5c4033" 
                }}>
                  No orders yet
                </h3>
                <p style={{ 
                  color: "#666", 
                  marginBottom: "20px" 
                }}>
                  Start shopping to see your orders here
                </p>
                <button 
                  onClick={() => navigate("/products")}
                  style={{
                    background: "#5c4033",
                    color: "white",
                    border: "none",
                    padding: "12px 24px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "600"
                  }}
                >
                  Browse Products
                </button>
              </div>
            ) : (
              <div style={{ 
                display: "grid", 
                gap: "15px" 
              }}>
                {orders.slice(0, 3).map((order) => (
                  <div key={order._id} style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    padding: "15px", 
                    border: "1px solid #eee", 
                    borderRadius: "8px" 
                  }}>
                    <div>
                      <div style={{ 
                        fontWeight: "600", 
                        marginBottom: "5px" 
                      }}>
                        Order #{order.orderNumber}
                      </div>
                      <div style={{ 
                        fontSize: "14px", 
                        color: "#666" 
                      }}>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ 
                      textAlign: "right" 
                    }}>
                      <div style={{ 
                        fontWeight: "600", 
                        marginBottom: "5px" 
                      }}>
                        ₹{order.finalAmount || order.total || 0}
                      </div>
                      <div style={{ 
                        fontSize: "14px",
                        padding: "4px 8px",
                        borderRadius: "999px",
                        backgroundColor: order.orderStatus === "delivered" ? "#e6f4ea" : 
                                         order.orderStatus === "pending" ? "#fff7e6" : "#e6f0ff",
                        color: order.orderStatus === "delivered" ? "#1e7e34" : 
                               order.orderStatus === "pending" ? "#a87300" : "#21409a",
                        display: "inline-block"
                      }}>
                        {order.orderStatus}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Recommendations */}
          <div style={{ 
            background: "#fff", 
            padding: "24px", 
            borderRadius: "12px" 
          }}>
            <h2 style={{ 
              margin: "0 0 20px 0", 
              color: "#5c4033" 
            }}>
              Recommended For You
            </h2>
            
            {recommendations.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "40px 0" 
              }}>
                <div style={{ 
                  fontSize: "48px", 
                  marginBottom: "15px" 
                }}>
                  🎯
                </div>
                <p style={{ 
                  color: "#666" 
                }}>
                  We'll show personalized recommendations based on your purchases
                </p>
              </div>
            ) : (
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", 
                gap: "15px" 
              }}>
                {recommendations
                  .filter(product => {
                    // Exclude test products
                    if (product.title && product.title.toLowerCase().includes("test product")) return false;
                    return true;
                  })
                  .map((product) => (
                  <div key={product._id} style={{ 
                    textAlign: "center" 
                  }}>
                    <div style={{ 
                      height: "120px", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      marginBottom: "10px" 
                    }}>
                      {product.image ? (
                        <img
                          src={`http://localhost:5000/uploads/${product.image}`}
                          alt={product.title}
                          style={{ 
                            maxHeight: "100%", 
                            maxWidth: "100%", 
                            objectFit: "contain" 
                          }}
                        />
                      ) : product.img ? (
                        <img
                          src={`/images/products/${product.img}`}
                          alt={product.title}
                          style={{ 
                            maxHeight: "100%", 
                            maxWidth: "100%", 
                            objectFit: "contain" 
                          }}
                        />
                      ) : (
                        <div style={{ 
                          fontSize: "40px" 
                        }}>
                          📦
                        </div>
                      )}
                    </div>
                    <h4 style={{ 
                      margin: "0 0 5px 0", 
                      fontSize: "14px" 
                    }}>
                      {product.title}
                    </h4>
                    <div style={{ 
                      fontWeight: "600", 
                      color: "#5c4033" 
                    }}>
                      ₹{product.price}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Right Column */}
        <div>
          {/* Profile Card */}
          <div style={{ 
            background: "#fff", 
            padding: "24px", 
            borderRadius: "12px", 
            marginBottom: "20px" 
          }}>
            <h2 style={{ 
              margin: "0 0 20px 0", 
              color: "#5c4033" 
            }}>
              Your Profile
            </h2>
            
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              marginBottom: "20px" 
            }}>
              <div style={{ 
                width: "60px", 
                height: "60px", 
                borderRadius: "50%", 
                background: "#f0f0f0", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                fontSize: "24px", 
                marginRight: "15px" 
              }}>
                {userInfo?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div>
                <div style={{ 
                  fontWeight: "600", 
                  fontSize: "18px" 
                }}>
                  {userInfo?.name || "User"}
                </div>
                <div style={{ 
                  color: "#666" 
                }}>
                  {userInfo?.email || "user@example.com"}
                </div>
              </div>
            </div>
            
            <div style={{ 
              display: "grid", 
              gap: "15px" 
            }}>
              <button 
                onClick={() => navigate("/account/profile")}
                style={{
                  width: "100%",
                  background: "transparent",
                  color: "#5c4033",
                  border: "1px solid #5c4033",
                  padding: "12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  textAlign: "left"
                }}
              >
                🖋️ Edit Profile
              </button>
              <button 
                onClick={() => navigate("/account/address")}
                style={{
                  width: "100%",
                  background: "transparent",
                  color: "#5c4033",
                  border: "1px solid #5c4033",
                  padding: "12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  textAlign: "left"
                }}
              >
                📍 Manage Addresses
              </button>
              <button 
                onClick={() => navigate("/account/security")}
                style={{
                  width: "100%",
                  background: "transparent",
                  color: "#5c4033",
                  border: "1px solid #5c4033",
                  padding: "12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  textAlign: "left"
                }}
              >
                🔐 Security Settings
              </button>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div style={{ 
            background: "#fff", 
            padding: "24px", 
            borderRadius: "12px" 
          }}>
            <h2 style={{ 
              margin: "0 0 20px 0", 
              color: "#5c4033" 
            }}>
              Quick Actions
            </h2>
            
            <div style={{ 
              display: "grid", 
              gap: "15px" 
            }}>
              <button 
                onClick={() => navigate("/wishlist")}
                style={{
                  width: "100%",
                  background: "#fff8e6",
                  color: "#5c4033",
                  border: "1px solid #ffd54f",
                  padding: "15px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ❤️ View Wishlist ({wishlist.length})
              </button>
              <button 
                onClick={() => navigate("/cart")}
                style={{
                  width: "100%",
                  background: "#e6f4ea",
                  color: "#1e7e34",
                  border: "1px solid #c3e6cb",
                  padding: "15px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                🛒 Go to Cart
              </button>
              <button 
                onClick={() => navigate("/products")}
                style={{
                  width: "100%",
                  background: "#5c4033",
                  color: "white",
                  border: "none",
                  padding: "15px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                🛍️ Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}