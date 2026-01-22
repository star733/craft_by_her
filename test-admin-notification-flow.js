const axios = require('axios');

const API_BASE = 'http://localhost:5000';

// Test admin credentials - you'll need to replace with actual admin token
const ADMIN_TOKEN = 'your-admin-firebase-token-here';

async function testAdminNotificationFlow() {
  console.log('🧪 Testing Admin Notification Flow for Hub Orders');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Check current admin notifications
    console.log('\n📋 Step 1: Checking current admin notifications...');
    const notificationsResponse = await axios.get(`${API_BASE}/api/admin/orders/notifications?unreadOnly=true`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    
    console.log(`✅ Current unread notifications: ${notificationsResponse.data.unreadCount}`);
    if (notificationsResponse.data.notifications.length > 0) {
      console.log('📋 Recent notifications:');
      notificationsResponse.data.notifications.slice(0, 3).forEach(notification => {
        console.log(`  - ${notification.title}: ${notification.message}`);
      });
    }
    
    // Step 2: Check pending hub orders
    console.log('\n📦 Step 2: Checking pending hub orders...');
    const pendingOrdersResponse = await axios.get(`${API_BASE}/api/admin/orders/hub-orders/pending`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    
    console.log(`✅ Pending hub orders: ${pendingOrdersResponse.data.count}`);
    
    if (pendingOrdersResponse.data.orders.length > 0) {
      const firstOrder = pendingOrdersResponse.data.orders[0];
      console.log(`📋 First pending order: ${firstOrder.orderNumber} from ${firstOrder.customer}`);
      console.log(`   Hub: ${firstOrder.hubInfo.hubName} (${firstOrder.hubInfo.hubDistrict})`);
      console.log(`   Amount: ₹${firstOrder.totalAmount}`);
      
      // Step 3: Approve the first pending order
      console.log('\n✅ Step 3: Approving the first pending order...');
      const approveResponse = await axios.patch(
        `${API_BASE}/api/admin/orders/${firstOrder._id}/approve-hub-delivery`,
        {},
        { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
      );
      
      if (approveResponse.data.success) {
        console.log(`✅ Order ${firstOrder.orderNumber} approved successfully!`);
        console.log(`   Dispatched to: ${approveResponse.data.order.toHub}`);
        
        // Step 4: Wait a moment and check notifications again
        console.log('\n⏳ Step 4: Waiting 2 seconds for notifications to be created...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const updatedNotificationsResponse = await axios.get(`${API_BASE}/api/admin/orders/notifications?unreadOnly=true`, {
          headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
        });
        
        console.log(`✅ Updated unread notifications: ${updatedNotificationsResponse.data.unreadCount}`);
        
        if (updatedNotificationsResponse.data.notifications.length > 0) {
          console.log('📋 Latest notifications:');
          updatedNotificationsResponse.data.notifications.slice(0, 3).forEach(notification => {
            console.log(`  - ${notification.title}: ${notification.message}`);
          });
          
          // Step 5: Mark first notification as read
          const firstNotification = updatedNotificationsResponse.data.notifications[0];
          console.log(`\n📖 Step 5: Marking notification as read: ${firstNotification._id}`);
          
          const markReadResponse = await axios.patch(
            `${API_BASE}/api/admin/orders/notifications/${firstNotification._id}/read`,
            {},
            { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
          );
          
          if (markReadResponse.data.success) {
            console.log('✅ Notification marked as read successfully!');
          }
        }
      }
    } else {
      console.log('ℹ️  No pending orders to test with. Create an order and move it to a hub first.');
    }
    
    console.log('\n🎉 Admin notification flow test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Tip: Make sure to replace ADMIN_TOKEN with a valid Firebase admin token');
    } else if (error.response?.status === 403) {
      console.log('\n💡 Tip: Make sure the token belongs to a user with admin role');
    }
  }
}

// Test notification creation directly (for development)
async function testNotificationCreation() {
  console.log('\n🧪 Testing Direct Notification Creation');
  console.log('='.repeat(50));
  
  try {
    // This would typically be called from the hub order route
    const { createAdminHubNotification } = require('./server/utils/notificationService');
    
    const mockOrder = {
      _id: 'test-order-id',
      orderNumber: 'ORD123456',
      buyerDetails: {
        name: 'Test Customer',
        phone: '+91 9876543210'
      },
      finalAmount: 1500,
      items: [{ title: 'Test Product' }]
    };
    
    const mockHub = {
      name: 'Test Hub Ernakulam',
      district: 'Ernakulam',
      hubId: 'HUB001'
    };
    
    console.log('📝 Creating test admin notification...');
    const notifications = await createAdminHubNotification(mockOrder, mockHub);
    console.log(`✅ Created ${notifications.length} notifications`);
    
  } catch (error) {
    console.error('❌ Direct notification test failed:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  console.log('🚀 Starting Admin Notification System Tests');
  console.log('Make sure the server is running on http://localhost:5000');
  console.log('');
  
  // Uncomment the test you want to run:
  
  // Test the complete flow (requires valid admin token)
  // testAdminNotificationFlow();
  
  // Test notification creation directly
  testNotificationCreation();
  
  console.log('\n💡 To test the complete flow:');
  console.log('1. Get a valid Firebase admin token');
  console.log('2. Replace ADMIN_TOKEN in this file');
  console.log('3. Uncomment testAdminNotificationFlow() call');
  console.log('4. Run: node test-admin-notification-flow.js');
}

module.exports = {
  testAdminNotificationFlow,
  testNotificationCreation
};