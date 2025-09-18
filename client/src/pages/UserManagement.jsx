import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";

export default function UserManagement() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [pagination, setPagination] = useState({});
  
  // Filters and search
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 10
  });
  const navigate = useNavigate();

  // Wait for Firebase auth to be ready
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setFirebaseUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (authLoading) return; // Still checking auth
    
    if (!firebaseUser) {
      // Not logged in → redirect to login
      navigate("/login");
      return;
    }
    
    // Check if user is admin
    const checkAdminRole = async () => {
      try {
        const token = await firebaseUser.getIdToken();
        console.log('Checking admin role for user:', firebaseUser.email);
        
        const response = await fetch('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Auth response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('User data:', data);
          if (data.user?.role !== 'admin') {
            console.log('User is not admin, redirecting to admin dashboard');
            navigate("/admin"); // Redirect to admin dashboard if not admin
            return;
          }
        } else {
          console.error('Auth check failed:', response.status, response.statusText);
        }
        
        // User is admin, fetch data
        console.log('User is admin, fetching data...');
        fetchUsers();
        fetchStats();
      } catch (error) {
        console.error('Error checking admin role:', error);
        navigate("/login");
      }
    };
    
    checkAdminRole();
  }, [firebaseUser, authLoading, filters, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        console.log('No current user found');
        return;
      }

      const token = await user.getIdToken();
      console.log('Fetching users with token for user:', user.email);
      
      const queryParams = new URLSearchParams({
        page: filters.page,
        limit: filters.limit,
        search: filters.search,
        role: filters.role,
        status: filters.status,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });

      const url = `http://localhost:5000/api/admin/users?${queryParams}`;
      console.log('Fetching from URL:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Users API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Users data received:', data);
        setUsers(data.users || []);
        setPagination(data.pagination || {});
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch users:', response.status, response.statusText, errorText);
        toast.error(`Failed to load users: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error loading users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch('http://localhost:5000/api/admin/users/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const getRoleBadge = (role) => {
    const roleColors = {
      admin: '#dc3545',
      user: '#28a745',
      buyer: '#8B4513' // Changed from blue to brown to match theme
    };
    
    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '600',
        color: '#fff',
        backgroundColor: roleColors[role] || '#6c757d'
      }}>
        {role === 'admin' ? 'Admin' : (role === 'buyer' ? 'Buyer' : 'User')}
      </span>
    );
  };

  return (
    <div style={{ 
      padding: '30px', 
      backgroundColor: '#f8f6f3', 
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: '700', 
          color: '#3f2d23', 
          marginBottom: '30px',
          textAlign: 'center'
        }}>
          User Management
        </h1>

        {authLoading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '18px', color: '#7b6457' }}>Checking authentication...</div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '20px', 
              marginBottom: '30px' 
            }}>
              <div style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                textAlign: 'center',
                border: '1px solid #ead9c9'
              }}>
                <div style={{ fontSize: '36px', fontWeight: '700', color: '#5c4033', marginBottom: '8px' }}>
                  {stats.totalUsers || 0}
                </div>
                <div style={{ fontSize: '14px', color: '#7b6457', fontWeight: '500' }}>Total Users</div>
              </div>
              <div style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                textAlign: 'center',
                border: '1px solid #ead9c9'
              }}>
                <div style={{ fontSize: '36px', fontWeight: '700', color: '#5c4033', marginBottom: '8px' }}>
                  {stats.activeUsers || 0}
                </div>
                <div style={{ fontSize: '14px', color: '#7b6457', fontWeight: '500' }}>Active Users</div>
              </div>
              <div style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                textAlign: 'center',
                border: '1px solid #ead9c9'
              }}>
                <div style={{ fontSize: '36px', fontWeight: '700', color: '#5c4033', marginBottom: '8px' }}>
                  {stats.onlineUsers || 0}
                </div>
                <div style={{ fontSize: '14px', color: '#7b6457', fontWeight: '500' }}>Online Now</div>
              </div>
              <div style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                textAlign: 'center',
                border: '1px solid #ead9c9'
              }}>
                <div style={{ fontSize: '36px', fontWeight: '700', color: '#5c4033', marginBottom: '8px' }}>
                  {stats.recentUsers || 0}
                </div>
                <div style={{ fontSize: '14px', color: '#7b6457', fontWeight: '500' }}>New This Month</div>
              </div>
            </div>

            {/* Filters */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              border: '1px solid #ead9c9',
              marginBottom: '20px'
            }}>
              <div style={{
                padding: '24px',
                borderBottom: '1px solid #ead9c9'
              }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#3f2d23',
                  margin: '0 0 20px 0'
                }}>Users</h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '15px',
                  alignItems: 'end'
                }}>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    style={{
                      padding: '12px 16px',
                      border: '2px solid #ead9c9',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      backgroundColor: '#fafafa'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#5c4033'}
                    onBlur={(e) => e.target.style.borderColor = '#ead9c9'}
                  />
                  <select
                    value={filters.role}
                    onChange={(e) => handleFilterChange('role', e.target.value)}
                    style={{
                      padding: '12px 16px',
                      border: '2px solid #ead9c9',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: '#fafafa',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                    <option value="buyer">Buyer</option>
                  </select>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    style={{
                      padding: '12px 16px',
                      border: '2px solid #ead9c9',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: '#fafafa',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">All Status</option>
                    <option value="online">Online</option>
                    <option value="recent">Recent</option>
                    <option value="offline">Offline</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    style={{
                      padding: '12px 16px',
                      border: '2px solid #ead9c9',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: '#fafafa',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="createdAt">Sort by Registration</option>
                    <option value="lastLogin">Sort by Last Login</option>
                    <option value="name">Sort by Name</option>
                  </select>
                </div>
              </div>

              {/* Users Table */}
              {loading ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#7b6457',
                  fontSize: '16px'
                }}>
                  Loading users...
                </div>
              ) : (
                <div style={{ overflow: 'hidden' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{
                        backgroundColor: '#f8f6f3',
                        borderBottom: '2px solid #ead9c9'
                      }}>
                        <th style={{
                          padding: '16px',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#3f2d23',
                          fontSize: '14px'
                        }}>User</th>
                        <th style={{
                          padding: '16px',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#3f2d23',
                          fontSize: '14px'
                        }}>Role</th>
                        <th style={{
                          padding: '16px',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#3f2d23',
                          fontSize: '14px'
                        }}>Status</th>
                        <th style={{
                          padding: '16px',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#3f2d23',
                          fontSize: '14px'
                        }}>Last Login</th>
                        <th style={{
                          padding: '16px',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#3f2d23',
                          fontSize: '14px'
                        }}>Registered</th>
                        <th style={{
                          padding: '16px',
                          textAlign: 'center',
                          fontWeight: '600',
                          color: '#3f2d23',
                          fontSize: '14px'
                        }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.filter(user => user.role !== 'admin').map((user, index) => (
                        <tr key={user._id} style={{
                          backgroundColor: index % 2 === 0 ? 'white' : '#fafafa',
                          borderBottom: '1px solid #ead9c9'
                        }}>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: '#ead9c9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                fontWeight: '600',
                                color: '#3f2d23'
                              }}>
                                {user.name?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                              <div>
                                <div style={{ 
                                  fontWeight: '600', 
                                  color: '#3f2d23',
                                  fontSize: '15px',
                                  marginBottom: '2px'
                                }}>
                                  {user.name || 'No Name'}
                                </div>
                                <div style={{ 
                                  fontSize: '13px', 
                                  color: '#7b6457' 
                                }}>
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px' }}>{getRoleBadge(user.role)}</td>
                          <td style={{ padding: '16px' }}>
                            <span style={{
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '500',
                              backgroundColor: user.isActive ? '#d4edda' : '#f8d7da',
                              color: user.isActive ? '#155724' : '#721c24'
                            }}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ padding: '16px', color: '#7b6457' }}>
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                          </td>
                          <td style={{ padding: '16px', color: '#7b6457' }}>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserDetails(true);
                              }}
                              style={{ 
                                padding: '10px 20px', 
                                fontSize: '14px',
                                borderRadius: '8px',
                                backgroundColor: '#5c4033',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: '500',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseOver={(e) => e.target.style.backgroundColor = '#4a3429'}
                              onMouseOut={(e) => e.target.style.backgroundColor = '#5c4033'}
                            >
                              View Activities
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div style={{
                      padding: '20px 24px',
                      borderTop: '1px solid #ead9c9',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '15px'
                    }}>
                      <button
                        disabled={!pagination.hasPrev}
                        onClick={() => handleFilterChange('page', pagination.currentPage - 1)}
                        style={{
                          padding: '8px 16px',
                          border: '2px solid #ead9c9',
                          borderRadius: '6px',
                          backgroundColor: 'white',
                          color: '#7b6457',
                          cursor: pagination.hasPrev ? 'pointer' : 'not-allowed',
                          opacity: pagination.hasPrev ? 1 : 0.5
                        }}
                      >
                        Previous
                      </button>
                      <span style={{ 
                        fontSize: '14px', 
                        color: '#7b6457',
                        fontWeight: '500'
                      }}>
                        Page {pagination.currentPage} of {pagination.totalPages}
                      </span>
                      <button
                        disabled={!pagination.hasNext}
                        onClick={() => handleFilterChange('page', pagination.currentPage + 1)}
                        style={{
                          padding: '8px 16px',
                          border: '2px solid #ead9c9',
                          borderRadius: '6px',
                          backgroundColor: 'white',
                          color: '#7b6457',
                          cursor: pagination.hasNext ? 'pointer' : 'not-allowed',
                          opacity: pagination.hasNext ? 1 : 0.5
                        }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Details Modal */}
            {showUserDetails && selectedUser && (
              <UserDetailsModal
                user={selectedUser}
                onClose={() => {
                  setShowUserDetails(false);
                  setSelectedUser(null);
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// User Details Modal Component
function UserDetailsModal({ user, onClose }) {
  const [activities, setActivities] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const authUser = auth.currentUser;
        if (!authUser) return;

        const token = await authUser.getIdToken();
        
        // Fetch user details with enriched cart, wishlist, and orders
        const response = await fetch(`http://localhost:5000/api/admin/users/${user._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setActivities(data.recentActivities || []);
          setCartItems(data.cart?.items || []);
          setWishlistItems(data.wishlist?.products || []);
          setOrders(data.orders || []);
        } else {
          console.error('Failed to fetch user data:', response.status);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user._id]);

  const getActivityIcon = (action) => {
    const icons = {
      login: '🔐',
      logout: '🚪',
      register: '📝',
      profile_update: '✏️',
      order_placed: '🛒',
      product_viewed: '👁️',
      cart_updated: '🛍️',
      wishlist_updated: '❤️'
    };
    return icons[action] || '📋';
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        padding: '0',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 30px',
          borderBottom: '1px solid #ead9c9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8f6f3'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: '#ead9c9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: '600',
              color: '#3f2d23'
            }}>
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 style={{ margin: 0, color: '#3f2d23', fontSize: '24px', fontWeight: '600' }}>
                {user.name || 'No Name'}
              </h2>
              <p style={{ margin: 0, color: '#7b6457', fontSize: '14px' }}>{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              color: '#7b6457',
              padding: '5px',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#f0f0f0'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #ead9c9',
          backgroundColor: '#f8f6f3'
        }}>
          {[
            { id: 'overview', label: 'Overview', icon: '👤' },
            { id: 'cart', label: `Cart (${cartItems.length})`, icon: '🛒' },
            { id: 'wishlist', label: `Wishlist (${wishlistItems.length})`, icon: '❤️' },
            { id: 'orders', label: `Orders (${orders.length})`, icon: '📦' },
            { id: 'activities', label: 'Activities', icon: '📋' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '16px 20px',
                border: 'none',
                backgroundColor: activeTab === tab.id ? 'white' : 'transparent',
                color: activeTab === tab.id ? '#3f2d23' : '#7b6457',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                borderBottom: activeTab === tab.id ? '2px solid #5c4033' : '2px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ marginRight: '8px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px 30px'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7b6457' }}>
              Loading user data...
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div>
                  <h3 style={{ color: '#3f2d23', marginBottom: '20px' }}>User Information</h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '20px',
                    marginBottom: '30px'
                  }}>
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#f8f6f3',
                      borderRadius: '8px',
                      border: '1px solid #ead9c9'
                    }}>
                      <div style={{ fontSize: '12px', color: '#7b6457', marginBottom: '4px' }}>Role</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#3f2d23' }}>
                        {user.role === 'admin' ? 'Admin' : (user.role === 'buyer' ? 'Buyer' : 'User')}
                      </div>
                    </div>
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#f8f6f3',
                      borderRadius: '8px',
                      border: '1px solid #ead9c9'
                    }}>
                      <div style={{ fontSize: '12px', color: '#7b6457', marginBottom: '4px' }}>Status</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#3f2d23' }}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#f8f6f3',
                      borderRadius: '8px',
                      border: '1px solid #ead9c9'
                    }}>
                      <div style={{ fontSize: '12px', color: '#7b6457', marginBottom: '4px' }}>Phone</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#3f2d23' }}>
                        {user.phone || 'Not provided'}
                      </div>
                    </div>
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#f8f6f3',
                      borderRadius: '8px',
                      border: '1px solid #ead9c9'
                    }}>
                      <div style={{ fontSize: '12px', color: '#7b6457', marginBottom: '4px' }}>Provider</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#3f2d23' }}>
                        {user.provider || 'Email'}
                      </div>
                    </div>
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#f8f6f3',
                      borderRadius: '8px',
                      border: '1px solid #ead9c9'
                    }}>
                      <div style={{ fontSize: '12px', color: '#7b6457', marginBottom: '4px' }}>Registered</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#3f2d23' }}>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#f8f6f3',
                      borderRadius: '8px',
                      border: '1px solid #ead9c9'
                    }}>
                      <div style={{ fontSize: '12px', color: '#7b6457', marginBottom: '4px' }}>Last Login</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#3f2d23' }}>
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'cart' && (
                <div>
                  <h3 style={{ color: '#3f2d23', marginBottom: '20px' }}>Cart Items</h3>
                  {cartItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#7b6457' }}>
                      No items in cart
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {cartItems.map((item, index) => (
                        <div key={index} style={{
                          padding: '16px',
                          backgroundColor: '#f8f6f3',
                          borderRadius: '8px',
                          border: '1px solid #ead9c9',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <div style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            backgroundColor: '#ead9c9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {item.image ? (
                              <img 
                                src={`http://localhost:5000/uploads/${item.image}`} 
                                alt={item.title}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div style={{
                              display: item.image ? 'none' : 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '20px',
                              color: '#7b6457',
                              width: '100%',
                              height: '100%'
                            }}>
                              📦
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', color: '#3f2d23', fontSize: '16px', marginBottom: '4px' }}>
                              {item.title || 'Product'}
                            </div>
                            <div style={{ fontSize: '14px', color: '#7b6457', marginBottom: '2px' }}>
                              Quantity: {item.quantity}
                            </div>
                            <div style={{ fontSize: '14px', color: '#5c4033', fontWeight: '600' }}>
                              Price: ₹{item.price}
                            </div>
                            {item.variant && (
                              <div style={{ fontSize: '12px', color: '#7b6457', marginTop: '2px' }}>
                                Variant: {item.variant.weight || item.variant.name || 'Standard'}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'wishlist' && (
                <div>
                  <h3 style={{ color: '#3f2d23', marginBottom: '20px' }}>Wishlist Items</h3>
                  {wishlistItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#7b6457' }}>
                      No items in wishlist
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {wishlistItems.map((item, index) => (
                        <div key={index} style={{
                          padding: '16px',
                          backgroundColor: '#f8f6f3',
                          borderRadius: '8px',
                          border: '1px solid #ead9c9',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <div style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            backgroundColor: '#ead9c9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {item.image ? (
                              <img 
                                src={`http://localhost:5000/uploads/${item.image}`} 
                                alt={item.title}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div style={{
                              display: item.image ? 'none' : 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '20px',
                              color: '#7b6457',
                              width: '100%',
                              height: '100%'
                            }}>
                              ❤️
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', color: '#3f2d23', fontSize: '16px', marginBottom: '4px' }}>
                              {item.title || 'Product'}
                            </div>
                            <div style={{ fontSize: '14px', color: '#5c4033', fontWeight: '600', marginBottom: '2px' }}>
                              Price: ₹{item.price}
                            </div>
                            <div style={{ fontSize: '12px', color: '#7b6457' }}>
                              Added to wishlist
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'orders' && (
                <div>
                  <h3 style={{ color: '#3f2d23', marginBottom: '20px' }}>Order History</h3>
                  {orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#7b6457' }}>
                      No orders placed
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {orders.map((order, index) => (
                        <div key={index} style={{
                          padding: '16px',
                          backgroundColor: '#f8f6f3',
                          borderRadius: '8px',
                          border: '1px solid #ead9c9'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ fontWeight: '600', color: '#3f2d23' }}>
                              Order #{order.orderNumber || order._id}
                            </div>
                            <div style={{ fontSize: '12px', color: '#7b6457' }}>
                              {new Date(order.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: '#7b6457' }}>
                            Status: {order.status || 'Pending'} | Total: ₹{order.totalAmount || 0}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'activities' && (
                <div>
                  <h3 style={{ color: '#3f2d23', marginBottom: '20px' }}>Activity Timeline</h3>
                  {activities.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#7b6457' }}>
                      No activities recorded
                    </div>
                  ) : (
                    <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                      {activities.map((activity, index) => (
                        <div key={index} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          borderBottom: '1px solid #ead9c9',
                          fontSize: '14px'
                        }}>
                          <span style={{ fontSize: '16px' }}>{getActivityIcon(activity.action)}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', color: '#3f2d23' }}>
                              {activity.action.replace('_', ' ').toUpperCase()}
                            </div>
                            <div style={{ fontSize: '12px', color: '#7b6457' }}>
                              {new Date(activity.timestamp).toLocaleString()}
                            </div>
                          </div>
                          {activity.ipAddress && (
                            <div style={{ fontSize: '12px', color: '#7b6457' }}>
                              {activity.ipAddress}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}