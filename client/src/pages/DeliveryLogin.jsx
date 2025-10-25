import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";

export default function DeliveryLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("=== DELIVERY LOGIN FORM SUBMIT ===");
      console.log("Form data:", form);
      
      const res = await fetch("http://localhost:5000/api/delivery/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      console.log("Response status:", res.status);
      const data = await res.json();
      console.log("Response data:", data);

      if (res.ok && data.success) {
        // Store the JWT token
        localStorage.setItem("deliveryToken", data.token);
        localStorage.setItem("deliveryAgent", JSON.stringify(data.agent));
        
        toast.success(`Welcome back, ${data.agent.name}!`);
        navigate("/delivery-dashboard");
      } else {
        toast.error(data.error || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #f5f1eb 0%, #e8dcc6 100%)",
      fontFamily: "Inter, sans-serif",
      padding: "20px"
    }}>
      <div style={{
        background: "#fff",
        borderRadius: "16px",
        boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
        overflow: "hidden",
        width: "100%",
        maxWidth: "400px"
      }}>
        {/* Header */}
        <div style={{
          background: "#5c4033",
          color: "white",
          padding: "30px",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: "48px",
            marginBottom: "10px"
          }}>
            🚚
          </div>
          <h1 style={{
            margin: "0 0 8px 0",
            fontSize: "24px",
            fontWeight: "600"
          }}>
            Delivery Partner
          </h1>
          <p style={{
            margin: 0,
            opacity: 0.9,
            fontSize: "14px"
          }}>
            Sign in to your delivery account
          </p>
        </div>

        {/* Form */}
        <div style={{ padding: "30px" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
                color: "#333",
                fontSize: "14px"
              }}>
                Username
              </label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e1e5e9",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box"
                }}
                placeholder="Enter your username"
                onFocus={(e) => e.target.style.borderColor = "#5c4033"}
                onBlur={(e) => e.target.style.borderColor = "#e1e5e9"}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
                color: "#333",
                fontSize: "14px"
              }}>
                Password
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e1e5e9",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box"
                }}
                placeholder="Enter your password"
                onFocus={(e) => e.target.style.borderColor = "#5c4033"}
                onBlur={(e) => e.target.style.borderColor = "#e1e5e9"}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: loading ? "#ccc" : "#5c4033",
                color: "white",
                border: "none",
                padding: "14px",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background-color 0.2s",
                marginBottom: "20px"
              }}
              onMouseOver={(e) => {
                if (!loading) e.target.style.background = "#4a332a";
              }}
              onMouseOut={(e) => {
                if (!loading) e.target.style.background = "#5c4033";
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Status Info */}
          <div style={{
            background: "#f8f9fa",
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid #e9ecef",
            marginBottom: "20px"
          }}>
            <h4 style={{
              margin: "0 0 8px 0",
              fontSize: "14px",
              fontWeight: "600",
              color: "#5c4033"
            }}>
              Account Status
            </h4>
            <p style={{
              margin: 0,
              fontSize: "13px",
              color: "#666",
              lineHeight: "1.4"
            }}>
              Your account must be <strong>approved by admin</strong> before you can start making deliveries. 
              Contact support if you need assistance.
            </p>
          </div>

          {/* Links */}
          <div style={{
            textAlign: "center",
            paddingTop: "20px",
            borderTop: "1px solid #e9ecef"
          }}>
            <Link 
              to="/login" 
              style={{
                color: "#5c4033",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "500"
              }}
            >
              ← Back to Customer Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
