import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function ContentDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      toast.error("Please login to view content");
      navigate("/login");
      return;
    }

    fetchContent();
  }, [navigate, id]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`${API_BASE}/api/content/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setContent(data.content);
      } else {
        throw new Error("Failed to fetch content");
      }
    } catch (error) {
      console.error("Error fetching content:", error);
      toast.error("Content not found");
      navigate("/content");
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

  if (!content) {
    return (
      <div style={{ 
        minHeight: "80vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ color: "#5c4033", marginBottom: "20px" }}>Content Not Found</h2>
          <button
            onClick={() => navigate("/content")}
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
            Back to Content Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px" }}>
      <button
        onClick={() => navigate("/content")}
        style={{
          background: "none",
          border: "none",
          color: "#5c4033",
          cursor: "pointer",
          fontSize: "16px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}
      >
        ← Back to Content Feed
      </button>

      <div style={{
        background: "#fff",
        padding: "32px",
        borderRadius: "12px",
        border: "1px solid #ddd"
      }}>
        <h1 style={{ color: "#5c4033", marginBottom: "16px" }}>{content.title}</h1>
        <div style={{ fontSize: "14px", color: "#999", marginBottom: "24px" }}>
          {new Date(content.createdAt).toLocaleDateString()}
        </div>
        
        {content.image && (
          <div style={{ width: "100%", marginBottom: "24px", borderRadius: "8px", overflow: "hidden" }}>
            <img
              src={content.image}
              alt={content.title}
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        )}

        <div style={{ fontSize: "16px", lineHeight: "1.6", color: "#374151" }}>
          {content.description || "No description available."}
        </div>
      </div>
    </div>
  );
}








