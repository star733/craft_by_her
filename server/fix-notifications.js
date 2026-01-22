// Script to fix notifications - regenerate clean seller notifications
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function fixNotifications() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const Notification = require('./models/Notification');
    const Order = require('./models/Order');
    const User = require('./models/User');

    // Find seller
    const seller = await User.findOne({ role: 'seller' });
    if (!seller) {
      console.log('❌ No seller found');
      process.exit(1);
    }

    console.log('\n👤 Seller:', seller.email, '(', seller.uid, ')');

    // Delete ALL seller notifications
    console.log('\n🗑️  Deleting ALL seller notifications...');
    const deleteResult = await Notification.deleteMany({
      userId: seller.uid,
      userRole: 'seller'
    });
    console.log(`✅ Deleted ${deleteResult.deletedCount} seller notifications`);

    // Find orders that haven't been moved to hub yet
    console.log('\n📦 Finding orders needing notifications...');
    const orders = await Order.find({
      $or: [
        { 'hubTracking.sellerHubId': { $exists: false } },
        { 'hubTracking.sellerHubId': null }
      ]
    }).sort({ createdAt: -1 }).limit(10);

    console.log(`✅ Found ${orders.length} orders`);

    // Create fresh notifications
    console.log('\n🔔 Creating NEW notifications...');
    let created = 0;
    for (const order of orders) {
      try {
        const notification = await Notification.create({
          userId: seller.uid,
          userRole: 'seller',
          type: 'new_order',
          title: '🎉 New Order Received!',
          message: `You have a new order #${order.orderNumber}. Please move the products to your nearest hub.`,
          orderId: order._id,
          orderNumber: order.orderNumber,
          actionRequired: true,
          actionType: 'move_to_hub',
          metadata: {
            orderAmount: order.finalAmount || order.totalAmount,
            itemCount: order.items.length
          }
        });
        
        console.log(`  ✅ Created notification for order #${order.orderNumber}`);
        created++;
      } catch (err) {
        console.log(`  ❌ Error creating notification for order #${order.orderNumber}:`, err.message);
      }
    }

    console.log(`\n✅ Created ${created} new notifications!`);
    console.log('\n📋 NEXT STEPS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Go to your browser');
    console.log('2. Press Ctrl+Shift+Delete');
    console.log('3. Clear "Cached images and files"');
    console.log('4. Close ALL browser tabs');
    console.log('5. Reopen browser and go to http://localhost:5173/seller');
    console.log('6. Login and check sidebar notifications');
    console.log('7. Click a notification - it should open a MODAL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixNotifications();
