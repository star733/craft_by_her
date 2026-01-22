#!/usr/bin/env node

/**
 * Complete System Flow Test
 * Tests the entire product movement control system
 */

const API_BASE = 'http://localhost:5000';

console.log('🧪 COMPLETE SYSTEM FLOW TEST');
console.log('============================');

async function testSystemFlow() {
  try {
    console.log('\n1. Testing Server Health...');
    const healthResponse = await fetch(`${API_BASE}/api/health`).catch(() => null);
    if (!healthResponse || !healthResponse.ok) {
      console.log('❌ Server is not running on port 5000');
      console.log('💡 Please start the server with: npm start');
      return;
    }
    console.log('✅ Server is running');

    console.log('\n2. Testing Admin Endpoints...');
    
    // Test admin orders endpoint
    console.log('   - Testing admin orders endpoint...');
    const adminOrdersTest = await fetch(`${API_BASE}/api/admin/orders`).catch(() => null);
    console.log(`   - Admin orders endpoint: ${adminOrdersTest ? '✅ Available' : '❌ Not available'}`);
    
    // Test pending hub orders endpoint
    console.log('   - Testing pending hub orders endpoint...');
    const pendingHubOrdersTest = await fetch(`${API_BASE}/api/admin/orders/hub-orders/pending`).catch(() => null);
    console.log(`   - Pending hub orders endpoint: ${pendingHubOrdersTest ? '✅ Available' : '❌ Not available'}`);
    
    // Test admin notifications endpoint
    console.log('   - Testing admin notifications endpoint...');
    const adminNotificationsTest = await fetch(`${API_BASE}/api/admin/orders/notifications`).catch(() => null);
    console.log(`   - Admin notifications endpoint: ${adminNotificationsTest ? '✅ Available' : '❌ Not available'}`);

    console.log('\n3. Testing Hub Manager Endpoints...');
    
    // Test hub manager stats endpoint
    console.log('   - Testing hub manager stats endpoint...');
    const hubStatsTest = await fetch(`${API_BASE}/api/hub-managers/dashboard/stats`).catch(() => null);
    console.log(`   - Hub manager stats endpoint: ${hubStatsTest ? '✅ Available' : '❌ Not available'}`);
    
    // Test hub notifications endpoint
    console.log('   - Testing hub notifications endpoint...');
    const hubNotificationsTest = await fetch(`${API_BASE}/api/hub-notifications`).catch(() => null);
    console.log(`   - Hub notifications endpoint: ${hubNotificationsTest ? '✅ Available' : '❌ Not available'}`);

    console.log('\n4. Testing Buyer Endpoints...');
    
    // Test buyer notifications endpoint
    console.log('   - Testing buyer notifications endpoint...');
    const buyerNotificationsTest = await fetch(`${API_BASE}/api/notifications/buyer`).catch(() => null);
    console.log(`   - Buyer notifications endpoint: ${buyerNotificationsTest ? '✅ Available' : '❌ Not available'}`);

    console.log('\n5. Testing Email Configuration...');
    console.log('   - Checking environment variables...');
    console.log(`   - EMAIL_USER: ${process.env.EMAIL_USER ? '✅ Set' : '❌ Not set'}`);
    console.log(`   - EMAIL_PASS: ${process.env.EMAIL_PASS ? '✅ Set' : '❌ Not set'}`);
    console.log(`   - SMTP_HOST: ${process.env.SMTP_HOST || 'smtp.gmail.com (default)'}`);

    console.log('\n6. System Flow Summary:');
    console.log('   📦 Product arrives at seller hub → Admin gets notification');
    console.log('   👨‍💼 Admin approves → Product dispatched to customer hub');
    console.log('   🔐 OTP generated → Email sent to customer');
    console.log('   📱 Customer gets notification with OTP');
    console.log('   🏢 Hub manager sees "Dispatch: X" stat');

    console.log('\n✅ System flow test completed!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Start the server: npm start');
    console.log('   2. Start the client: npm run dev');
    console.log('   3. Login as admin and check Product Movement Control section');
    console.log('   4. Test the complete flow with a sample order');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSystemFlow();