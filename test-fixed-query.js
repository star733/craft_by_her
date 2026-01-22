const mongoose = require("./server/node_modules/mongoose");
require("./server/node_modules/dotenv").config({ path: './server/.env' });

const Order = require("./server/models/Order");
const Hub = require("./server/models/Hub");

async function testFixedQuery() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const malappuramHub = await Hub.findOne({ 
      district: { $regex: /malappuram/i } 
    }).lean();
    
    console.log("📍 Malappuram Hub:");
    console.log("  _id:", malappuramHub._id.toString());
    console.log("  hubId:", malappuramHub.hubId);
    console.log("");

    // Test the FIXED query (checking both hubId and _id)
    const dispatchedToCustomerHub = await Order.countDocuments({
      $or: [
        { 'hubTracking.customerHubId': malappuramHub.hubId },
        { 'hubTracking.customerHubId': malappuramHub._id.toString() }
      ],
      orderStatus: { $in: ['shipped', 'out_for_delivery', 'ready_for_pickup'] }
    });
    
    console.log("✅ FIXED QUERY RESULT:");
    console.log(`   Dispatched to Malappuram: ${dispatchedToCustomerHub}`);
    
    // Show the matching order
    const orders = await Order.find({
      $or: [
        { 'hubTracking.customerHubId': malappuramHub.hubId },
        { 'hubTracking.customerHubId': malappuramHub._id.toString() }
      ],
      orderStatus: { $in: ['shipped', 'out_for_delivery', 'ready_for_pickup'] }
    }).select('orderId orderStatus hubTracking').lean();
    
    console.log("\n📦 Matching Orders:");
    orders.forEach(order => {
      console.log(`  - Status: ${order.orderStatus}`);
      console.log(`    Customer Hub ID: ${order.hubTracking?.customerHubId}`);
      console.log(`    Customer Hub Name: ${order.hubTracking?.customerHubName}`);
    });

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
  }
}

testFixedQuery();
