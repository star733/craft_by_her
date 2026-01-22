const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const verify = require("../middleware/verifyFirebaseToken");
const verifySeller = require("../middleware/verifySeller");
const { geocodeAddress } = require("../utils/locationUtils");
const User = require("../models/User");
const SellerApplication = require("../models/SellerApplication");

// ✅ Get seller location
router.get("/", verify, verifySeller, async (req, res) => {
  console.log("📍 GET /api/seller/location - Request received");
  try {
    // Get seller from User model
    const seller = await User.findOne({ uid: req.user.uid });
    if (!seller) {
      return res.status(404).json({ 
        success: false,
        error: "Seller not found" 
      });
    }
    
    // Check if seller has location in User model
    let location = seller.sellerLocation;
    
    // If no location in User, try to get from SellerApplication
    if (!location || !location.coordinates || !location.coordinates.latitude) {
      const application = await SellerApplication.findOne({ userId: req.user.uid });
      
      if (application && application.location && application.location.coordinates) {
        // Location exists in application, copy it to User
        location = {
          address: application.address,
          coordinates: application.location.coordinates,
          district: application.location.district
        };
        
        // Update User with location from application
        await User.findByIdAndUpdate(seller._id, {
          sellerLocation: location
        });
        
        console.log(`✅ Migrated location for seller ${req.user.uid} from application`);
      } else {
        return res.status(404).json({
          success: false,
          error: "Seller location not found. Please update your location.",
          needsUpdate: true
        });
      }
    }
    
    res.json({
      success: true,
      location: location
    });
  } catch (err) {
    console.error("Error fetching seller location:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ Update seller location
router.put("/", verify, verifySeller, async (req, res) => {
  console.log("📍 PUT /api/seller/location - Request received");
  console.log("Request body:", JSON.stringify(req.body, null, 2));
  console.log("User from token:", req.user?.uid);
  
  try {
    const { address } = req.body;
    
    // Validate request body
    if (!address) {
      console.log("❌ No address in request body");
      return res.status(400).json({
        success: false,
        error: "Address is required"
      });
    }
    
    if (!address.pincode) {
      console.log("❌ No pincode in address");
      return res.status(400).json({
        success: false,
        error: "Pincode is required"
      });
    }
    
    // Validate pincode format
    if (address.pincode.length !== 6 || !/^\d{6}$/.test(address.pincode)) {
      console.log("❌ Invalid pincode format:", address.pincode);
      return res.status(400).json({
        success: false,
        error: "Pincode must be exactly 6 digits"
      });
    }
    
    console.log("✅ Address validation passed");
    console.log("Address to geocode:", JSON.stringify(address, null, 2));
    
    // Geocode the address
    const geocodedLocation = geocodeAddress(address);
    console.log("Geocoded location:", JSON.stringify(geocodedLocation, null, 2));
    
    if (!geocodedLocation.coordinates.latitude || !geocodedLocation.coordinates.longitude) {
      console.log("❌ Geocoding failed - no coordinates");
      return res.status(400).json({
        success: false,
        error: `Could not determine location from pincode ${address.pincode}. Please ensure it's a valid Kerala pincode.`
      });
    }
    
    console.log("✅ Geocoding successful");
    
    // Find seller in database
    const seller = await User.findOne({ uid: req.user.uid });
    if (!seller) {
      console.log("❌ Seller not found in database:", req.user.uid);
      return res.status(404).json({
        success: false,
        error: "Seller not found"
      });
    }
    
    console.log("✅ Seller found:", seller.email);
    
    const locationData = {
      address: geocodedLocation.address,
      coordinates: geocodedLocation.coordinates,
      district: geocodedLocation.district
    };
    
    console.log("Updating seller with location data:", JSON.stringify(locationData, null, 2));
    
    // Update User model
    const updateResult = await User.findByIdAndUpdate(
      seller._id, 
      { sellerLocation: locationData },
      { new: true }
    );
    
    if (!updateResult) {
      console.log("❌ Failed to update User model");
      return res.status(500).json({
        success: false,
        error: "Failed to update seller location"
      });
    }
    
    console.log("✅ User model updated successfully");
    
    // Also update SellerApplication if it exists
    const application = await SellerApplication.findOne({ userId: req.user.uid });
    if (application) {
      application.address = geocodedLocation.address;
      application.location = {
        coordinates: geocodedLocation.coordinates,
        district: geocodedLocation.district
      };
      await application.save();
      console.log("✅ SellerApplication updated as well");
    } else {
      console.log("ℹ️ No SellerApplication found to update");
    }
    
    console.log(`✅ Location update completed for seller ${req.user.uid}`);
    
    res.json({
      success: true,
      message: "Location updated successfully",
      location: locationData
    });
  } catch (err) {
    console.error("❌ Error updating seller location:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({
      success: false,
      error: `Server error: ${err.message}`
    });
  }
});

module.exports = router;

