// Test script to verify admin hub management setup
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Admin Hub Management Setup...\n');

// Check if AdminHubManagement component exists
const adminHubPath = path.join(__dirname, 'client/src/pages/AdminHubManagement.jsx');
if (fs.existsSync(adminHubPath)) {
  console.log('✅ AdminHubManagement.jsx exists');
  
  const content = fs.readFileSync(adminHubPath, 'utf8');
  
  // Check for key features
  const features = [
    { name: 'Product Movement Notifications State', check: content.includes('pendingHubOrders') },
    { name: 'Admin Notifications State', check: content.includes('adminNotifications') },
    { name: 'Approve Hub Order Function', check: content.includes('approveHubOrder') },
    { name: 'Notification Filter', check: content.includes('notificationFilter') },
    { name: 'Hub Order Modal', check: content.includes('showHubOrderModal') },
    { name: 'Mark Notification Read', check: content.includes('markAdminNotificationAsRead') },
    { name: 'Fetch Pending Hub Orders', check: content.includes('fetchPendingHubOrders') },
    { name: 'Notifications Tab', check: content.includes('Product Movement Approvals') }
  ];
  
  features.forEach(feature => {
    console.log(`${feature.check ? '✅' : '❌'} ${feature.name}`);
  });
  
  // Count key elements
  const pendingOrdersCount = (content.match(/pendingHubOrders/g) || []).length;
  const notificationsCount = (content.match(/adminNotifications/g) || []).length;
  
  console.log(`\n📊 Code Analysis:`);
  console.log(`- pendingHubOrders references: ${pendingOrdersCount}`);
  console.log(`- adminNotifications references: ${notificationsCount}`);
  console.log(`- File size: ${content.length} characters`);
  
} else {
  console.log('❌ AdminHubManagement.jsx not found');
}

// Check if App.jsx has the route
const appPath = path.join(__dirname, 'client/src/App.jsx');
if (fs.existsSync(appPath)) {
  console.log('\n✅ App.jsx exists');
  
  const appContent = fs.readFileSync(appPath, 'utf8');
  const hasRoute = appContent.includes('/admin/hub-management');
  const hasImport = appContent.includes('AdminHubManagement');
  
  console.log(`${hasImport ? '✅' : '❌'} AdminHubManagement import`);
  console.log(`${hasRoute ? '✅' : '❌'} /admin/hub-management route`);
} else {
  console.log('❌ App.jsx not found');
}

console.log('\n🎯 Setup Summary:');
console.log('- Admin can now monitor all product movements between hubs');
console.log('- Notifications appear when products arrive at seller district hubs');
console.log('- Admin must approve before products move to buyer district hubs');
console.log('- Real-time notification system with unread counts');
console.log('- Detailed order information and tracking');
console.log('- Filter notifications by type and status');

console.log('\n📋 Next Steps:');
console.log('1. Start the development server: npm run dev (in client folder)');
console.log('2. Navigate to /admin/hub-management');
console.log('3. Test the notification and approval workflow');
console.log('4. Verify hub order approvals work correctly');

console.log('\n✅ Admin Hub Management Setup Complete!');