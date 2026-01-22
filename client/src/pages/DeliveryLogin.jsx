import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";

/**
 * DELIVERY BOY CREDENTIAL FLOW:
 * 1. Admin creates delivery boy account in Admin Dashboard
 * 2. Admin sets username & password during account creation
 * 3. Admin shares credentials with delivery boy (via email/phone/SMS/in-person)
 * 4. Delivery boy uses these credentials to login here
 * 5. Account must be "active" status to successfully login
 */

export default function DeliveryLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    username: "",
    password: "",
  });
  const [touched, setTouched] = useState({
    username: false,
    password: false,
  });

  // Validation functions
  const validateUsername = (username) => {
    if (!username || username.trim() === "") {
      return "Username is required";
    }
    if (username.length < 3) {
      return "Username must be at least 3 characters";
    }
    if (username.length > 20) {
      return "Username must be less than 20 characters";
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return "Username can only contain letters, numbers, and underscores";
    }
    return "";
  };

  const validatePassword = (password) => {
    if (!password || password.trim() === "") {
      return "Password is required";
    }
    if (password.length < 6) {
      return "Password must be at least 6 characters";
    }
    return "";
  };

  const validateForm = () => {
    const usernameError = validateUsername(form.username);
    const passwordError = validatePassword(form.password);
    
    setErrors({
      username: usernameError,
      password: passwordError,
    });

    return !usernameError && !passwordError;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({
      username: true,
      password: true,
    });

    // Validate form
    if (!validateForm()) {
      toast.error("Please fix the errors before submitting");
      return;
    }

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
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: value,
    });

    // Real-time validation
    if (touched[name]) {
      if (name === "username") {
        setErrors({ ...errors, username: validateUsername(value) });
      } else if (name === "password") {
        setErrors({ ...errors, password: validatePassword(value) });
      }
    }
  };

  const handleBlur = (field) => {
    setTouched({ ...touched, [field]: true });
    
    if (field === "username") {
      setErrors({ ...errors, username: validateUsername(form.username) });
    } else if (field === "password") {
      setErrors({ ...errors, password: validatePassword(form.password) });
    }
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
                onBlur={() => handleBlur("username")}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: `2px solid ${
                    touched.username && errors.username
                      ? "#dc3545"
                      : touched.username && !errors.username
                      ? "#28a745"
                      : "#e1e5e9"
                  }`,
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box",
                  backgroundColor: touched.username && errors.username ? "#fff5f5" : "#fff"
                }}
                placeholder="Enter your username"
              />
              {touched.username && errors.username && (
                <span style={{
                  display: "block",
                  color: "#dc3545",
                  fontSize: "12px",
                  marginTop: "4px"
                }}>
                  {errors.username}
                </span>
              )}
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
                onBlur={() => handleBlur("password")}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: `2px solid ${
                    touched.password && errors.password
                      ? "#dc3545"
                      : touched.password && !errors.password
                      ? "#28a745"
                      : "#e1e5e9"
                  }`,
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box",
                  backgroundColor: touched.password && errors.password ? "#fff5f5" : "#fff"
                }}
                placeholder="Enter your password"
              />
              {touched.password && errors.password && (
                <span style={{
                  display: "block",
                  color: "#dc3545",
                  fontSize: "12px",
                  marginTop: "4px"
                }}>
                  {errors.password}
                </span>
              )}
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
