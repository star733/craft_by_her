import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function CentralHubManagerLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/central-hub-manager/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Store token
        localStorage.setItem('hubManagerToken', data.token);
        localStorage.setItem('hubManagerData', JSON.stringify(data.manager));
        
        toast.success("Login successful!");
        navigate("/central-hub-manager/dashboard");
      } else {
        toast.error(data.error || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f5f1eb 0%, #e8dcc6 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        background: "white",
        borderRadius: "16px",
        padding: "40px",
        width: "100%",
        maxWidth: "400px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #5c4033 0%, #8b5e34 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "32px",
            margin: "0 auto 20px",
            color: "white",
            fontWeight: "bold"
          }}>
            🏢
          </div>
          <h1 style={{
            margin: "0 0 8px 0",
            fontSize: "24px",
            color: "#5c4033",
            fontWeight: "600"
          }}>
            Central Hub Manager
          </h1>
          <p style={{
            margin: 0,
            color: "#666",
            fontSize: "14px"
          }}>
            Kerala State Operations Portal
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "500",
              color: "#333"
            }}>
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Enter your username"
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s",
                boxSizing: "border-box"
              }}
              onFocus={(e) => e.target.style.borderColor = "#5c4033"}
              onBlur={(e) => e.target.style.borderColor = "#ddd"}
            />
          </div>

          <div>
            <label style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "500",
              color: "#333"
            }}>
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter your password"
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s",
                boxSizing: "border-box"
              }}
              onFocus={(e) => e.target.style.borderColor = "#5c4033"}
              onBlur={(e) => e.target.style.borderColor = "#ddd"}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: loading ? "#ccc" : "linear-gradient(135deg, #5c4033 0%, #8b5e34 100%)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              marginTop: "8px"
            }}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {/* Demo Credentials */}
        <div style={{
          marginTop: "24px",
          padding: "16px",
          background: "#f8f9fa",
          borderRadius: "8px",
          border: "1px solid #e9ecef"
        }}>
          <h3 style={{
            margin: "0 0 12px 0",
            fontSize: "14px",
            color: "#5c4033",
            fontWeight: "600"
          }}>
            Demo Credentials:
          </h3>
          <div style={{ fontSize: "13px", color: "#666", lineHeight: "1.5" }}>
            <div><strong>Username:</strong> centralmanager</div>
            <div><strong>Password:</strong> central123</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: "center",
          marginTop: "24px",
          paddingTop: "20px",
          borderTop: "1px solid #eee"
        }}>
          <p style={{
            margin: 0,
            fontSize: "12px",
            color: "#999"
          }}>
            Manage all Kerala district hubs from one central location
          </p>
        </div>
      </div>
    </div>
  );
}