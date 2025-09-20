// src/components/Navbar.jsx
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiUser, FiShoppingCart, FiHeart } from "react-icons/fi";
import { auth } from "../firebase";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're on account, cart, or wishlist pages
  const isSimplifiedHeaderPage = location.pathname.startsWith('/account') || 
                                 location.pathname.startsWith('/cart') || 
                                 location.pathname.startsWith('/wishlist');

  // Determine which page we're on for icon display
  const isAccountPage = location.pathname.startsWith('/account');
  const isCartPage = location.pathname.startsWith('/cart');
  const isWishlistPage = location.pathname.startsWith('/wishlist');

  // load user info whenever route changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      
      // Check user role if user is logged in
      if (user) {
        try {
          const token = await user.getIdToken();
          const response = await fetch('http://localhost:5000/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            setUserRole(data.user?.role || 'buyer');
          } else {
            setUserRole('buyer');
          }
        } catch (error) {
          console.error('Error checking user role:', error);
          setUserRole('buyer');
        }
      } else {
        setUserRole(null);
      }
    });

    return () => unsubscribe();
  }, [location.pathname]);

  const handleCartClick = () => {
    if (userRole === 'admin') {
      navigate("/admin");
      return;
    }
    navigate(user ? "/cart/authenticated" : "/cart");
  };

  const handleWishlistClick = () => {
    if (userRole === 'admin') {
      navigate("/admin");
      return;
    }
    navigate(user ? "/wishlist/authenticated" : "/wishlist");
  };

  const handleAccountClick = () => {
    if (userRole === 'admin') {
      navigate("/admin");
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
            <Link to="/about" className="bk-link">About Us</Link>
            <Link to="/contact" className="bk-link">Contact</Link>
            {user && userRole !== 'admin' && <Link to="/orders" className="bk-link">My Orders</Link>}
          </nav>
        )}

        {/* Right actions */}
        <div className="bk-actions">
          {/* Show different icons based on current page */}
          {isSimplifiedHeaderPage ? (
            <>
              {/* Cart page: Show wishlist and account icons */}
              {isCartPage && userRole !== 'admin' && (
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
              {isWishlistPage && userRole !== 'admin' && (
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

              {/* Account page: Show wishlist and cart icons */}
              {isAccountPage && userRole !== 'admin' && (
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
            </>
          ) : (
            <>
              {/* Full navigation on other pages - hide user features for admin */}
              {userRole !== 'admin' && (
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
                title={user ? (userRole === 'admin' ? "Admin Dashboard" : "Account") : "Sign In"}
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
