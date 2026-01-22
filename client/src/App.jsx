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
import AdminHubManagement from "./pages/AdminHubManagement";
import AdminApplications from "./pages/AdminApplications";
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
import SellerRegistrationGuide from "./pages/SellerRegistrationGuide";
import RequireAuth from "./routes/RequireAuth";
import RequireUserAuth from "./routes/RequireUserAuth";
import RequireSeller from "./routes/RequireSeller";
import DeliveryLogin from "./pages/DeliveryLogin";
import DeliveryDashboard from "./pages/DeliveryDashboard";
import SellerDashboard from "./pages/SellerDashboard";
import SellerApplication from "./pages/SellerApplication";
import HubManagerLogin from "./pages/HubManagerLogin";
import CraftedByHerHubDashboard from "./pages/CraftedByHerHubDashboard";
import HubManagerRegistration from "./pages/HubManagerRegistration";
import CentralHubManagerLogin from "./pages/CentralHubManagerLogin";
import CentralHubManagerDashboard from "./pages/CentralHubManagerDashboard";
import ErrorBoundary from "./components/ErrorBoundary";
import ConnectionTest from "./pages/ConnectionTest";
import ContentFeed from "./pages/ContentFeed";
import ContentUpload from "./pages/ContentUpload";
import ContentDetail from "./pages/ContentDetail";
import UserProfile from "./pages/UserProfile";

export default function App() {
  const location = useLocation();

  // ✅ Hide Navbar & Footer for admin pages, delivery pages, seller pages, and hub manager pages
  const isAdminPage = location.pathname.startsWith("/admin");
  const isDeliveryPage = location.pathname.startsWith("/delivery");
  const isSellerPage = location.pathname.startsWith("/seller");
  const isHubManagerPage = location.pathname.startsWith("/hub-manager") || location.pathname.startsWith("/central-hub-manager");

  return (
    <>
      {!isAdminPage && !isDeliveryPage && !isSellerPage && !isHubManagerPage && <Navbar />}
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
          <Route path="/seller-guide" element={<SellerRegistrationGuide />} />
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
          <Route path="/admin/hub-management" element={<AdminHubManagement />} />
          <Route path="/admin/applications" element={<AdminApplications />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/delivery-login" element={<DeliveryLogin />} />
          <Route path="/delivery-dashboard" element={<DeliveryDashboard />} />
          <Route path="/seller" element={<RequireSeller><SellerDashboard /></RequireSeller>} />
          <Route path="/seller/application" element={<RequireSeller><SellerApplication /></RequireSeller>} />
          <Route path="/hub-manager/login" element={<HubManagerLogin />} />
          <Route path="/hub-manager/register" element={<HubManagerRegistration />} />
          <Route path="/hub-manager/dashboard" element={<CraftedByHerHubDashboard />} />
          <Route path="/central-hub-manager/login" element={<CentralHubManagerLogin />} />
          <Route path="/central-hub-manager/dashboard" element={<CentralHubManagerDashboard />} />
          <Route path="/connection-test" element={<ConnectionTest />} />
          <Route path="/content" element={<RequireUserAuth><ContentFeed /></RequireUserAuth>} />
          <Route path="/content/upload" element={<RequireUserAuth><ContentUpload /></RequireUserAuth>} />
          <Route path="/content/:id" element={<RequireUserAuth><ContentDetail /></RequireUserAuth>} />
          <Route path="/profile/:userId" element={<RequireUserAuth><UserProfile /></RequireUserAuth>} />
        </Routes>
      </main>
      {!isAdminPage && !isDeliveryPage && !isSellerPage && !isHubManagerPage && <Footer />}
      <ToastContainer
        position="bottom-center"
        hideProgressBar
        className="custom-toast"
        autoClose={3000}
      />
    </>
  );
}