#!/usr/bin/env node

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import models
const HubManager = require("./models/HubManager");

console.log("🔧 CREATING TEST HUB MANAGER FOR ERNAKULAM");
console.log("==========================================");

async function createTestHubManager() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/foodily-auth-app");
    console.log("✅ Connected to MongoDB");

    // Delete existing test manager if exists
    await HubManager.deleteOne({ email: 'ernakulam.hub@craftedbyher.com' });

    // Hash the password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash("hub@1234", salt);

    // Create new hub manager for Ernakulam (without pre-save hook)
    const managerData = {
      managerId: 'HM-ERN-TEST',
      name: 'Ernakulam Hub Manager',
      email: 'ernakulam.hub@craftedbyher.com',
      phone: '9876543299',
      username: 'ernakulam_hub',
      password: hashedPassword,
      hubId: 'HUB-ERN-001',
      hubName: 'Ernakulam Central Hub',
      district: 'Ernakulam',
      status: 'active',
      createdBy: 'test_script'
    };

    // Insert directly to bypass pre-save hooks
    const result = await HubManager.collection.insertOne(managerData);
    const manager = await HubManager.findById(result.insertedId);

    console.log("✅ Created test hub manager:");
    console.log("   Name:", manager.name);
    console.log("   Email:", manager.email);
    console.log("   Hub ID:", manager.hubId);
    console.log("   Manager ID:", manager.managerId);

    // Test password
    const isValid = await manager.comparePassword("hub@1234");
    console.log(`   🧪 Password test: ${isValid ? '✅ PASS' : '❌ FAIL'}`);

    console.log("\n🎯 TEST CREDENTIALS:");
    console.log("   Email: ernakulam.hub@craftedbyher.com");
    console.log("   Password: hub@1234");
    console.log("\n📊 EXPECTED STATS:");
    console.log("   Orders (at seller hub): 1");
    console.log("   Dispatch (to customer hub): 1");

  } catch (error) {
    console.error("❌ Error creating test hub manager:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the script
createTestHubManager();