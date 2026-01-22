import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function ContentFeed() {
  const navigate = useNavigate();
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      toast.error("Please login to view content");
      navigate("/login");
      return;
    }

    fetchContent();
  }, [navigate]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`${API_BASE}/api/content`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setContent(data.content || []);
      } else {
        throw new Error("Failed to fetch content");
      }
    } catch (error) {
      console.error("Error fetching content:", error);
      toast.error("Failed to load content");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: "80vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <div style={{ textAlign: "center" }}>
          <div className="loading-spinner" style={{
            width: "50px",
            height: "50px",
            border: "4px solid #f3f3f3",
            borderTop: "4px solid #5c4033",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 20px"
          }}></div>
          <p>Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
      <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ color: "#5c4033", margin: 0 }}>Content Feed</h1>
        <button
          onClick={() => navigate("/content/upload")}
          style={{
            padding: "12px 24px",
            backgroundColor: "#5c4033",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "16px"
          }}
        >
          + Upload Content
        </button>
      </div>

      {content.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "60px 20px",
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid #ddd"
        }}>
          <h2 style={{ color: "#5c4033", marginBottom: "16px" }}>No Content Available</h2>
          <p style={{ color: "#666", marginBottom: "24px" }}>
            Content feed feature is coming soon!
          </p>
          <button
            onClick={() => navigate("/content/upload")}
            style={{
              padding: "12px 24px",
              backgroundColor: "#5c4033",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            Be the First to Upload
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
          {content.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/content/${item.id}`)}
              style={{
                background: "#fff",
                borderRadius: "12px",
                border: "1px solid #ddd",
                overflow: "hidden",
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {item.image && (
                <div style={{ width: "100%", height: "200px", overflow: "hidden" }}>
                  <img
                    src={item.image}
                    alt={item.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              )}
              <div style={{ padding: "20px" }}>
                <h3 style={{ color: "#5c4033", marginBottom: "8px" }}>{item.title}</h3>
                <p style={{ color: "#666", fontSize: "14px", marginBottom: "12px" }}>
                  {item.description || "No description"}
                </p>
                <div style={{ fontSize: "12px", color: "#999" }}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}








