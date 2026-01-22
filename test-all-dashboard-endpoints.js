// Test all dashboard endpoints to find which one returns HTML
const http = require('http');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ 
          status: res.statusCode, 
          data: data,
          headers: res.headers
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testAllDashboardEndpoints() {
  try {
    console.log("🧪 Testing All Dashboard Endpoints\n");
    
    // First get a valid token
    console.log("0. Getting authentication token...");
    const loginResponse = await makeRequest("http://localhost:5000/api/hub-managers/login", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'hubmanager@test.com',
        password: 'test123'
      })
    });
    
    if (loginResponse.status !== 200) {
      console.log("❌ Login failed, cannot test authenticated endpoints");
      return;
    }
    
    const loginData = JSON.parse(loginResponse.data);
    const token = loginData.token;
    const managerId = loginData.manager?.managerId;
    
    console.log(`   ✅ Token obtained for manager ${managerId}`);
    
    // Test each endpoint that the dashboard calls
    const endpoints = [
      {
        name: "Dashboard Stats",
        url: "http://localhost:5000/api/hub-managers/dashboard/stats",
        headers: { 'Authorization': `Bearer ${token}` }
      },
      {
        name: "All Hubs with Stats",
        url: "http://localhost:5000/api/hubs/all-with-stats",
        headers: {}
      },
      {
        name: "Hub Notifications",
        url: `http://localhost:5000/api/hub-notifications?managerId=${managerId}`,
        headers: {}
      },
      {
        name: "Hub Orders",
        url: "http://localhost:5000/api/hub-managers/orders/hub",
        headers: { 'Authorization': `Bearer ${token}` }
      }
    ];
    
    for (let i = 0; i < endpoints.length; i++) {
      const endpoint = endpoints[i];
      console.log(`\n${i + 1}. Testing ${endpoint.name}...`);
      console.log(`   URL: ${endpoint.url}`);
      
      try {
        const response = await makeRequest(endpoint.url, {
          headers: endpoint.headers
        });
        
        console.log(`   Status: ${response.status}`);
        console.log(`   Content-Type: ${response.headers['content-type'] || 'Not specified'}`);
        
        // Check if response looks like HTML
        const isHTML = response.data.trim().startsWith('<!DOCTYPE') || response.data.trim().startsWith('<html');
        const isJSON = response.data.trim().startsWith('{') || response.data.trim().startsWith('[');
        
        if (isHTML) {
          console.log(`   ❌ PROBLEM: Returning HTML instead of JSON!`);
          console.log(`   First 200 chars: ${response.data.substring(0, 200)}...`);
        } else if (isJSON) {
          try {
            const jsonData = JSON.parse(response.data);
            console.log(`   ✅ Valid JSON response`);
            console.log(`   Success: ${jsonData.success || 'not specified'}`);
            if (jsonData.error) {
              console.log(`   Error: ${jsonData.error}`);
            }
          } catch (e) {
            console.log(`   ❌ Invalid JSON: ${e.message}`);
            console.log(`   First 200 chars: ${response.data.substring(0, 200)}...`);
          }
        } else {
          console.log(`   ⚠️  Unknown response format`);
          console.log(`   First 200 chars: ${response.data.substring(0, 200)}...`);
        }
        
      } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error("❌ Test error:", error);
  }
}

testAllDashboardEndpoints();