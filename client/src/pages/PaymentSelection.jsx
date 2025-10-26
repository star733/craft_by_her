import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function PaymentSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [loading, setLoading] = useState(false);

  // Get order data from location state (now includes deliveryPincode, not buyerDetails)
  const { cartItems, deliveryPincode, deliveryCity } = location.state || {};

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

  // Buyer details state (to be filled in this page)
  const [buyerDetails, setBuyerDetails] = useState({
    name: "",
    email: "",
    phone: "",
    address: {
      street: "",
      city: deliveryCity || "",
      state: "Kerala",
      pincode: deliveryPincode || "",
      landmark: "",
    },
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [addressFormCompleted, setAddressFormCompleted] = useState(false);
  const [saveThisAddress, setSaveThisAddress] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // Fetch saved addresses on mount
  useEffect(() => {
    const fetchSavedAddresses = async () => {
      try {
        console.log('🏠 [PaymentSelection] Fetching saved addresses...');
        const user = auth.currentUser;
        if (!user) {
          console.log('❌ [PaymentSelection] No user logged in');
          return;
        }

        console.log('✅ [PaymentSelection] User:', user.email);

        // First, sync user to ensure they exist in MongoDB
        const token = await user.getIdToken();
        console.log('🔄 [PaymentSelection] Syncing user to MongoDB...');
        try {
          const syncResp = await fetch("http://localhost:5000/api/auth/sync", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
            }),
          });
          console.log('✅ [PaymentSelection] User sync response:', syncResp.status);
        } catch (syncError) {
          console.warn('⚠️ [PaymentSelection] User sync failed:', syncError);
        }

        // Now fetch addresses
        console.log('📍 [PaymentSelection] Fetching addresses from API...');
        const response = await fetch("http://localhost:5000/api/addresses", {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log('📍 [PaymentSelection] Address API response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('📍 [PaymentSelection] Address API response data:', data);
          const addresses = Array.isArray(data.addresses) ? data.addresses : [];
          console.log('📍 [PaymentSelection] Parsed addresses count:', addresses.length);
          setSavedAddresses(addresses);
          
          // Auto-select default address if exists
          const defaultAddr = addresses.find(a => a.isDefault);
          if (defaultAddr && !showNewAddressForm) {
            console.log('⭐ [PaymentSelection] Auto-selecting default address:', defaultAddr.label);
            selectSavedAddress(defaultAddr);
          } else {
            console.log('ℹ️ [PaymentSelection] No default address found');
          }
        } else {
          const errorText = await response.text();
          console.error('❌ [PaymentSelection] Address fetch failed:', response.status, errorText);
        }
      } catch (error) {
        console.error("❌ [PaymentSelection] Failed to load addresses:", error);
      } finally {
        setLoadingAddresses(false);
        console.log('✅ [PaymentSelection] Address loading complete');
      }
    };

    fetchSavedAddresses();
  }, []);

  useEffect(() => {
    // Redirect if no cart items
    if (!cartItems) {
      toast.error("No order data found. Please start from checkout.");
      navigate("/checkout");
      return;
    }

    // Initialize buyer details from auth
    const user = auth.currentUser;
    if (user) {
      setBuyerDetails(prev => ({
        ...prev,
        name: cleanDisplayName(user.displayName) || "",
        email: user.email || "",
      }));
    }
  }, [cartItems, navigate]);

  const calculateTotals = () => {
    const totalAmount = cartItems?.reduce((sum, item) => {
      return sum + (item.variant.price * item.quantity);
    }, 0) || 0;
    
    const shippingCharges = 50; // Fixed shipping charge
    const finalAmount = totalAmount + shippingCharges;
    
    return { totalAmount, shippingCharges, finalAmount };
  };

  const selectSavedAddress = (address) => {
    setSelectedAddressId(address._id);
    setShowNewAddressForm(false);
    setBuyerDetails({
      name: address.name || cleanDisplayName(auth.currentUser.displayName) || "",
      email: auth.currentUser.email || "",
      phone: address.phone || "",
      address: {
        street: address.address.street || "",
        city: address.address.city || "",
        state: address.address.state || "",
        pincode: address.address.pincode || deliveryPincode || "",
        landmark: address.address.landmark || "",
      },
    });
    toast.success(`Selected: ${address.label}`);
  };

  const handleNewAddressClick = () => {
    setSelectedAddressId(null);
    setShowNewAddressForm(true);
    setBuyerDetails({
      name: cleanDisplayName(auth.currentUser.displayName) || "",
      email: auth.currentUser.email || "",
      phone: "",
      address: {
        street: "",
        city: deliveryCity || "",
        state: "Kerala",
        pincode: deliveryPincode || "",
        landmark: "",
      },
    });
  };

  const handleInputChange = (field, value) => {
    // Clear validation error for this field
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
          [child]: value
        }
      }));
    } else {
      setBuyerDetails(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const validateAddressForm = () => {
    const errors = {};
    let isValid = true;

    // Name validation
    if (!buyerDetails.name.trim()) {
      errors.name = "Name is required";
      isValid = false;
    } else if (buyerDetails.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
      isValid = false;
    }

    // Phone validation
    if (!buyerDetails.phone.trim()) {
      errors.phone = "Phone number is required";
      isValid = false;
    } else {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(buyerDetails.phone.trim())) {
        errors.phone = "Enter valid 10-digit phone number starting with 6-9";
        isValid = false;
      }
    }

    // Address validation
    if (!buyerDetails.address.street.trim()) {
      errors["address.street"] = "Street address is required";
      isValid = false;
    } else if (buyerDetails.address.street.trim().length < 10) {
      errors["address.street"] = "Please provide complete address (min 10 characters)";
      isValid = false;
    }

    if (!buyerDetails.address.city.trim()) {
      errors["address.city"] = "City is required";
      isValid = false;
    }

    if (!buyerDetails.address.state.trim()) {
      errors["address.state"] = "State is required";
      isValid = false;
    }

    setValidationErrors(errors);

    if (!isValid) {
      const errorFields = Object.keys(errors).map(key => {
        if (key.includes('.')) {
          return key.split('.')[1].charAt(0).toUpperCase() + key.split('.')[1].slice(1);
        }
        return key.charAt(0).toUpperCase() + key.slice(1);
      }).join(', ');
      
      toast.error(`Please fill required fields: ${errorFields}`);
    }

    return isValid;
  };

  const handleContinueToPayment = () => {
    if (validateAddressForm()) {
      setAddressFormCompleted(true);
      toast.success("Address saved! Now select payment method");
      // Scroll to payment section
      setTimeout(() => {
        const paymentSection = document.getElementById('payment-section');
        if (paymentSection) {
          paymentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  const handlePlaceOrder = async () => {
    if (!auth.currentUser) {
      toast.error("Please login to continue");
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      const user = auth.currentUser;
      const token = await user.getIdToken();

      // Sync user to MongoDB first (ensure user exists in database)
      try {
        await fetch("http://localhost:5000/api/auth/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
          }),
        });
      } catch (syncError) {
        console.warn("⚠️ User sync warning:", syncError);
        // Continue even if sync fails
      }

      // Save address if user wants to save it
      console.log("💾 [Save Check] saveThisAddress:", saveThisAddress);
      console.log("💾 [Save Check] setAsDefault:", setAsDefault);
      console.log("💾 [Save Check] buyerDetails:", buyerDetails);
      
      if (saveThisAddress) {
        try {
          console.log("💾 [Save] Attempting to save address...");
          const addressData = {
            label: "Home",
            name: buyerDetails.name,
            phone: buyerDetails.phone,
            address: buyerDetails.address,
            isDefault: setAsDefault,
          };
          console.log("💾 [Save] Address data to save:", addressData);
          
          const saveResp = await fetch("http://localhost:5000/api/addresses", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json", 
              Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify(addressData),
          });
          
          console.log("💾 [Save] API response status:", saveResp.status);
          
          if (saveResp.ok) {
            const data = await saveResp.json();
            console.log("✅ [Save] Address saved successfully! Response:", data);
            toast.success("Address saved for future orders!");
            
            // Refresh saved addresses list
            if (Array.isArray(data.addresses)) {
              console.log("✅ [Save] Updated addresses count:", data.addresses.length);
              setSavedAddresses(data.addresses);
            }
          } else {
            const errorText = await saveResp.text();
            console.error("❌ [Save] Failed to save address:", saveResp.status, errorText);
            toast.warning("Failed to save address, but order will continue");
          }
        } catch (saveError) {
          console.error("❌ [Save] Error saving address:", saveError);
          toast.warning("Failed to save address, but order will continue");
          // Don't block order creation if address save fails
        }
      } else {
        console.log("ℹ️ [Save] Skipping address save (checkbox not checked)");
      }

      // Transform cartItems to match backend expectations
      const transformedItems = cartItems.map(item => {
        const pid = item?.productId?._id || item?.productId || item?._id || item?.id;
        return {
          productId: pid,
          title: item?.productId?.title || item?.title || "",
          image: item?.productId?.image || item?.image || "",
          variant: item?.variant,
          quantity: item?.quantity || 1
        };
      });

      const finalOrderData = {
        items: transformedItems,
        buyerDetails,
        paymentMethod,
        notes: "",
      };

      console.log("Creating order:", finalOrderData);

      const response = await fetch("http://localhost:5000/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(finalOrderData),
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
        // For COD, replace history so user can't go back to payment page
        navigate(`/order-confirmation/${result.order._id}`, { 
          state: { order: result.order },
          replace: true 
        });
      }
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error(`Failed to place order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!cartItems) {
    return null;
  }

  const { totalAmount, shippingCharges, finalAmount } = calculateTotals();

  return (
    <div style={{ 
      background: "linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)", 
      minHeight: "100vh",
      paddingTop: "20px",
      paddingBottom: "40px"
    }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 20px" }}>
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
            {!addressFormCompleted ? "📍 Delivery Address" : "💳 Choose Payment Method"}
          </h1>
          <p style={{ color: "#666", fontSize: "14px" }}>
            {!addressFormCompleted 
              ? "Enter your delivery details to continue" 
              : "Review your order and select payment option"}
          </p>
        </div>

        {/* STEP 1: Address Selection/Form (shown first) */}
        {!addressFormCompleted && (
          <div style={{
            background: "white",
            padding: "32px",
            borderRadius: "16px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            marginBottom: "24px"
          }}>
            <h2 style={{
              fontSize: "20px",
              fontWeight: "700",
              color: "#5c4033",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              📍 Delivery Details
            </h2>

            {/* Saved Addresses Section */}
            {!loadingAddresses && savedAddresses.length > 0 && !showNewAddressForm && (
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ 
                  fontSize: "16px", 
                  fontWeight: "600", 
                  color: "#333", 
                  marginBottom: "16px" 
                }}>
                  Select Saved Address:
                </h3>
                <div style={{ display: "grid", gap: "12px", marginBottom: "16px" }}>
                  {savedAddresses.map((address) => (
                    <div
                      key={address._id}
                      onClick={() => selectSavedAddress(address)}
                      style={{
                        padding: "16px",
                        border: selectedAddressId === address._id ? "2px solid #5c4033" : "1px solid #ddd",
                        borderRadius: "8px",
                        cursor: "pointer",
                        background: selectedAddressId === address._id ? "#f9f5f3" : "white",
                        transition: "all 0.2s",
                      }}
                    >
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "flex-start",
                        marginBottom: "8px"
                      }}>
                        <span style={{ 
                          fontWeight: "700", 
                          fontSize: "14px",
                          color: "#5c4033"
                        }}>
                          {address.label}
                        </span>
                        {address.isDefault && (
                          <span style={{
                            background: "#28a745",
                            color: "white",
                            fontSize: "11px",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontWeight: "600"
                          }}>
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "13px", color: "#666", lineHeight: "1.6" }}>
                        <div style={{ fontWeight: "600", color: "#333" }}>{address.name}</div>
                        <div>{address.address.street}</div>
                        {address.address.landmark && <div>Near {address.address.landmark}</div>}
                        <div>
                          {address.address.city}, {address.address.state} - {address.address.pincode}
                        </div>
                        <div style={{ marginTop: "4px" }}>📞 {address.phone}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleNewAddressClick}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "white",
                    color: "#5c4033",
                    border: "2px dashed #5c4033",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                >
                  ➕ Add New Address
                </button>
              </div>
            )}

            {/* Show Continue Button if address is selected */}
            {!showNewAddressForm && selectedAddressId && (
              <button
                onClick={handleContinueToPayment}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "linear-gradient(135deg, #5c4033 0%, #7d5a47 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "16px",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(92, 64, 51, 0.3)",
                }}
              >
                Continue to Payment →
              </button>
            )}

            {/* New Address Form (shown if no saved addresses or "Add New" clicked) */}
            {(showNewAddressForm || savedAddresses.length === 0) && (
              <div>
            
            {/* Back Button (only show if there are saved addresses) */}
            {showNewAddressForm && savedAddresses.length > 0 && (
              <button
                onClick={() => setShowNewAddressForm(false)}
                style={{
                  marginBottom: "20px",
                  padding: "8px 16px",
                  background: "white",
                  color: "#5c4033",
                  border: "1px solid #5c4033",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                ← Back to Saved Addresses
              </button>
            )}

            <h3 style={{ 
              fontSize: "16px", 
              fontWeight: "600", 
              color: "#333", 
              marginBottom: "16px" 
            }}>
              {savedAddresses.length === 0 ? "Enter Delivery Address:" : "New Delivery Address:"}
            </h3>

            {/* Name & Phone */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "600", color: "#333" }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={buyerDetails.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
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
                <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "600", color: "#333" }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={buyerDetails.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: validationErrors.phone ? "2px solid #dc3545" : "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                    backgroundColor: validationErrors.phone ? "#fff5f5" : "white",
                  }}
                  placeholder="10-digit mobile number"
                />
                {validationErrors.phone && (
                  <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>
                    {validationErrors.phone}
                  </div>
                )}
              </div>
            </div>

            {/* Street Address */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "600", color: "#333" }}>
                Street Address *
              </label>
              <textarea
                value={buyerDetails.address.street}
                onChange={(e) => handleInputChange("address.street", e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: validationErrors["address.street"] ? "2px solid #dc3545" : "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "14px",
                  minHeight: "70px",
                  resize: "vertical",
                  backgroundColor: validationErrors["address.street"] ? "#fff5f5" : "white",
                }}
                placeholder="House/Flat No., Building Name, Street"
              />
              {validationErrors["address.street"] && (
                <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>
                  {validationErrors["address.street"]}
                </div>
              )}
            </div>

            {/* City, State, Pincode */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "600", color: "#333" }}>
                  City *
                </label>
                <input
                  type="text"
                  value={buyerDetails.address.city}
                  onChange={(e) => handleInputChange("address.city", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: validationErrors["address.city"] ? "2px solid #dc3545" : "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                    backgroundColor: validationErrors["address.city"] ? "#fff5f5" : "white",
                  }}
                  placeholder="City"
                />
                {validationErrors["address.city"] && (
                  <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>
                    {validationErrors["address.city"]}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "600", color: "#333" }}>
                  State *
                </label>
                <input
                  type="text"
                  value={buyerDetails.address.state}
                  onChange={(e) => handleInputChange("address.state", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: validationErrors["address.state"] ? "2px solid #dc3545" : "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                    backgroundColor: validationErrors["address.state"] ? "#fff5f5" : "white",
                  }}
                  placeholder="State"
                />
                {validationErrors["address.state"] && (
                  <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>
                    {validationErrors["address.state"]}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "600", color: "#333" }}>
                  Pincode
                </label>
                <input
                  type="text"
                  value={buyerDetails.address.pincode}
                  onChange={(e) => handleInputChange("address.pincode", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                    backgroundColor: "#f0f0f0",
                    cursor: "not-allowed"
                  }}
                  disabled
                  placeholder="Pincode"
                />
              </div>
            </div>

            {/* Landmark (optional) */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "600", color: "#333" }}>
                Landmark (optional)
              </label>
              <input
                type="text"
                value={buyerDetails.address.landmark}
                onChange={(e) => handleInputChange("address.landmark", e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
                placeholder="Nearby landmark"
              />
            </div>

            {/* Save Address Options */}
            <div style={{ 
              marginBottom: "24px",
              padding: "16px",
              background: "#f8f9fa",
              borderRadius: "8px",
              border: "1px solid #e0e0e0"
            }}>
              <label style={{ 
                display: "flex", 
                alignItems: "center", 
                marginBottom: "12px",
                cursor: "pointer",
                fontSize: "14px"
              }}>
                <input
                  type="checkbox"
                  checked={saveThisAddress}
                  onChange={(e) => setSaveThisAddress(e.target.checked)}
                  style={{ 
                    width: "18px", 
                    height: "18px", 
                    marginRight: "10px",
                    cursor: "pointer"
                  }}
                />
                <span style={{ fontWeight: "500", color: "#333" }}>
                  💾 Save this address for future orders
                </span>
              </label>

              {saveThisAddress && (
                <label style={{ 
                  display: "flex", 
                  alignItems: "center",
                  marginLeft: "28px",
                  cursor: "pointer",
                  fontSize: "14px"
                }}>
                  <input
                    type="checkbox"
                    checked={setAsDefault}
                    onChange={(e) => setSetAsDefault(e.target.checked)}
                    style={{ 
                      width: "18px", 
                      height: "18px", 
                      marginRight: "10px",
                      cursor: "pointer"
                    }}
                  />
                  <span style={{ fontWeight: "500", color: "#333" }}>
                    ⭐ Set as default address
                  </span>
                </label>
              )}
            </div>

            {/* Continue Button */}
            <button
              onClick={handleContinueToPayment}
              style={{
                width: "100%",
                padding: "14px",
                background: "linear-gradient(135deg, #5c4033 0%, #7d5a47 100%)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(92, 64, 51, 0.3)",
              }}
            >
              Continue to Payment →
            </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Order Summary & Payment (shown after address form) */}
        {addressFormCompleted && (
        <div style={{ display: "grid", gap: "24px" }} id="payment-section">
          {/* Order Summary */}
          <div style={{ 
            background: "linear-gradient(135deg, #ffffff 0%, #fafafa 100%)", 
            padding: "28px", 
            borderRadius: "16px", 
            border: "2px solid #e8e8e8",
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)"
          }}>
            <h2 style={{ 
              marginBottom: "24px", 
              color: "#5c4033", 
              fontSize: "22px", 
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              borderBottom: "2px solid #e8e8e8",
              paddingBottom: "16px"
            }}>
              📦 Order Summary
            </h2>
          
          {/* Cart Items */}
          <div style={{ marginBottom: "20px" }}>
            {cartItems.map((item, index) => (
              <div key={index} style={{ 
                display: "flex", 
                gap: "16px", 
                marginBottom: "16px", 
                paddingBottom: "16px", 
                borderBottom: index < cartItems.length - 1 ? "1px solid #eee" : "none" 
              }}>
                <div style={{ width: "80px", height: "80px", background: "#f5f5f5", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {item.image || (item.productId && item.productId.image) ? (
                    <img
                      src={`http://localhost:5000/uploads/${item.image || (item.productId && item.productId.image)}`}
                      alt={item.title || (item.productId && item.productId.title) || "Product"}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: "12px", color: "#999" }}>No Image</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>
                    {item.title || (item.productId && item.productId.title) || "Product"}
                  </h4>
                  <div style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>
                    {item.variant?.weight}
                  </div>
                  <div style={{ fontSize: "14px", color: "#5c4033", fontWeight: "600" }}>
                    ₹{item.variant?.price} × {item.quantity} = ₹{(item.variant?.price || 0) * (item.quantity || 0)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Price Breakdown */}
          <div style={{ 
            background: "#f9f9f9",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid #e8e8e8",
            marginTop: "16px"
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
              fontSize: "22px", 
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
          </div>

          {/* Delivery Address */}
        <div style={{ 
          background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)", 
          padding: "24px", 
          borderRadius: "16px", 
          border: "2px solid #e3e8ef",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
        }}>
          <h2 style={{ 
            marginBottom: "16px", 
            color: "#5c4033",
            fontSize: "18px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            📍 Delivery Address
          </h2>
          <div style={{ 
            background: "#fff", 
            padding: "16px", 
            borderRadius: "8px",
            border: "1px solid #e8e8e8"
          }}>
            <p style={{ margin: "0 0 8px 0", fontWeight: "700", fontSize: "16px", color: "#333" }}>
              {buyerDetails.name}
            </p>
            <p style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#555", lineHeight: "1.6" }}>
              {buyerDetails.address.street}
              {buyerDetails.address.landmark && `, Near ${buyerDetails.address.landmark}`}
            </p>
            <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#555" }}>
              {buyerDetails.address.city}, {buyerDetails.address.state} - {buyerDetails.address.pincode}
            </p>
            <p style={{ 
              margin: "0", 
              fontSize: "14px", 
              color: "#666",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
              <span style={{ fontSize: "16px" }}>📞</span>
              {buyerDetails.phone}
            </p>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div style={{ 
          background: "linear-gradient(135deg, #ffffff 0%, #fafafa 100%)", 
          padding: "28px", 
          borderRadius: "16px", 
          border: "2px solid #e8e8e8",
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{ 
            marginBottom: "24px", 
            color: "#5c4033", 
            fontSize: "22px", 
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            borderBottom: "2px solid #e8e8e8",
            paddingBottom: "16px"
          }}>
            💳 Choose Payment Method
          </h2>
          
          <div style={{ display: "grid", gap: "16px" }}>
            {/* Online Payment Option */}
            <label 
              style={{ 
                display: "block",
                padding: "20px", 
                border: paymentMethod === "online" ? "3px solid #667eea" : "2px solid #ddd",
                borderRadius: "16px", 
                cursor: "pointer",
                background: paymentMethod === "online" ? "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)" : "white",
                transition: "all 0.3s ease",
                boxShadow: paymentMethod === "online" ? "0 4px 12px rgba(102, 126, 234, 0.2)" : "0 2px 6px rgba(0,0,0,0.05)"
              }}
              onMouseEnter={(e) => {
                if (paymentMethod !== "online") {
                  e.currentTarget.style.borderColor = "#667eea";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (paymentMethod !== "online") {
                  e.currentTarget.style.borderColor = "#ddd";
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="online"
                  checked={paymentMethod === "online"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ marginTop: "4px", width: "20px", height: "20px", cursor: "pointer" }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "10px", 
                    marginBottom: "8px" 
                  }}>
                    <span style={{ fontSize: "24px" }}>💳</span>
                    <div style={{ fontWeight: "700", fontSize: "18px", color: "#333" }}>Online Payment</div>
                  </div>
                  <div style={{ fontSize: "14px", color: "#666", marginBottom: "12px" }}>
                    Pay securely using UPI, Cards, Net Banking, Wallets & More
                  </div>
                  <div style={{ 
                    display: "flex", 
                    gap: "8px", 
                    flexWrap: "wrap", 
                    fontSize: "11px",
                    fontWeight: "600"
                  }}>
                    <span style={{ background: "#e8f4fd", color: "#1976d2", padding: "4px 10px", borderRadius: "12px" }}>UPI</span>
                    <span style={{ background: "#e8f4fd", color: "#1976d2", padding: "4px 10px", borderRadius: "12px" }}>Cards</span>
                    <span style={{ background: "#e8f4fd", color: "#1976d2", padding: "4px 10px", borderRadius: "12px" }}>Net Banking</span>
                    <span style={{ background: "#e8f4fd", color: "#1976d2", padding: "4px 10px", borderRadius: "12px" }}>Wallets</span>
                  </div>
                </div>
              </div>
            </label>
            
            {/* Cash on Delivery Option */}
            <label 
              style={{ 
                display: "block",
                padding: "20px", 
                border: paymentMethod === "cod" ? "3px solid #28a745" : "2px solid #ddd",
                borderRadius: "16px", 
                cursor: "pointer",
                background: paymentMethod === "cod" ? "linear-gradient(135deg, #28a74515 0%, #20c99715 100%)" : "white",
                transition: "all 0.3s ease",
                boxShadow: paymentMethod === "cod" ? "0 4px 12px rgba(40, 167, 69, 0.2)" : "0 2px 6px rgba(0,0,0,0.05)"
              }}
              onMouseEnter={(e) => {
                if (paymentMethod !== "cod") {
                  e.currentTarget.style.borderColor = "#28a745";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (paymentMethod !== "cod") {
                  e.currentTarget.style.borderColor = "#ddd";
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ marginTop: "4px", width: "20px", height: "20px", cursor: "pointer" }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "10px", 
                    marginBottom: "8px" 
                  }}>
                    <span style={{ fontSize: "24px" }}>💵</span>
                    <div style={{ fontWeight: "700", fontSize: "18px", color: "#333" }}>Cash on Delivery</div>
                  </div>
                  <div style={{ fontSize: "14px", color: "#666" }}>
                    Pay when your order is delivered at your doorstep
                  </div>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "16px", marginTop: "24px" }}>
          <button
            onClick={() => navigate("/checkout")}
            style={{
              flex: "0 0 auto",
              padding: "16px 32px",
              background: "white",
              color: "#6c757d",
              border: "2px solid #6c757d",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#6c757d";
              e.target.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "white";
              e.target.style.color = "#6c757d";
            }}
          >
            ← Back
          </button>
          
          <button
            onClick={handlePlaceOrder}
            disabled={loading}
            style={{
              flex: "1",
              padding: "18px 40px",
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
            ) : paymentMethod === "cod" ? (
              <>
                💵 Place Order (COD)
              </>
            ) : (
              <>
                💳 Proceed to Payment
              </>
            )}
          </button>
        </div>

        {/* Trust Badge */}
        <div style={{ 
          textAlign: "center", 
          marginTop: "24px",
          padding: "16px",
          background: "#f0f8ff",
          borderRadius: "12px",
          border: "1px solid #d0e8ff"
        }}>
          <div style={{ 
            fontSize: "14px", 
            color: "#555",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            flexWrap: "wrap"
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ color: "#28a745", fontSize: "16px" }}>✓</span>
              <span>Secure Checkout</span>
            </span>
            <span style={{ color: "#ddd" }}>|</span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ color: "#28a745", fontSize: "16px" }}>✓</span>
              <span>Easy Returns</span>
            </span>
            <span style={{ color: "#ddd" }}>|</span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ color: "#28a745", fontSize: "16px" }}>✓</span>
              <span>Fast Delivery</span>
            </span>
          </div>
        </div>
        </div>
        )}
      </div>
    </div>
  );
}

