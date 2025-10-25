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
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [saveThisAddress, setSaveThisAddress] = useState(true);
  const [setAsDefault, setSetAsDefault] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    if (!auth.currentUser) {
      toast.error("Please login to proceed with checkout");
      navigate("/login");
      return;
    }

    // Prefer any cart items passed via navigation state (e.g., Buy Now)
    if (location.state?.cartItems) {
      setCartItems(location.state.cartItems);
    } else {
      // Only fetch server cart if NOT coming from Buy Now
      fetchCartItems();
    }

    // Load saved addresses
    (async () => {
      try {
        const token = await auth.currentUser.getIdToken();
        const resp = await fetch("http://localhost:5000/api/addresses", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          const addresses = Array.isArray(data.addresses) ? data.addresses : [];
          setSavedAddresses(addresses);
          // Pre-fill with default address if exists
          const def = addresses.find((a) => a.isDefault) || addresses[0];
          if (def) {
            setSelectedAddressId(def._id);
            setBuyerDetails({
              name: def.name || auth.currentUser.displayName || "",
              email: auth.currentUser.email || "",
              phone: def.phone || "",
              address: { ...def.address },
            });
            setShowNewAddressForm(false);
          }
        }
      } catch (e) {
        console.warn("Unable to load addresses", e);
      }
    })();
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
    
    const shippingCharges = 50; // Fixed shipping charge
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

  const handleProceedToPayment = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const user = auth.currentUser;
      const token = await user.getIdToken();

      // If user entered a new address and chose to save it, persist to profile first
      if ((!selectedAddressId || showNewAddressForm) && saveThisAddress) {
        try {
          const saveResp = await fetch("http://localhost:5000/api/addresses", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              label: "Home",
              name: buyerDetails.name,
              phone: buyerDetails.phone,
              address: buyerDetails.address,
              isDefault: !!setAsDefault,
            }),
          });
          if (saveResp.ok) {
            const data = await saveResp.json().catch(() => ({}));
            if (Array.isArray(data.addresses)) {
              setSavedAddresses(data.addresses);
              const def = data.addresses.find((a) => a.isDefault) || data.addresses[data.addresses.length - 1];
              if (def) {
                setSelectedAddressId(def._id);
              }
            }
          } else {
            const er = await saveResp.json().catch(() => ({}));
            console.warn("Address not saved", er);
          }
        } catch (e) {
          console.warn("Skipping save address due to error", e);
        }
      }

      // Navigate to payment selection page with cart and buyer details
      navigate("/payment-selection", {
        state: {
          cartItems,
          buyerDetails
        }
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error(`Error: ${error.message}`);
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
    <div style={{ 
      background: "linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)", 
      minHeight: "100vh",
      paddingTop: "20px",
      paddingBottom: "40px"
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>
        {/* Header */}
        <div style={{ 
          textAlign: "center", 
          marginBottom: "30px",
          paddingBottom: "20px",
          borderBottom: "2px solid #e0e0e0"
        }}>
          <h1 style={{ 
            color: "#5c4033", 
            fontSize: "32px", 
            fontWeight: "700",
            marginBottom: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px"
          }}>
            🛒 Secure Checkout
          </h1>
          <p style={{ color: "#666", fontSize: "14px" }}>Complete your order in just a few steps</p>
        </div>
      
      {/* Deliver to header + change */}
      <div style={{ 
        background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)", 
        padding: "20px", 
        borderRadius: "16px", 
        border: "2px solid #e3e8ef",
        marginBottom: "20px", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
      }}>
        <div style={{ fontSize: "14px" }}>
          <div style={{ 
            fontSize: "12px", 
            color: "#888", 
            textTransform: "uppercase", 
            letterSpacing: "0.5px",
            marginBottom: "4px"
          }}>
            📍 Delivery Address
          </div>
          <div style={{ fontWeight: "700", fontSize: "16px", marginBottom: "4px" }}>
            {buyerDetails.name || auth.currentUser?.displayName || auth.currentUser?.providerData?.[0]?.displayName || auth.currentUser?.email}
          </div>
          <div style={{ color: "#555", lineHeight: "1.5" }}>
            {buyerDetails.address.street ? (
              <>
                {buyerDetails.address.street}{buyerDetails.address.landmark ? `, Near ${buyerDetails.address.landmark}` : ""}, {buyerDetails.address.city}, {buyerDetails.address.state} - {buyerDetails.address.pincode}
              </>
            ) : (
              <span style={{ color: "#999", fontStyle: "italic" }}>No address selected</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowNewAddressForm(prev => !prev)}
          style={{ 
            border: "2px solid #5c4033", 
            color: "#5c4033", 
            background: "white", 
            padding: "10px 20px", 
            borderRadius: "8px", 
            cursor: "pointer", 
            fontWeight: "700",
            fontSize: "14px",
            transition: "all 0.3s ease",
            whiteSpace: "nowrap"
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "#5c4033";
            e.target.style.color = "white";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "white";
            e.target.style.color = "#5c4033";
          }}
        >
          {showNewAddressForm ? "📋 Use Saved" : "✏️ Change"}
        </button>
      </div>

      {/* Saved addresses selector */}
      {savedAddresses.length > 0 && !showNewAddressForm && (
        <div style={{ background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #eee", marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Select saved address</div>
          <div style={{ display: "grid", gap: 8 }}>
            {savedAddresses.map(addr => (
              <label key={addr._id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
                <input
                  type="radio"
                  name="address"
                  checked={selectedAddressId === addr._id}
                  onChange={() => {
                    setSelectedAddressId(addr._id);
                    setBuyerDetails({
                      name: addr.name || auth.currentUser.displayName || "",
                      email: auth.currentUser.email || "",
                      phone: addr.phone || "",
                      address: { ...addr.address },
                    });
                  }}
                  style={{ marginTop: 4 }}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>{addr.name}</div>
                  <div style={{ fontSize: 13, color: "#555" }}>{addr.address.street}{addr.address.landmark ? `, Near ${addr.address.landmark}` : ""}</div>
                  <div style={{ fontSize: 13, color: "#555" }}>{addr.address.city}, {addr.address.state} - {addr.address.pincode}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Phone: {addr.phone}</div>
                  {addr.isDefault && (
                    <span style={{ display: "inline-block", marginTop: 6, fontSize: 12, background: "#eef7ee", color: "#2e7d32", padding: "2px 8px", borderRadius: 999 }}>Default</span>
                  )}
                </div>
              </label>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => { setShowNewAddressForm(true); setSelectedAddressId(null); }}
              style={{ border: "1px dashed #5c4033", color: "#5c4033", background: "transparent", padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
            >
              Use another address
            </button>
          </div>
        </div>
      )}

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

            {/* Saved Addresses selector */}
            {!!savedAddresses.length && (
              <div style={{ marginBottom: 16, border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Saved Addresses</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {savedAddresses.map((a) => (
                    <label key={a._id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 8, border: selectedAddressId === a._id ? "2px solid #5c4033" : "1px solid #ddd", borderRadius: 8 }}>
                      <input
                        type="radio"
                        name="selectedAddress"
                        checked={selectedAddressId === a._id}
                        onChange={() => {
                          setSelectedAddressId(a._id);
                          setShowNewAddressForm(false);
                          setBuyerDetails({
                            name: a.name || auth.currentUser.displayName || "",
                            email: auth.currentUser.email || "",
                            phone: a.phone || "",
                            address: { ...a.address },
                          });
                        }}
                        style={{ marginTop: 4 }}
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {a.label} {a.isDefault && <span style={{ color: "#28a745", fontSize: 12, marginLeft: 6 }}>(Default)</span>}
                        </div>
                        <div style={{ fontSize: 14, color: "#555" }}>{a.name} {a.phone && `· ${a.phone}`}</div>
                        <div style={{ fontSize: 14, color: "#555" }}>
                          {a.address?.street}, {a.address?.city}, {a.address?.state} {a.address?.pincode}
                          {a.address?.landmark ? `, Landmark: ${a.address.landmark}` : ""}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <div style={{ marginTop: 10 }}>
                  <button className="bk-btn bk-btn--pill bk-btn--ghost" onClick={() => { setShowNewAddressForm(true); setSelectedAddressId(null); }}>
                    {showNewAddressForm ? "Using new address" : "Use another address"}
                  </button>
                </div>
              </div>
            )}

            {/* New Address Form (shown when none saved or user toggles) */}
            {(!savedAddresses.length || showNewAddressForm || !selectedAddressId) && (
              <>
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

                {/* Save options */}
                <div style={{ display: "flex", gap: 20, alignItems: "center", marginTop: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={saveThisAddress} onChange={(e) => setSaveThisAddress(e.target.checked)} />
                    Save this address to my profile
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={setAsDefault} onChange={(e) => setSetAsDefault(e.target.checked)} />
                    Set as default
                  </label>
                </div>
              </>
            )}
          </div>

        </div>

        {/* Right Column - Order Summary */}
        <div>
          <div style={{ 
            background: "linear-gradient(135deg, #ffffff 0%, #fafafa 100%)", 
            padding: "28px", 
            borderRadius: "16px", 
            position: "sticky", 
            top: "20px",
            border: "2px solid #e8e8e8",
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)"
          }}>
            <h2 style={{ 
              marginBottom: "24px", 
              color: "#5c4033", 
              fontSize: "24px", 
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              borderBottom: "2px solid #e8e8e8",
              paddingBottom: "16px"
            }}>
              📋 Order Summary
            </h2>
            
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
            <div style={{ 
              marginBottom: "24px",
              background: "#f9f9f9",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid #e8e8e8"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "15px" }}>
                <span style={{ color: "#555" }}>Subtotal:</span>
                <span style={{ fontWeight: "600" }}>₹{totalAmount}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", fontSize: "15px" }}>
                <span style={{ color: "#555" }}>Shipping:</span>
                <span style={{ fontWeight: "600", color: "#333" }}>
                  ₹{shippingCharges}
                </span>
              </div>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                fontSize: "20px", 
                fontWeight: "700", 
                color: "#5c4033", 
                paddingTop: "16px", 
                borderTop: "2px dashed #d0d0d0",
                marginTop: "8px"
              }}>
                <span>Total Amount:</span>
                <span>₹{finalAmount}</span>
              </div>
            </div>
            
            {/* Place Order Button */}
            <button
              onClick={handleProceedToPayment}
              disabled={loading}
              style={{
                width: "100%",
                padding: "18px",
                background: loading ? "#ccc" : "linear-gradient(135deg, #5c4033 0%, #7d5a47 100%)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontSize: "18px",
                fontWeight: "700",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                boxShadow: loading ? "none" : "0 4px 15px rgba(92, 64, 51, 0.3)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px"
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 6px 20px rgba(92, 64, 51, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 4px 15px rgba(92, 64, 51, 0.3)";
                }
              }}
            >
              {loading ? (
                <>
                  <span style={{ 
                    display: "inline-block", 
                    width: "16px", 
                    height: "16px", 
                    border: "2px solid white", 
                    borderTopColor: "transparent", 
                    borderRadius: "50%", 
                    animation: "spin 1s linear infinite" 
                  }}></span>
                  Processing...
                </>
              ) : (
                <>
                  <span>🔒</span>
                  Place Order
                </>
              )}
            </button>
            
            {/* Security badge */}
            <div style={{ 
              textAlign: "center", 
              marginTop: "16px", 
              fontSize: "12px", 
              color: "#666",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px"
            }}>
              <span style={{ color: "#28a745", fontSize: "14px" }}>✓</span>
              100% Secure Payment
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
