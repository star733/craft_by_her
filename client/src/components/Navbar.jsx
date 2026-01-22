// src/components/Navbar.jsx
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiUser, FiShoppingCart, FiHeart } from "react-icons/fi";
import { auth } from "../firebase";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're on account, cart, or wishlist pages
  const isSimplifiedHeaderPage = location.pathname.startsWith('/account') || 
                                 location.pathname.startsWith('/cart') || 
                                 location.pathname.startsWith('/wishlist');

  // Check if we're on seller dashboard
  const isSellerDashboard = location.pathname.startsWith('/seller');

  // Determine which page we're on for icon display
  const isAccountPage = location.pathname.startsWith('/account');
  const isCartPage = location.pathname.startsWith('/cart');
  const isWishlistPage = location.pathname.startsWith('/wishlist');

  // Helper function to clean display name (remove codes like "MCA2024-2026")
  const cleanDisplayName = (rawName) => {
    if (!rawName) return 'User';
    
    // Split by space and filter out words containing numbers or all caps codes
    const words = rawName.split(/\s+/);
    const nameWords = words.filter(word => {
      // Remove words with numbers
      if (/\d/.test(word)) return false;
      
      // Remove all-caps words with 3+ characters (like "MCA", "MBA", etc.)
      if (word.length >= 3 && word === word.toUpperCase()) return false;
      
      // Keep the word
      return true;
    });
    
    // If we filtered everything, just take first 2 words
    if (nameWords.length === 0) {
      return rawName.split(/\s+/).slice(0, 2).join(' ');
    }
    
    // Get first 2-3 name words and format to Title Case
    const finalWords = nameWords.slice(0, Math.min(3, nameWords.length));
    return finalWords
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // load user info whenever route changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      
      // Check user role if user is logged in
      if (user) {
        try {
          const token = await user.getIdToken();
          const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
          const response = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            setUserRole(data.user?.role || 'buyer');
            // Get name from backend first, then fallback to Firebase, then email username
            const backendName = data.user?.name;
            const firebaseName = user.displayName;
            const emailName = user.email?.split('@')[0];
            
            // Use backend name if available, otherwise clean Firebase name
            const finalName = backendName || cleanDisplayName(firebaseName) || emailName || 'User';
            setUserName(finalName);
          } else {
            // API failed, default to buyer role
            console.log('Auth API not available, using default role');
            setUserRole('buyer');
            // Fallback to cleaned Firebase name or email username
            const firebaseName = user.displayName;
            const emailName = user.email?.split('@')[0];
            setUserName(cleanDisplayName(firebaseName) || emailName || 'User');
          }
        } catch (error) {
          // Network error or other issues, default to buyer role
          console.log('Auth API error, using default role:', error.message);
          setUserRole('buyer');
            // Fallback to cleaned Firebase name or email username
            const firebaseName = user.displayName;
            const emailName = user.email?.split('@')[0];
            setUserName(cleanDisplayName(firebaseName) || emailName || 'User');
        }
      } else {
        setUserRole(null);
        setUserName("");
      }
    });
    
    return () => unsubscribe();
  }, [location.pathname]);

  const handleCartClick = () => {
    if (userRole === 'admin') {
      navigate("/admin");
      return;
    }
    if (userRole === 'seller') {
      navigate("/seller");
      return;
    }
    navigate(user ? "/cart/authenticated" : "/cart");
  };

  const handleWishlistClick = () => {
    if (userRole === 'admin') {
      navigate("/admin");
      return;
    }
    if (userRole === 'seller') {
      navigate("/seller");
      return;
    }
    navigate(user ? "/wishlist/authenticated" : "/wishlist");
  };

  const handleAccountClick = () => {
    if (userRole === 'admin') {
      navigate("/admin");
      return;
    }
    if (userRole === 'seller') {
      navigate("/seller");
      return;
    }
    navigate(user ? "/account" : "/login");
  };

  return (
    <header className="bk-header">
      <div className={`bk-header__main ${isSimplifiedHeaderPage ? 'simplified' : ''}`}>
        {/* Brand */}
        <div className="bk-brand" onClick={() => navigate("/")}>
          CraftedByHer
        </div>

        {/* Center Nav - Hide on account, cart, and wishlist pages */}
        {!isSimplifiedHeaderPage && (
          <nav className="bk-nav">
            <Link to="/" className="bk-link">Home</Link>
            <Link
              to="/products"
              className="bk-link"
              onClick={(e) => {
                e.preventDefault();
                navigate("/products");
              }}
            >
              Menu
            </Link>
            {user && <Link to="/content" className="bk-link">Talent Platform</Link>}
            <Link to="/about" className="bk-link">About Us</Link>
            <Link to="/contact" className="bk-link">Contact</Link>
            {user && userRole !== 'admin' && userRole !== 'seller' && <Link to="/orders" className="bk-link">My Orders</Link>}
          </nav>
        )}

        {/* Right actions */}
        <div className="bk-actions">
          {/* Show different icons based on current page */}
          {isSimplifiedHeaderPage ? (
            <>
              {/* Cart page: Show wishlist and account icons */}
              {isCartPage && userRole !== 'admin' && userRole !== 'seller' && (
                <>
                  <button
                    className="icon-btn"
                    onClick={handleWishlistClick}
                    aria-label="Wishlist"
                    title="Wishlist"
                  >
                    <FiHeart size={20} />
                  </button>
                  <button
                    className="icon-btn"
                    onClick={handleAccountClick}
                    aria-label="Account"
                    title="Account"
                  >  
                    <FiUser size={20} />
                  </button>
                  
                </>
              )}

              {/* Wishlist page: Show cart and account icons */}
              {isWishlistPage && userRole !== 'admin' && userRole !== 'seller' && (
                <>
                  <button
                    className="icon-btn"
                    onClick={handleCartClick}
                    aria-label="Cart"
                    title="Cart"
                  >
                    <FiShoppingCart size={20} />
                  </button>
                  <button
                    className="icon-btn"
                    onClick={handleAccountClick}
                    aria-label="Account"
                    title="Account"
                  >
                    <FiUser size={20} />
                  </button>
                </> 
              )}

              {/* Account page: Show user name, wishlist and cart icons */}
              {isAccountPage && userRole !== 'admin' && userRole !== 'seller' && (
                <>
                  {user && (
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#5c4033',
                      marginRight: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      Hi, {userName}
                    </span>
                  )}
                  <button
                    className="icon-btn"
                    onClick={handleWishlistClick}
                    aria-label="Wishlist"
                    title="Wishlist"
                  >
                    <FiHeart size={20} />
                  </button>
                  <button
                    className="icon-btn"
                    onClick={handleCartClick}
                    aria-label="Cart"
                    title="Cart"
                  >
                    <FiShoppingCart size={20} />
                  </button>
                  
                </>
              )}
            </>
          ) : (
            <>
              {/* Display user name if logged in and not a seller or admin */}
              {user && userRole !== 'admin' && userRole !== 'seller' && (
                <span style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#5c4033',
                  marginRight: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  Hi, {userName}
                </span>
              )}

              {/* Full navigation on other pages - hide user features for admin and seller */}
              {userRole !== 'admin' && userRole !== 'seller' && (
                <>
                  <button
                    className="icon-btn"
                    onClick={handleWishlistClick}
                    aria-label="Wishlist"
                    title="Wishlist"
                  >
                    <FiHeart size={20} />
                  </button>

                  <button
                    className="icon-btn"
                    onClick={handleCartClick}
                    aria-label="Cart"
                    title="Cart"
                  >
                    <FiShoppingCart size={20} />
                  </button>
                </>
              )}

              <button
                className="icon-btn"
                onClick={handleAccountClick}
                aria-label="Profile"
                title={user ? (userRole === 'admin' ? "Admin Dashboard" : userRole === 'seller' ? "Seller Dashboard" : "Account") : "Sign In"}
              >
                <FiUser size={20} />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}