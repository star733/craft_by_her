import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import OrderRating from "../components/OrderRating";
// Live tracking (Socket.IO + Leaflet) loaded via CDN at runtime

export default function OrderConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [live, setLive] = useState({
    connected: false,
    updates: 0,
    distanceM: 0,
    coords: null,
    delivered: false
  });

  // Check for persisted delivery status and sync with server
  useEffect(() => {
    const checkDeliveredStatus = async () => {
      if (orderId) {
        const savedStatus = localStorage.getItem(`delivery-status-${orderId}`);
        if (savedStatus) {
          const parsed = JSON.parse(savedStatus);
          if (parsed.delivered) {
            console.log('[OrderConfirmation] Found delivered status in localStorage, syncing...');
            setLive(prev => ({ ...prev, delivered: true }));
            setOrder((prev) => prev ? { ...prev, orderStatus: "delivered" } : prev);
            
            // Also sync with server to ensure consistency
            try {
              if (auth.currentUser) {
                const token = await auth.currentUser.getIdToken();
                await fetch(`http://localhost:5000/api/orders/${orderId}/delivered`, {
                  method: 'PATCH',
                  headers: { Authorization: `Bearer ${token}` }
                });
                console.log('[OrderConfirmation] Synced delivered status with server');
              }
            } catch (e) {
              console.warn('[OrderConfirmation] Failed to sync with server:', e);
            }
          }
        }
      }
    };
    
    checkDeliveredStatus();
  }, [orderId]);

  // Lazy load external scripts (Socket.IO client + Leaflet assets)
  const loadScript = (src) => new Promise((resolve, reject) => {
    if (document.querySelector(`script[src=\"${src}\"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.body.appendChild(s);
  });
  const loadCss = (href) => new Promise((resolve, reject) => {
    if (document.querySelector(`link[href=\"${href}\"]`)) return resolve();
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    l.onload = resolve;
    l.onerror = reject;
    document.head.appendChild(l);
  });

  const fetchOrderDetails = async () => {
    if (orderId) {
      try {
        const token = await auth.currentUser.getIdToken();
        const resp = await fetch(`http://localhost:5000/api/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error("Failed to fetch order");
        const data = await resp.json();
        setOrder(data);
      } catch (e) {
        console.error("Error fetching order:", e);
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!auth.currentUser) {
        toast.error("Please login to view order details");
        navigate("/login");
        return;
      }

      if (location.state?.order) {
        setOrder(location.state.order);
        setPaymentSuccess(location.state.paymentSuccess || false);
        return;
      }

      if (orderId) {
        try {
          const token = await auth.currentUser.getIdToken();
          const resp = await fetch(`http://localhost:5000/api/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!resp.ok) throw new Error("Failed to fetch order");
          const data = await resp.json();
          setOrder(data);
        } catch (e) {
          toast.error("No order found");
          navigate("/orders");
        }
      } else {
        toast.error("No order found");
        navigate("/orders");
      }
    };
    init();
  }, [navigate, location.state, orderId]);

  // Prevent going back to payment/checkout pages after order is placed
  useEffect(() => {
    // Add a new history entry to prevent back navigation
    window.history.pushState(null, '', window.location.href);
    
    const handlePopState = (event) => {
      // Prevent default back navigation
      window.history.pushState(null, '', window.location.href);
      toast.info("Please use the navigation buttons to continue shopping");
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Attach live tracking map when order becomes available
  useEffect(() => {
    let socket;
    let map;
    let marker;
    let polyline;
    let coords = [];
    const haversine = (lat1, lon1, lat2, lon2) => {
      const toRad = (v) => (v * Math.PI) / 180;
      const R = 6371000;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    const setup = async () => {
      if (!order) return;
      
      // Check if map container exists
      const mapContainer = document.getElementById("buyer-live-map");
      if (!mapContainer) {
        console.warn("Map container not found, skipping map initialization");
        return;
      }
      
      try {
        // Load assets
        await loadCss("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
        await loadScript("https://cdn.socket.io/4.7.4/socket.io.min.js");
        await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");

        // eslint-disable-next-line no-undef
        map = window.L.map("buyer-live-map").setView([9.9312, 76.2673], 14);
      } catch (error) {
        console.error("Error initializing map:", error);
        return;
      }
      // eslint-disable-next-line no-undef
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      // eslint-disable-next-line no-undef
      marker = window.L.marker([9.9312, 76.2673]).addTo(map);
      marker.bindPopup('Delivery Boy is on the way 🚚').openPopup();
      // eslint-disable-next-line no-undef
      polyline = window.L.polyline([], { color: '#2563eb', weight: 4 }).addTo(map);

      // eslint-disable-next-line no-undef
      socket = window.io('http://localhost:3000', { transports: ['websocket', 'polling'], timeout: 4000, reconnectionAttempts: 5 });
      socket.on('connect', () => setLive((p) => ({ ...p, connected: true })));
      socket.on('location-D1', (p) => {
        const { lat, lon, count, delivered } = p;
        if (marker && map) {
          marker.setLatLng([lat, lon]);
          map.setView([lat, lon]);
          if (delivered) {
            marker.bindPopup('Delivered ✅').openPopup();
          }
        }
        coords.push([lat, lon]);
        if (polyline) polyline.setLatLngs(coords);
        let add = 0;
        if (coords.length >= 2) {
          const prev = coords[coords.length - 2];
          add = haversine(prev[0], prev[1], lat, lon);
        }
        setLive((p2) => ({
          ...p2,
          updates: count,
          coords: { lat, lon },
          distanceM: Number((p2.distanceM + add).toFixed(1)),
          delivered: delivered || p2.delivered
        }));
        
        // Persist delivery status
        if (delivered && orderId) {
          localStorage.setItem(`delivery-status-${orderId}`, JSON.stringify({ delivered: true, timestamp: Date.now() }));
        }
      });
      socket.on('delivered-D1', () => {
        setLive((p2) => ({ ...p2, delivered: true }));
        if (orderId) {
          localStorage.setItem(`delivery-status-${orderId}`, JSON.stringify({ delivered: true, timestamp: Date.now() }));
        }
      });
      socket.on('orderDelivered', () => {
        setLive((p2) => ({ ...p2, delivered: true }));
        if (orderId) {
          localStorage.setItem(`delivery-status-${orderId}`, JSON.stringify({ delivered: true, timestamp: Date.now() }));
        }
      });
    };

    setup();
    return () => {
      try { if (map) map.remove(); } catch {}
      if (socket) socket.close();
    };
  }, [order]);

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "#ffc107";
      case "confirmed": return "#17a2b8";
      case "preparing": return "#fd7e14";
      case "shipped": return "#6f42c1";
      case "delivered": return "#28a745";
      case "cancelled": return "#dc3545";
      default: return "#6c757d";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending": return "Order Pending";
      case "confirmed": return "Order Confirmed";
      case "preparing": return "Preparing Your Order";
      case "shipped": return "Shipped";
      case "delivered": return "Delivered";
      case "cancelled": return "Cancelled";
      default: return status;
    }
  };

  const getPaymentStatusText = (status, method) => {
    if (method === "cod" && status === "pending") return "Pay on Delivery";
    switch (status) {
      case "pending": return "Payment Pending";
      case "paid": return "Payment Successful";
      case "failed": return "Payment Failed";
      case "refunded": return "Payment Refunded";
      default: return status;
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case "pending": return "#ffc107";
      case "paid": return "#28a745";
      case "failed": return "#dc3545";
      case "refunded": return "#6c757d";
      default: return "#6c757d";
    }
  };

  const getEstimatedDelivery = () => {
    const orderDate = new Date(order.createdAt);
    const deliveryDate = new Date(orderDate.getTime() + (3 * 24 * 60 * 60 * 1000)); // 3 days
    return deliveryDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleTrackOrder = () => {
    navigate("/orders");
  };

  const handleContinueShopping = () => {
    navigate("/products");
  };

  if (!order) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Loading order details...</h2>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      {/* Success Message */}
      {paymentSuccess && (
        <div style={{ 
          background: "#d4edda", 
          border: "1px solid #c3e6cb", 
          color: "#155724", 
          padding: "16px", 
          borderRadius: "8px", 
          marginBottom: "30px",
          textAlign: "center"
        }}>
          <h2 style={{ margin: "0 0 8px 0", color: "#155724" }}>🎉 Order Placed Successfully!</h2>
          <p style={{ margin: 0 }}>Thank you for your order. We'll start preparing it right away!</p>
        </div>
      )}

      <h1 style={{ marginBottom: "30px", color: "#5c4033" }}>Order Confirmation</h1>

      {/* Order Status */}
      <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "24px", border: "1px solid #ddd" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, color: "#5c4033" }}>Order #{order.orderNumber}</h2>
          <div style={{ 
            background: getStatusColor(live.delivered ? "delivered" : order.orderStatus), 
            color: "white", 
            padding: "6px 12px", 
            borderRadius: "20px", 
            fontSize: "14px", 
            fontWeight: "600" 
          }}>
            {getStatusText(live.delivered ? "delivered" : order.orderStatus)}
          </div>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "14px" }}>
          <div>
            <strong>Order Date:</strong> {new Date(order.createdAt).toLocaleDateString()}
          </div>
          <div>
            <strong>Payment Method:</strong> {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}
          </div>
          <div>
            <strong>Payment Status:</strong> 
            <span style={{ 
              color: live.delivered ? "#28a745" : 
                    order.paymentMethod === "cod" && order.paymentStatus === "pending" ? "#17a2b8" : 
                    order.paymentStatus === "paid" ? "#28a745" : 
                    order.paymentStatus === "pending" ? "#ffc107" : "#dc3545",
              fontWeight: "600",
              marginLeft: "8px"
            }}>
              {live.delivered ? "Payment Successful" : getPaymentStatusText(order.paymentStatus, order.paymentMethod)}
            </span>
          </div>
          <div>
            <strong>Total Amount:</strong> ₹{order.finalAmount}
          </div>
          <div>
            <strong>Estimated Delivery:</strong> {getEstimatedDelivery()}
          </div>
          {live.delivered && (
            <div style={{ gridColumn: "1 / -1", marginTop: "12px", padding: "12px", background: "#d4edda", borderRadius: "8px", border: "1px solid #c3e6cb" }}>
              <strong style={{ color: "#155724" }}>✅ Order Delivered!</strong>
              <div style={{ fontSize: "12px", color: "#155724", marginTop: "4px" }}>
                Your order has been successfully delivered to your address.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Tracking (Live Map + Timeline) */}
      <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "24px", border: "1px solid #ddd" }}>
        <h3 style={{ marginBottom: "20px", color: "#5c4033" }}>Delivery Tracking</h3>
        {/* Link to dedicated live tracking page (simulator) */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px", gap: "8px" }}>
          <button
            onClick={() => navigate(`/track/${order._id}`)}
            style={{
              padding: "8px 12px",
              background: "#5c4033",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600
            }}
          >
            🗺 Track Order (In App)
          </button>
        </div>
        {/* Replace embedded live widgets with simple CTA to Track page */}
        <div style={{ background: "#f9fafb", padding: "12px", border: "1px dashed #d1d5db", borderRadius: "10px", marginBottom: "16px", fontSize: "14px", color: "#374151" }}>
          To see live map, timeline, ETA and auto updates, use the Track Order page.
        </div>
        
        {/* Simple status display without timeline */}
        <div style={{ background: "#f8f9fa", padding: "16px", borderRadius: "8px", textAlign: "center" }}>
          <div style={{ fontSize: "16px", fontWeight: "600", color: "#495057", marginBottom: "8px" }}>
            Current Status: {getStatusText(live.delivered ? "delivered" : order.orderStatus)}
          </div>
          <div style={{ fontSize: "14px", color: "#6c757d" }}>
            {order.orderStatus === "delivered" ? 
              "Your order has been successfully delivered!" : 
              "Track your order in real-time using the Track Order page above."
            }
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "24px", border: "1px solid #ddd" }}>
        <h3 style={{ marginBottom: "20px", color: "#5c4033" }}>Order Items</h3>
        
        {order.items.map((item, index) => (
          <div key={index} style={{ 
            display: "flex", 
            gap: "16px", 
            marginBottom: "16px", 
            paddingBottom: "16px", 
            borderBottom: index < order.items.length - 1 ? "1px solid #eee" : "none" 
          }}>
            <div style={{ width: "80px", height: "80px", background: "#f5f5f5", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {(item.image || (item.productId && item.productId.image)) ? (
                <img
                  src={`http://localhost:5000/uploads/${item.image || (item.productId && item.productId.image)}`}
                  alt={item.title || (item.productId && item.productId.title) || "Product"}
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }}
                />
              ) : (
                <span style={{ fontSize: "12px", color: "#999" }}>No Image</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>{item.title || (item.productId && item.productId.title) || "Product"}</h4>
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>
                {item.variant?.weight}
              </div>
              <div style={{ fontSize: "14px", color: "#5c4033", fontWeight: "600" }}>
                ₹{item.variant?.price} × {item.quantity} = ₹{(item.variant?.price || 0) * (item.quantity || 0)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delivery Address */}
      <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "24px", border: "1px solid #ddd" }}>
        <h3 style={{ marginBottom: "20px", color: "#5c4033" }}>Delivery Address</h3>
        
        <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
          <div style={{ fontWeight: "600", marginBottom: "8px" }}>{order.buyerDetails.name}</div>
          <div>{order.buyerDetails.address.street}</div>
          {order.buyerDetails.address.landmark && (
            <div>Near {order.buyerDetails.address.landmark}</div>
          )}
          <div>{order.buyerDetails.address.city}, {order.buyerDetails.address.state} - {order.buyerDetails.address.pincode}</div>
          <div style={{ marginTop: "8px" }}>
            <strong>Phone:</strong> {order.buyerDetails.phone}
          </div>
          <div>
            <strong>Email:</strong> {order.buyerDetails.email}
          </div>
        </div>
      </div>

      {/* Price Breakdown */}
      <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "24px", border: "1px solid #ddd" }}>
        <h3 style={{ marginBottom: "20px", color: "#5c4033" }}>Price Breakdown</h3>
        
        <div style={{ fontSize: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span>Subtotal:</span>
            <span>₹{order.totalAmount}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span>Shipping:</span>
            <span>₹{(order.shippingCharges || 50)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: "600", color: "#5c4033", paddingTop: "12px", borderTop: "2px solid #5c4033" }}>
            <span>Total:</span>
            <span>₹{order.finalAmount}</span>
          </div>
        </div>
      </div>

      {/* Payment Details (if online payment) */}
      {order.paymentMethod === "online" && order.paymentDetails && (
        <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "24px", border: "1px solid #ddd" }}>
          <h3 style={{ marginBottom: "20px", color: "#5c4033" }}>Payment Details</h3>
          
          <div style={{ fontSize: "14px" }}>
            <div style={{ marginBottom: "8px" }}>
              <strong>Transaction ID:</strong> {order.paymentDetails.transactionId}
            </div>
            <div style={{ marginBottom: "8px" }}>
              <strong>Payment Gateway:</strong> {order.paymentDetails.paymentGateway}
            </div>
            {order.paymentDetails.paidAt && (
              <div>
                <strong>Paid At:</strong> {new Date(order.paymentDetails.paidAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
        <button
          onClick={() => navigate("/orders")}
          style={{
            padding: "12px 24px",
            background: "#5c4033",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          View All Orders
        </button>
        <button
          onClick={() => navigate("/products")}
          style={{
            padding: "12px 24px",
            background: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          Continue Shopping
        </button>
      </div>

      {/* Rating Section - Only show for delivered orders that haven't been rated */}
      {(live.delivered || order.orderStatus === "delivered") && !order.rating?.value && (
        <OrderRating 
          orderId={orderId} 
          onRatingSubmitted={() => {
            // Refresh order data to show rating
            fetchOrderDetails();
          }}
        />
      )}

      {/* Show existing rating if already rated */}
      {(live.delivered || order.orderStatus === "delivered") && order.rating?.value && (
        <div style={{
          background: '#fff',
          border: '1px solid #e0e0e0',
          borderRadius: '12px',
          padding: '24px',
          marginTop: '20px'
        }}>
          <h3 style={{ 
            margin: '0 0 16px 0', 
            color: '#5c4033',
            fontSize: '18px',
            fontWeight: '600'
          }}>
            Your Rating
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  style={{
                    fontSize: '20px',
                    color: star <= order.rating.value ? '#ffc107' : '#ddd'
                  }}
                >
                  ★
                </span>
              ))}
            </div>
            <span style={{ fontSize: '14px', color: '#666' }}>
              {order.rating.value === 1 ? 'Poor' :
               order.rating.value === 2 ? 'Fair' :
               order.rating.value === 3 ? 'Good' :
               order.rating.value === 4 ? 'Very Good' :
               'Excellent'}
            </span>
          </div>
          
          {order.rating.review && (
            <div style={{
              background: '#f8f9fa',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#333',
              fontStyle: 'italic'
            }}>
              "{order.rating.review}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
