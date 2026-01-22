const http = require('http');

console.log('\n🔍 Testing /api/hubs/all-with-stats endpoint...\n');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/hubs/all-with-stats',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`✅ STATUS: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📦 RESPONSE:');
    console.log(data);
    console.log('');
  });
});

req.on('error', (e) => {
  console.error(`❌ ERROR: ${e.message}`);
});

req.end();
