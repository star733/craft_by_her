// src/components/Navbar.jsx
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiUser, FiShoppingCart, FiHeart } from "react-icons/fi";
import { auth } from "../firebase";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're on account page
  const isAccountPage = location.pathname.startsWith('/account');

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
      <div className="bk-header__main">
        {/* Brand */}
        <div className="bk-brand" onClick={() => navigate("/")}>
          CraftedByHer
        </div>

        {/* Center Nav - Hide on account page */}
        {!isAccountPage && (
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
          {/* Wishlist */}
          <button
            className="icon-btn"
            onClick={handleWishlistClick}
            aria-label="Wishlist"
            title="Wishlist"
          >
            <FiHeart size={20} />
          </button>

          {/* Cart */}
          <button
            className="icon-btn"
            onClick={handleCartClick}
            aria-label="Cart"
            title="Cart"
          >
            <FiShoppingCart size={20} />
          </button>

          {/* User icon - Hide on account page since user is already in their account */}
          {!isAccountPage && (
            <button
              className="icon-btn"
              onClick={() => navigate(user ? "/account" : "/login")}
              aria-label="Profile"
              title={user ? "Account" : "Sign In"}
            >
              <FiUser size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
