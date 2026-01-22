import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function ContentUpload() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    file: null
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({
      ...prev,
      file: e.target.files[0]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      setLoading(true);
      const token = await auth.currentUser.getIdToken();
      
      // This is a placeholder - implement actual upload logic when backend is ready
      toast.info("Content upload feature coming soon!");
      
      // For now, just navigate back
      setTimeout(() => {
        navigate("/content");
      }, 2000);
      
    } catch (error) {
      console.error("Error uploading content:", error);
      toast.error("Failed to upload content");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "24px" }}>
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

      <h1 style={{ color: "#5c4033", marginBottom: "32px" }}>Upload Content</h1>

      <div style={{
        background: "#fff",
        padding: "32px",
        borderRadius: "12px",
        border: "1px solid #ddd"
      }}>
        <div style={{
          textAlign: "center",
          padding: "40px 20px",
          background: "#f9fafb",
          borderRadius: "8px",
          marginBottom: "32px"
        }}>
          <h2 style={{ color: "#5c4033", marginBottom: "16px" }}>Content Upload</h2>
          <p style={{ color: "#666" }}>
            This feature is coming soon! You'll be able to upload videos, posts, and other content here.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", marginBottom: "8px", color: "#5c4033", fontWeight: "600" }}>
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter content title"
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "16px"
              }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", marginBottom: "8px", color: "#5c4033", fontWeight: "600" }}>
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter content description"
              rows="5"
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "16px",
                fontFamily: "inherit"
              }}
            />
          </div>

          <div style={{ marginBottom: "32px" }}>
            <label style={{ display: "block", marginBottom: "8px", color: "#5c4033", fontWeight: "600" }}>
              Upload File
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*,video/*"
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "8px"
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "16px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => navigate("/content")}
              style={{
                padding: "12px 24px",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "12px 24px",
                backgroundColor: "#5c4033",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "16px",
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? "Uploading..." : "Upload Content"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}








