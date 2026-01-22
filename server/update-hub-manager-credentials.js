#!/usr/bin/env node

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import models
const HubManager = require("./models/HubManager");

console.log("🔧 UPDATING HUB MANAGER CREDENTIALS");
console.log("===================================");

async function updateHubManagerCredentials() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/foodily-auth-app");
    console.log("✅ Connected to MongoDB");

    // Update Rajesh Kumar's credentials to match the login page format
    const rajeshManager = await HubManager.findOne({ managerId: 'HM-ERN-001' });
    
    if (rajeshManager) {
      console.log("🔧 Updating Rajesh Kumar's credentials...");
      
      // Hash the password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash("hub@1234", salt);
      
      // Update the manager
      await HubManager.updateOne(
        { _id: rajeshManager._id },
        { 
          $set: { 
            email: "rajesh.hub@craftedbyher.com",
            password: hashedPassword 
          } 
        }
      );
      
      console.log("✅ Updated Rajesh Kumar's credentials");
      console.log("   New email: rajesh.hub@craftedbyher.com");
      console.log("   New password: hub@1234");
      
      // Verify the password works
      const updatedManager = await HubManager.findById(rajeshManager._id);
      const isValid = await updatedManager.comparePassword("hub@1234");
      console.log(`   🧪 Password verification: ${isValid ? '✅ PASS' : '❌ FAIL'}`);
    }

    // List all hub managers with their credentials
    const managers = await HubManager.find({}).select('managerId name email hubId district status');
    
    console.log("\n📋 All Hub Managers:");
    console.log("====================");
    
    for (const manager of managers) {
      console.log(`${manager.name} (${manager.managerId})`);
      console.log(`  Email: ${manager.email}`);
      console.log(`  Hub: ${manager.hubId || 'Not assigned'}`);
      console.log(`  District: ${manager.district || 'Not assigned'}`);
      console.log(`  Status: ${manager.status}`);
      console.log("");
    }

  } catch (error) {
    console.error("❌ Error updating credentials:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the script
updateHubManagerCredentials();