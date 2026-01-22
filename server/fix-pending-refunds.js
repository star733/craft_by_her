// Script to update existing "pending" refunds to "completed"
const mongoose = require('mongoose');
require('dotenv').config();

const Order = require('./models/Order');

async function fixPendingRefunds() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/foodily-auth';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all orders with pending refunds
    const ordersWithPendingRefunds = await Order.find({
      paymentStatus: 'refunded',
      'refundDetails.refundStatus': 'pending'
    });

    console.log(`\n📋 Found ${ordersWithPendingRefunds.length} orders with pending refunds`);

    if (ordersWithPendingRefunds.length === 0) {
      console.log('✨ No pending refunds to update!');
      process.exit(0);
    }

    // Update each order
    for (const order of ordersWithPendingRefunds) {
      console.log(`\n🔄 Updating order ${order.orderNumber}...`);
      console.log(`   Customer: ${order.buyerDetails.name}`);
      console.log(`   Amount: ₹${order.refundDetails.refundAmount}`);
      
      order.refundDetails.refundStatus = 'completed';
      order.refundDetails.refundCompletedAt = new Date();
      order.refundDetails.refundNotes = 'Refund processed automatically. Amount will be credited within 5-7 business days.';
      
      await order.save();
      console.log(`   ✅ Refund marked as completed`);
    }

    console.log(`\n✅ Successfully updated ${ordersWithPendingRefunds.length} orders!`);
    console.log('🎉 All pending refunds are now marked as completed.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
fixPendingRefunds();



