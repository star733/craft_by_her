# Seller Location Migration Scripts

## Quick Start

### Option 1: Run Migration Script (Recommended)
```bash
# From project root
node server/scripts/migrate-seller-locations.js
```

### Option 2: Automatic Migration (Lazy Loading)
The system will automatically migrate location data when sellers try to access hub features. No action needed - just works!

## What Gets Migrated

1. **Location from SellerApplication → User model**
   - Address details (street, city, state, pincode)
   - Coordinates (latitude, longitude)
   - District name

2. **Geocoding**
   - If location coordinates are missing, addresses are geocoded using pincode
   - District is determined from pincode or city name

## Migration Output

The script will show:
- ✅ Number of sellers migrated
- ✓ Number of sellers who already had location
- 🔄 Number of addresses that needed geocoding
- ❌ Number of errors encountered

## Requirements

- MongoDB connection (uses MONGO_URI from .env)
- Approved seller applications with address data
- Valid pincodes in location database

## Troubleshooting

**Error: "Could not geocode address"**
- Check if pincode exists in location database
- Ensure pincode is in correct format (6 digits)

**Error: "User not found"**
- Seller application exists but User model entry missing
- User may need to login once to create User entry

**No sellers migrated**
- Check if any sellers have approved applications
- Verify applications have pincode in address field








