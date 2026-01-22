const http = require('http');

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtYW5hZ2VySWQiOiJITTAwMDMiLCJlbWFpbCI6Im1pa2t5Z281N0BnbWFpbC5jb20iLCJyb2xlIjoiaHVibWFuYWdlciIsIm5hbWUiOiJDZW50cmFsIEh1YiBNYW5hZ2VyIiwiaHViSWQiOiJBTExfSFVCUyIsImlhdCI6MTc2ODg4OTg4MiwiZXhwIjoxNzY5NDk0NjgyfQ.C_O4LHnysN_-BvaYEeqHX7jL5M4-PtdoG7aljQiZkgY";

function testHubManagerStats() {
  console.log("🧪 Testing Hub Manager Stats API...");
  
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
          console.log(`⏳ Pending count: ${statsData.stats.pending}`);
          console.log(`✅ Delivered count: ${statsData.stats.delivered}`);
          console.log(`🚚 Out for Delivery count: ${statsData.stats.outForDelivery}`);
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

testHubManagerStats();