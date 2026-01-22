const http = require('http');

async function testHubCount() {
  try {
    console.log("🧪 Testing Hub Count (Should be 14)...");
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/public-hubs',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
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
          
          if (responseData.success) {
            console.log("✅ Hub Count API working!");
            console.log(`🏢 Total Hubs: ${responseData.hubs.length}`);
            console.log(`📊 Expected: 14 districts, Got: ${responseData.hubs.length} hubs`);
            
            if (responseData.hubs.length === 14) {
              console.log("✅ CORRECT: 14 hubs for 14 districts!");
            } else {
              console.log("❌ INCORRECT: Expected 14 hubs");
            }
            
            console.log("\n🗺️ Districts covered:");
            const districts = [...new Set(responseData.hubs.map(hub => hub.district))];
            districts.sort().forEach(district => {
              const hubsInDistrict = responseData.hubs.filter(h => h.district === district);
              console.log(`   ${district}: ${hubsInDistrict.length} hub(s)`);
            });
            
            console.log(`\n📍 Total unique districts: ${districts.length}`);
            
          } else {
            console.log("❌ Hub Count API failed:", responseData.error);
          }
        } catch (error) {
          console.error("❌ Error parsing response:", error);
          console.log("Raw response:", data.substring(0, 200));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error("❌ Request error:", error);
    });
    
    req.end();
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testHubCount();