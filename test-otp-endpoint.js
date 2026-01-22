// Test OTP verification endpoint
const fetch = require('node-fetch');

async function testOTPVerification() {
  const orderId = 'ORD528653119';
  const otp = '719953';
  const url = `http://localhost:5000/api/delivery-otp/orders/${orderId}/verify-otp`;
  
  console.log('Testing URL:', url);
  console.log('OTP:', otp);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ otp })
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const text = await response.text();
    console.log('Response:', text);
    
    try {
      const json = JSON.parse(text);
      console.log('JSON Response:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Not JSON response');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testOTPVerification();
