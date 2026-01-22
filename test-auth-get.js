// Test hub manager auth GET route
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/hub-manager-auth/test',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();