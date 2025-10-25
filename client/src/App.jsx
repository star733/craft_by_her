// src/App.jsx
import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles/razorpay-fixes.css";

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
import PaymentSelection from "./pages/PaymentSelection";
import Payment from "./pages/Payment";
import OrderConfirmation from "./pages/OrderConfirmation";
import Orders from "./pages/Orders";
import TrackOrder from "./pages/TrackOrder.jsx";
import Mission from "./pages/Mission";
import RequireAuth from "./routes/RequireAuth";
import RequireUserAuth from "./routes/RequireUserAuth";
import DeliveryLogin from "./pages/DeliveryLogin";
import DeliveryDashboard from "./pages/DeliveryDashboard";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  const location = useLocation();

  // ✅ Hide Navbar & Footer for admin pages and delivery pages
  const isAdminPage = location.pathname.startsWith("/admin");
  const isDeliveryPage = location.pathname.startsWith("/delivery");

  return (
    <>
      {!isAdminPage && !isDeliveryPage && <Navbar />}
      <main className="min-h-[80vh] px-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/action" element={<Action />} />
          <Route path="/account/*" element={<RequireUserAuth><Account /></RequireUserAuth>} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/mission" element={<Mission />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<CartPrompt />} />
          <Route path="/wishlist" element={<WishlistPrompt />} />
          <Route path="/cart/authenticated" element={<RequireUserAuth><Cart /></RequireUserAuth>} />
          <Route path="/wishlist/authenticated" element={<RequireUserAuth><Wishlist /></RequireUserAuth>} />
          <Route path="/checkout" element={<RequireUserAuth><Checkout /></RequireUserAuth>} />
          <Route path="/payment-selection" element={<RequireUserAuth><PaymentSelection /></RequireUserAuth>} />
          <Route path="/payment" element={<RequireUserAuth><Payment /></RequireUserAuth>} />
          <Route path="/order-confirmation" element={<RequireUserAuth><OrderConfirmation /></RequireUserAuth>} />
          <Route path="/order-confirmation/:orderId" element={<RequireUserAuth><OrderConfirmation /></RequireUserAuth>} />
          <Route path="/orders" element={<RequireUserAuth><Orders /></RequireUserAuth>} />
          <Route path="/track/:orderId" element={<ErrorBoundary><RequireUserAuth><TrackOrder /></RequireUserAuth></ErrorBoundary>} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/delivery-login" element={<DeliveryLogin />} />
          <Route path="/delivery-dashboard" element={<DeliveryDashboard />} />
        </Routes>
      </main>
      {!isAdminPage && !isDeliveryPage && <Footer />}
      <ToastContainer
        position="bottom-center"
        hideProgressBar
        className="custom-toast"
        autoClose={3000}
      />
    </>
  );
}
