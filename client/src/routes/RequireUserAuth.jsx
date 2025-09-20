import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase";

export default function RequireUserAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setRoleLoading(false);
        return;
      }

      try {
        const token = await user.getIdToken();
        const response = await fetch('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setUserRole(data.user?.role || 'buyer');
        } else {
          setUserRole('buyer'); // Default to buyer if API fails
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        setUserRole('buyer'); // Default to buyer on error
      } finally {
        setRoleLoading(false);
      }
    };

    checkUserRole();
  }, [user]);

  // Show loading while checking authentication and role
  if (loading || roleLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin user trying to access user features - redirect to admin dashboard
  if (userRole === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Regular user - allow access
  return children;
}
