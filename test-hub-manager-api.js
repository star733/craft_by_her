// Test hub manager API endpoints
const http = require('http');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({ 
            status: res.statusCode, 
            ok: res.statusCode < 400, 
            json: () => jsonData,
            text: () => data,
            headers: res.headers
          });
        } catch (e) {
          resolve({ 
            status: res.statusCode, 
            ok: res.statusCode < 400, 
            text: () => data,
            json: () => ({ error: 'Invalid JSON response' }),
            headers: res.headers
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

const API_BASE = "http://localhost:5000";

async function testHubManagerAPI() {
  try {
    console.log("🧪 Testing Hub Manager API\n");
    
    // Test 1: Login to get token
    console.log("1. Testing hub manager login...");
    const loginResponse = await makeRequest(`${API_BASE}/api/hub-manager-auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'hubmanager@test.com',
        password: 'test123'
      })
    });
    
    console.log(`   Login Status: ${loginResponse.status}`);
    const loginData = loginResponse.json();
    
    if (loginResponse.ok && loginData.success) {
      console.log(`   ✅ Login successful for: ${loginData.manager?.name}`);
      console.log(`   Token: ${loginData.token ? loginData.token.substring(0, 20) + '...' : 'NO TOKEN'}`);
      
      const token = loginData.token;
      
      // Debug: Save token to file for manual testing
      require('fs').writeFileSync('debug-token.txt', token);
      console.log("   💾 Token saved to debug-token.txt");
      
      // Test 2: Test notifications route
      console.log("\n2. Testing test-notifications endpoint...");
      const testResponse = await makeRequest(`${API_BASE}/api/hub-managers/test-notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`   Test Status: ${testResponse.status}`);
      const testData = testResponse.json();
      console.log(`   Test Response:`, JSON.stringify(testData, null, 2));
      
      // Test 3: Get notifications
      // Test 3: Get notifications
      console.log("\n3. Testing notifications endpoint...");
      console.log(`   Using token: ${token.substring(0, 30)}...`);
      
      const notificationsResponse = await makeRequest(`${API_BASE}/api/hub-managers/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`   Notifications Status: ${notificationsResponse.status}`);
      console.log(`   Response headers:`, notificationsResponse.headers);
      const notificationsData = notificationsResponse.json();
      console.log(`   Response body:`, JSON.stringify(notificationsData, null, 2));
      
      if (notificationsResponse.ok) {
        console.log(`   ✅ Notifications fetched successfully`);
        console.log(`   Count: ${notificationsData.notifications?.length || 0}`);
        console.log(`   Unread: ${notificationsData.unreadCount || 0}`);
        
        if (notificationsData.notifications?.length > 0) {
          console.log("   Recent notifications:");
          notificationsData.notifications.slice(0, 3).forEach(notification => {
            console.log(`     - ${notification.title} (${notification.read ? 'Read' : 'Unread'})`);
          });
        }
      } else {
        console.log(`   ❌ Notifications failed: ${JSON.stringify(notificationsData)}`);
      }
      
      // Test 4: Get dashboard stats
      console.log("\n4. Testing dashboard stats endpoint...");
      const statsResponse = await makeRequest(`${API_BASE}/api/hub-managers/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`   Stats Status: ${statsResponse.status}`);
      console.log(`   Stats headers:`, statsResponse.headers);
      const statsData = statsResponse.json();
      console.log(`   Stats body:`, JSON.stringify(statsData, null, 2).substring(0, 200) + "...");
      
      if (statsResponse.ok) {
        console.log(`   ✅ Stats fetched successfully`);
      } else {
        console.log(`   ❌ Stats failed: ${JSON.stringify(statsData)}`);
      }
      
    } else {
      console.log(`   ❌ Login failed: ${JSON.stringify(loginData)}`);
    }
    
    console.log("\n🎯 Test Summary:");
    console.log("   - If login works but notifications fail: Token/auth issue");
    console.log("   - If notifications work: Frontend issue");
    console.log("   - If login fails: Credentials issue");
    
  } catch (error) {
    console.error("❌ Test error:", error);
  }
}

testHubManagerAPI();