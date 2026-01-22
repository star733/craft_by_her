// Test central hub manager login
const http = require('http');

const postData = JSON.stringify({
  username: 'centralmanager',
  password: 'central123'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/central-hub-manager/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
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

req.write(postData);
req.end();