const mongoose = require("./server/node_modules/mongoose");
require("./server/node_modules/dotenv").config({ path: './server/.env' });

const Order = require("./server/models/Order");

async function checkOrderOTP() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const order = await Order.findOne({ orderNumber: 'ORD528653119' });
    
    if (!order) {
      console.log("❌ Order not found!");
      return;
    }
    
    console.log("📦 Order Found:");
    console.log("   Order Number:", order.orderNumber);
    console.log("   Status:", order.orderStatus);
    console.log("   Customer:", order.buyerDetails.name);
    console.log("   Email:", order.buyerDetails.email);
    console.log("\n🔐 Delivery OTP:");
    if (order.deliveryOTP) {
      console.log("   Code:", order.deliveryOTP.code);
      console.log("   Generated:", order.deliveryOTP.generatedAt);
      console.log("   Expires:", order.deliveryOTP.expiresAt);
      console.log("   Is Used:", order.deliveryOTP.isUsed);
      console.log("   Verified:", order.deliveryOTP.verifiedAt);
    } else {
      console.log("   ❌ No delivery OTP found!");
    }
    
    console.log("\n📍 Hub Tracking:");
    console.log("   Seller Hub:", order.hubTracking?.sellerHubName);
    console.log("   Customer Hub:", order.hubTracking?.customerHubName);
    console.log("   Current Location:", order.hubTracking?.currentLocation);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
  }
}

checkOrderOTP();
