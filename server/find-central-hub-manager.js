#!/usr/bin/env node

const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

console.log("🔍 SEARCHING FOR CENTRAL HUB MANAGER");
console.log("====================================");

async function findCentralHubManager() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/foodily-auth-app");
    console.log("✅ Connected to MongoDB");

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("\n📋 All Collections:");
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    // Search in hubmanagers collection
    const hubManagersCollection = mongoose.connection.db.collection('hubmanagers');
    const allHubManagers = await hubManagersCollection.find({}).toArray();
    
    console.log(`\n🔍 Hub Managers Collection (${allHubManagers.length} documents):`);
    allHubManagers.forEach(manager => {
      console.log(`   ${manager.name} (${manager.managerId}) - ${manager.email}`);
      if (manager.email === 'mikkygo57@gmail.com') {
        console.log("   ⭐ FOUND CENTRAL HUB MANAGER!");
        console.log("      Hub ID:", manager.hubId);
        console.log("      Status:", manager.status);
      }
    });

    // Search for mikkygo57@gmail.com specifically
    const centralManager = await hubManagersCollection.findOne({ 
      email: 'mikkygo57@gmail.com' 
    });
    
    if (centralManager) {
      console.log("\n✅ Central Hub Manager Details:");
      console.log(JSON.stringify(centralManager, null, 2));
    } else {
      console.log("\n❌ Central Hub Manager not found in hubmanagers collection");
    }

    // Check if there's a separate central hub manager collection
    const centralHubCollection = mongoose.connection.db.collection('centralhubmanagers');
    const centralHubManagers = await centralHubCollection.find({}).toArray();
    
    if (centralHubManagers.length > 0) {
      console.log(`\n🔍 Central Hub Managers Collection (${centralHubManagers.length} documents):`);
      centralHubManagers.forEach(manager => {
        console.log(`   ${manager.name} - ${manager.email}`);
      });
    }

  } catch (error) {
    console.error("❌ Error searching:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the script
findCentralHubManager();