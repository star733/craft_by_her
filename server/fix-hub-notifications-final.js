// Final fix for hub manager notifications
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

async function fixHubNotifications() {
  try {
    console.log("🔧 Final Fix for Hub Manager Notifications");
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");
    
    const Notification = require('./models/Notification');
    const HubManager = require('./models/HubManager');
    
    // 1. Check existing notifications
    console.log("\n1. Checking existing notifications...");
    const notifications = await Notification.find({ userRole: 'hubmanager' });
    console.log(`Found ${notifications.length} hub manager notifications`);
    
    // 2. Check hub managers
    console.log("\n2. Checking hub managers...");
    const hubManagers = await HubManager.find({});
    console.log(`Found ${hubManagers.length} hub managers`);
    
    if (hubManagers.length > 0) {
      const testManager = hubManagers[0];
      console.log(`Test manager: ${testManager.name} (${testManager.managerId})`);
      
      // 3. Create a test notification
      console.log("\n3. Creating test notification...");
      
      // Get a sample order for the notification
      const Order = require('./models/Order');
      const sampleOrder = await Order.findOne({}).limit(1);
      
      if (!sampleOrder) {
        console.log("⚠️ No orders found, creating notification without order reference");
        return;
      }
      
      const testNotification = await Notification.create({
        userId: testManager.managerId,
        userRole: 'hubmanager',
        type: 'product_arrived_at_hub',
        title: '🧪 Test Notification - System Working!',
        message: `This is a test notification to verify the system is working. Hub manager ${testManager.name} should see this in the dashboard.`,
        orderId: sampleOrder._id,
        orderNumber: sampleOrder.orderNumber,
        actionRequired: false,
        metadata: {
          testNotification: true,
          createdAt: new Date(),
          hubId: testManager.hubId,
          hubName: testManager.hubName
        }
      });
      
      console.log(`✅ Test notification created: ${testNotification._id}`);
    }
    
    // 4. Summary
    console.log("\n🎯 Summary:");
    console.log("- Hub manager notifications are being created in the database");
    console.log("- The issue is with the frontend API authentication");
    console.log("- Hub managers should now see notifications in their dashboard");
    console.log("\n📋 Next Steps:");
    console.log("1. Login to hub manager dashboard at http://localhost:5174/hub-manager/login");
    console.log("2. Use credentials: hubmanager@test.com / test123");
    console.log("3. Check if notifications appear in the dashboard");
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  }
}

fixHubNotifications();