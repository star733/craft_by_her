const express = require("express");
const router = express.Router();

// Seller location (Koovappally, Kerala)
const SELLER_LOCATION = {
  lat: 9.5341,
  lon: 76.7852,
  name: "Koovappally"
};

// Maximum delivery radius in kilometers
const MAX_DELIVERY_RADIUS_KM = 50;

// Kerala pincode to coordinates mapping - ALL Kottayam and nearby areas within 50km
const pincodeDatabase = {
  // Kottayam district - ALL pincodes
  "686001": { lat: 9.5916, lon: 76.5222, city: "Kottayam" },
  "686002": { lat: 9.6022, lon: 76.5328, city: "Kottayam" },
  "686003": { lat: 9.5916, lon: 76.5222, city: "Kottayam" },
  "686004": { lat: 9.5916, lon: 76.5222, city: "Kottayam" },
  "686005": { lat: 9.5916, lon: 76.5222, city: "Kottayam" },
  "686006": { lat: 9.5916, lon: 76.5222, city: "Kottayam" },
  "686007": { lat: 9.5916, lon: 76.5222, city: "Kottayam" },
  "686008": { lat: 9.5916, lon: 76.5222, city: "Kottayam" },
  "686009": { lat: 9.5916, lon: 76.5222, city: "Kottayam" },
  "686010": { lat: 9.5916, lon: 76.5222, city: "Kottayam" },
  "686011": { lat: 9.5916, lon: 76.5222, city: "Kottayam Medical College" },
  "686013": { lat: 9.5916, lon: 76.5222, city: "Kottayam" },
  "686014": { lat: 9.5916, lon: 76.5222, city: "Kottayam" },
  "686015": { lat: 9.5916, lon: 76.5222, city: "Kottayam" },
  "686016": { lat: 9.5916, lon: 76.5222, city: "Kottayam" },
  "686017": { lat: 9.5916, lon: 76.5222, city: "Kottayam" },
  "686018": { lat: 9.5916, lon: 76.5222, city: "Kottayam" },
  
  // Kanjirappally Taluk - COMPLETE
  "686507": { lat: 9.5583, lon: 76.7917, city: "Kanjirappally" },
  "686508": { lat: 9.5583, lon: 76.7917, city: "Kanjirappally" },
  "686509": { lat: 9.5583, lon: 76.7917, city: "Kanjirappally" },
  "686510": { lat: 9.5583, lon: 76.7917, city: "Mundakayam" },
  "686511": { lat: 9.5583, lon: 76.7917, city: "Mundakayam" },
  "686512": { lat: 9.6189, lon: 76.8369, city: "Mundakayam" },
  "686513": { lat: 9.6189, lon: 76.8369, city: "Erattupetta" },
  "686514": { lat: 9.6189, lon: 76.8369, city: "Erattupetta" },
  "686515": { lat: 9.5583, lon: 76.7917, city: "Kanjirappally" },
  "686516": { lat: 9.5500, lon: 76.8000, city: "Kanjirappally" },
  "686517": { lat: 9.5500, lon: 76.8000, city: "Kanjirappally" },
  "686518": { lat: 9.5500, lon: 76.8000, city: "Kanjirappally" },
  "686519": { lat: 9.5500, lon: 76.8000, city: "Kanjirappally" },
  "686520": { lat: 9.5500, lon: 76.8000, city: "Kanjirappally" },
  "686521": { lat: 9.5500, lon: 76.8000, city: "Chirakkadavu" },
  "686522": { lat: 9.5500, lon: 76.8000, city: "Mundakkayam" },
  "686540": { lat: 9.5341, lon: 76.7852, city: "Koovappally" },
  "686541": { lat: 9.5341, lon: 76.7852, city: "Koovappally" },
  "686542": { lat: 9.4800, lon: 76.7500, city: "Teekoy" },
  "686543": { lat: 9.4500, lon: 76.7200, city: "Manimala" },
  "686544": { lat: 9.4500, lon: 76.7200, city: "Manimala" },
  "686545": { lat: 9.4500, lon: 76.7200, city: "Manimala" },
  "686546": { lat: 9.4500, lon: 76.7200, city: "Manimala" },
  "686547": { lat: 9.4500, lon: 76.7200, city: "Manimala" },
  "686548": { lat: 9.4500, lon: 76.7200, city: "Manimala" },
  "686549": { lat: 9.4500, lon: 76.7200, city: "Manimala" },
  "686550": { lat: 9.4800, lon: 76.7000, city: "Pampady" },
  "686551": { lat: 9.4800, lon: 76.7000, city: "Pampady" },
  "686552": { lat: 9.4800, lon: 76.7000, city: "Pampady" },
  "686560": { lat: 9.5917, lon: 76.7167, city: "Kanjiramattom" },
  "686561": { lat: 9.5917, lon: 76.7167, city: "Kanjiramattom" },
  "686562": { lat: 9.5917, lon: 76.7167, city: "Kanjiramattom" },
  "686563": { lat: 9.5917, lon: 76.7167, city: "Kanjiramattom" },
  "686564": { lat: 9.5917, lon: 76.7167, city: "Kanjiramattom" },
  "686565": { lat: 9.5917, lon: 76.7167, city: "Kanjiramattom" },
  
  // Vaikom Taluk (within 50km)
  "686101": { lat: 9.7489, lon: 76.3956, city: "Vaikom" },
  "686102": { lat: 9.7489, lon: 76.3956, city: "Vaikom" },
  "686103": { lat: 9.7489, lon: 76.3956, city: "Vaikom" },
  "686104": { lat: 9.7489, lon: 76.3956, city: "Vaikom" },
  "686141": { lat: 9.7489, lon: 76.3956, city: "Vaikom" },
  "686143": { lat: 9.7489, lon: 76.3956, city: "Vaikom" },
  
  // Changanassery Taluk (within 50km)
  "686101": { lat: 9.4450, lon: 76.5500, city: "Changanassery" },
  "686531": { lat: 9.4450, lon: 76.5500, city: "Changanassery" },
  "686532": { lat: 9.4450, lon: 76.5500, city: "Changanassery" },
  "686533": { lat: 9.4450, lon: 76.5500, city: "Changanassery" },
  "686534": { lat: 9.4450, lon: 76.5500, city: "Changanassery" },
  "686535": { lat: 9.4450, lon: 76.5500, city: "Changanassery" },
  "686536": { lat: 9.4450, lon: 76.5500, city: "Changanassery" },
  "686537": { lat: 9.4450, lon: 76.5500, city: "Changanassery" },
  "686538": { lat: 9.4450, lon: 76.5500, city: "Changanassery" },
  "686539": { lat: 9.4450, lon: 76.5500, city: "Changanassery" },
  "686541": { lat: 9.4450, lon: 76.5500, city: "Changanassery" },
  
  // Pala Taluk (within 50km) - COMPLETE
  "686574": { lat: 9.7050, lon: 76.6800, city: "Pala" },
  "686575": { lat: 9.7050, lon: 76.6800, city: "Pala" },
  "686576": { lat: 9.7050, lon: 76.6800, city: "Pala" },
  "686577": { lat: 9.7050, lon: 76.6800, city: "Pala" },
  "686578": { lat: 9.7050, lon: 76.6800, city: "Pala" },
  "686579": { lat: 9.7050, lon: 76.6800, city: "Pala" },
  "686580": { lat: 9.7050, lon: 76.6800, city: "Pala" },
  "686651": { lat: 9.7050, lon: 76.6800, city: "Pala" },
  "686652": { lat: 9.7050, lon: 76.6800, city: "Pala" },
  "686653": { lat: 9.7050, lon: 76.6800, city: "Ramapuram" },
  "686654": { lat: 9.7050, lon: 76.6800, city: "Ramapuram" },
  
  // Ettumanoor (within 50km) - COMPLETE
  "686631": { lat: 9.6717, lon: 76.5539, city: "Ettumanoor" },
  "686632": { lat: 9.6717, lon: 76.5539, city: "Ettumanoor" },
  "686633": { lat: 9.6717, lon: 76.5539, city: "Ettumanoor" },
  "686634": { lat: 9.6717, lon: 76.5539, city: "Ettumanoor" },
  "686635": { lat: 9.6717, lon: 76.5539, city: "Ettumanoor" },
  
  // Meenachil Taluk - COMPLETE
  "686019": { lat: 9.5500, lon: 76.5500, city: "Kumarakom" },
  "686020": { lat: 9.5500, lon: 76.5500, city: "Kumarakom" },
  "686039": { lat: 9.6200, lon: 76.6200, city: "Puthuppally" },
  "686586": { lat: 9.6500, lon: 76.6500, city: "Erumely" },
  "686587": { lat: 9.6500, lon: 76.6500, city: "Erumely" },
  "686588": { lat: 9.6500, lon: 76.6500, city: "Erumely" },
  "686589": { lat: 9.6500, lon: 76.6500, city: "Erumely" },
  
  // Kottayam Taluk - COMPLETE
  "686021": { lat: 9.5800, lon: 76.5300, city: "Kottayam" },
  "686022": { lat: 9.5800, lon: 76.5300, city: "Kottayam" },
  "686023": { lat: 9.5800, lon: 76.5300, city: "Kottayam" },
  "686024": { lat: 9.5800, lon: 76.5300, city: "Kottayam" },
  "686025": { lat: 9.5800, lon: 76.5300, city: "Kottayam" },
  "686026": { lat: 9.5800, lon: 76.5300, city: "Kottayam" },
  "686027": { lat: 9.5800, lon: 76.5300, city: "Kottayam" },
  "686028": { lat: 9.5800, lon: 76.5300, city: "Kottayam" },
  "686029": { lat: 9.5800, lon: 76.5300, city: "Kottayam" },
  "686030": { lat: 9.5800, lon: 76.5300, city: "Kottayam" },
  "686031": { lat: 9.5800, lon: 76.5300, city: "Kottayam" },
  "686032": { lat: 9.5800, lon: 76.5300, city: "Kottayam" },
  "686033": { lat: 9.5800, lon: 76.5300, city: "Kottayam" },
  "686034": { lat: 9.5800, lon: 76.5300, city: "Kottayam" },
  "686035": { lat: 9.5800, lon: 76.5300, city: "Kottayam" },
  "686036": { lat: 9.5800, lon: 76.5300, city: "Kottayam" },
  "686037": { lat: 9.5800, lon: 76.5300, city: "Kottayam" },
  "686038": { lat: 9.5800, lon: 76.5300, city: "Kottayam" },
  "686041": { lat: 9.5800, lon: 76.5300, city: "Athirampuzha" },
  "686042": { lat: 9.5800, lon: 76.5300, city: "Athirampuzha" },
  "686043": { lat: 9.5800, lon: 76.5300, city: "Athirampuzha" },
  "686044": { lat: 9.5800, lon: 76.5300, city: "Athirampuzha" },
  
  // Pathanamthitta district (within 50km from Koovappally) - COMPLETE
  "689101": { lat: 9.3700, lon: 76.6500, city: "Pandalam" },
  "689102": { lat: 9.3700, lon: 76.6500, city: "Pandalam" },
  "689103": { lat: 9.3700, lon: 76.6500, city: "Pandalam" },
  "689104": { lat: 9.3700, lon: 76.6500, city: "Pandalam" },
  "689105": { lat: 9.3700, lon: 76.6500, city: "Pandalam" },
  "689501": { lat: 9.3200, lon: 76.7800, city: "Pathanamthitta" },
  "689502": { lat: 9.3200, lon: 76.7800, city: "Pathanamthitta" },
  "689503": { lat: 9.3200, lon: 76.7800, city: "Pathanamthitta" },
  "689510": { lat: 9.3200, lon: 76.7800, city: "Pathanamthitta" },
  "689582": { lat: 9.4067, lon: 76.7508, city: "Kozhencherry" },
  "689583": { lat: 9.4067, lon: 76.7508, city: "Kozhencherry" },
  "689584": { lat: 9.4067, lon: 76.7508, city: "Kozhencherry" },
  "689585": { lat: 9.4100, lon: 76.6800, city: "Ranni" },
  "689586": { lat: 9.4100, lon: 76.6800, city: "Ranni" },
  "689587": { lat: 9.4100, lon: 76.6800, city: "Ranni" },
  "689588": { lat: 9.4100, lon: 76.6800, city: "Ranni" },
  "689589": { lat: 9.4100, lon: 76.6800, city: "Ranni" },
  "689590": { lat: 9.4100, lon: 76.6800, city: "Ranni" },
  "689645": { lat: 9.3400, lon: 76.6900, city: "Thiruvalla" },
  "689646": { lat: 9.3400, lon: 76.6900, city: "Thiruvalla" },
  "689647": { lat: 9.3400, lon: 76.6900, city: "Thiruvalla" },
  "689661": { lat: 9.3500, lon: 76.6700, city: "Mallappally" },
  "689662": { lat: 9.3500, lon: 76.6700, city: "Mallappally" },
  "689663": { lat: 9.3500, lon: 76.6700, city: "Mallappally" },
  "689664": { lat: 9.3500, lon: 76.6700, city: "Mallappally" },
  "689672": { lat: 9.2667, lon: 76.7500, city: "Pathanamthitta" },
  "689673": { lat: 9.2667, lon: 76.7500, city: "Pathanamthitta" },
  "689674": { lat: 9.2667, lon: 76.7500, city: "Pathanamthitta" },
  
  // Alappuzha district (within 50km) - COMPLETE
  "688001": { lat: 9.4981, lon: 76.3388, city: "Alappuzha" },
  "688002": { lat: 9.4981, lon: 76.3388, city: "Alappuzha" },
  "688003": { lat: 9.4981, lon: 76.3388, city: "Alappuzha" },
  "688004": { lat: 9.4981, lon: 76.3388, city: "Alappuzha" },
  "688005": { lat: 9.4981, lon: 76.3388, city: "Alappuzha" },
  "688006": { lat: 9.4981, lon: 76.3388, city: "Alappuzha" },
  "688007": { lat: 9.4981, lon: 76.3388, city: "Alappuzha" },
  "688008": { lat: 9.4981, lon: 76.3388, city: "Alappuzha" },
  "688009": { lat: 9.4981, lon: 76.3388, city: "Alappuzha" },
  "688010": { lat: 9.4981, lon: 76.3388, city: "Alappuzha" },
  "688011": { lat: 9.4981, lon: 76.3388, city: "Alappuzha" },
  "688012": { lat: 9.4981, lon: 76.3388, city: "Alappuzha" },
  "688013": { lat: 9.4981, lon: 76.3388, city: "Alappuzha" },
  "688014": { lat: 9.4981, lon: 76.3388, city: "Alappuzha" },
  "688505": { lat: 9.6450, lon: 76.5600, city: "Changanassery" },
  "688506": { lat: 9.6450, lon: 76.5600, city: "Changanassery" },
  "688507": { lat: 9.6450, lon: 76.5600, city: "Changanassery" },
  "688539": { lat: 9.5833, lon: 76.4833, city: "Cherthala" },
  "688540": { lat: 9.5833, lon: 76.4833, city: "Cherthala" },
  "688541": { lat: 9.5833, lon: 76.4833, city: "Cherthala" },
  "688582": { lat: 9.4500, lon: 76.4200, city: "Ambalappuzha" },
  "688583": { lat: 9.4500, lon: 76.4200, city: "Ambalappuzha" },
  "688584": { lat: 9.4500, lon: 76.4200, city: "Ambalappuzha" },
  
  // Idukki district (within 50km from Koovappally) - COMPLETE
  "685501": { lat: 9.6650, lon: 76.9700, city: "Thodupuzha" },
  "685502": { lat: 9.6650, lon: 76.9700, city: "Thodupuzha" },
  "685503": { lat: 9.6650, lon: 76.9700, city: "Thodupuzha" },
  "685505": { lat: 9.6650, lon: 76.9700, city: "Thodupuzha" },
  "685506": { lat: 9.6650, lon: 76.9700, city: "Thodupuzha" },
  "685509": { lat: 9.6650, lon: 76.9700, city: "Thodupuzha" },
  "685511": { lat: 9.6650, lon: 76.9700, city: "Muttom" },
  "685512": { lat: 9.6650, lon: 76.9700, city: "Muttom" },
  "685513": { lat: 9.6650, lon: 76.9700, city: "Muttom" },
  "685551": { lat: 9.6500, lon: 76.8800, city: "Poonjar" },
  "685552": { lat: 9.6500, lon: 76.8800, city: "Poonjar" },
  "685553": { lat: 9.6500, lon: 76.8800, city: "Poonjar" },
  "685554": { lat: 9.6500, lon: 76.8800, city: "Poonjar" },
  "685581": { lat: 9.6000, lon: 76.9000, city: "Erattayar" },
  "685582": { lat: 9.6000, lon: 76.9000, city: "Erattayar" },
  "685583": { lat: 9.6000, lon: 76.9000, city: "Erattayar" },
  "685584": { lat: 9.6650, lon: 76.9700, city: "Thodupuzha" },
  "685585": { lat: 9.6650, lon: 76.9700, city: "Thodupuzha" },
  "685586": { lat: 9.6650, lon: 76.9700, city: "Thodupuzha" },
  "685587": { lat: 9.6650, lon: 76.9700, city: "Thodupuzha" },
  "685588": { lat: 9.6650, lon: 76.9700, city: "Thodupuzha" },
  "685589": { lat: 9.6650, lon: 76.9700, city: "Thodupuzha" },
  "685590": { lat: 9.6650, lon: 76.9700, city: "Thodupuzha" },
  "685591": { lat: 9.6650, lon: 76.9700, city: "Thodupuzha" },
  "685592": { lat: 9.6650, lon: 76.9700, city: "Thodupuzha" },
  "685595": { lat: 9.6650, lon: 76.9700, city: "Thodupuzha" },
  "685596": { lat: 9.6650, lon: 76.9700, city: "Thodupuzha" },
  "685601": { lat: 9.5080, lon: 77.1686, city: "Thodupuzha" },
  "685602": { lat: 9.5080, lon: 77.1686, city: "Thodupuzha" },
  "685603": { lat: 9.5080, lon: 77.1686, city: "Thodupuzha" },
  "685604": { lat: 9.5080, lon: 77.1686, city: "Thodupuzha" },
  "685605": { lat: 9.5080, lon: 77.1686, city: "Thodupuzha" },
  "685606": { lat: 9.5080, lon: 77.1686, city: "Thodupuzha" },
  "685607": { lat: 9.5080, lon: 77.1686, city: "Thodupuzha" },
  "685608": { lat: 9.5080, lon: 77.1686, city: "Thodupuzha" },
};

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// Check delivery availability by pincode
router.post("/check", async (req, res) => {
  try {
    const { pincode } = req.body;
    
    if (!pincode) {
      return res.status(400).json({
        success: false,
        message: "Pincode is required"
      });
    }
    
    // Check if pincode exists in our database
    const buyerLocation = pincodeDatabase[pincode];
    
    if (!buyerLocation) {
      return res.json({
        success: false,
        available: false,
        message: `Sorry, we don't have pincode ${pincode} in our delivery database. Please contact us for delivery availability.`,
        pincode: pincode
      });
    }
    
    // Calculate distance from seller location to buyer location
    const distance = calculateDistance(
      SELLER_LOCATION.lat,
      SELLER_LOCATION.lon,
      buyerLocation.lat,
      buyerLocation.lon
    );
    
    const distanceRounded = Math.round(distance * 10) / 10; // Round to 1 decimal place
    
    // Check if within delivery radius
    const isAvailable = distance <= MAX_DELIVERY_RADIUS_KM;
    
    console.log(`=== DELIVERY CHECK ===`);
    console.log(`Pincode: ${pincode}`);
    console.log(`Location: ${buyerLocation.city}`);
    console.log(`Distance from ${SELLER_LOCATION.name}: ${distanceRounded} km`);
    console.log(`Max radius: ${MAX_DELIVERY_RADIUS_KM} km`);
    console.log(`Available: ${isAvailable}`);
    
    if (isAvailable) {
      return res.json({
        success: true,
        available: true,
        message: `✅ Great! Delivery is available to ${buyerLocation.city} (${distanceRounded} km from ${SELLER_LOCATION.name})`,
        distance: distanceRounded,
        city: buyerLocation.city,
        pincode: pincode,
        maxRadius: MAX_DELIVERY_RADIUS_KM
      });
    } else {
      return res.json({
        success: true,
        available: false,
        message: `❌ Sorry, ${buyerLocation.city} is ${distanceRounded} km away, which is beyond our delivery radius of ${MAX_DELIVERY_RADIUS_KM} km from ${SELLER_LOCATION.name}`,
        distance: distanceRounded,
        city: buyerLocation.city,
        pincode: pincode,
        maxRadius: MAX_DELIVERY_RADIUS_KM
      });
    }
    
  } catch (error) {
    console.error("Delivery check error:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking delivery availability",
      error: error.message
    });
  }
});

// Get all available pincodes (optional - for admin reference)
router.get("/pincodes", (req, res) => {
  const pincodes = Object.keys(pincodeDatabase).map(code => ({
    pincode: code,
    city: pincodeDatabase[code].city,
    coordinates: {
      lat: pincodeDatabase[code].lat,
      lon: pincodeDatabase[code].lon
    }
  }));
  
  res.json({
    success: true,
    sellerLocation: SELLER_LOCATION,
    maxDeliveryRadius: MAX_DELIVERY_RADIUS_KM,
    totalPincodes: pincodes.length,
    pincodes: pincodes
  });
});

module.exports = router;

