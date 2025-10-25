const Razorpay = require("razorpay");
require("dotenv").config();

// Load environment configuration
require("./environment");

// Check if we have real Razorpay keys
const hasRealKeys = process.env.RAZORPAY_KEY_ID && 
                   process.env.RAZORPAY_KEY_SECRET && 
                   !process.env.RAZORPAY_KEY_ID.includes('your_key_id_here') &&
                   !process.env.RAZORPAY_KEY_SECRET.includes('your_razorpay_secret_key_here') &&
                   process.env.RAZORPAY_KEY_ID !== 'rzp_test_1234567890' &&
                   process.env.RAZORPAY_KEY_SECRET !== 'test_secret_key_1234567890' &&
                   !process.env.RAZORPAY_KEY_SECRET.includes('test_secret_key') &&
                   process.env.RAZORPAY_KEY_ID.startsWith('rzp_') &&
                   process.env.RAZORPAY_KEY_ID.length > 20; // Real Razorpay keys are longer

console.log("=== RAZORPAY CONFIG DEBUG ===");
console.log("RAZORPAY_KEY_ID:", process.env.RAZORPAY_KEY_ID);
console.log("RAZORPAY_KEY_SECRET:", process.env.RAZORPAY_KEY_SECRET ? "***SET***" : "NOT SET");
console.log("Has real keys:", hasRealKeys);

if (hasRealKeys) {
  // Use real Razorpay SDK
  console.log("✅ Using REAL Razorpay SDK with your keys");
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  module.exports = razorpay;
} else {
  // Mock Razorpay for testing
  console.log("⚠️  USING MOCK RAZORPAY - PAYMENT GATEWAY WILL NOT OPEN");
  console.log("🔑 Current Razorpay Key ID:", process.env.RAZORPAY_KEY_ID);
  console.log("📋 To fix this:");
  console.log("   1. Go to https://dashboard.razorpay.com/");
  console.log("   2. Get your real API keys from Settings > API Keys");
  console.log("   3. Replace the placeholder keys in your .env file");
  console.log("   4. Restart the server");
  console.log("⚠️  Your MongoDB connection is safe and will not be affected");
  
  const mockRazorpay = {
    orders: {
      create: async (orderData) => {
        console.log("Mock Razorpay order creation:", orderData);
        return {
          id: `order_${Date.now()}`,
          amount: orderData.amount,
          currency: orderData.currency,
          receipt: orderData.receipt,
          status: 'created',
          created_at: Math.floor(Date.now() / 1000)
        };
      }
    }
  };
  
  module.exports = mockRazorpay;
}
