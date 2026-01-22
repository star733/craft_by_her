// Final fix for hub manager login
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import models
const HubManager = require('./models/HubManager');

async function fixHubManagerFinal() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const email = 'mikkygo57@gmail.com';
    const password = 'hub@1234';

    console.log('🔧 Final fix for hub manager login...');

    // Delete existing manager if exists
    await HubManager.deleteOne({ email: email.toLowerCase() });
    console.log('🗑️ Deleted existing manager');

    // Create fresh manager
    console.log('🆕 Creating fresh hub manager...');
    
    const count = await HubManager.countDocuments();
    const managerId = `HM${String(count + 1).padStart(4, '0')}`;

    const manager = new HubManager({
      managerId,
      name: 'Hub Manager',
      email: email.toLowerCase(),
      phone: '7654321099', // New unique phone
      username: 'hubmgr001', // Short unique username
      password: password, // Let the model hash this
      status: 'active',
      createdBy: 'admin_final_fix'
    });

    await manager.save();

    console.log('✅ Fresh hub manager created successfully');
    console.log('Manager details:', {
      managerId: manager.managerId,
      name: manager.name,
      email: manager.email,
      status: manager.status
    });

    // Test the password
    console.log('🔐 Testing password...');
    const isPasswordValid = await manager.comparePassword(password);
    console.log('Password test result:', isPasswordValid);

    if (isPasswordValid) {
      console.log('✅ Password is working correctly!');
      console.log('\n🎯 LOGIN CREDENTIALS (WORKING):');
      console.log('  Email: mikkygo57@gmail.com');
      console.log('  Password: hub@1234');
      console.log('\n🔗 LOGIN URL:');
      console.log('  http://localhost:5173/hub-manager/login');
      console.log('\n✅ Ready to login!');
    } else {
      console.log('❌ Password still not working');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixHubManagerFinal();