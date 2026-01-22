import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";

// Helper function to clean display name (remove codes like "MCA2024-2026")
const cleanDisplayName = (rawName) => {
  if (!rawName) return '';
  
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
  
  // Delivery availability check - FIRST STEP
  const [pincodeInput, setPincodeInput] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState(null); // null, 'checking', 'available', 'unavailable'
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [deliveryDistance, setDeliveryDistance] = useState(null);
  const [deliveryCity, setDeliveryCity] = useState("");

  // If the buyer selects an existing saved address, we assume delivery was
  // already checked when that address was created.
  const usingSavedAddress =
    savedAddresses.length > 0 &&
    !showNewAddressForm &&
    !!selectedAddressId;

  const canProceed = usingSavedAddress || deliveryStatus === "available";

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

    // Load saved addresses immediately
    loadSavedAddresses();
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

  // Load saved addresses on initial load
  const loadSavedAddresses = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const resp = await fetch("http://localhost:5000/api/addresses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        const addresses = Array.isArray(data.addresses) ? data.addresses : [];
        setSavedAddresses(addresses);
      }
    } catch (e) {
      console.warn("Unable to load addresses", e);
    }
  };

  // Select a saved address and auto-check delivery
  const selectSavedAddress = async (address) => {
    setSelectedAddressId(address._id);
    setPincodeInput(address.address.pincode);
    setBuyerDetails({
      name: address.name || cleanDisplayName(auth.currentUser.displayName) || "",
      email: auth.currentUser.email || "",
      phone: address.phone || "",
      address: { ...address.address },
    });
    setShowNewAddressForm(false);

    // Auto-check delivery for this pincode
    await checkDeliveryForPincode(address.address.pincode);
  };

  // Check delivery for a specific pincode
  const checkDeliveryForPincode = async (pincode) => {
    if (!pincode || !/^[0-9]{6}$/.test(pincode)) {
      return;
    }

    setDeliveryStatus('checking');
    setDeliveryMessage("Checking hub availability...");

    try {
      const response = await fetch("http://localhost:5000/api/hubs/check-pincode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pincode }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response from delivery check:", text);
        setDeliveryStatus("error");
        setDeliveryMessage("Error checking hub availability. Please try again.");
        toast.error("Failed to check hub availability");
        return;
      }

      const data = await response.json();

      if (data.success && data.available) {
        setDeliveryStatus('available');
        setDeliveryMessage(data.message);
        setDeliveryDistance(null); // Not needed for hub system
        setDeliveryCity(data.district);
        toast.success(`✅ ${data.message}`);
      } else {
        setDeliveryStatus('unavailable');
        setDeliveryMessage(data.message);
        setDeliveryDistance(null);
        setDeliveryCity(data.district || '');
        toast.error(`❌ ${data.message}`);
      }
    } catch (error) {
      console.error("Hub check error:", error);
      setDeliveryStatus('error');
      setDeliveryMessage("Error checking hub availability. Please try again.");
      toast.error("Failed to check hub availability");
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

  // Check delivery availability - PRIMARY ACTION
  const checkDeliveryAvailability = async () => {
    const pincode = pincodeInput.trim();
    
    if (!pincode) {
      toast.error("Please enter your pincode");
      return;
    }
    
    if (!/^[0-9]{6}$/.test(pincode)) {
      toast.error("Please enter a valid 6-digit pincode");
      return;
    }

    // Use the common function
    await checkDeliveryForPincode(pincode);

    // If hub is available, set up new address form with this pincode
    if (deliveryStatus === 'available') {
      setBuyerDetails({
        name: cleanDisplayName(auth.currentUser.displayName) || "",
        email: auth.currentUser.email || "",
        phone: "",
        address: {
          street: "",
          city: deliveryCity || "",
          state: "Kerala",
          pincode: pincode,
          landmark: "",
        },
      });
      setShowNewAddressForm(true);
      setSelectedAddressId(null);
    }
  };

  const validateForm = () => {
    // This page is ONLY for hub availability check
    // Full form validation happens on the next page (payment-selection)
    
    // Only check if hub availability has been verified
    if (!canProceed) {
      toast.error('Please check hub availability for your pincode first');
      console.log('❌ Hub not available or not checked');
      return false;
    }

    console.log('✅ Hub availability confirmed');
    return true;
  };

  const handleProceedToPayment = async () => {
    console.log('🛒 Place Order button clicked');
    
    // Only validate delivery availability
    if (!validateForm()) {
      console.log('❌ Delivery check failed');
      return;
    }

    console.log('✅ Delivery check passed - proceeding to address & payment page');

    try {
      setLoading(true);
      const user = auth.currentUser;
      
      if (!user) {
        toast.error('Please log in to continue');
        console.log('❌ No user logged in');
        setLoading(false);
        return;
      }
      
      console.log('✅ User authenticated:', user.email);
      console.log('✅ Navigating to payment selection...');
      console.log('Cart items:', cartItems.length);
      
      // Navigate to payment selection page where user will enter full address
      navigate("/payment-selection", {
        state: {
          cartItems,
          deliveryPincode: pincodeInput, // Pass verified pincode
          deliveryCity: deliveryCity,     // Pass delivery city
        }
      });
      
      console.log('✅ Navigation initiated');
    } catch (error) {
      console.error("❌ Error during checkout:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const { totalAmount, shippingCharges, finalAmount } = calculateTotals();

  if (loading && cartItems.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <div style={{ fontSize: "48px", marginBottom: "20px" }}>⏳</div>
        <h2 style={{ color: "#5c4033" }}>Loading Cart...</h2>
        <p style={{ color: "#666" }}>Please wait while we fetch your cart items.</p>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <div style={{ fontSize: "48px", marginBottom: "20px" }}>🛒</div>
        <h2 style={{ color: "#5c4033" }}>Your Cart is Empty</h2>
        <p style={{ color: "#666" }}>Looks like you haven't added anything to your cart yet.</p>
        <button
          onClick={() => navigate("/products")}
          style={{
            backgroundColor: "#5c4033",
            color: "white",
            padding: "12px 25px",
            borderRadius: "8px",
            border: "none",
            fontSize: "16px",
            cursor: "pointer",
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
      paddingBottom: "40px",
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>
        {/* Header */}
        <div style={{
          textAlign: "center",
          marginBottom: "20px",
          paddingBottom: "15px",
          borderBottom: "2px solid #e0e0e0"
        }}>
          <h1 style={{
            color: "#5c4033",
            fontSize: "24px",
            fontWeight: "700",
            marginBottom: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px"
          }}>
            🛒 Secure Checkout
          </h1>
          <p style={{ color: "#666", fontSize: "13px" }}>Complete your order in just a few steps</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "30px" }}>
          {/* Left Column: Delivery Check & Address */}
          <div>
            {/* STEP 1: Delivery Availability Check with Saved Addresses */}
            <div style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              padding: "20px",
              marginBottom: "20px",
              border: deliveryStatus === 'available' ? "2px solid #28a745" : deliveryStatus === 'unavailable' ? "2px solid #dc3545" : "2px solid #e3e8ef"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "15px" }}>
                <div style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: deliveryStatus === 'available' ? "#28a745" : "#5c4033",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700",
                  fontSize: "14px"
                }}>1</div>
                <h2 style={{
                  fontSize: "18px",
                  color: "#5c4033",
                  margin: 0
                }}>
                  Hub Availability Check
                </h2>
              </div>

              {/* Show saved addresses if available */}
              {savedAddresses.length > 0 && !showNewAddressForm && (
                <>
                  <p style={{ fontSize: "13px", color: "#666", marginBottom: "15px" }}>
                    Select a saved address or check delivery for a new location
                  </p>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "15px" }}>
                    {savedAddresses.map((addr) => (
                      <label 
                        key={addr._id} 
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "12px",
                          padding: "15px",
                          border: selectedAddressId === addr._id ? "2px solid #5c4033" : "1px solid #e9ecef",
                          borderRadius: "10px",
                          backgroundColor: selectedAddressId === addr._id ? "#fff7e6" : "#fdfdfd",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => {
                          if (selectedAddressId !== addr._id) {
                            e.currentTarget.style.borderColor = "#5c4033";
                            e.currentTarget.style.boxShadow = "0 2px 8px rgba(92, 64, 51, 0.1)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedAddressId !== addr._id) {
                            e.currentTarget.style.borderColor = "#e9ecef";
                            e.currentTarget.style.boxShadow = "none";
                          }
                        }}
                      >
                        <input
                          type="radio"
                          name="savedAddress"
                          checked={selectedAddressId === addr._id}
                          onChange={() => selectSavedAddress(addr)}
                          style={{ marginTop: 4, cursor: "pointer" }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>
                            {addr.label || "Address"} 
                            {addr.isDefault && (
                              <span style={{ 
                                color: "#28a745", 
                                fontSize: 12, 
                                marginLeft: 6,
                                backgroundColor: "var(--accent-soft, #f3e7dc)",
                                padding: "2px 8px",
                                borderRadius: "4px"
                              }}>
                                Default
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: "#333", marginBottom: "2px" }}>
                            {addr.name} {addr.phone && `· ${addr.phone}`}
                          </div>
                          <div style={{ fontSize: 13, color: "#666" }}>
                            {addr.address?.street}, {addr.address?.city}, {addr.address?.state} - {addr.address?.pincode}
                            {addr.address?.landmark && ` (Near ${addr.address.landmark})`}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  
                  <div style={{ 
                    marginTop: "15px", 
                    paddingTop: "15px", 
                    borderTop: "1px dashed #e9ecef",
                    textAlign: "center"
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewAddressForm(true);
                        setSelectedAddressId(null);
                        setDeliveryStatus(null);
                        setPincodeInput("");
                        setBuyerDetails({
                          name: cleanDisplayName(auth.currentUser.displayName) || "",
                          email: auth.currentUser.email || "",
                          phone: "",
                          address: {
                            street: "",
                            city: "",
                            state: "Kerala",
                            pincode: "",
                            landmark: "",
                          },
                        });
                      }}
                      style={{
                        padding: "10px 20px",
                        border: "2px solid #5c4033",
                        background: "white",
                        color: "#5c4033",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "600",
                        transition: "all 0.2s"
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = "#5c4033";
                        e.target.style.color = "white";
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = "white";
                        e.target.style.color = "#5c4033";
                      }}
                    >
                      + Add New Address
                    </button>
                  </div>
                </>
              )}

              {/* Delivery check for new address */}
              {(savedAddresses.length === 0 || showNewAddressForm) && (
                <>
                  <p style={{ color: "#666", marginBottom: "15px", lineHeight: "1.5", fontSize: "13px" }}>
                    📍 We deliver across Kerala through our district hubs. Enter your pincode to check which hub serves your area.
                  </p>

              <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                <input
                  type="text"
                  value={pincodeInput}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setPincodeInput(value);
                    // Reset status when typing a new pincode
                    if (deliveryStatus !== null) {
                      setDeliveryStatus(null);
                      setDeliveryMessage("");
                    }
                  }}
                  maxLength="6"
                  placeholder="Enter your 6-digit pincode"
                  disabled={deliveryStatus === 'checking'}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    border: deliveryStatus === 'available' ? "2px solid #28a745" : 
                           deliveryStatus === 'unavailable' ? "2px solid #dc3545" : "2px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    backgroundColor: deliveryStatus === 'available' ? "#f0f9f4" : 
                                    deliveryStatus === 'unavailable' ? "#fff5f5" : "white",
                    cursor: (deliveryStatus === 'available' || deliveryStatus === 'unavailable') ? "not-allowed" : "text",
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && deliveryStatus !== 'available' && deliveryStatus !== 'unavailable') {
                      checkDeliveryAvailability();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={checkDeliveryAvailability}
                  disabled={deliveryStatus === 'checking' || deliveryStatus === 'available' || deliveryStatus === 'unavailable'}
                  style={{
                    padding: "10px 24px",
                    background: deliveryStatus === 'checking' ? "#ccc" : 
                               deliveryStatus === 'available' ? "#28a745" : 
                               deliveryStatus === 'unavailable' ? "#dc3545" :
                               "linear-gradient(135deg, #5c4033 0%, #8b6f47 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: (deliveryStatus === 'checking' || deliveryStatus === 'available' || deliveryStatus === 'unavailable') ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                    transition: "transform 0.2s",
                    minWidth: "100px"
                  }}
                  onMouseOver={(e) => {
                    if (deliveryStatus !== 'checking' && deliveryStatus !== 'available' && deliveryStatus !== 'unavailable') {
                      e.target.style.transform = "scale(1.05)";
                    }
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = "scale(1)";
                  }}
                >
                  {deliveryStatus === 'checking' ? '⏳ Checking...' : 
                   deliveryStatus === 'available' ? '✓ Checked' : 
                   deliveryStatus === 'unavailable' ? '✗ Checked' :
                   '📍 Check'}
                </button>
              </div>

              {/* Delivery Status Message */}
              {deliveryStatus && deliveryStatus !== 'checking' && (
                <div style={{
                  padding: "12px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  background: deliveryStatus === 'available' ? "var(--accent-soft, #f3e7dc)" : "#f8d7da",
                  border: `2px solid ${deliveryStatus === 'available' ? "#d4a574" : "#dc3545"}`,
                  color: deliveryStatus === 'available' ? "var(--brand, #8b5e34)" : "#721c24",
                }}>
                  <div style={{ fontWeight: "700", marginBottom: "4px", fontSize: "14px" }}>
                    {deliveryStatus === 'available' ? '✅ Delivery Available!' : '❌ Delivery Not Available'}
                  </div>
                  <div style={{ marginBottom: "4px" }}>{deliveryMessage}</div>
                  {deliveryDistance && (
                    <div style={{ marginTop: "4px", fontSize: "12px", opacity: 0.9 }}>
                      📏 Distance: <strong>{deliveryDistance} km</strong>
                    </div>
                  )}
                  {deliveryStatus === 'unavailable' && (
                    <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px dashed rgba(0,0,0,0.2)", fontSize: "12px" }}>
                      💡 <strong>Tip:</strong> Try a different pincode or contact us for special arrangements.
                    </div>
                  )}
                </div>
              )}

              {deliveryStatus === 'checking' && (
                <div style={{
                  padding: "12px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  background: "#fff3cd",
                  border: "2px solid #ffc107",
                  color: "#856404",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <span style={{
                    display: "inline-block",
                    width: "16px",
                    height: "16px",
                    border: "2px solid #856404",
                    borderBottomColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }}></span>
                  <span>Checking delivery availability...</span>
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                </div>
              )}
                </>
              )}
            </div>

            {/* STEP 2: Address Details - Only show if delivery is available and using new address */}
            {deliveryStatus === 'available' && showNewAddressForm && (
              <div style={{
                backgroundColor: "#fff",
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                padding: "20px",
                border: "2px solid #e3e8ef"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "15px" }}>
                  <div style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "#5c4033",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "700",
                    fontSize: "14px"
                  }}>2</div>
                  <h2 style={{
                    fontSize: "18px",
                    color: "#5c4033",
                    margin: 0
                  }}>
                    Delivery Address
                  </h2>
                </div>

                {/* New Address Form - Show for new addresses after delivery check */}
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
                          border: validationErrors["address.street"] ? "2px solid #dc3545" : "1px solid #ddd",
                          borderRadius: "8px",
                          fontSize: "14px",
                          minHeight: "80px",
                          resize: "vertical",
                          backgroundColor: validationErrors["address.street"] ? "#fff5f5" : "white",
                        }}
                        placeholder="House/Flat No., Building Name, Street Name"
                      />
                      {validationErrors["address.street"] && (
                        <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>
                          {validationErrors["address.street"]}
                        </div>
                      )}
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
                            border: validationErrors["address.city"] ? "2px solid #dc3545" : "1px solid #ddd",
                            borderRadius: "8px",
                            fontSize: "14px",
                            backgroundColor: validationErrors["address.city"] ? "#fff5f5" : "white",
                          }}
                          placeholder="Enter your city"
                        />
                        {validationErrors["address.city"] && (
                          <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>
                            {validationErrors["address.city"]}
                          </div>
                        )}
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
                            border: validationErrors["address.state"] ? "2px solid #dc3545" : "1px solid #ddd",
                            borderRadius: "8px",
                            fontSize: "14px",
                            backgroundColor: validationErrors["address.state"] ? "#fff5f5" : "white",
                          }}
                          placeholder="Enter your state"
                        />
                        {validationErrors["address.state"] && (
                          <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>
                            {validationErrors["address.state"]}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                      <div>
                        <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                          Pincode *
                        </label>
                        <input
                          type="text"
                          value={buyerDetails.address.pincode}
                          disabled
                          style={{
                            width: "100%",
                            padding: "12px",
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                            fontSize: "14px",
                            backgroundColor: "#f0f0f0",
                            color: "#666",
                            cursor: "not-allowed"
                          }}
                        />
                        <div style={{ color: "#28a745", fontSize: "12px", marginTop: "4px", fontWeight: "600" }}>
                          ✓ Delivery confirmed for this pincode
                        </div>
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
                    {savedAddresses.length > 0 && (
                      <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 16 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input type="checkbox" checked={saveThisAddress} onChange={(e) => setSaveThisAddress(e.target.checked)} />
                          <span style={{ fontSize: 14, color: "#555" }}>Save this address</span>
                        </label>
                        {saveThisAddress && (
                          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input type="checkbox" checked={setAsDefault} onChange={(e) => setSetAsDefault(e.target.checked)} />
                            <span style={{ fontSize: 14, color: "#555" }}>Set as default</span>
                          </label>
                        )}
                      </div>
                    )}

                    {/* Contact Information */}
                    <h3 style={{
                      fontSize: "16px",
                      color: "#5c4033",
                      marginBottom: "12px",
                      marginTop: "20px",
                      paddingTop: "20px",
                      borderTop: "1px solid #eee"
                    }}>
                      Contact Information
                    </h3>
                    
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
                            backgroundColor: validationErrors.email ? "#fff5f5" : "#f0f0f0",
                            cursor: "not-allowed"
                          }}
                          placeholder="Enter your email"
                          disabled
                        />
                        {validationErrors.email && (
                          <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>
                            {validationErrors.email}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: "24px" }}>
                      <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={buyerDetails.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        maxLength="10"
                        style={{
                          width: "100%",
                          padding: "12px",
                          border: validationErrors.phone ? "2px solid #dc3545" : "1px solid #ddd",
                          borderRadius: "8px",
                          fontSize: "14px",
                          backgroundColor: validationErrors.phone ? "#fff5f5" : "white",
                        }}
                        placeholder="Enter 10-digit phone number"
                      />
                      {validationErrors.phone && (
                        <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>
                          {validationErrors.phone}
                        </div>
                      )}
                    </div>
                  </>
              </div>
            )}
          </div>

          {/* Right Column: Order Summary */}
          <div style={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            padding: "20px",
            position: "sticky",
            top: "20px",
            alignSelf: "flex-start",
            border: "2px solid #e3e8ef"
          }}>
            <h2 style={{
              fontSize: "18px",
              color: "#5c4033",
              marginBottom: "20px",
              borderBottom: "1px solid #eee",
              paddingBottom: "12px"
            }}>
              Order Summary
            </h2>

            {/* Cart Items List */}
            <div style={{ marginBottom: "20px", maxHeight: "300px", overflowY: "auto" }}>
              {cartItems.map((item) => {
                // Handle two different item structures:
                // 1. From Cart: item.productId is an object with image/title
                // 2. From Buy Now: item has image/title directly, productId is just ID
                
                let imageUrl = null;
                let rawImagePath = null;
                
                // Try to get image from multiple sources
                if (typeof item.productId === 'object' && item.productId !== null) {
                  // Cart structure: productId is an object
                  rawImagePath = item.productId.image || item.productId.img;
                } else {
                  // Buy Now structure: image is at root level
                  rawImagePath = item.image || item.img;
                }
                
                // Build the full URL
                if (rawImagePath) {
                  if (rawImagePath.startsWith('/uploads/')) {
                    imageUrl = `http://localhost:5000${rawImagePath}`;
                  } else if (rawImagePath.startsWith('http')) {
                    imageUrl = rawImagePath;
                  } else {
                    imageUrl = `http://localhost:5000/uploads/${rawImagePath}`;
                  }
                }
                
                // Get product title
                const productTitle = (typeof item.productId === 'object' ? item.productId?.title : null) || item.title || "Product";
                
                const variantWeight = item.variant?.weight || "N/A";
                const variantPrice = item.variant?.price || 0;
                const itemQuantity = item.quantity || 1;
                
                return (
                  <div key={(typeof item.productId === 'object' ? item.productId?._id : item.productId) + (item.variant?.weight || '')} style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                    paddingBottom: "12px",
                    borderBottom: "1px dashed #eee"
                  }}>
                    <img
                      src={imageUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Crect fill='%23f0f0f0' width='50' height='50'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='20'%3E📦%3C/text%3E%3C/svg%3E"}
                      alt={productTitle}
                      style={{ 
                        width: "50px", 
                        height: "50px", 
                        borderRadius: "6px", 
                        marginRight: "12px", 
                        objectFit: "cover",
                        backgroundColor: "#f0f0f0"
                      }}
                      onError={(e) => { 
                        // If image fails, show package icon
                        e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Crect fill='%23f0f0f0' width='50' height='50'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='20'%3E📦%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#5c4033" }}>
                        {productTitle}
                      </div>
                      <div style={{ fontSize: "11px", color: "#666", marginBottom: "3px" }}>
                        {variantWeight}
                      </div>
                      <div style={{ fontSize: "13px", color: "#5c4033", fontWeight: "600" }}>
                        ₹{variantPrice} × {itemQuantity}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Price Breakdown */}
            <div style={{
              marginBottom: "20px",
              background: "#f9f9f9",
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid #e8e8e8"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "13px" }}>
                <span style={{ color: "#555" }}>Subtotal:</span>
                <span style={{ fontWeight: "600" }}>₹{totalAmount}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "13px" }}>
                <span style={{ color: "#555" }}>Shipping:</span>
                <span style={{ fontWeight: "600", color: "#333" }}>₹{shippingCharges}</span>
              </div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "16px",
                fontWeight: "700",
                color: "#5c4033",
                paddingTop: "12px",
                borderTop: "2px dashed #d0d0d0",
                marginTop: "6px"
              }}>
                <span>Total Amount:</span>
                <span>₹{finalAmount}</span>
              </div>
            </div>

            {/* Place Order Button */}
            <button
              onClick={handleProceedToPayment}
              disabled={loading || !canProceed}
              style={{
                width: "100%",
                padding: "14px",
                background: loading || !canProceed ? "#ccc" : "linear-gradient(135deg, #5c4033 0%, #7d5a47 100%)",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: "700",
                cursor: loading || !canProceed ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                boxShadow: loading || !canProceed ? "none" : "0 4px 15px rgba(92, 64, 51, 0.3)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
              onMouseEnter={(e) => {
                if (!loading && canProceed) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 6px 20px rgba(92, 64, 51, 0.4)";
                }
              }}
              onMouseOut={(e) => {
                if (!loading && canProceed) {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 4px 15px rgba(92, 64, 51, 0.3)";
                }
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    display: "inline-block",
                    width: "14px",
                    height: "14px",
                    border: "2px solid white",
                    borderBottomColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }}></span>
                  <span>Processing...</span>
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                </>
              ) : !canProceed ? (
                <>🔒 Check Delivery First</>
              ) : (
                <>
                  Place Order →
                </>
              )}
            </button>

            {!canProceed && (
              <p style={{ 
                fontSize: "12px", 
                color: "#999", 
                textAlign: "center", 
                marginTop: "12px",
                lineHeight: "1.5"
              }}>
                Please check delivery availability for your pincode before proceeding
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
