const http = require('http');

async function testHubManagerLogin() {
  try {
    console.log("🧪 Testing Hub Manager Login API...");
    
    const postData = JSON.stringify({
      email: 'rajesh.ernakulam@craftedbyher.com',
      password: 'password123'
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
            
            // Test the stats endpoint
            testStatsEndpoint(responseData.token);
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

function testStatsEndpoint(token) {
  console.log("\n🧪 Testing Hub Manager Stats API...");
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/hub-managers/dashboard/stats',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
  
  const req = http.request(options, (res) => {
    console.log("Stats response status:", res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const statsData = JSON.parse(data);
        console.log("Stats data:", JSON.stringify(statsData, null, 2));
        
        if (statsData.success) {
          console.log("✅ Stats API working!");
          console.log(`📊 Dispatch count: ${statsData.stats.dispatch}`);
          console.log(`📦 Orders count: ${statsData.stats.orders}`);
          console.log(`🏢 At Hub count: ${statsData.stats.atHub}`);
        }
      } catch (error) {
        console.error("❌ Error parsing stats response:", error);
        console.log("Raw stats response:", data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error("❌ Stats request error:", error);
  });
  
  req.end();
}

testHubManagerLogin();