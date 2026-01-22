/**
 * Cleanup Duplicate Order Notifications
 * 
 * This script removes duplicate "order_arrived_customer_hub" notifications
 * and keeps only "order_dispatched_to_customer_hub" notifications for each order
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const Notification = require("./models/Notification");

async function cleanupDuplicateNotifications() {
  try {
    console.log("🧹 Starting cleanup of duplicate order notifications...\n");

    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/foodily-auth-app"
    );
    console.log("✅ Connected to MongoDB\n");

    // Find all "arrived" notifications
    const arrivedNotifications = await Notification.find({
      type: "order_arrived_customer_hub"
    });

    console.log(`📋 Found ${arrivedNotifications.length} 'order arrived' notifications`);

    if (arrivedNotifications.length > 0) {
      // Delete them
      const result = await Notification.deleteMany({
        type: "order_arrived_customer_hub"
      });

      console.log(`✅ Deleted ${result.deletedCount} duplicate 'arrived' notifications\n`);
    } else {
      console.log("✨ No duplicate notifications to clean up\n");
    }

    // Show remaining notifications grouped by type
    const notificationStats = await Notification.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log("📊 Remaining notifications by type:");
    notificationStats.forEach(stat => {
      console.log(`   - ${stat._id}: ${stat.count}`);
    });

    console.log("\n✅ Cleanup completed successfully!");

    await mongoose.connection.close();
    console.log("👋 Disconnected from MongoDB");

  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupDuplicateNotifications();
