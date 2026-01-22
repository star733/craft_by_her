const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const HubManager = require("./models/HubManager");
const Hub = require("./models/Hub");

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '.env') });

async function createTestHubManager() {
  try {
    console.log("🔧 Creating Test Hub Manager...\n");

    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/foodily-auth-app";
    console.log("🔌 Connecting to MongoDB...");
    
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB connected\n");

    // Check if test manager already exists
    const existingManager = await HubManager.findOne({ username: "testmanager" });
    if (existingManager) {
      console.log("ℹ️  Test hub manager already exists:");
      console.log(`   Manager ID: ${existingManager.managerId}`);
      console.log(`   Username: ${existingManager.username}`);
      console.log(`   Email: ${existingManager.email}`);
      console.log(`   Hub: ${existingManager.hubId || 'Not assigned'}`);
      console.log(`   Status: ${existingManager.status}\n`);
      
      if (existingManager.status !== 'active') {
        console.log("⚠️  Manager is not active. Activating...");
        existingManager.status = 'active';
        await existingManager.save();
        console.log("✅ Manager activated!\n");
      }
      
      console.log("Login credentials:");
      console.log(`   Username: testmanager`);
      console.log(`   Password: test123\n`);
      
      process.exit(0);
    }

    // Get Ernakulam hub (most central)
    const hub = await Hub.findOne({ hubId: "HUB0007" });
    if (!hub) {
      console.log("⚠️  Ernakulam hub not found. Creating manager without hub assignment.");
    }

    // Create test hub manager
    const count = await HubManager.countDocuments();
    const managerId = `HM${String(count + 1).padStart(4, '0')}`;

    const manager = new HubManager({
      managerId,
      name: "Test Hub Manager",
      email: "hubmanager@test.com",
      phone: "9876543210",
      username: "testmanager",
      password: "test123", // Will be hashed automatically
      address: {
        street: "Test Street",
        city: "Kochi",
        state: "Kerala",
        pincode: "682001"
      },
      hubId: hub ? hub.hubId : null,
      hubName: hub ? hub.name : "",
      district: hub ? hub.district : "",
      status: "active",
      createdBy: "system-test"
    });

    await manager.save();
    console.log("✅ Test hub manager created successfully!\n");

    // Update hub if assigned
    if (hub) {
      hub.managerId = manager.managerId;
      hub.managerName = manager.name;
      await hub.save();
      console.log(`✅ Manager assigned to ${hub.name}\n`);
    }

    console.log("📋 Manager Details:");
    console.log(`   Manager ID: ${manager.managerId}`);
    console.log(`   Name: ${manager.name}`);
    console.log(`   Email: ${manager.email}`);
    console.log(`   Phone: ${manager.phone}`);
    console.log(`   Username: ${manager.username}`);
    console.log(`   Hub: ${manager.hubId || 'Not assigned'}`);
    console.log(`   Status: ${manager.status}\n`);

    console.log("🔑 Login Credentials:");
    console.log(`   Username: testmanager`);
    console.log(`   Password: test123\n`);

    console.log("🧪 Test Login:");
    console.log(`   POST http://localhost:5000/api/hub-managers/login`);
    console.log(`   Body: { "username": "testmanager", "password": "test123" }\n`);

    console.log("✅ Ready to test hub manager functionality!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating test hub manager:", error);
    process.exit(1);
  }
}

// Run the function
createTestHubManager();
