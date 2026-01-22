import React, { useState, useEffect, useRef } from "react";
import { FiBell } from "react-icons/fi";
import { auth } from "../firebase";
import { toast } from "react-toastify";

export default function NotificationBell({ userRole }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!auth.currentUser || !userRole || userRole === 'buyer') return;
    
    try {
      setLoading(true);
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("http://localhost:5000/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Handle both array response and object with notifications array
        const notificationsList = Array.isArray(data) ? data : data.notifications || [];
        setNotifications(notificationsList);
        setUnreadCount(notificationsList.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userRole]);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Handle action button click
  const handleAction = async (notification) => {
    if (notification.actionType === 'move_to_hub') {
      // TODO: Implement move to hub functionality
      toast.info("Move to hub functionality coming soon!");
      markAsRead(notification._id);
    }
  };

  // Don't show for buyers
  if (!userRole || userRole === 'buyer') {
    return null;
  }

  // Don't show if not logged in
  if (!auth.currentUser) {
    return null;
  }

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        className="icon-btn"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        aria-label="Notifications"
        title="Notifications"
        style={{ position: "relative" }}
      >
        <FiBell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: "-4px",
            right: "-4px",
            background: "#dc3545",
            color: "white",
            borderRadius: "50%",
            width: "18px",
            height: "18px",
            fontSize: "10px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: "0",
          width: "360px",
          maxHeight: "480px",
          background: "white",
          border: "1px solid #ddd",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 1000,
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "16px",
            borderBottom: "1px solid #eee",
            background: "#f8f9fa",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#5c4033" }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span style={{ fontSize: "12px", color: "#666" }}>
                {unreadCount} unread
              </span>
            )}
          </div>

          {/* Notifications List */}
          <div style={{
            maxHeight: "400px",
            overflowY: "auto",
          }}>
            {loading ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#666" }}>
                <FiBell size={32} style={{ marginBottom: "12px", opacity: 0.3 }} />
                <div>No notifications yet</div>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  style={{
                    padding: "16px",
                    borderBottom: "1px solid #eee",
                    background: notification.read ? "white" : "#f0f8ff",
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onClick={() => !notification.read && markAsRead(notification._id)}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#f8f9fa"}
                  onMouseLeave={(e) => e.currentTarget.style.background = notification.read ? "white" : "#f0f8ff"}
                >
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "8px",
                  }}>
                    <h4 style={{
                      margin: 0,
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#333",
                    }}>
                      {notification.title}
                    </h4>
                    {!notification.read && (
                      <span style={{
                        width: "8px",
                        height: "8px",
                        background: "#007bff",
                        borderRadius: "50%",
                        flexShrink: 0,
                        marginLeft: "8px",
                      }} />
                    )}
                  </div>
                  
                  <p style={{
                    margin: "0 0 8px 0",
                    fontSize: "13px",
                    color: "#666",
                    lineHeight: "1.4",
                  }}>
                    {notification.message}
                  </p>

                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}>
                    <span style={{
                      fontSize: "11px",
                      color: "#999",
                    }}>
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>

                    {notification.actionRequired && notification.actionType === 'move_to_hub' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction(notification);
                        }}
                        style={{
                          padding: "4px 12px",
                          background: "#5c4033",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        Move to Hub
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: "12px",
              borderTop: "1px solid #eee",
              background: "#f8f9fa",
              textAlign: "center",
            }}>
              <button
                onClick={async () => {
                  try {
                    const token = await auth.currentUser.getIdToken();
                    await fetch("http://localhost:5000/api/notifications/mark-all-read", {
                      method: "PATCH",
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    setUnreadCount(0);
                    toast.success("All notifications marked as read");
                  } catch (error) {
                    toast.error("Failed to mark all as read");
                  }
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#5c4033",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
