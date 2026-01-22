const http = require('http');

function testAuthRoute() {
  console.log("🧪 Testing Hub Manager Auth Test Route...");
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/hub-manager-auth/test',
    method: 'GET'
  };
  
  const req = http.request(options, (res) => {
    console.log("Test route status:", res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log("Test route response:", data);
    });
  });
  
  req.on('error', (error) => {
    console.error("❌ Test route error:", error);
  });
  
  req.end();
}

testAuthRoute();