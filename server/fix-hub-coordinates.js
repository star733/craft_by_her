const mongoose = require('mongoose');
require('dotenv').config();

async function fixHubCoordinates() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodily-auth-app');
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🔧 FIXING HUB COORDINATES');
    console.log('=========================');
    
    const Hub = require('./models/Hub');
    
    // Kerala district coordinates (approximate central locations)
    const keralaCityCoordinates = {
      'Thiruvananthapuram': { latitude: 8.5241, longitude: 76.9366 },
      'Kollam': { latitude: 8.8932, longitude: 76.6141 },
      'Pathanamthitta': { latitude: 9.2648, longitude: 76.7870 },
      'Alappuzha': { latitude: 9.4981, longitude: 76.3388 },
      'Kottayam': { latitude: 9.5916, longitude: 76.5222 },
      'Idukki': { latitude: 9.8547, longitude: 76.9544 },
      'Ernakulam': { latitude: 9.9312, longitude: 76.2673 },
      'Thrissur': { latitude: 10.5276, longitude: 76.2144 },
      'Palakkad': { latitude: 10.7867, longitude: 76.6548 },
      'Malappuram': { latitude: 11.0410, longitude: 76.0788 },
      'Kozhikode': { latitude: 11.2588, longitude: 75.7804 },
      'Wayanad': { latitude: 11.6854, longitude: 76.1320 },
      'Kannur': { latitude: 11.8745, longitude: 75.3704 },
      'Kasaragod': { latitude: 12.4996, longitude: 74.9869 }
    };
    
    console.log('📍 Updating hub coordinates...');
    
    let updatedCount = 0;
    
    for (const [district, coords] of Object.entries(keralaCityCoordinates)) {
      const result = await Hub.updateMany(
        { district: district },
        {
          $set: {
            'location.coordinates.latitude': coords.latitude,
            'location.coordinates.longitude': coords.longitude
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ Updated ${result.modifiedCount} hub(s) in ${district}: ${coords.latitude}, ${coords.longitude}`);
        updatedCount += result.modifiedCount;
      }
    }
    
    console.log(`\n🎉 Successfully updated ${updatedCount} hubs with proper coordinates`);
    
    // Verify the updates
    console.log('\n🔍 Verifying updates...');
    const updatedHubs = await Hub.find({ status: 'active' })
      .select('hubId name district location.coordinates');
    
    console.log('Updated hub coordinates:');
    updatedHubs.forEach(hub => {
      const coords = hub.location?.coordinates;
      if (coords && coords.latitude !== 0 && coords.longitude !== 0) {
        console.log(`✅ ${hub.name}: ${coords.latitude}, ${coords.longitude}`);
      } else {
        console.log(`❌ ${hub.name}: Still has invalid coordinates`);
      }
    });
    
    // Test distance calculation for Kanjirapally seller
    console.log('\n📏 Testing distance calculation for Kanjirapally seller...');
    const { calculateDistance } = require('./utils/locationUtils');
    
    const kanjirapallyLat = 9.5583;
    const kanjirapallyLon = 76.7917;
    
    const hubsWithValidCoords = updatedHubs.filter(hub => 
      hub.location?.coordinates?.latitude !== 0 && hub.location?.coordinates?.longitude !== 0
    );
    
    if (hubsWithValidCoords.length > 0) {
      console.log(`\nDistances from Kanjirapally (${kanjirapallyLat}, ${kanjirapallyLon}) to hubs:`);
      
      const hubDistances = hubsWithValidCoords.map(hub => {
        const distance = calculateDistance(
          kanjirapallyLat, kanjirapallyLon,
          hub.location.coordinates.latitude, hub.location.coordinates.longitude
        );
        return { hub, distance };
      }).sort((a, b) => a.distance - b.distance);
      
      hubDistances.forEach(({ hub, distance }) => {
        console.log(`- ${hub.name}: ${distance.toFixed(2)} km`);
      });
      
      const nearestHub = hubDistances[0];
      console.log(`\n🎯 Nearest hub: ${nearestHub.hub.name} (${nearestHub.distance.toFixed(2)} km)`);
    }
    
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    console.log('\n✅ HUB COORDINATES FIX COMPLETE!');
    console.log('The seller should now be able to find nearby hubs.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

fixHubCoordinates();