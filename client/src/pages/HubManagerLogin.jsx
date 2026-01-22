import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function HubManagerLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/api/hub-managers/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password
        })
      });

      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response:", text.substring(0, 200));
        toast.error("Server error. Please try again or contact support.");
        return;
      }

      const data = await res.json();

      if (res.ok && data.success) {
        // Validate response data
        if (!data.token || !data.manager) {
          console.error("Invalid response data:", data);
          toast.error("Login response incomplete. Please try again.");
          return;
        }

        // Store token and manager info
        localStorage.setItem("hubManagerToken", data.token);
        localStorage.setItem("hubManager", JSON.stringify(data.manager));
        
        toast.success("Login successful!");
        navigate("/hub-manager/dashboard");
      } else {
        toast.error(data.error || "Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error("Login error:", error);
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        toast.error("Cannot connect to server. Please check your internet connection.");
      } else {
        toast.error("Network error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundImage: "url('/images/hub-login-bg.jpg')",
      backgroundSize: "85%",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundAttachment: "fixed",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "var(--body-font, 'Poppins', sans-serif)",
      position: "relative"
    }}>
      {/* Overlay for better readability */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(135deg, rgba(139, 94, 52, 0.3) 0%, rgba(243, 231, 220, 0.4) 100%)"
      }}></div>

      {/* Login Card - Pop up style */}
      <div style={{
        position: "relative",
        zIndex: 10,
        maxWidth: "400px",
        width: "100%",
        background: "var(--surface, #ffffff)",
        borderRadius: "24px",
        padding: "40px 32px",
        boxShadow: "0 20px 60px rgba(63, 45, 35, 0.3), 0 0 0 1px rgba(139, 94, 52, 0.1)",
        backdropFilter: "blur(10px)",
        animation: "slideUp 0.5s ease-out"
      }}>
        <form onSubmit={handleSubmit} style={{ width: "100%" }}>
            <h2 style={{
              fontFamily: "var(--title-font, 'Playfair Display', serif)",
              fontSize: "32px",
              fontWeight: "900",
              color: "var(--brand, #8b5e34)",
              margin: "0 0 8px 0",
              textAlign: "center"
            }}>
              Hub Manager Portal
            </h2>
            <p style={{
              fontSize: "14px",
              color: "var(--text-muted, #7b6457)",
              margin: "0 0 32px 0",
              textAlign: "center"
            }}>
              Sign in to manage your hub operations
            </p>

            {/* Email Field */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: "var(--text, #3f2d23)",
                marginBottom: "8px"
              }}>
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                disabled={loading}
                autoComplete="email"
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  fontSize: "15px",
                  fontFamily: "var(--body-font, 'Poppins', sans-serif)",
                  background: "var(--accent-soft, #f3e7dc)",
                  border: "2px solid var(--border, #ead9c9)",
                  borderRadius: "12px",
                  color: "var(--text, #3f2d23)",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--brand, #8b5e34)";
                  e.target.style.background = "var(--surface, #ffffff)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border, #ead9c9)";
                  e.target.style.background = "var(--accent-soft, #f3e7dc)";
                }}
              />
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: "var(--text, #3f2d23)",
                marginBottom: "8px"
              }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  disabled={loading}
                  autoComplete="current-password"
                  style={{
                    width: "100%",
                    padding: "14px 48px 14px 16px",
                    fontSize: "15px",
                    fontFamily: "var(--body-font, 'Poppins', sans-serif)",
                    background: "var(--accent-soft, #f3e7dc)",
                    border: "2px solid var(--border, #ead9c9)",
                    borderRadius: "12px",
                    color: "var(--text, #3f2d23)",
                    transition: "all 0.2s ease",
                    boxSizing: "border-box"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--brand, #8b5e34)";
                    e.target.style.background = "var(--surface, #ffffff)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border, #ead9c9)";
                    e.target.style.background = "var(--accent-soft, #f3e7dc)";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted, #7b6457)",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button 
              type="submit" 
              disabled={loading}
              style={{
                width: "auto",
                minWidth: "180px",
                padding: "16px 32px",
                fontSize: "16px",
                fontWeight: "700",
                fontFamily: "var(--body-font, 'Poppins', sans-serif)",
                background: loading ? "var(--text-muted, #7b6457)" : "#d4a574",
                color: "var(--text, #3f2d23)",
                border: "none",
                borderRadius: "12px",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                margin: "0 auto 24px auto"
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.background = "#c49564";
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 4px 12px rgba(212, 165, 116, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.background = "#d4a574";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "none";
                }
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: "20px",
                    height: "20px",
                    border: "3px solid rgba(255,255,255,0.3)",
                    borderTop: "3px solid white",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }}></div>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>

            {/* Back to Home */}
            <div style={{ textAlign: "center", marginTop: "24px" }}>
              <Link 
                to="/" 
                style={{ 
                  fontSize: "14px", 
                  color: "var(--text-muted, #7b6457)",
                  textDecoration: "none",
                  transition: "color 0.2s ease"
                }}
                onMouseEnter={(e) => e.target.style.color = "var(--brand, #8b5e34)"}
                onMouseLeave={(e) => e.target.style.color = "var(--text-muted, #7b6457)"}
              >
                ← Back to Home
              </Link>
            </div>
          </form>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @media (max-width: 768px) {
          .hub-login-card {
            padding: 32px 24px !important;
            margin: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
