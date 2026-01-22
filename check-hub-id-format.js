const mongoose = require("./server/node_modules/mongoose");
require("./server/node_modules/dotenv").config({ path: './server/.env' });

const Order = require("./server/models/Order");
const Hub = require("./server/models/Hub");

async function fixHubIdIssue() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get Malappuram hub
    const malappuramHub = await Hub.findOne({ 
      district: { $regex: /malappuram/i } 
    });
    
    console.log("Malappuram Hub:");
    console.log("  _id (ObjectId):", malappuramHub._id.toString());
    console.log("  hubId (String):", malappuramHub.hubId);
    console.log("");

    // Check orders using _id
    const ordersWithObjectId = await Order.find({
      'hubTracking.customerHubId': malappuramHub._id.toString()
    }).select('orderId orderStatus hubTracking').lean();
    
    console.log(`📦 Orders with customerHubId = ObjectId (${malappuramHub._id}): ${ordersWithObjectId.length}`);
    
    // Check orders using hubId string
    const ordersWithHubId = await Order.find({
      'hubTracking.customerHubId': malappuramHub.hubId
    }).select('orderId orderStatus hubTracking').lean();
    
    console.log(`📦 Orders with customerHubId = hubId (${malappuramHub.hubId}): ${ordersWithHubId.length}`);
    console.log("");

    if (ordersWithObjectId.length > 0) {
      console.log("✅ Found orders using ObjectId!");
      ordersWithObjectId.forEach(order => {
        console.log(`  Order: ${order.orderId || 'N/A'}, Status: ${order.orderStatus}`);
      });
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
  }
}

fixHubIdIssue();
