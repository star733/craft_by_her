#!/usr/bin/env node

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import models
const HubManager = require("./models/HubManager");

console.log("🔐 FIXING HUB MANAGER PASSWORDS");
console.log("===============================");

async function fixHubManagerPasswords() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/foodily-auth-app");
    console.log("✅ Connected to MongoDB");

    // Find all hub managers
    const managers = await HubManager.find({});
    
    console.log(`Found ${managers.length} hub managers`);
    
    for (const manager of managers) {
      console.log(`\n🔧 Fixing password for ${manager.name} (${manager.email})`);
      
      // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
      if (manager.password.startsWith('$2')) {
        console.log("  ✅ Password already hashed, skipping");
        continue;
      }
      
      console.log("  🔐 Password is plain text, hashing...");
      
      // Hash the password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash("password123", salt);
      
      // Update the manager directly in the database (bypass pre-save hook)
      await HubManager.updateOne(
        { _id: manager._id },
        { $set: { password: hashedPassword } }
      );
      
      console.log("  ✅ Password hashed and updated");
      
      // Verify the password works
      const updatedManager = await HubManager.findById(manager._id);
      const isValid = await updatedManager.comparePassword("password123");
      console.log(`  🧪 Password verification: ${isValid ? '✅ PASS' : '❌ FAIL'}`);
    }

  } catch (error) {
    console.error("❌ Error fixing passwords:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the script
fixHubManagerPasswords();