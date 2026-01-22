// Script to create hub manager with specific email and password
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import models
const HubManager = require('./models/HubManager');
const Hub = require('./models/Hub');

async function createSpecificHubManager() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const email = 'mikkygo57@gmail.com';
    const password = 'hub@1234';

    // Check if manager already exists
    const existingManager = await HubManager.findOne({ email });

    if (existingManager) {
      console.log('⚠️ Hub manager already exists with this email');
      console.log('Updating password...');
      
      // Update the existing manager
      existingManager.password = password;
      existingManager.status = 'active';
      await existingManager.save();
      
      console.log('✅ Hub manager updated successfully!');
      console.log('Manager details:', {
        name: existingManager.name,
        email: existingManager.email,
        managerId: existingManager.managerId,
        status: existingManager.status
      });
    } else {
      // Create new manager
      console.log('🔧 Creating new hub manager...');
      
      // Generate managerId
      const count = await HubManager.countDocuments();
      const managerId = `HM${String(count + 1).padStart(4, '0')}`;

      // Get an available hub (optional)
      const availableHub = await Hub.findOne({ managerId: { $exists: false } });
      
      const managerData = {
        managerId,
        name: 'Hub Manager',
        email: email,
        phone: '7654321098', // Unique phone number
        username: 'hubmanager',
        password: password,
        hubId: availableHub?.hubId || null,
        hubName: availableHub?.name || '',
        district: availableHub?.district || '',
        status: 'active',
        createdBy: 'admin_direct'
      };

      const manager = new HubManager(managerData);
      await manager.save();

      console.log('✅ Hub manager created successfully!');
      console.log('Manager details:', {
        managerId: manager.managerId,
        name: manager.name,
        email: manager.email,
        status: manager.status,
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
    }

    console.log('\n🎯 LOGIN CREDENTIALS:');
    console.log('  Email: mikkygo57@gmail.com');
    console.log('  Password: hub@1234');
    console.log('\n🔗 LOGIN URL:');
    console.log('  http://localhost:5173/hub-manager/login');
    console.log('\n✅ Ready to login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createSpecificHubManager();