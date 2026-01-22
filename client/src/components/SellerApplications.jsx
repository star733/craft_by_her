import React, { useState, useEffect } from "react";
import { auth } from "../firebase";
import { toast } from "react-toastify";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const SellerApplications = ({ onViewApplicationDetails }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('submitted'); // Default to pending applications

  // Fetch seller applications with status filter
  const fetchSellerApplications = async (status = null) => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        console.error("No user found");
        return;
      }
      
      await user.reload();
      const token = await user.getIdToken(true);
      let url = `${API_BASE}/api/seller/applications`;
      if (status) {
        url += `?status=${status}`;
      }
      
      console.log("Fetching seller applications from:", url, "with status:", status);
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Response status:", res.status);

      if (res.status === 403) {
        toast.error("Access denied: You are not an admin");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error response:", errorText);
        toast.error(`Failed to fetch applications: ${res.status}`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      console.log("Applications data:", data);
      
      if (data.success) {
        console.log(`Setting ${data.applications?.length || 0} applications`);
        setApplications(data.applications || []);
      } else {
        console.error("API returned success: false", data);
        toast.error(data.error || "Failed to fetch seller applications");
      }
    } catch (err) {
      console.error("Fetch seller applications error:", err);
      toast.error("Failed to fetch seller applications: " + (err.message || "Network error"));
    } finally {
      setLoading(false);
    }
  };

  // Refresh applications based on current filter
  const refreshApplications = () => {
    fetchSellerApplications(filter === 'all' ? null : filter);
  };

  // Handle filter change
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    fetchSellerApplications(newFilter === 'all' ? null : newFilter);
  };

  // Approve seller application
  const approveApplication = async (applicationId) => {
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken(true);
      
      const res = await fetch(`${API_BASE}/api/seller/applications/${applicationId}/status`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: 'approved' })
      });
      
      if (res.status === 403) {
        toast.error("Access denied: You are not an admin");
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        if (data.emailSent) {
          toast.success("Seller application approved successfully and email sent to seller!", {
            autoClose: 5000
          });
        } else {
          toast.warning(`Application approved but email failed: ${data.emailError || "Unknown error"}`, {
            autoClose: 7000
          });
        }
        // Refresh the list
        refreshApplications();
      } else {
        toast.error(data.error || "Failed to approve application");
      }
    } catch (err) {
      console.error("Approve application error:", err);
      toast.error("Failed to approve application");
    }
  };

  // Reject seller application
  const rejectApplication = async (applicationId, rejectionReason) => {
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken(true);
      
      const res = await fetch(`${API_BASE}/api/seller/applications/${applicationId}/status`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: 'rejected', rejectionReason })
      });
      
      if (res.status === 403) {
        toast.error("Access denied: You are not an admin");
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        toast.success("Seller application rejected");
        // Refresh the list
        refreshApplications();
      } else {
        toast.error(data.error || "Failed to reject application");
      }
    } catch (err) {
      console.error("Reject application error:", err);
      toast.error("Failed to reject application");
    }
  };

  // Load initial applications
  useEffect(() => {
    const fetchInitial = async () => {
      const user = auth.currentUser;
      if (user) {
        console.log("Initial fetch of seller applications");
        await fetchSellerApplications(filter === 'all' ? null : filter);
      } else {
        // Wait for auth state
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
          if (user) {
            console.log("User authenticated, fetching seller applications");
            await fetchSellerApplications(filter === 'all' ? null : filter);
            unsubscribe();
          }
        });
        return () => unsubscribe();
      }
    };
    fetchInitial();
  }, []);

  return (
    <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginTop: "30px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ margin: "0" }}>Seller Applications</h2>
        <button 
          onClick={refreshApplications}
          style={{ 
            background: "#5c4033", 
            color: "white", 
            border: "none", 
            padding: "8px 16px", 
            borderRadius: "6px", 
            cursor: "pointer",
            fontSize: "14px"
          }}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      
      {/* Status Filter Buttons */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button 
          onClick={() => handleFilterChange('all')}
          style={{ 
            background: filter === 'all' ? "#5c4033" : "#6c757d", 
            color: "white", 
            border: "none", 
            padding: "6px 12px", 
            borderRadius: "4px", 
            cursor: "pointer",
            fontSize: "12px"
          }}
        >
          All Applications
        </button>
        <button 
          onClick={() => handleFilterChange('submitted')}
          style={{ 
            background: filter === 'submitted' ? "#5c4033" : "#007bff", 
            color: "white", 
            border: "none", 
            padding: "6px 12px", 
            borderRadius: "4px", 
            cursor: "pointer",
            fontSize: "12px"
          }}
        >
          Pending
        </button>
        <button 
          onClick={() => handleFilterChange('approved')}
          style={{ 
            background: filter === 'approved' ? "#5c4033" : "#28a745", 
            color: "white", 
            border: "none", 
            padding: "6px 12px", 
            borderRadius: "4px", 
            cursor: "pointer",
            fontSize: "12px"
          }}
        >
          Approved
        </button>
        <button 
          onClick={() => handleFilterChange('rejected')}
          style={{ 
            background: filter === 'rejected' ? "#5c4033" : "#dc3545", 
            color: "white", 
            border: "none", 
            padding: "6px 12px", 
            borderRadius: "4px", 
            cursor: "pointer",
            fontSize: "12px"
          }}
        >
          Rejected
        </button>
      </div>
      
      {loading ? (
        <p>Loading applications...</p>
      ) : applications.length === 0 ? (
        <div style={{ 
          textAlign: "center", 
          padding: "40px", 
          background: "#f8f9fa", 
          borderRadius: "8px",
          border: "1px solid #dee2e6"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "15px" }}>📋</div>
          <h3 style={{ margin: "0 0 10px 0", color: "#5c4033" }}>No Seller Applications Found</h3>
          <p style={{ color: "#666", margin: "0" }}>
            {filter === 'submitted' 
              ? "No pending seller registration requests at the moment." 
              : filter === 'approved'
              ? "No approved seller applications."
              : filter === 'rejected'
              ? "No rejected seller applications."
              : "No seller applications found."}
          </p>
          {filter !== 'all' && (
            <button 
              onClick={() => handleFilterChange('all')}
              style={{ 
                marginTop: "15px",
                background: "#5c4033", 
                color: "white", 
                border: "none", 
                padding: "8px 16px", 
                borderRadius: "6px", 
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              View All Applications
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "15px" }}>
          {applications.map((application) => (
            <div key={application._id} style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              padding: "15px",
              border: "1px solid #eee",
              borderRadius: "8px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "20px" }}>📄</span>
                <div>
                  <div style={{ fontWeight: "600", fontSize: "16px" }}>{application.businessName}</div>
                  <div style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>
                    <strong>Email:</strong> {application.email}
                  </div>
                  <div style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>
                    <strong>Phone:</strong> {application.phone || 'N/A'}
                  </div>
                  <div style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>
                    Submitted: {new Date(application.submittedAt || application.createdAt).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
                    Status: 
                    <span style={{
                      padding: "2px 6px",
                      borderRadius: "4px",
                      marginLeft: "5px",
                      backgroundColor: application.status === 'approved' ? "#e6f4ea" : 
                                     application.status === 'rejected' ? "#fce8e6" : "#fff7e6",
                      color: application.status === 'approved' ? "#1e7e34" : 
                            application.status === 'rejected' ? "#c5221f" : "#a87300",
                      fontWeight: 600
                    }}>
                      {application.displayStatus || application.status}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  onClick={() => onViewApplicationDetails(application)}
                  style={{ 
                    background: "#5c4033", 
                    color: "white", 
                    border: "none", 
                    padding: "8px 16px", 
                    borderRadius: "6px", 
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  View Details
                </button>
                {application.status === 'submitted' && (
                  <>
                    <button 
                      onClick={() => approveApplication(application._id)}
                      style={{ 
                        background: "#28a745", 
                        color: "white", 
                        border: "none", 
                        padding: "8px 16px", 
                        borderRadius: "6px", 
                        cursor: "pointer",
                        fontSize: "14px"
                      }}
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => {
                        const reason = prompt("Enter rejection reason:");
                        if (reason !== null) {
                          rejectApplication(application._id, reason);
                        }
                      }}
                      style={{ 
                        background: "#dc3545", 
                        color: "white", 
                        border: "none", 
                        padding: "8px 16px", 
                        borderRadius: "6px", 
                        cursor: "pointer",
                        fontSize: "14px"
                      }}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerApplications;