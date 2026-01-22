// Test hubs API endpoint
const http = require('http');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function testHubsAPI() {
  try {
    console.log("🧪 Testing Hubs API Endpoint");
    
    const response = await makeRequest("http://localhost:5000/api/hubs/all-with-stats");
    
    console.log("Status:", response.status);
    console.log("Response type:", typeof response.data);
    
    if (response.status === 200 && response.data.success) {
      console.log("✅ Hubs API endpoint works!");
      console.log(`Found ${response.data.hubs?.length || 0} hubs`);
    } else {
      console.log("❌ Hubs API endpoint failed");
      console.log("Response:", JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error("❌ Test error:", error);
  }
}

testHubsAPI();