const mongoose = require("mongoose");
const HubManager = require("./server/models/HubManager");
require("dotenv").config();

async function debugHubManager() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");
    
    // Find all hub managers
    const managers = await HubManager.find({}).select('name email managerId hubId status');
    console.log(`\n📋 Found ${managers.length} hub managers:`);
    
    managers.forEach(manager => {
      console.log(`   ${manager.name} (${manager.managerId}) - ${manager.email} - ${manager.status}`);
    });
    
    // Test specific manager
    const testManager = await HubManager.findOne({ email: 'rajesh.hub@craftedbyher.com' });
    if (testManager) {
      console.log(`\n🔍 Testing manager: ${testManager.name}`);
      console.log(`   Email: ${testManager.email}`);
      console.log(`   Status: ${testManager.status}`);
      console.log(`   Hub ID: ${testManager.hubId}`);
      
      // Test password
      const isValid = await testManager.comparePassword('password123');
      console.log(`   Password test: ${isValid ? '✅ PASS' : '❌ FAIL'}`);
    }
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

debugHubManager();