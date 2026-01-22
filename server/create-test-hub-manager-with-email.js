// Script to create a test hub manager and send credentials email
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import models and services
const HubManager = require('./models/HubManager');
const Hub = require('./models/Hub');
const { sendHubManagerCredentials } = require('./utils/hubManagerEmailService');

async function createTestHubManager() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Check if test manager already exists
    const existingManager = await HubManager.findOne({ 
      email: 'testhubmanager@gmail.com' 
    });

    if (existingManager) {
      console.log('⚠️ Test hub manager already exists');
      console.log('Manager details:', {
        name: existingManager.name,
        email: existingManager.email,
        managerId: existingManager.managerId,
        status: existingManager.status
      });
      
      // Send email again for testing
      console.log('📧 Sending credentials email again for testing...');
      const emailData = {
        name: existingManager.name,
        email: existingManager.email,
        password: 'hubmanager123', // Plain password for email
        phone: existingManager.phone,
        managerId: existingManager.managerId,
        hubName: existingManager.hubName || null,
        district: existingManager.district || null
      };

      const emailResult = await sendHubManagerCredentials(emailData);

      if (emailResult.success) {
        console.log('✅ Credentials email sent successfully!');
      } else {
        console.error('❌ Failed to send email:', emailResult.error);
      }
      
      process.exit(0);
    }

    // Get a hub to assign (optional)
    const availableHub = await Hub.findOne({ managerId: { $exists: false } });
    
    // Generate managerId
    const count = await HubManager.countDocuments();
    const managerId = `HM${String(count + 1).padStart(4, '0')}`;

    // Create test hub manager
    console.log('🔧 Creating test hub manager...');
    
    const managerData = {
      managerId,
      name: 'Test Hub Manager',
      email: 'testhubmanager@gmail.com',
      phone: '8765432109', // Different phone number
      username: 'testhubmanager',
      password: 'hubmanager123',
      hubId: availableHub?.hubId || null,
      hubName: availableHub?.name || '',
      district: availableHub?.district || '',
      status: 'active',
      createdBy: 'admin_test'
    };

    const manager = new HubManager(managerData);
    await manager.save();

    console.log('✅ Test hub manager created:', {
      managerId: manager.managerId,
      name: manager.name,
      email: manager.email,
      hubAssigned: manager.hubName || 'None'
    });

    // Update hub if assigned
    if (availableHub) {
      await Hub.findOneAndUpdate(
        { hubId: availableHub.hubId },
        { 
          $set: { 
            managerId: manager.managerId,
            managerName: manager.name
          } 
        }
      );
      console.log(`✅ Hub ${availableHub.name} assigned to manager`);
    }

    // Send credentials email
    console.log('📧 Sending credentials email...');
    
    const emailData = {
      name: manager.name,
      email: manager.email,
      password: 'hubmanager123', // Plain password for email
      phone: manager.phone,
      managerId: manager.managerId,
      hubName: manager.hubName || null,
      district: manager.district || null
    };

    const emailResult = await sendHubManagerCredentials(emailData);

    if (emailResult.success) {
      console.log('✅ Credentials email sent successfully!');
    } else {
      console.error('❌ Failed to send email:', emailResult.error);
    }

    console.log('\n📋 Test Hub Manager Details:');
    console.log('  - Name: Test Hub Manager');
    console.log('  - Email: testhubmanager@gmail.com');
    console.log('  - Password: hubmanager123');
    console.log('  - Manager ID:', managerId);
    console.log('  - Status: active');
    if (availableHub) {
      console.log('  - Assigned Hub:', availableHub.name);
      console.log('  - District:', availableHub.district);
    }

    console.log('\n🧪 Test Instructions:');
    console.log('1. Check the email inbox for credentials');
    console.log('2. Go to: http://localhost:5173/hub-manager/login');
    console.log('3. Login with: testhubmanager@gmail.com / hubmanager123');
    console.log('4. Verify the hub manager dashboard works');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestHubManager();