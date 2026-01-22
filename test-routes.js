// Test available routes
const http = require('http');

async function testRoute(path, method = 'GET') {
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
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data,
          headers: res.headers
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        status: 'ERROR',
        error: error.message
      });
    });
    
    if (method === 'POST') {
      req.write('{}');
    }
    req.end();
  });
}

async function testRoutes() {
  console.log('🧪 Testing available routes...\n');
  
  const routes = [
    { path: '/', method: 'GET' },
    { path: '/api/hub-managers', method: 'GET' },
    { path: '/api/hub-managers/login', method: 'POST' },
    { path: '/api/central-hub-manager/login', method: 'POST' }
  ];
  
  for (const route of routes) {
    console.log(`Testing ${route.method} ${route.path}:`);
    const result = await testRoute(route.path, route.method);
    console.log(`  Status: ${result.status}`);
    if (result.data) {
      try {
        const parsed = JSON.parse(result.data);
        console.log(`  Response: ${JSON.stringify(parsed, null, 2)}`);
      } catch {
        console.log(`  Response: ${result.data.substring(0, 100)}...`);
      }
    }
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
    console.log('');
  }
}

testRoutes();