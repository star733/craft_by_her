// src/App.jsx
import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import Action from "./pages/Action.jsx";
import Products from "./pages/Products"; 
import Account from "./pages/Account";
import About from "./pages/About";
import Contact from "./pages/Contact";
import AdminDashboard from "./pages/AdminDashboard";
import UserManagement from "./pages/UserManagement";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Wishlist from "./pages/Wishlist";
import CartPrompt from "./pages/CartPrompt";
import WishlistPrompt from "./pages/WishlistPrompt";
import Checkout from "./pages/Checkout";
import Payment from "./pages/Payment";
import OrderConfirmation from "./pages/OrderConfirmation";
import Orders from "./pages/Orders";
import RequireAuth from "./routes/RequireAuth";

export default function App() {
  const location = useLocation();

  // ✅ Hide Navbar & Footer for admin pages
  const isAdminPage = location.pathname.startsWith("/admin");

  return (
    <>
      {!isAdminPage && <Navbar />}
      <main className="min-h-[80vh] px-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/action" element={<Action />} />
          <Route path="/account/*" element={<Account />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<CartPrompt />} />
          <Route path="/wishlist" element={<WishlistPrompt />} />
          <Route path="/cart/authenticated" element={<RequireAuth><Cart /></RequireAuth>} />
          <Route path="/wishlist/authenticated" element={<RequireAuth><Wishlist /></RequireAuth>} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
        </Routes>
      </main>
      {!isAdminPage && <Footer />}
      <ToastContainer
        position="bottom-center"
        hideProgressBar
        className="custom-toast"
        autoClose={3000}
      />
    </>
  );
}
