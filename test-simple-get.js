// Simple test to check server connectivity
const http = require('http');

function testSimpleGet() {
  const req = http.get('http://localhost:5000/', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('✅ Server is responding');
      console.log('Status:', res.statusCode);
      console.log('Response:', data);
      
      // Now test the hub-notifications test endpoint
      testNotificationsEndpoint();
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Server connection error:', error.message);
  });
}

function testNotificationsEndpoint() {
  console.log('\n🧪 Testing hub-notifications test endpoint...');
  
  const req = http.get('http://localhost:5000/api/hub-notifications/test', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', data);
      
      if (res.statusCode === 200) {
        console.log('✅ Hub notifications route is working!');
        
        // Now test with a managerId
        testWithManagerId();
      } else {
        console.log('❌ Hub notifications route failed');
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Notifications endpoint error:', error.message);
  });
}

function testWithManagerId() {
  console.log('\n🧪 Testing hub-notifications with managerId...');
  
  // Use the known manager ID from the database
  const managerId = 'HM0001';
  const url = `http://localhost:5000/api/hub-notifications?managerId=${managerId}`;
  
  console.log('URL:', url);
  
  const req = http.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', data);
      
      try {
        const jsonData = JSON.parse(data);
        if (res.statusCode === 200 && jsonData.success) {
          console.log('✅ Notifications fetched successfully!');
          console.log('Count:', jsonData.notifications?.length || 0);
          console.log('Unread:', jsonData.unreadCount || 0);
          
          if (jsonData.notifications?.length > 0) {
            console.log('\n📋 Notifications:');
            jsonData.notifications.forEach((notification, index) => {
              console.log(`${index + 1}. ${notification.title} (${notification.read ? 'Read' : 'Unread'})`);
            });
          }
        } else {
          console.log('❌ Notifications failed:', jsonData);
        }
      } catch (e) {
        console.log('❌ JSON parse error:', e.message);
        console.log('Raw response:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Manager ID test error:', error.message);
  });
}

console.log('🧪 Testing server connectivity...');
testSimpleGet();