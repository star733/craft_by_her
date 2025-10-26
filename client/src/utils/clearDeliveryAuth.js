// Utility to clear delivery authentication data
export const clearDeliveryAuth = () => {
  localStorage.removeItem("deliveryToken");
  localStorage.removeItem("deliveryAgent");
  console.log("Delivery authentication data cleared");
};

// Call this in browser console: clearDeliveryAuth()
// Or paste this directly in browser console:
/*
localStorage.removeItem("deliveryToken");
localStorage.removeItem("deliveryAgent");
console.log("Delivery auth data cleared - please login again");
*/




























