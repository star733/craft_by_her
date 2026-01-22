const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crafted-by-her', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Order = require('./server/models/Order');
const User = require('./server/models/User');
const Hub = require('./server/models/Hub');
const Notification = require('./server/models/Notification');
const { createAdminHubNotification } = require('./server/utils/notificationService');

async function createTestOrder() {
  console.log('🧪 Creating test order for hub notification system...');
  
  try {
    // Create a test order
    const testOrder = new Order({
      userId: 'test-user-123',
      orderNumber: `ORD${Date.now()}`,
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          title: 'Test Handcrafted Item',
          image: 'test-image.jpg',
          variant: {
            weight: '500g',
            price: 1200
          },
          quantity: 2
        }
      ],
      buyerDetails: {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '+91 9876543210',
        address: {
          street: '123 Test Street',
          city: 'Ernakulam',
          state: 'Kerala',
          pincode: '682001',
          landmark: 'Near Test Mall'
        }
      },
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      orderStatus: 'pending',
      totalAmount: 2400,
      shippingCharges: 50,
      finalAmount: 2450
    });
    
    await testOrder.save();
    console.log(`✅ Test order created: ${testOrder.orderNumber}`);
    
    return testOrder;
  } catch (error) {
    console.error('❌ Error creating test order:', error);
    throw error;
  }
}

async function moveOrderToHub(order) {
  console.log(`📦 Moving order ${order.orderNumber} to seller hub...`);
  
  try {
    // Find an active hub in Ernakulam
    let hub = await Hub.findOne({ district: 'Ernakulam', status: 'active' });
    
    if (!hub) {
      // Create a test hub if none exists
      hub = new Hub({
        hubId: `HUB${Date.now()}`,
        name: 'Test Hub Ernakulam',
        district: 'Ernakulam',
        location: {
          address: 'Test Hub Address, Ernakulam',
          coordinates: {
            latitude: 9.9312,
            longitude: 76.2673
          }
        },
        contactInfo: {
          phone: '+91 9876543210',
          email: 'testhub@example.com'
        },
        capacity: {
          maxOrders: 100,
          currentOrders: 0
        },
        status: 'active'
      });
      
      await hub.save();
      console.log(`✅ Test hub created: ${hub.name}`);
    }
    
    // Update order to be at seller hub
    order.hubTracking = {
      sellerHubId: hub.hubId,
      sellerHubName: hub.name,
      sellerHubDistrict: hub.district,
      arrivedAtSellerHub: new Date(),
      currentLocation: 'seller_hub',
      approvedByAdmin: false
    };
    
    order.orderStatus = 'at_seller_hub';
    await order.save();
    
    console.log(`✅ Order moved to hub: ${hub.name}`);
    
    // Create admin notification
    const notifications = await createAdminHubNotification(order, {
      name: hub.name,
      district: hub.district,
      hubId: hub.hubId
    });
    
    console.log(`✅ Created ${notifications.length} admin notifications`);
    
    return { order, hub, notifications };
  } catch (error) {
    console.error('❌ Error moving order to hub:', error);
    throw error;
  }
}

async function checkNotifications() {
  console.log('🔔 Checking admin notifications...');
  
  try {
    const notifications = await Notification.find({
      userRole: 'admin',
      type: 'admin_approval_required',
      read: false
    }).sort({ createdAt: -1 }).limit(5);
    
    console.log(`✅ Found ${notifications.length} unread admin notifications`);
    
    notifications.forEach((notification, index) => {
      console.log(`\n📋 Notification ${index + 1}:`);
      console.log(`   Title: ${notification.title}`);
      console.log(`   Message: ${notification.message}`);
      console.log(`   Order: ${notification.orderNumber}`);
      console.log(`   Action Required: ${notification.actionRequired}`);
      console.log(`   Created: ${notification.createdAt.toLocaleString()}`);
      
      if (notification.metadata) {
        console.log(`   Hub: ${notification.metadata.hubName} (${notification.metadata.hubDistrict})`);
        console.log(`   Customer: ${notification.metadata.customerName}`);
        console.log(`   Amount: ₹${notification.metadata.totalAmount}`);
      }
    });
    
    return notifications;
  } catch (error) {
    console.error('❌ Error checking notifications:', error);
    throw error;
  }
}

async function testCompleteFlow() {
  console.log('🚀 Testing Complete Admin Notification Flow');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Create test order
    console.log('\n📝 Step 1: Creating test order...');
    const order = await createTestOrder();
    
    // Step 2: Move order to hub (this should trigger admin notification)
    console.log('\n🏢 Step 2: Moving order to seller hub...');
    const { hub, notifications } = await moveOrderToHub(order);
    
    // Step 3: Check all admin notifications
    console.log('\n🔔 Step 3: Checking admin notifications...');
    await checkNotifications();
    
    console.log('\n🎉 Test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Order created: ${order.orderNumber}`);
    console.log(`   - Hub: ${hub.name}`);
    console.log(`   - Notifications created: ${notifications.length}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Start the server: npm start');
    console.log('   2. Login as admin in the dashboard');
    console.log('   3. Go to Hub Orders section');
    console.log('   4. You should see the notification and pending order');
    console.log('   5. Click "Approve & Dispatch" to test the approval flow');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
if (require.main === module) {
  testCompleteFlow();
}

module.exports = {
  createTestOrder,
  moveOrderToHub,
  checkNotifications,
  testCompleteFlow
};