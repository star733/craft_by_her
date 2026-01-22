const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function addSellerLocations() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const User = require('./models/User');
    const Hub = require('./models/Hub');

    // Find all sellers
    const sellers = await User.find({ role: 'seller' });
    console.log(`\n📦 Found ${sellers.length} seller(s)`);

    if (sellers.length === 0) {
      console.log('❌ No sellers found');
      process.exit(1);
    }

    // Get all active hubs
    const hubs = await Hub.find({ status: 'active' });
    console.log(`📍 Found ${hubs.length} active hub(s)\n`);

    // Assign default locations to sellers without location
    for (const seller of sellers) {
      console.log(`\n👤 Seller: ${seller.email}`);
      
      // Add name if missing
      if (!seller.name) {
        seller.name = seller.email.split('@')[0];
        console.log(`  ✅ Added name: ${seller.name}`);
      }
      
      if (!seller.city || !seller.state) {
        // Assign default Kerala location
        seller.city = 'Kozhikode';
        seller.state = 'Kerala';
        seller.district = 'Kozhikode';
        await seller.save();
        console.log(`  ✅ Added location: ${seller.city}, ${seller.district}, ${seller.state}`);
      } else {
        console.log(`  ℹ️  Already has location: ${seller.city}, ${seller.state}`);
      }

      // Find nearest hub (for now, just find any hub in Kerala)
      const nearestHub = hubs.find(h => h.district === seller.district) || hubs[0];
      
      if (nearestHub) {
        console.log(`  📍 Nearest hub: ${nearestHub.name} (${nearestHub.district})`);
      } else {
        console.log(`  ⚠️  No hubs found`);
      }
    }

    console.log('\n✅ All sellers updated with locations!');
    console.log('\n📋 SELLER LOCATIONS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const updatedSellers = await User.find({ role: 'seller' });
    updatedSellers.forEach(s => {
      console.log(`${s.email}: ${s.city}, ${s.district}, ${s.state}`);
    });
    
    console.log('\n📋 AVAILABLE HUBS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    hubs.forEach(h => {
      console.log(`${h.name}: ${h.district}, Kerala`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addSellerLocations();
