const http = require('http');

function testServerHealth() {
  console.log("🧪 Testing Server Health...");
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/',
    method: 'GET'
  };
  
  const req = http.request(options, (res) => {
    console.log("Health check status:", res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log("Health check response:", data);
      
      // Now test the hub manager login endpoint
      testHubManagerLogin();
    });
  });
  
  req.on('error', (error) => {
    console.error("❌ Health check error:", error);
  });
  
  req.end();
}

function testHubManagerLogin() {
  console.log("\n🧪 Testing Hub Manager Login API...");
  
  const postData = JSON.stringify({
    email: 'rajesh.hub@craftedbyher.com',
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
    console.log("Login response status:", res.statusCode);
    console.log("Login response headers:", res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log("Login response body:", data);
      
      try {
        const responseData = JSON.parse(data);
        console.log("Parsed response:", JSON.stringify(responseData, null, 2));
      } catch (error) {
        console.error("❌ Error parsing response:", error);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error("❌ Login request error:", error);
  });
  
  req.write(postData);
  req.end();
}

testServerHealth();