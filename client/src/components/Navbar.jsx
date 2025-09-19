// src/components/Navbar.jsx
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiUser, FiShoppingCart, FiHeart } from "react-icons/fi";
import { auth } from "../firebase";

export default function Navbar() {
  const [user, setUser] = useState(null);
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
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, [location.pathname]);

  const handleCartClick = () => {
    navigate(user ? "/cart/authenticated" : "/cart");
  };

  const handleWishlistClick = () => {
    navigate(user ? "/wishlist/authenticated" : "/wishlist");
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
            {user && <Link to="/orders" className="bk-link">My Orders</Link>}
          </nav>
        )}

        {/* Right actions */}
        <div className="bk-actions">
          {/* Show different icons based on current page */}
          {isSimplifiedHeaderPage ? (
            <>
              {/* Cart page: Show wishlist and account icons */}
              {isCartPage && (
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
                    onClick={() => navigate("/account")}
                    aria-label="Account"
                    title="Account"
                  >
                    <FiUser size={20} />
                  </button>
                </>
              )}

              {/* Wishlist page: Show cart and account icons */}
              {isWishlistPage && (
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
                    onClick={() => navigate("/account")}
                    aria-label="Account"
                    title="Account"
                  >
                    <FiUser size={20} />
                  </button>
                </>
              )}

              {/* Account page: Show wishlist and cart icons */}
              {isAccountPage && (
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
              {/* Full navigation on other pages */}
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

              <button
                className="icon-btn"
                onClick={() => navigate(user ? "/account" : "/login")}
                aria-label="Profile"
                title={user ? "Account" : "Sign In"}
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
