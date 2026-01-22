// Test requiring hub managers route
try {
  console.log('Testing require of hubManagers.js...');
  const hubManagersRoute = require('./server/routes/hubManagers');
  console.log('✅ hubManagers.js loaded successfully');
  console.log('Type:', typeof hubManagersRoute);
} catch (error) {
  console.error('❌ Error requiring hubManagers.js:', error.message);
  console.error('Stack:', error.stack);
}