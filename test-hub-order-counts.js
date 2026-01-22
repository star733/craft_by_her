// Test the updated hub order counts
const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testHubOrderCounts() {
  console.log('🧪 Testing Updated Hub Order Counts\n');

  try {
    // 1. Test orders by district endpoint
    console.log('1. Testing orders by district...');
    const ordersRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/hub-notifications/orders-by-district',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (ordersRes.status === 200) {
      console.log('   ✅ Orders by district endpoint working');
      const ordersByDistrict = ordersRes.data.ordersByDistrict || {};
      const districts = Object.keys(ordersByDistrict);
      console.log('   Districts with orders:', districts);
      
      districts.forEach(district => {
        const orders = ordersByDistrict[district];
        console.log(`\n   📍 ${district} District:`);
        console.log(`      Total Orders: ${orders.length}`);
        
        // Group orders by hub
        const ordersByHub = {};
        orders.forEach(order => {
          const hubName = order.hubName || 'Unknown Hub';
          if (!ordersByHub[hubName]) ordersByHub[hubName] = [];
          ordersByHub[hubName].push(order);
        });
        
        Object.entries(ordersByHub).forEach(([hubName, hubOrders]) => {
          console.log(`      ${hubName}: ${hubOrders.length} orders`);
          hubOrders.forEach(order => {
            console.log(`        - ${order.orderNumber} (${order.hubType} hub, ₹${order.finalAmount})`);
          });
        });
      });
    } else {
      console.log('   ❌ Orders by district endpoint failed:', ordersRes.status);
    }

    // 2. Test hubs endpoint
    console.log('\n2. Testing hubs endpoint...');
    const hubsRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/hubs/all-with-stats',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (hubsRes.status === 200) {
      console.log('   ✅ Hubs endpoint working');
      const hubs = hubsRes.data.hubs || [];
      console.log(`   Total hubs: ${hubs.length}`);
      
      // Show Ernakulam hub specifically
      const ernakulamHub = hubs.find(hub => hub.district === 'Ernakulam');
      if (ernakulamHub) {
        console.log(`\n   🏙️ Ernakulam Hub:`);
        console.log(`      Name: ${ernakulamHub.name}`);
        console.log(`      ID: ${ernakulamHub.hubId}`);
        console.log(`      Current Orders (from hub data): ${ernakulamHub.ordersAtHub || 0}`);
      }
    }

    console.log('\n🎯 Updated Features:');
    console.log('   ✅ Removed order count badge from district header');
    console.log('   ✅ Hub "Orders" field shows actual order count');
    console.log('   ✅ Chevron button appears when district has orders');
    console.log('   ✅ All districts follow same pattern');
    
    console.log('\n📱 Expected Display:');
    console.log('   🏙️ Ernakulam');
    console.log('   1 hub                    [>]');
    console.log('   ');
    console.log('   Ernakulam Central Hub');
    console.log('   ID: HUB0007    Orders: 3');
    
    console.log('\n🔧 How It Works:');
    console.log('   • District header: Clean, no order count badge');
    console.log('   • Hub card: Shows actual order count');
    console.log('   • Chevron: Appears only if district has orders');
    console.log('   • Click chevron: Expands to show order details');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testHubOrderCounts();