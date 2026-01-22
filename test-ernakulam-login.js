const http = require('http');

async function testErnakulamLogin() {
  try {
    console.log("🧪 Testing Ernakulam Hub Manager Login...");
    
    const postData = JSON.stringify({
      email: 'ernakulam.hub@craftedbyher.com',
      password: 'hub@1234'
    });
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/hub-managers/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      console.log("Response status:", res.statusCode);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const responseData = JSON.parse(data);
          console.log("Response data:", JSON.stringify(responseData, null, 2));
          
          if (responseData.success && responseData.token) {
            console.log("✅ Login successful!");
            console.log("Manager ID:", responseData.manager.managerId);
            console.log("Hub ID:", responseData.manager.hubId);
            console.log("District:", responseData.manager.district);
            
            // Test the new endpoints
            testNewEndpoints(responseData.token);
          }
        } catch (error) {
          console.error("❌ Error parsing response:", error);
          console.log("Raw response:", data);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error("❌ Request error:", error);
    });
    
    req.write(postData);
    req.end();
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

function testNewEndpoints(token) {
  console.log("\n🧪 Testing New Hub Manager Endpoints...");
  
  // Test stats endpoint
  testEndpoint('/api/hub-managers/dashboard/stats', token, 'Stats');
  
  // Test seller hub orders endpoint
  setTimeout(() => {
    testEndpoint('/api/hub-managers/orders/seller-hub', token, 'Seller Hub Orders');
  }, 1000);
  
  // Test customer hub orders endpoint
  setTimeout(() => {
    testEndpoint('/api/hub-managers/orders/customer-hub', token, 'Customer Hub Orders');
  }, 2000);
}

function testEndpoint(path, token, name) {
  console.log(`\n🔍 Testing ${name} endpoint: ${path}`);
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: path,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
  
  const req = http.request(options, (res) => {
    console.log(`${name} response status:`, res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const responseData = JSON.parse(data);
        
        if (responseData.success) {
          console.log(`✅ ${name} API working!`);
          
          if (name === 'Stats') {
            console.log(`📊 Dispatch count: ${responseData.stats.dispatch}`);
            console.log(`📦 Orders count: ${responseData.stats.orders}`);
            console.log(`🏢 At Hub count: ${responseData.stats.atHub}`);
            console.log(`🚚 Out for Delivery: ${responseData.stats.outForDelivery}`);
            console.log(`✅ Delivered: ${responseData.stats.delivered}`);
          } else if (name.includes('Orders')) {
            console.log(`📋 Found ${responseData.orders.length} orders`);
            if (responseData.orders.length > 0) {
              console.log(`📝 First order: ${responseData.orders[0].orderNumber}`);
            }
          }
        } else {
          console.log(`❌ ${name} API failed:`, responseData.error);
        }
      } catch (error) {
        console.error(`❌ Error parsing ${name} response:`, error);
        console.log(`Raw ${name} response:`, data.substring(0, 200));
      }
    });
  });
  
  req.on('error', (error) => {
    console.error(`❌ ${name} request error:`, error);
  });
  
  req.end();
}

testErnakulamLogin();