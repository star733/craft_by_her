const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const Hub = require("./models/Hub");

dotenv.config({ path: path.join(__dirname, '.env') });

async function updateHubCapacity() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const hubs = await Hub.find();
    console.log(`📊 Found ${hubs.length} hubs`);

    for (const hub of hubs) {
      // Set random realistic capacity and current orders
      const maxOrders = Math.floor(Math.random() * 400) + 300; // 300-700
      const currentOrders = Math.floor(Math.random() * maxOrders * 0.8); // 0-80% of capacity
      
      hub.capacity = {
        maxOrders,
        currentOrders
      };
      
      await hub.save();
      const utilization = ((currentOrders / maxOrders) * 100).toFixed(1);
      console.log(`✅ Updated ${hub.name}: ${currentOrders}/${maxOrders} (${utilization}%)`);
    }

    console.log("\n🎉 All hubs updated successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

updateHubCapacity();
