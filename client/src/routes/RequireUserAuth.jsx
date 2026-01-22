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

        console.log('User auth response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('User auth data:', data);
          const role = data.user?.role || 'buyer';
          setUserRole(role);
          console.log('User role set to:', role);
        } else {
          // API failed, try to get role from localStorage
          console.log('Auth API not available, checking localStorage');
          const storedUser = localStorage.getItem('craftedbyher_user');
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            console.log('Role from localStorage:', userData?.role);
            setUserRole(userData?.role || 'buyer');
          } else {
            console.log('No role in localStorage, defaulting to buyer');
            setUserRole('buyer');
          }
        }
      } catch (error) {
        // Network error or other issues, try to get role from localStorage
        console.log('Auth API error, checking localStorage:', error.message);
        try {
          const storedUser = localStorage.getItem('craftedbyher_user');
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            console.log('Role from localStorage (catch block):', userData?.role);
            setUserRole(userData?.role || 'buyer');
          } else {
            console.log('No role in localStorage (catch block), defaulting to buyer');
            setUserRole('buyer');
          }
        } catch (parseError) {
          console.log('Error parsing stored user data:', parseError.message);
          setUserRole('buyer');
        }
      } finally {
        console.log('User role loading complete');
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
    console.log('User is admin, redirecting to /admin');
    return <Navigate to="/admin" replace />;
  }
  
  // Seller user trying to access buyer features - redirect to seller dashboard
  if (userRole === 'seller') {
    console.log('User is seller, checking application status');
    // Check if seller application status is already stored
    const checkSellerRedirect = async () => {
      // For sellers, check if they have submitted an application
      try {
        const token = await user.getIdToken(true);
        const response = await fetch('http://localhost:5000/api/seller/applications/my-application', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Seller application check response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Seller application data:', data);
          if (data.success && data.application) {
            // If application is approved, go to seller dashboard
            if (data.application.status === 'approved') {
              console.log('Seller application approved, redirecting to /seller');
              window.location.href = "/seller";
            } else {
              // If application exists but not approved, go to application page
              console.log('Seller application not approved, redirecting to /seller/application');
              window.location.href = "/seller/application";
            }
          } else {
            // If no application exists, go to application page
            console.log('No seller application found, redirecting to /seller/application');
            window.location.href = "/seller/application";
          }
        } else {
          // If we can't check application status, go to application page by default
          console.log('Failed to check application status, redirecting to /seller/application');
          window.location.href = "/seller/application";
        }
      } catch (err) {
        console.log("Error checking application status, redirecting to application page", err);
        window.location.href = "/seller/application";
      }
    };
    
    // Call the async function
    checkSellerRedirect();
    
    // Return null while redirecting
    return null;
  }

  // Regular user - allow access
  return children;
}
