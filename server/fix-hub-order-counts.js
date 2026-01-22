/**
 * Fix Hub Order Counts
 * 
 * This script recalculates and updates the order counts for all hubs
 * based on actual orders in the system
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const Hub = require("./models/Hub");
const Order = require("./models/Order");

async function fixHubOrderCounts() {
  try {
    console.log("🔧 Starting hub order count fix...\n");

    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/foodily-auth-app"
    );
    console.log("✅ Connected to MongoDB\n");

    // Get all hubs
    const hubs = await Hub.find({});
    console.log(`📋 Found ${hubs.length} hubs to process\n`);

    for (const hub of hubs) {
      console.log(`\n🏢 Processing: ${hub.name} (${hub.district})`);
      
      // Count orders at this hub as seller hub
      const ordersAtSellerHub = await Order.countDocuments({
        'hubTracking.sellerHubId': hub.hubId,
        orderStatus: { $in: ['at_seller_hub', 'awaiting_admin_approval'] }
      });

      // Count orders at this hub as customer hub
      const ordersAtCustomerHub = await Order.countDocuments({
        'hubTracking.customerHubId': hub.hubId,
        orderStatus: { $in: ['shipped', 'out_for_delivery', 'at_customer_hub', 'ready_for_pickup'] }
      });

      // Count orders ready for pickup
      const ordersReadyForPickup = await Order.countDocuments({
        'hubTracking.customerHubId': hub.hubId,
        'hubTracking.readyForPickup': true,
        orderStatus: { $in: ['out_for_delivery', 'ready_for_pickup'] }
      });

      // Total current orders at this hub
      const totalCurrentOrders = ordersAtSellerHub + ordersAtCustomerHub;

      console.log(`   Orders at seller hub: ${ordersAtSellerHub}`);
      console.log(`   Orders at customer hub: ${ordersAtCustomerHub}`);
      console.log(`   Orders ready for pickup: ${ordersReadyForPickup}`);
      console.log(`   Total current orders: ${totalCurrentOrders}`);

      // Update hub stats
      hub.capacity.currentOrders = totalCurrentOrders;
      hub.stats.ordersReadyForPickup = ordersReadyForPickup;
      
      // Save with validation bypass for phone numbers
      await hub.save({ validateModifiedOnly: true });
      console.log(`   ✅ Updated ${hub.name}`);
    }

    console.log("\n\n📊 Summary of Hub Order Counts:");
    console.log("─────────────────────────────────────────────────────────");
    
    const updatedHubs = await Hub.find({}).sort({ 'capacity.currentOrders': -1 });
    
    for (const hub of updatedHubs) {
      const ordersText = hub.capacity.currentOrders > 0 
        ? `\x1b[32m${hub.capacity.currentOrders} orders\x1b[0m` 
        : `${hub.capacity.currentOrders} orders`;
      
      console.log(`${hub.name.padEnd(30)} │ ${ordersText.padEnd(20)} │ Ready: ${hub.stats.ordersReadyForPickup}`);
    }

    console.log("─────────────────────────────────────────────────────────");
    console.log("\n✅ Hub order counts fixed successfully!");

    await mongoose.connection.close();
    console.log("👋 Disconnected from MongoDB");

  } catch (error) {
    console.error("❌ Error fixing hub counts:", error);
    process.exit(1);
  }
}

// Run the fix
fixHubOrderCounts();
