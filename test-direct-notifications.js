// Test the direct hub-notifications endpoint
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
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({ 
            status: res.statusCode, 
            ok: res.statusCode < 400, 
            json: () => jsonData,
            text: () => data
          });
        } catch (e) {
          resolve({ 
            status: res.statusCode, 
            ok: res.statusCode < 400, 
            text: () => data,
            json: () => ({ error: 'Invalid JSON response' })
          });
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function testDirectNotifications() {
  try {
    console.log("🧪 Testing Direct Hub Notifications API\n");
    
    // First, let's get the hub manager ID
    console.log("1. Getting hub manager login to find managerId...");
    const loginResponse = await makeRequest("http://localhost:5000/api/hub-managers/login", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'hubmanager@test.com',
        password: 'test123'
      })
    });
    
    const loginData = loginResponse.json();
    console.log(`   Login Status: ${loginResponse.status}`);
    
    if (loginResponse.ok && loginData.success) {
      const managerId = loginData.manager?.managerId;
      console.log(`   ✅ Manager ID: ${managerId}`);
      
      // Test the hub-notifications endpoint
      console.log("\n2. Testing /api/hub-notifications endpoint...");
      const notificationsUrl = `http://localhost:5000/api/hub-notifications?managerId=${managerId}`;
      console.log(`   URL: ${notificationsUrl}`);
      
      const notificationsResponse = await makeRequest(notificationsUrl);
      
      console.log(`   Status: ${notificationsResponse.status}`);
      const notificationsData = notificationsResponse.json();
      console.log(`   Response:`, JSON.stringify(notificationsData, null, 2));
      
      if (notificationsResponse.ok && notificationsData.success) {
        console.log(`   ✅ Notifications fetched successfully!`);
        console.log(`   Count: ${notificationsData.notifications?.length || 0}`);
        console.log(`   Unread: ${notificationsData.unreadCount || 0}`);
        
        if (notificationsData.notifications?.length > 0) {
          console.log("\n   📋 Recent notifications:");
          notificationsData.notifications.slice(0, 3).forEach((notification, index) => {
            console.log(`     ${index + 1}. ${notification.title}`);
            console.log(`        Message: ${notification.message}`);
            console.log(`        Read: ${notification.read ? 'Yes' : 'No'}`);
            console.log(`        Created: ${new Date(notification.createdAt).toLocaleString()}`);
            console.log("");
          });
        }
      } else {
        console.log(`   ❌ Notifications failed: ${JSON.stringify(notificationsData)}`);
      }
      
      // Test the test endpoint
      console.log("3. Testing /api/hub-notifications/test endpoint...");
      const testResponse = await makeRequest("http://localhost:5000/api/hub-notifications/test");
      
      console.log(`   Test Status: ${testResponse.status}`);
      const testData = testResponse.json();
      console.log(`   Test Response:`, JSON.stringify(testData, null, 2));
      
    } else {
      console.log(`   ❌ Login failed: ${JSON.stringify(loginData)}`);
    }
    
  } catch (error) {
    console.error("❌ Test error:", error);
  }
}

testDirectNotifications();