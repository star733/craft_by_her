const mongoose = require("./server/node_modules/mongoose");
require("./server/node_modules/dotenv").config({ path: './server/.env' });

const Order = require("./server/models/Order");

async function generateOTPForOrder() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const order = await Order.findOne({ orderNumber: 'ORD528653119' });
    
    if (!order) {
      console.log("❌ Order not found!");
      return;
    }
    
    console.log("📦 Generating OTP for order:", order.orderNumber);
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    order.deliveryOTP = {
      code: otp,
      generatedAt: new Date(),
      expiresAt: otpExpiry,
      isUsed: false
    };
    
    await order.save();
    
    console.log("\n✅ OTP Generated Successfully!");
    console.log("   OTP Code:", otp);
    console.log("   Expires At:", otpExpiry);
    console.log("\n📧 Use this OTP to verify in the Hub Manager Dashboard!");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
  }
}

generateOTPForOrder();
