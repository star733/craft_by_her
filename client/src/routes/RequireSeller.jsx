import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequireSeller({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [allowAccess, setAllowAccess] = useState(false);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setRoleLoading(false);
        return;
      }

      // Set a timeout to allow access if API takes too long
      const timeoutId = setTimeout(() => {
        console.log('⏱️ Role check timeout - allowing access and will verify in dashboard');
        setAllowAccess(true); // Allow access on timeout
        setRoleLoading(false);
      }, 2000); // 2 second timeout

      try {
        const token = await user.getIdToken();
        const controller = new AbortController();
        const fetchTimeout = setTimeout(() => controller.abort(), 1500);

        const response = await fetch('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });

        clearTimeout(fetchTimeout);
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          const role = data.user?.role || 'buyer';
          setUserRole(role);
          localStorage.setItem('craftedbyher_user', JSON.stringify(data.user));
          console.log('✅ User role verified:', role);
        } else {
          console.log('⚠️ Auth API returned error, checking localStorage');
          const storedUser = localStorage.getItem('craftedbyher_user');
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            setUserRole(userData?.role || 'buyer');
            console.log('📦 Role from localStorage:', userData?.role);
          } else {
            // If no stored data, allow access and let dashboard handle verification
            console.log('⚠️ No stored role, allowing access for dashboard verification');
            setAllowAccess(true);
          }
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.log('❌ Auth API error:', error.message);
        
        // Try localStorage first
        const storedUser = localStorage.getItem('craftedbyher_user');
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            setUserRole(userData?.role || 'buyer');
            console.log('📦 Role from localStorage (error):', userData?.role);
          } catch {
            // If localStorage fails, allow access and let dashboard handle it
            console.log('⚠️ localStorage parse failed, allowing access');
            setAllowAccess(true);
          }
        } else {
          // No localStorage, allow access and let dashboard verify
          console.log('⚠️ No localStorage, allowing access for dashboard verification');
          setAllowAccess(true);
        }
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
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #f5f1eb 0%, #e8dcc6 100%)',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '20px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}>
          🔐
        </div>
        <div style={{
          fontSize: '18px',
          color: '#5c4033',
          fontWeight: '600',
          marginBottom: '10px'
        }}>
          Verifying Seller Access...
        </div>
        <div style={{
          fontSize: '14px',
          color: '#666'
        }}>
          Please wait while we check your credentials
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  // Not logged in - redirect to login
  if (!user) {
    console.log('❌ User not logged in, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If we're allowing access (API timeout/error), let the dashboard handle verification
  if (allowAccess) {
    console.log('✅ Allowing access - dashboard will handle verification');
    return children;
  }

  // Not a seller - redirect to appropriate dashboard
  if (userRole && userRole !== 'seller') {
    console.log('❌ User is not a seller, role:', userRole);
    if (userRole === 'admin') {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/account" replace />;
    }
  }

  // Seller user - allow access
  console.log('✅ Seller access granted');
  return children;
}