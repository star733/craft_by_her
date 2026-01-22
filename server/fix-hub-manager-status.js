#!/usr/bin/env node

const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import models
const HubManager = require("./models/HubManager");

console.log("🔧 FIXING HUB MANAGER STATUS");
console.log("=============================");

async function fixHubManagerStatus() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/foodily-auth-app");
    console.log("✅ Connected to MongoDB");

    // Update all hub managers to active status
    const result = await HubManager.updateMany(
      { status: { $ne: 'active' } },
      { $set: { status: 'active' } }
    );

    console.log(`✅ Updated ${result.modifiedCount} hub managers to active status`);

    // List all hub managers with their status
    const managers = await HubManager.find({}).select('managerId name email status hubId');
    
    console.log("\n📋 Hub Manager Status:");
    console.log("======================");
    
    for (const manager of managers) {
      console.log(`${manager.name} (${manager.managerId})`);
      console.log(`  Email: ${manager.email}`);
      console.log(`  Status: ${manager.status}`);
      console.log(`  Hub: ${manager.hubId || 'Not assigned'}`);
      console.log("");
    }

  } catch (error) {
    console.error("❌ Error fixing hub manager status:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the script
fixHubManagerStatus();