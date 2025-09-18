// src/components/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import { FaInstagram } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bk-footer">
      <div className="bk-footer__inner cbh-container">
        {/* Left: Logo */}
        <div className="bk-footer__brand">
          <h2 className="bk-footer__logo">CraftedByHer</h2>
          <p className="bk-footer__tag">by Women • for Everyone</p>
        </div>

        {/* Middle: Navigation */}
        <div className="bk-footer__links">
          <div>
            <Link to="/" className="bk-footer-link">Home</Link>
            <Link to="/about" className="bk-footer-link">About Us</Link>
            <Link to="/contact" className="bk-footer-link">Contact Us</Link>
            <Link to="/account" className="bk-footer-link">My Account</Link>
          </div>
          <div>
            <Link to="/privacy" className="bk-footer-link">Privacy Policy</Link>
            <Link to="/refund" className="bk-footer-link">Refund Policy</Link>
            <Link to="/shipping" className="bk-footer-link">Shipping Policy</Link>
            <Link to="/terms" className="bk-footer-link">Terms of Service</Link>
          </div>
        </div>

        {/* Right: Social & Payments */}
        <div className="bk-footer__social">
          <a href="https://instagram.com" target="_blank" rel="noreferrer" className="bk-footer-icon">
            <FaInstagram size={20} />
          </a>
          <div className="bk-footer__payments">
            <img src="/images/payments.png" alt="Payments" />
          </div>
        </div>
      </div>

      <div className="bk-footer__bottom">
        <p>© {new Date().getFullYear()} CraftedByHer. All Rights Reserved.</p>
      </div>
    </footer>
  );
}
