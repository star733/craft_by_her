const mongoose = require('mongoose');
require('dotenv').config();

async function inspectNotifications() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const Notification = require('./models/Notification');
    
    // Get all seller notifications
    const notifications = await Notification.find({ userRole: 'seller' }).sort({ createdAt: -1 });
    
    console.log(`📬 Found ${notifications.length} seller notifications\n`);
    
    notifications.forEach((n, i) => {
      console.log(`${i + 1}. ${n.title}`);
      console.log(`   ID: ${n._id}`);
      console.log(`   Order ID: ${n.orderId}`);
      console.log(`   Order Number: ${n.orderNumber}`);
      console.log(`   Action Type: ${n.actionType}`);
      console.log(`   Has actionUrl: ${!!n.actionUrl}`);
      if (n.actionUrl) {
        console.log(`   ⚠️  ACTION URL: ${n.actionUrl}`);
      }
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

inspectNotifications();
