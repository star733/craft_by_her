import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import SellerApplications from "../components/SellerApplications";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function AdminApplications() {
  const navigate = useNavigate();
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  const viewApplicationDetails = (application) => {
    setSelectedApplication(application);
    setShowApplicationModal(true);
  };

  const handleApprove = async (applicationId) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_BASE}/api/admin/seller-applications/${applicationId}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve application");
      }

      toast.success("Application approved successfully!");
      fetchApplications(user);
      setShowApplicationModal(false);
    } catch (err) {
      console.error("Approve error:", err);
      toast.error(err.message || "Failed to approve application");
    }
  };

  const handleReject = async (applicationId, reason) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_BASE}/api/admin/seller-applications/${applicationId}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reject application");
      }

      toast.success("Application rejected");
      fetchApplications(user);
      setShowApplicationModal(false);
    } catch (err) {
      console.error("Reject error:", err);
      toast.error(err.message || "Failed to reject application");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--background, #faf8f5)",
      padding: "32px 24px"
    }}>
      <div style={{
        maxWidth: "1400px",
        margin: "0 auto"
      }}>
        {/* Header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: "32px" 
        }}>
          <div>
            <button
              onClick={() => navigate("/admin")}
              style={{
                padding: "8px 16px",
                background: "transparent",
                color: "var(--brand, #8b5e34)",
                border: "2px solid var(--brand, #8b5e34)",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "16px",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "var(--brand, #8b5e34)";
                e.target.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "transparent";
                e.target.style.color = "var(--brand, #8b5e34)";
              }}
            >
              ← Back to Dashboard
            </button>
            <h1 style={{ 
              margin: "0 0 8px 0", 
              color: "var(--brand-strong, #6f4518)", 
              fontFamily: "var(--title-font, 'Playfair Display', serif)",
              fontSize: "36px",
              fontWeight: "900"
            }}>
              Seller Applications
            </h1>
            <p style={{ 
              margin: 0, 
              color: "var(--text-muted, #7b6457)", 
              fontSize: "15px" 
            }}>
              Review and manage all seller applications
            </p>
          </div>
        </div>

        {/* Applications List */}
        <div style={{ 
          background: "var(--surface, #ffffff)", 
          padding: "24px", 
          borderRadius: "16px", 
          border: "1px solid var(--border, #ead9c9)",
          boxShadow: "0 8px 20px rgba(63,45,35,.10)"
        }}>
          <SellerApplications 
            onViewApplicationDetails={viewApplicationDetails}
          />
        </div>

        {/* Application Details Modal */}
        {showApplicationModal && selectedApplication && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px"
          }}
          onClick={() => setShowApplicationModal(false)}
          >
            <div style={{
              background: "var(--surface, #ffffff)",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 12px 32px rgba(0, 0, 0, 0.3)"
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                marginBottom: "24px"
              }}>
                <h2 style={{
                  margin: 0,
                  color: "var(--brand-strong, #6f4518)",
                  fontFamily: "var(--title-font, 'Playfair Display', serif)",
                  fontSize: "24px"
                }}>
                  Application Details
                </h2>
                <button
                  onClick={() => setShowApplicationModal(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: "24px",
                    cursor: "pointer",
                    color: "var(--text-muted, #7b6457)",
                    padding: "0",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <p style={{ 
                    margin: "0 0 4px 0", 
                    fontSize: "12px", 
                    color: "var(--text-muted, #7b6457)",
                    textTransform: "uppercase",
                    fontWeight: "600"
                  }}>
                    Business Name
                  </p>
                  <p style={{ margin: 0, fontSize: "16px", color: "var(--text, #3f2d23)", fontWeight: "600" }}>
                    {selectedApplication.businessName || "N/A"}
                  </p>
                </div>

                <div>
                  <p style={{ 
                    margin: "0 0 4px 0", 
                    fontSize: "12px", 
                    color: "var(--text-muted, #7b6457)",
                    textTransform: "uppercase",
                    fontWeight: "600"
                  }}>
                    Email
                  </p>
                  <p style={{ margin: 0, fontSize: "16px", color: "var(--text, #3f2d23)" }}>
                    {selectedApplication.email || "N/A"}
                  </p>
                </div>

                <div>
                  <p style={{ 
                    margin: "0 0 4px 0", 
                    fontSize: "12px", 
                    color: "var(--text-muted, #7b6457)",
                    textTransform: "uppercase",
                    fontWeight: "600"
                  }}>
                    Phone
                  </p>
                  <p style={{ margin: 0, fontSize: "16px", color: "var(--text, #3f2d23)" }}>
                    {selectedApplication.phone || "N/A"}
                  </p>
                </div>

                <div>
                  <p style={{ 
                    margin: "0 0 4px 0", 
                    fontSize: "12px", 
                    color: "var(--text-muted, #7b6457)",
                    textTransform: "uppercase",
                    fontWeight: "600"
                  }}>
                    Status
                  </p>
                  <span style={{
                    padding: "6px 12px",
                    borderRadius: "20px",
                    fontSize: "13px",
                    fontWeight: "700",
                    background: selectedApplication.status === "approved" 
                      ? "var(--accent-soft, #f3e7dc)"
                      : selectedApplication.status === "rejected"
                      ? "#f8d7da"
                      : "#fff3cd",
                    color: selectedApplication.status === "approved"
                      ? "var(--brand, #8b5e34)"
                      : selectedApplication.status === "rejected"
                      ? "#721c24"
                      : "#856404"
                  }}>
                    {selectedApplication.status?.toUpperCase() || "PENDING"}
                  </span>
                </div>

                {selectedApplication.status === "rejected" && selectedApplication.rejectionReason && (
                  <div>
                    <p style={{ 
                      margin: "0 0 4px 0", 
                      fontSize: "12px", 
                      color: "var(--text-muted, #7b6457)",
                      textTransform: "uppercase",
                      fontWeight: "600"
                    }}>
                      Rejection Reason
                    </p>
                    <p style={{ margin: 0, fontSize: "14px", color: "#721c24" }}>
                      {selectedApplication.rejectionReason}
                    </p>
                  </div>
                )}

                <div style={{
                  marginTop: "24px",
                  paddingTop: "24px",
                  borderTop: "1px solid var(--border, #ead9c9)",
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end"
                }}>
                  {selectedApplication.status === "submitted" || selectedApplication.status === "pending" ? (
                    <>
                      <button
                        onClick={() => handleReject(selectedApplication._id, "Rejected by admin")}
                        style={{
                          padding: "10px 20px",
                          background: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "600"
                        }}
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(selectedApplication._id)}
                        style={{
                          padding: "10px 20px",
                          background: "var(--brand, #8b5e34)",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "600"
                        }}
                      >
                        Approve
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowApplicationModal(false)}
                      style={{
                        padding: "10px 20px",
                        background: "var(--brand, #8b5e34)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "600"
                      }}
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

