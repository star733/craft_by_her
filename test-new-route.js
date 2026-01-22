// Test new hub manager route
const http = require('http');

async function testRoute(path, method = 'GET', data = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: responseData
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        status: 'ERROR',
        error: error.message
      });
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testRoutes() {
  console.log('🧪 Testing new test routes...\n');
  
  // Test GET route
  console.log('Testing GET /api/test-hub-managers/test:');
  const getResult = await testRoute('/api/test-hub-managers/test', 'GET');
  console.log(`  Status: ${getResult.status}`);
  console.log(`  Response: ${getResult.data}`);
  console.log('');
  
  // Test POST login route
  console.log('Testing POST /api/test-hub-managers/login:');
  const postResult = await testRoute('/api/test-hub-managers/login', 'POST', {
    email: 'test@example.com',
    password: 'test123'
  });
  console.log(`  Status: ${postResult.status}`);
  console.log(`  Response: ${postResult.data}`);
}

testRoutes();