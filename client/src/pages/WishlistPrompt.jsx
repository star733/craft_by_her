import React from "react";
import { useNavigate } from "react-router-dom";

export default function WishlistPrompt() {
  const navigate = useNavigate();

  return (
    <div style={containerStyle}>
      <div style={promptCardStyle}>
        <div style={iconStyle}>❤️</div>
        <h2 style={titleStyle}>Login to View Your Wishlist</h2>
        <p style={messageStyle}>
          You need to be logged in to view and manage your wishlist items.
        </p>
        <div style={buttonContainerStyle}>
          <button 
            onClick={() => navigate("/login")} 
            style={loginButtonStyle}
          >
            Login
          </button>
          <button 
            onClick={() => navigate("/register")} 
            style={registerButtonStyle}
          >
            Sign Up
          </button>
        </div>
        <p style={footerStyle}>
          Don't have an account? <span style={linkStyle} onClick={() => navigate("/register")}>Create one here</span>
        </p>
      </div>
    </div>
  );
}

// Styles
const containerStyle = {
  minHeight: "100vh",
  background: "#f8fafc",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  fontFamily: "Inter, sans-serif",
};

const promptCardStyle = {
  background: "#fff",
  borderRadius: "16px",
  padding: "40px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
  textAlign: "center",
  maxWidth: "400px",
  width: "100%",
};

const iconStyle = {
  fontSize: "64px",
  marginBottom: "20px",
};

const titleStyle = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#5c4033",
  margin: "0 0 16px 0",
};

const messageStyle = {
  fontSize: "16px",
  color: "#666",
  margin: "0 0 24px 0",
  lineHeight: "1.5",
};

const buttonContainerStyle = {
  display: "flex",
  gap: "12px",
  marginBottom: "20px",
};

const loginButtonStyle = {
  flex: "1",
  background: "#5c4033",
  color: "#fff",
  border: "none",
  padding: "12px 20px",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "background 0.3s ease",
};

const registerButtonStyle = {
  flex: "1",
  background: "transparent",
  color: "#5c4033",
  border: "2px solid #5c4033",
  padding: "10px 20px",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "all 0.3s ease",
};

const footerStyle = {
  fontSize: "14px",
  color: "#666",
  margin: "0",
};

const linkStyle = {
  color: "#5c4033",
  cursor: "pointer",
  textDecoration: "underline",
};
