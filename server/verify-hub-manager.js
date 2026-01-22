// Verify hub manager credentials work
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import models
const HubManager = require('./models/HubManager');

async function verifyHubManager() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const email = 'mikkygo57@gmail.com';
    const password = 'hub@1234';

    console.log('🔍 Looking for hub manager with email:', email);
    
    // Find manager by email
    const manager = await HubManager.findOne({ 
      email: email.toLowerCase().trim()
    });
    
    if (!manager) {
      console.log('❌ Hub Manager not found');
      process.exit(1);
    }
    
    console.log('✅ Hub Manager found:', {
      managerId: manager.managerId,
      name: manager.name,
      email: manager.email,
      status: manager.status
    });
    
    // Check if manager is active
    if (manager.status !== 'active') {
      console.log('❌ Hub Manager not active, status:', manager.status);
      process.exit(1);
    }
    
    // Verify password
    console.log('🔐 Verifying password...');
    const isPasswordValid = await manager.comparePassword(password);
    console.log('Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      process.exit(1);
    }
    
    console.log('✅ Hub Manager credentials are working!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('🆔 Manager ID:', manager.managerId);
    console.log('👤 Name:', manager.name);
    console.log('📱 Phone:', manager.phone);
    console.log('🏢 Hub ID:', manager.hubId);
    console.log('🌍 District:', manager.district);
    
    console.log('\n🎯 The hub manager login should work with these credentials!');
    console.log('🔗 Login URL: http://localhost:5173/hub-manager/login');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyHubManager();