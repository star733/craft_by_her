const http = require('http');

console.log("🎯 TESTING COMPLETE HUB MANAGER WORKFLOW");
console.log("========================================");

// Step 1: Login as Central Hub Manager
function loginAsCentralHubManager() {
  console.log("\n1️⃣ Step 1: Login as Central Hub Manager");
  
  const postData = JSON.stringify({
    email: 'mikkygo57@gmail.com',
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
    console.log("   Login status:", res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const responseData = JSON.parse(data);
        
        if (responseData.success && responseData.token) {
          console.log("   ✅ Login successful!");
          console.log("   Manager:", responseData.manager.name);
          console.log("   Hub ID:", responseData.manager.hubId);
          
          // Step 2: Get dashboard stats
          getDashboardStats(responseData.token);
        } else {
          console.log("   ❌ Login failed:", responseData.error);
        }
      } catch (error) {
        console.error("   ❌ Error parsing login response:", error);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error("   ❌ Login request error:", error);
  });
  
  req.write(postData);
  req.end();
}

// Step 2: Get dashboard stats
function getDashboardStats(token) {
  console.log("\n2️⃣ Step 2: Get Dashboard Stats");
  
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
    console.log("   Stats status:", res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const statsData = JSON.parse(data);
        
        if (statsData.success) {
          console.log("   ✅ Stats retrieved successfully!");
          console.log("   📊 Stats:", {
            pending: statsData.stats.pending,
            atHub: statsData.stats.atHub,
            orders: statsData.stats.orders,
            dispatch: statsData.stats.dispatch,
            outForDelivery: statsData.stats.outForDelivery,
            delivered: statsData.stats.delivered
          });
          
          // Step 3: Get all hubs
          getAllHubs(token);
        } else {
          console.log("   ❌ Stats failed:", statsData.error);
        }
      } catch (error) {
        console.error("   ❌ Error parsing stats response:", error);
        console.log("   Raw response:", data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error("   ❌ Stats request error:", error);
  });
  
  req.end();
}

// Step 3: Get all hubs
function getAllHubs(token) {
  console.log("\n3️⃣ Step 3: Get All Hubs");
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/hubs/all-with-stats',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
  
  const req = http.request(options, (res) => {
    console.log("   Hubs status:", res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const hubsData = JSON.parse(data);
        
        if (hubsData.success) {
          console.log("   ✅ Hubs retrieved successfully!");
          console.log(`   🏢 Found ${hubsData.hubs.length} hubs:`);
          
          hubsData.hubs.forEach(hub => {
            console.log(`      - ${hub.name} (${hub.hubId}) - ${hub.district}`);
            console.log(`        Orders: ${hub.ordersAtHub}, Utilization: ${hub.utilization}%`);
          });
          
          // Step 4: Get notifications
          getNotifications(token);
        } else {
          console.log("   ❌ Hubs failed:", hubsData.error);
        }
      } catch (error) {
        console.error("   ❌ Error parsing hubs response:", error);
        console.log("   Raw response:", data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error("   ❌ Hubs request error:", error);
  });
  
  req.end();
}

// Step 4: Get notifications
function getNotifications(token) {
  console.log("\n4️⃣ Step 4: Get Notifications");
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/hub-notifications?managerId=HM0003',
    method: 'GET'
  };
  
  const req = http.request(options, (res) => {
    console.log("   Notifications status:", res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const notificationsData = JSON.parse(data);
        
        if (notificationsData.success) {
          console.log("   ✅ Notifications retrieved successfully!");
          console.log(`   🔔 Found ${notificationsData.notifications.length} notifications`);
          console.log(`   📬 Unread: ${notificationsData.unreadCount}`);
          
          if (notificationsData.notifications.length > 0) {
            console.log("   Recent notifications:");
            notificationsData.notifications.slice(0, 3).forEach(notification => {
              console.log(`      - ${notification.title}`);
              console.log(`        ${notification.message.substring(0, 80)}...`);
            });
          }
          
          // Final summary
          showFinalSummary();
        } else {
          console.log("   ❌ Notifications failed:", notificationsData.error);
        }
      } catch (error) {
        console.error("   ❌ Error parsing notifications response:", error);
        console.log("   Raw response:", data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error("   ❌ Notifications request error:", error);
  });
  
  req.end();
}

// Final summary
function showFinalSummary() {
  console.log("\n🎉 WORKFLOW TEST COMPLETE!");
  console.log("===========================");
  console.log("✅ All API endpoints are working correctly!");
  console.log("");
  console.log("🌐 Frontend URLs to test:");
  console.log("   Hub Manager Login: http://localhost:5174/hub-manager/login");
  console.log("   Hub Manager Dashboard: http://localhost:5174/hub-manager/dashboard");
  console.log("");
  console.log("🔑 Test Credentials:");
  console.log("   Email: mikkygo57@gmail.com");
  console.log("   Password: hub@1234");
  console.log("");
  console.log("📊 Expected Results:");
  console.log("   - Login should work");
  console.log("   - Dashboard should load with stats");
  console.log("   - Hub directory should show all hubs");
  console.log("   - Notifications should be accessible");
}

// Start the workflow test
loginAsCentralHubManager();