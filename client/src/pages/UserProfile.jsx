import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function UserProfile() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) {
      toast.error("Please login to view profile");
      navigate("/login");
      return;
    }

    setIsOwnProfile(auth.currentUser.uid === userId);
    fetchProfile();
  }, [navigate, userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`${API_BASE}/api/profile/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      } else {
        throw new Error("Failed to fetch profile");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Profile not found");
      navigate("/");
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
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ 
        minHeight: "80vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ color: "#5c4033", marginBottom: "20px" }}>Profile Not Found</h2>
          <button
            onClick={() => navigate("/")}
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
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "24px" }}>
      <div style={{
        background: "#fff",
        padding: "32px",
        borderRadius: "12px",
        border: "1px solid #ddd"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "32px" }}>
          {profile.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.name}
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                objectFit: "cover"
              }}
            />
          ) : (
            <div style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: "#e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "48px",
              color: "#9ca3af"
            }}>
              {profile.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}
          <div>
            <h1 style={{ color: "#5c4033", marginBottom: "8px" }}>{profile.name}</h1>
            <p style={{ color: "#666", marginBottom: "4px" }}>{profile.email}</p>
            {profile.role && (
              <span style={{
                display: "inline-block",
                padding: "4px 12px",
                background: profile.role === "admin" ? "#fee2e2" : profile.role === "seller" ? "#dbeafe" : "#e0e7ff",
                color: profile.role === "admin" ? "#991b1b" : profile.role === "seller" ? "#1e40af" : "#3730a3",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "600",
                textTransform: "capitalize"
              }}>
                {profile.role}
              </span>
            )}
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "24px",
          padding: "24px",
          background: "#f9fafb",
          borderRadius: "8px"
        }}>
          <div>
            <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "4px" }}>Total Orders</div>
            <div style={{ fontSize: "24px", fontWeight: "600", color: "#5c4033" }}>
              {profile.totalOrders || 0}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "4px" }}>Total Spent</div>
            <div style={{ fontSize: "24px", fontWeight: "600", color: "#5c4033" }}>
              ₹{profile.totalSpent || 0}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "4px" }}>Member Since</div>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#374151" }}>
              {new Date(profile.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {isOwnProfile && (
          <div style={{ marginTop: "24px" }}>
            <button
              onClick={() => navigate("/account")}
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
              Edit Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}








