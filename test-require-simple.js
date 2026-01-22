// Test requiring simple hub login route
try {
  console.log('Testing require of simpleHubLogin.js...');
  const simpleHubRoute = require('./server/routes/simpleHubLogin');
  console.log('✅ simpleHubLogin.js loaded successfully');
  console.log('Type:', typeof simpleHubRoute);
} catch (error) {
  console.error('❌ Error requiring simpleHubLogin.js:', error.message);
  console.error('Stack:', error.stack);
}