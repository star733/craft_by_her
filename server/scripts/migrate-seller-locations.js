/**
 * Migration script to populate seller location from SellerApplication to User model
 * 
 * Run this script once to migrate location data for existing sellers:
 * node server/scripts/migrate-seller-locations.js
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

// Require models (adjust path if needed)
const User = require(path.resolve(__dirname, '../models/User'));
const SellerApplication = require(path.resolve(__dirname, '../models/SellerApplication'));
const { geocodeAddress } = require(path.resolve(__dirname, '../utils/locationUtils'));

async function migrateSellerLocations() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/foodily';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all approved seller applications with address
    const applications = await SellerApplication.find({
      status: 'approved',
      'address.pincode': { $exists: true, $ne: '' }
    });

    console.log(`\n📋 Found ${applications.length} approved seller applications with addresses`);

    let migrated = 0;
    let alreadyHasLocation = 0;
    let needsGeocoding = 0;
    let errors = 0;

    for (const application of applications) {
      try {
        // Find the corresponding user
        const user = await User.findOne({ uid: application.userId, role: 'seller' });
        
        if (!user) {
          console.log(`⚠️  User not found for application ${application._id} (userId: ${application.userId})`);
          continue;
        }

        // Check if user already has location
        if (user.sellerLocation && 
            user.sellerLocation.coordinates && 
            user.sellerLocation.coordinates.latitude) {
          alreadyHasLocation++;
          console.log(`✓ User ${user.email} already has location`);
          continue;
        }

        // Check if application has location data
        let locationData = null;
        
        if (application.location && 
            application.location.coordinates && 
            application.location.coordinates.latitude) {
          // Application already has geocoded location
          locationData = {
            address: application.address,
            coordinates: application.location.coordinates,
            district: application.location.district
          };
        } else {
          // Need to geocode from address
          needsGeocoding++;
          const geocoded = geocodeAddress(application.address);
          
          if (geocoded.coordinates.latitude && geocoded.coordinates.longitude) {
            locationData = {
              address: geocoded.address,
              coordinates: geocoded.coordinates,
              district: geocoded.district
            };
            
            // Update application with geocoded location
            application.location = {
              coordinates: geocoded.coordinates,
              district: geocoded.district
            };
            await application.save();
          } else {
            console.log(`⚠️  Could not geocode address for ${user.email}`);
            errors++;
            continue;
          }
        }

        // Update user with location
        if (locationData) {
          user.sellerLocation = locationData;
          await user.save();
          migrated++;
          console.log(`✅ Migrated location for ${user.email} (${locationData.district || 'Unknown district'})`);
        }

      } catch (err) {
        console.error(`❌ Error processing application ${application._id}:`, err.message);
        errors++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ✓ Already had location: ${alreadyHasLocation}`);
    console.log(`   🔄 Needed geocoding: ${needsGeocoding}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📋 Total processed: ${applications.length}`);

    await mongoose.disconnect();
    console.log('\n✅ Migration completed. Disconnected from MongoDB.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
migrateSellerLocations();

