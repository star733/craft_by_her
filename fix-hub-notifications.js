// Fix hub manager notifications
const mongoose = require('mongoose');
require('dotenv').config();

async function fixHubNotifications() {
  try {
    console.log("🔧 Fixing Hub Manager Notifications\n");
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/foodily-auth-app");
    console.log("✅ Connected to MongoDB");
    
    // Import models
    const Notification = require('./models/Notification');
    const HubManager = require('./models/HubManager');
    
    // 1. Get the Ernakulam hub manager
    const hubManager = await HubManager.findOne({ hubId: "HUB0007" });
    if (!hubManager) {
      console.log("❌ No hub manager found for HUB0007");
      return;
    }
    
    console.log(`✅ Found hub manager: ${hubManager.name} (${hubManager.managerId})`);
    
    // 2. Check existing notifications
    const existingNotifications = await Notification.find({
      userId: hubManager.managerId,
      userRole: 'hubmanager'
    }).sort({ createdAt: -1 });
    
    console.log(`📧 Found ${existingNotifications.length} existing notifications for ${hubManager.managerId}`);
    
    if (existingNotifications.length > 0) {
      console.log("Recent notifications:");
      existingNotifications.slice(0, 3).forEach(notification => {
        console.log(`   - ${notification.title} (${notification.read ? 'Read' : 'Unread'}) - ${notification.createdAt}`);
      });
    }
    
    // 3. Create a test notification if none exist
    if (existingNotifications.length === 0) {
      console.log("\n🔧 Creating test notification...");
      
      const testNotification = await Notification.create({
        userId: hubManager.managerId,
        userRole: 'hubmanager',
        type: 'product_arrived_at_hub',
        title: '📦 Test Notification - Products Arrived',
        message: 'This is a test notification to verify the notification system is working.',
        orderId: new mongoose.Types.ObjectId(),
        orderNumber: 'TEST-001',
        actionRequired: false,
        metadata: {
          hubName: 'Ernakulam Central Hub',
          hubId: 'HUB0007',
          hubDistrict: 'Ernakulam',
          sellerName: 'Test Seller',
          itemCount: 1
        }
      });
      
      console.log(`✅ Test notification created: ${testNotification._id}`);
    }
    
    // 4. Verify the notification can be queried
    const finalNotifications = await Notification.find({
      userId: hubManager.managerId,
      userRole: 'hubmanager'
    }).sort({ createdAt: -1 });
    
    console.log(`\n✅ Final verification: ${finalNotifications.length} notifications found for hub manager`);
    
    // 5. Check if there are any issues with the notification structure
    for (const notification of finalNotifications) {
      const issues = [];
      
      if (!notification.userId) issues.push('Missing userId');
      if (!notification.userRole) issues.push('Missing userRole');
      if (!notification.type) issues.push('Missing type');
      if (!notification.title) issues.push('Missing title');
      if (!notification.message) issues.push('Missing message');
      
      if (issues.length > 0) {
        console.log(`⚠️ Notification ${notification._id} has issues: ${issues.join(', ')}`);
      } else {
        console.log(`✅ Notification ${notification._id} is valid`);
      }
    }
    
    console.log("\n🎯 Summary:");
    console.log(`   - Hub Manager: ${hubManager.name} (${hubManager.managerId})`);
    console.log(`   - Hub: ${hubManager.hubId}`);
    console.log(`   - Notifications: ${finalNotifications.length}`);
    console.log(`   - Unread: ${finalNotifications.filter(n => !n.read).length}`);
    
    console.log("\n📋 Next Steps:");
    console.log("   1. Login to hub manager dashboard");
    console.log("   2. Check if notifications appear");
    console.log("   3. If not, check browser console for API errors");
    
  } catch (error) {
    console.error("❌ Error:", error);
    console.error("Stack trace:", error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  }
}

fixHubNotifications();