const mongoose = require("./server/node_modules/mongoose");
require("./server/node_modules/dotenv").config({ path: './server/.env' });

const Order = require("./server/models/Order");

async function checkAllOrders() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get ALL orders with hub tracking info
    const allOrders = await Order.find({})
      .select('orderId orderStatus hubTracking createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    console.log(`📦 Latest ${allOrders.length} Orders in Database:\n`);
    
    allOrders.forEach(order => {
      console.log(`Order ID: ${order.orderId}`);
      console.log(`  Status: ${order.orderStatus}`);
      console.log(`  Seller Hub: ${order.hubTracking?.sellerHubId} (${order.hubTracking?.sellerHubName})`);
      console.log(`  Customer Hub: ${order.hubTracking?.customerHubId} (${order.hubTracking?.customerHubName})`);
      console.log(`  Current Location: ${order.hubTracking?.currentLocation}`);
      console.log(`  Created: ${order.createdAt}`);
      console.log("");
    });

    // Count orders by status
    const statusCounts = await Order.aggregate([
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log("\n📊 Orders by Status:");
    statusCounts.forEach(({ _id, count }) => {
      console.log(`  ${_id}: ${count}`);
    });

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
  }
}

checkAllOrders();
