const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function createManager() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/foodily-auth');
    console.log('✅ Connected to MongoDB');

    const HubManager = require('./models/HubManager');
    const Hub = require('./models/Hub');

    // Check if hubs exist
    let hub = await Hub.findOne();
    if (!hub) {
      console.log('Creating hub first...');
      hub = await Hub.create({
        hubId: 'HUB0001',
        name: 'Kozhikode Central Hub',
        location: {
          district: 'Kozhikode',
          state: 'Kerala',
          address: 'Central Hub, Kozhikode',
          pincode: '673001',
          coordinates: { lat: 11.2588, lng: 75.7804 }
        },
        capacity: 1000,
        currentLoad: 0,
        status: 'active'
      });
      console.log('✅ Hub created:', hub.name);
    }

    // Check if manager exists
    const existing = await HubManager.findOne({ email: 'mikkygo57@gmail.com' });
    if (existing) {
      console.log('\n⚠️  Manager already exists!');
      console.log('Email:', existing.email);
      console.log('Manager ID:', existing.managerId);
      console.log('\nYou can login with:');
      console.log('Email: mikkygo57@gmail.com');
      console.log('Password: hub@1234');
    } else {
      // Create new manager
      const hashedPassword = await bcrypt.hash('hub@1234', 10);
      
      const lastManager = await HubManager.findOne().sort({ managerId: -1 });
      const managerCount = lastManager ? parseInt(lastManager.managerId.replace('HM', '')) : 0;
      const newManagerId = 'HM' + String(managerCount + 1).padStart(4, '0');

      const manager = await HubManager.create({
        managerId: newManagerId,
        name: 'hub manager',
        email: 'mikkygo57@gmail.com',
        phone: '1234567890',
        username: 'hubmanager2',
        password: hashedPassword,
        hubId: hub._id,
        district: hub.location.district,
        status: 'active'
      });

      console.log('\n✅ Hub Manager Created Successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 Email:', manager.email);
      console.log('🔑 Password: hub@1234');
      console.log('🆔 Manager ID:', manager.managerId);
      console.log('🏢 Hub:', hub.name);
      console.log('📍 District:', hub.location.district);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n🌐 Login at: http://localhost:5173/hub-manager/login');
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createManager();
