// Test new hub manager auth
const http = require('http');

async function testNewAuth() {
  try {
    console.log('🧪 Testing new hub manager auth...');
    
    const postData = JSON.stringify({
      email: 'mikkygo57@gmail.com',
      password: 'hub@1234'
    });
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/hub-manager-auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('Response status:', res.statusCode);
          console.log('Response data:', JSON.stringify(response, null, 2));
          
          if (res.statusCode === 200 && response.success) {
            console.log('✅ Hub manager auth is working!');
            console.log('Manager ID:', response.manager.managerId);
            console.log('Manager Name:', response.manager.name);
            console.log('Manager Email:', response.manager.email);
            console.log('Token received:', response.token ? 'Yes' : 'No');
          } else {
            console.log('❌ Login failed:', response.error);
          }
        } catch (parseError) {
          console.error('❌ Error parsing response:', parseError.message);
          console.log('Raw response:', data);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
    });
    
    req.write(postData);
    req.end();
    
  } catch (error) {
    console.error('❌ Error testing new auth:', error.message);
  }
}

testNewAuth();