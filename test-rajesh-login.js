const http = require('http');

function testRajeshLogin() {
  console.log("🧪 Testing Rajesh Kumar Login...");
  
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
    console.log("Login status:", res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const responseData = JSON.parse(data);
        console.log("Response:", JSON.stringify(responseData, null, 2));
        
        if (responseData.success && responseData.token) {
          console.log("✅ Login successful!");
          console.log("Manager:", responseData.manager.name);
          console.log("Hub ID:", responseData.manager.hubId);
          
          // Test stats with this token
          testStatsWithRajesh(responseData.token);
        } else {
          console.log("❌ Login failed:", responseData.error);
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
}

function testStatsWithRajesh(token) {
  console.log("\n🧪 Testing Stats with Rajesh Token...");
  
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
    console.log("Stats status:", res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const statsData = JSON.parse(data);
        console.log("Stats:", JSON.stringify(statsData, null, 2));
        
        if (statsData.success) {
          console.log("✅ Stats retrieved!");
          console.log(`📦 Orders (at seller hub): ${statsData.stats.orders}`);
          console.log(`🚚 Dispatch (to customer hub): ${statsData.stats.dispatch}`);
          console.log(`🏢 At Hub: ${statsData.stats.atHub}`);
          
          if (statsData.stats.dispatch > 0 || statsData.stats.orders > 0) {
            console.log("🎉 SUCCESS! Rajesh should see dispatch/order counts!");
          } else {
            console.log("⚠️ No dispatch/order counts for Rajesh");
          }
        }
      } catch (error) {
        console.error("❌ Error parsing stats:", error);
        console.log("Raw stats response:", data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error("❌ Stats request error:", error);
  });
  
  req.end();
}

testRajeshLogin();