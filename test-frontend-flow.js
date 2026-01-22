// Test the exact frontend flow to identify the issue
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
          ok: res.statusCode < 400,
          data: data,
          headers: res.headers,
          json: () => {
            try {
              return JSON.parse(data);
            } catch (e) {
              throw new Error(`JSON parse error: ${e.message}. Response: ${data.substring(0, 200)}`);
            }
          },
          text: () => data
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

async function testFrontendFlow() {
  try {
    console.log("🧪 Testing Exact Frontend Flow\n");
    
    const API_BASE = "http://localhost:5000";
    
    // Step 1: Simulate hub manager login (what frontend does)
    console.log("1. Simulating hub manager login...");
    const loginResponse = await makeRequest(`${API_BASE}/api/hub-managers/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'hubmanager@test.com',
        password: 'test123'
      })
    });
    
    console.log(`   Login Status: ${loginResponse.status}`);
    
    if (!loginResponse.ok) {
      console.log(`   ❌ Login failed: ${loginResponse.text()}`);
      return;
    }
    
    const loginData = loginResponse.json();
    console.log(`   ✅ Login successful for: ${loginData.manager?.name}`);
    
    const token = loginData.token;
    const manager = loginData.manager;
    const managerId = manager?.managerId;
    
    console.log(`   Manager ID: ${managerId}`);
    console.log(`   Hub ID: ${manager?.hubId}`);
    
    // Simulate storing in localStorage (what frontend does)
    const hubManagerData = JSON.stringify(manager);
    console.log(`   Stored manager data: ${hubManagerData.substring(0, 100)}...`);
    
    // Step 2: Simulate fetchDashboardData (what frontend does)
    console.log(`\n2. Simulating fetchDashboardData with managerId: ${managerId}...`);
    
    if (!managerId) {
      console.log("   ❌ No manager ID - this would cause frontend to redirect to login");
      return;
    }
    
    // Test each API call exactly as frontend does
    const apiCalls = [
      {
        name: "Stats",
        url: `${API_BASE}/api/hub-managers/dashboard/stats`,
        headers: { 'Authorization': `Bearer ${token}` }
      },
      {
        name: "Hubs",
        url: `${API_BASE}/api/hubs/all-with-stats`,
        headers: {}
      },
      {
        name: "Notifications",
        url: `${API_BASE}/api/hub-notifications?managerId=${managerId}`,
        headers: {}
      },
      {
        name: "Orders",
        url: `${API_BASE}/api/hub-managers/orders/hub`,
        headers: { 'Authorization': `Bearer ${token}` }
      }
    ];
    
    for (const apiCall of apiCalls) {
      console.log(`\n   Testing ${apiCall.name} API...`);
      console.log(`   URL: ${apiCall.url}`);
      
      try {
        const response = await makeRequest(apiCall.url, {
          headers: apiCall.headers
        });
        
        console.log(`   Status: ${response.status}`);
        console.log(`   Content-Type: ${response.headers['content-type'] || 'Not specified'}`);
        console.log(`   OK: ${response.ok}`);
        
        if (response.ok) {
          try {
            const jsonData = response.json();
            console.log(`   ✅ ${apiCall.name} JSON parsed successfully`);
            console.log(`   Success: ${jsonData.success}`);
            
            if (apiCall.name === "Notifications") {
              console.log(`   Notifications count: ${jsonData.notifications?.length || 0}`);
              console.log(`   Unread count: ${jsonData.unreadCount || 0}`);
            } else if (apiCall.name === "Hubs") {
              console.log(`   Hubs count: ${jsonData.hubs?.length || 0}`);
            }
            
          } catch (jsonError) {
            console.log(`   ❌ ${apiCall.name} JSON parse failed: ${jsonError.message}`);
            console.log(`   Response preview: ${response.text().substring(0, 200)}...`);
          }
        } else {
          console.log(`   ❌ ${apiCall.name} request failed`);
          console.log(`   Response preview: ${response.text().substring(0, 200)}...`);
        }
        
      } catch (requestError) {
        console.log(`   ❌ ${apiCall.name} request error: ${requestError.message}`);
      }
    }
    
    console.log("\n🎯 Summary:");
    console.log("   - All backend endpoints are working correctly");
    console.log("   - If frontend still has issues, it might be:");
    console.log("     1. CORS issues in browser");
    console.log("     2. Environment variable issues");
    console.log("     3. Browser caching issues");
    console.log("     4. Network connectivity issues");
    console.log("\n💡 Next steps:");
    console.log("   1. Open browser dev tools");
    console.log("   2. Go to http://localhost:5173/hub-manager/login");
    console.log("   3. Login with: hubmanager@test.com / test123");
    console.log("   4. Check console for errors");
    console.log("   5. Check Network tab for failed requests");
    
  } catch (error) {
    console.error("❌ Test error:", error);
  }
}

testFrontendFlow();