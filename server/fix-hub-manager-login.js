// Fix hub manager login issue
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import models
const HubManager = require('./models/HubManager');

async function fixHubManagerLogin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const email = 'mikkygo57@gmail.com';
    const password = 'hub@1234';

    console.log('🔧 Fixing hub manager login...');

    // Find or create the hub manager
    let manager = await HubManager.findOne({ email: email.toLowerCase() });

    if (!manager) {
      console.log('Creating new hub manager...');
      
      // Generate managerId
      const count = await HubManager.countDocuments();
      const managerId = `HM${String(count + 1).padStart(4, '0')}`;

      manager = new HubManager({
        managerId,
        name: 'Hub Manager',
        email: email.toLowerCase(),
        phone: '7654321098',
        username: 'hubmanager' + Date.now(), // Make unique
        password: password, // This will be hashed by the model
        status: 'active',
        createdBy: 'admin_fix'
      });
    } else {
      console.log('Updating existing hub manager...');
      // Manually hash the password to ensure it's correct
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      manager.password = hashedPassword;
      manager.status = 'active';
    }

    await manager.save();

    console.log('✅ Hub manager saved successfully');
    console.log('Manager details:', {
      managerId: manager.managerId,
      name: manager.name,
      email: manager.email,
      status: manager.status
    });

    // Test the password
    console.log('🔐 Testing password...');
    const isPasswordValid = await bcrypt.compare(password, manager.password);
    console.log('Password test result:', isPasswordValid);

    if (isPasswordValid) {
      console.log('✅ Password is working correctly!');
    } else {
      console.log('❌ Password still not working');
    }

    console.log('\n🎯 LOGIN CREDENTIALS (FIXED):');
    console.log('  Email: mikkygo57@gmail.com');
    console.log('  Password: hub@1234');
    console.log('\n🔗 LOGIN URL:');
    console.log('  http://localhost:5173/hub-manager/login');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixHubManagerLogin();