const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const HubManager = require("./models/HubManager");

async function fixHubManagerPassword() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/foodily-auth-app");
    console.log("✅ Connected to MongoDB");

    // Try both email variations
    const emails = ["mikkigo57@gmail.com", "mikkygo57@gmail.com"];
    const password = "hub@1234";

    for (const email of emails) {
      console.log(`\n🔍 Checking email: ${email}`);
      
      let manager = await HubManager.findOne({ 
        email: email.toLowerCase().trim() 
      });

      if (manager) {
        console.log(`✅ Found manager: ${manager.managerId}`);
        console.log(`   Name: ${manager.name}`);
        console.log(`   Status: ${manager.status}`);
        console.log(`   Current password hash: ${manager.password.substring(0, 20)}...`);

        // Test current password
        const currentTest = await bcrypt.compare(password, manager.password);
        console.log(`   Current password test: ${currentTest ? "✅ Valid" : "❌ Invalid"}`);

        if (!currentTest) {
          // Reset password with correct hashing (using salt rounds 12 to match model)
          console.log(`\n🔧 Resetting password...`);
          const salt = await bcrypt.genSalt(12);
          const hashedPassword = await bcrypt.hash(password, salt);
          
          // Use findOneAndUpdate to bypass pre-save hooks and avoid double hashing
          await HubManager.findOneAndUpdate(
            { _id: manager._id },
            { 
              $set: { 
                password: hashedPassword,
                status: "active"
              }
            },
            { new: true }
          );
          
          console.log(`✅ Password reset successfully`);

          // Reload and test new password
          const updatedManager = await HubManager.findById(manager._id);
          const newTest = await bcrypt.compare(password, updatedManager.password);
          console.log(`   New password test: ${newTest ? "✅ Valid" : "❌ Invalid"}`);

          console.log(`\n🎯 LOGIN CREDENTIALS:`);
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(`📧 Email: ${updatedManager.email}`);
          console.log(`🔑 Password: ${password}`);
          console.log(`🆔 Manager ID: ${updatedManager.managerId}`);
          console.log(`🏢 Hub: ${updatedManager.hubName || "Not assigned"}`);
          console.log(`📍 District: ${updatedManager.district || "Not assigned"}`);
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

          await mongoose.disconnect();
          console.log("\n✅ Done! You can now login with the credentials above.");
          return;
        } else {
          console.log(`\n✅ Password is already correct!`);
          console.log(`\n🎯 LOGIN CREDENTIALS:`);
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(`📧 Email: ${manager.email}`);
          console.log(`🔑 Password: ${password}`);
          console.log(`🆔 Manager ID: ${manager.managerId}`);
          console.log(`🏢 Hub: ${manager.hubName || "Not assigned"}`);
          console.log(`📍 District: ${manager.district || "Not assigned"}`);
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

          await mongoose.disconnect();
          console.log("\n✅ Done! You can now login with the credentials above.");
          return;
        }
      } else {
        console.log(`❌ Manager not found with email: ${email}`);
      }
    }

    // If not found, create new one with the email from the image
    console.log(`\n⚠️  Manager not found. Creating new manager with email: mikkigo57@gmail.com`);
    const count = await HubManager.countDocuments();
    const managerId = `HM${String(count + 1).padStart(4, '0')}`;

    // Create manager - password will be hashed by pre-save hook
    const newManager = new HubManager({
      managerId,
      name: "Hub Manager",
      email: "mikkigo57@gmail.com", // Use the email from the image
      phone: "9876543210",
      username: `hubmanager${Date.now()}`,
      password: password, // Will be hashed by pre-save hook
      status: "active",
      createdBy: "admin_fix"
    });

    await newManager.save();
    
    // Reload to test password
    const reloadedManager = await HubManager.findById(newManager._id);
    const passwordTest = await reloadedManager.comparePassword(password);
    
    console.log(`✅ New manager created!`);
    console.log(`📧 Email: ${reloadedManager.email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`🆔 Manager ID: ${reloadedManager.managerId}`);
    console.log(`🔐 Password test: ${passwordTest ? "✅ Valid" : "❌ Invalid"}`);

    await mongoose.disconnect();
    console.log("\n✅ Done! You can now login with the credentials above.");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixHubManagerPassword();

