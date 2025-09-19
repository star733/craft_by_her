import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [validationErrors, setValidationErrors] = useState({});
  const [buyerDetails, setBuyerDetails] = useState({
    name: "",
    email: "",
    phone: "",
    address: {
      street: "",
      city: "",
      state: "",
      pincode: "",
      landmark: "",
    },
  });

  useEffect(() => {
    // Check if user is logged in
    if (!auth.currentUser) {
      toast.error("Please login to proceed with checkout");
      navigate("/login");
      return;
    }

    // Get cart items from location state or fetch from API
    if (location.state?.cartItems) {
      setCartItems(location.state.cartItems);
    } else {
      fetchCartItems();
    }
  }, [navigate, location.state]);

  const fetchCartItems = async () => {
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();
      const response = await fetch("http://localhost:5000/api/cart", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const cart = await response.json();
        setCartItems(cart.items || []);
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
      toast.error("Failed to load cart items");
    }
  };

  const calculateTotals = () => {
    const totalAmount = cartItems.reduce((sum, item) => {
      return sum + (item.variant.price * item.quantity);
    }, 0);
    
    const shippingCharges = totalAmount >= 500 ? 0 : 50;
    const finalAmount = totalAmount + shippingCharges;
    
    return { totalAmount, shippingCharges, finalAmount };
  };

  const handleInputChange = (field, value) => {
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }

    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setBuyerDetails(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setBuyerDetails(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;

    // Name validation
    if (!buyerDetails.name.trim()) {
      errors.name = "Name is required";
      isValid = false;
    } else if (buyerDetails.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters long";
      isValid = false;
    } else if (!/^[a-zA-Z\s]+$/.test(buyerDetails.name.trim())) {
      errors.name = "Name can only contain letters and spaces";
      isValid = false;
    }

    // Email validation
    if (!buyerDetails.email.trim()) {
      errors.email = "Email is required";
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(buyerDetails.email.trim())) {
        errors.email = "Please enter a valid email address";
        isValid = false;
      }
    }

    // Phone validation
    if (!buyerDetails.phone.trim()) {
      errors.phone = "Phone number is required";
      isValid = false;
    } else {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(buyerDetails.phone.trim())) {
        errors.phone = "Please enter a valid 10-digit phone number starting with 6-9";
        isValid = false;
      }
    }

    // Address validation
    if (!buyerDetails.address.street.trim()) {
      errors["address.street"] = "Street address is required";
      isValid = false;
    } else if (buyerDetails.address.street.trim().length < 10) {
      errors["address.street"] = "Please provide a complete street address (at least 10 characters)";
      isValid = false;
    }

    if (!buyerDetails.address.city.trim()) {
      errors["address.city"] = "City is required";
      isValid = false;
    } else if (buyerDetails.address.city.trim().length < 2) {
      errors["address.city"] = "City name must be at least 2 characters long";
      isValid = false;
    } else if (!/^[a-zA-Z\s]+$/.test(buyerDetails.address.city.trim())) {
      errors["address.city"] = "City name can only contain letters and spaces";
      isValid = false;
    }

    if (!buyerDetails.address.state.trim()) {
      errors["address.state"] = "State is required";
      isValid = false;
    } else if (buyerDetails.address.state.trim().length < 2) {
      errors["address.state"] = "State name must be at least 2 characters long";
      isValid = false;
    } else if (!/^[a-zA-Z\s]+$/.test(buyerDetails.address.state.trim())) {
      errors["address.state"] = "State name can only contain letters and spaces";
      isValid = false;
    }

    if (!buyerDetails.address.pincode.trim()) {
      errors["address.pincode"] = "Pincode is required";
      isValid = false;
    } else {
      const pincodeRegex = /^[1-9][0-9]{5}$/;
      if (!pincodeRegex.test(buyerDetails.address.pincode.trim())) {
        errors["address.pincode"] = "Please enter a valid 6-digit pincode";
        isValid = false;
      }
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const user = auth.currentUser;
      const token = await user.getIdToken();

      const orderData = {
        items: cartItems,
        buyerDetails,
        paymentMethod,
        notes: "",
      };

      console.log("Creating order:", orderData);

      const response = await fetch("http://localhost:5000/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create order");
      }

      const result = await response.json();
      console.log("Order created:", result);

      // Redirect based on payment method
      if (paymentMethod === "online") {
        navigate("/payment", { 
          state: { 
            order: result.order,
            amount: calculateTotals().finalAmount 
          } 
        });
      } else {
        navigate("/order-confirmation", { 
          state: { order: result.order } 
        });
      }
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error(`Failed to place order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const { totalAmount, shippingCharges, finalAmount } = calculateTotals();

  if (cartItems.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Your cart is empty</h2>
        <p>Add some items to your cart before checkout.</p>
        <button 
          onClick={() => navigate("/products")}
          style={{
            padding: "12px 24px",
            background: "#5c4033",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "16px",
            marginTop: "20px",
          }}
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ marginBottom: "30px", color: "#5c4033" }}>Checkout</h1>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "30px" }}>
        {/* Left Column - Forms */}
        <div>
          {/* Buyer Details */}
          <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "24px" }}>
            <h2 style={{ marginBottom: "20px", color: "#5c4033" }}>Buyer Details</h2>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={buyerDetails.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: validationErrors.name ? "2px solid #dc3545" : "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                    backgroundColor: validationErrors.name ? "#fff5f5" : "white",
                  }}
                  placeholder="Enter your full name"
                />
                {validationErrors.name && (
                  <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>
                    {validationErrors.name}
                  </div>
                )}
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={buyerDetails.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: validationErrors.email ? "2px solid #dc3545" : "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                    backgroundColor: validationErrors.email ? "#fff5f5" : "white",
                  }}
                  placeholder="Enter your email"
                />
                {validationErrors.email && (
                  <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>
                    {validationErrors.email}
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                Phone Number *
              </label>
              <input
                type="tel"
                value={buyerDetails.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: validationErrors.phone ? "2px solid #dc3545" : "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "14px",
                  backgroundColor: validationErrors.phone ? "#fff5f5" : "white",
                }}
                placeholder="Enter your phone number"
              />
              {validationErrors.phone && (
                <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>
                  {validationErrors.phone}
                </div>
              )}
            </div>
            
            <h3 style={{ marginBottom: "16px", color: "#5c4033" }}>Delivery Address</h3>
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                Street Address *
              </label>
              <textarea
                value={buyerDetails.address.street}
                onChange={(e) => handleInputChange("address.street", e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "14px",
                  minHeight: "80px",
                  resize: "vertical",
                }}
                placeholder="Enter your street address"
              />
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                  City *
                </label>
                <input
                  type="text"
                  value={buyerDetails.address.city}
                  onChange={(e) => handleInputChange("address.city", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                  placeholder="Enter your city"
                />
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                  State *
                </label>
                <input
                  type="text"
                  value={buyerDetails.address.state}
                  onChange={(e) => handleInputChange("address.state", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                  placeholder="Enter your state"
                />
              </div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                  Pincode *
                </label>
                <input
                  type="text"
                  value={buyerDetails.address.pincode}
                  onChange={(e) => handleInputChange("address.pincode", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: validationErrors["address.pincode"] ? "2px solid #dc3545" : "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                    backgroundColor: validationErrors["address.pincode"] ? "#fff5f5" : "white",
                  }}
                  placeholder="Enter pincode"
                />
                {validationErrors["address.pincode"] && (
                  <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>
                    {validationErrors["address.pincode"]}
                  </div>
                )}
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={buyerDetails.address.landmark}
                  onChange={(e) => handleInputChange("address.landmark", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                  placeholder="Nearby landmark"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "24px" }}>
            <h2 style={{ marginBottom: "20px", color: "#5c4033" }}>Payment Method</h2>
            
            <div style={{ display: "flex", gap: "20px" }}>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ marginRight: "8px" }}
                />
                <div>
                  <div style={{ fontWeight: "600", fontSize: "16px" }}>Cash on Delivery</div>
                  <div style={{ fontSize: "14px", color: "#666" }}>Pay when your order arrives</div>
                </div>
              </label>
              
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="online"
                  checked={paymentMethod === "online"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ marginRight: "8px" }}
                />
                <div>
                  <div style={{ fontWeight: "600", fontSize: "16px" }}>Online Payment</div>
                  <div style={{ fontSize: "14px", color: "#666" }}>Pay now with dummy gateway</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div>
          <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", position: "sticky", top: "20px" }}>
            <h2 style={{ marginBottom: "20px", color: "#5c4033" }}>Order Summary</h2>
            
            {/* Cart Items */}
            <div style={{ marginBottom: "20px" }}>
              {cartItems.map((item, index) => (
                <div key={index} style={{ display: "flex", gap: "12px", marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #eee" }}>
                  <div style={{ width: "60px", height: "60px", background: "#f5f5f5", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {item.image ? (
                      <img
                        src={item.image.startsWith('http') ? item.image : `http://localhost:5000/uploads/${item.image}`}
                        alt={item.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }}
                        onError={(e) => {
                          // Fallback to legacy image path if upload fails
                          if (!e.target.src.includes('/images/products/')) {
                            e.target.src = `/images/products/${item.title?.toLowerCase().replace(/\s+/g, '-')}.jpg`;
                          }
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: "12px", color: "#999" }}>No Image</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", fontSize: "14px", marginBottom: "4px" }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
                      {item.variant.weight}
                    </div>
                    <div style={{ fontSize: "14px", color: "#5c4033", fontWeight: "600" }}>
                      ₹{item.variant.price} × {item.quantity}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Price Breakdown */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span>Subtotal:</span>
                <span>₹{totalAmount}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span>Shipping:</span>
                <span>{shippingCharges === 0 ? "Free" : `₹${shippingCharges}`}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: "600", color: "#5c4033", paddingTop: "12px", borderTop: "2px solid #5c4033" }}>
                <span>Total:</span>
                <span>₹{finalAmount}</span>
              </div>
            </div>
            
            {/* Place Order Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              style={{
                width: "100%",
                padding: "16px",
                background: loading ? "#ccc" : "#5c4033",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background-color 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.background = "#4a3429";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.background = "#5c4033";
                }
              }}
            >
              {loading ? "Processing..." : paymentMethod === "cod" ? "Place Order (COD)" : "Proceed to Payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
