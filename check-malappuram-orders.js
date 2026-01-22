const mongoose = require("./server/node_modules/mongoose");
require("./server/node_modules/dotenv").config({ path: './server/.env' });

const Order = require("./server/models/Order");
const Hub = require("./server/models/Hub");

async function checkMalappuramOrders() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find Malappuram hub
    const malappuramHub = await Hub.findOne({ 
      district: { $regex: /malappuram/i } 
    });
    
    if (!malappuramHub) {
      console.log("❌ Malappuram hub not found");
      return;
    }
    
    console.log("📍 Malappuram Hub:", {
      hubId: malappuramHub.hubId,
      name: malappuramHub.name,
      district: malappuramHub.district
    });
    console.log("\n" + "=".repeat(60) + "\n");

    // Check orders where Malappuram is the customer hub
    const ordersToMalappuram = await Order.find({
      'hubTracking.customerHubId': malappuramHub.hubId
    }).select('orderId orderStatus hubTracking createdAt').lean();
    
    console.log(`📦 Orders with Malappuram as CUSTOMER HUB: ${ordersToMalappuram.length}`);
    ordersToMalappuram.forEach(order => {
      console.log(`  - Order ${order.orderId}:`);
      console.log(`    Status: ${order.orderStatus}`);
      console.log(`    Seller Hub: ${order.hubTracking?.sellerHubId} (${order.hubTracking?.sellerHubName})`);
      console.log(`    Customer Hub: ${order.hubTracking?.customerHubId} (${order.hubTracking?.customerHubName})`);
      console.log(`    Current Location: ${order.hubTracking?.currentLocation}`);
      console.log("");
    });

    // Check what statuses we're looking for
    const dispatchedStatuses = ['shipped', 'out_for_delivery', 'ready_for_pickup'];
    const dispatchedToMalappuram = await Order.find({
      'hubTracking.customerHubId': malappuramHub.hubId,
      orderStatus: { $in: dispatchedStatuses }
    }).select('orderId orderStatus').lean();
    
    console.log("\n" + "=".repeat(60) + "\n");
    console.log(`📊 Orders DISPATCHED to Malappuram (statuses: ${dispatchedStatuses.join(', ')}): ${dispatchedToMalappuram.length}`);
    dispatchedToMalappuram.forEach(order => {
      console.log(`  - ${order.orderId}: ${order.orderStatus}`);
    });

    // Check orders at seller hub
    const ordersAtMalappuramSeller = await Order.find({
      'hubTracking.sellerHubId': malappuramHub.hubId,
      orderStatus: { $in: ['at_seller_hub', 'awaiting_admin_approval'] }
    }).select('orderId orderStatus').lean();
    
    console.log("\n" + "=".repeat(60) + "\n");
    console.log(`📊 Orders AT Malappuram as SELLER HUB: ${ordersAtMalappuramSeller.length}`);
    ordersAtMalappuramSeller.forEach(order => {
      console.log(`  - ${order.orderId}: ${order.orderStatus}`);
    });

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
  }
}

checkMalappuramOrders();
