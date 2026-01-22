const express = require("express");
const router = express.Router();
const Hub = require("../models/Hub");
const Order = require("../models/Order");
const verify = require("../middleware/verifyFirebaseToken");
const verifyAdmin = require("../middleware/verifyAdmin");

// Get all hubs with order counts for admin dashboard
router.get("/hubs-with-stats", verify, verifyAdmin, async (req, res) => {
  try {
    console.log("📊 Fetching all hubs with order statistics...");
    
    // Get all active hubs
    const hubs = await Hub.find({ status: 'active' })
      .select('hubId name district capacity stats')
      .lean();
    
    // Get order counts for each hub
    const hubsWithCounts = await Promise.all(
      hubs.map(async (hub) => {
        // Orders currently at this hub (at_seller_hub or at_customer_hub)
        const ordersAtHub = await Order.countDocuments({
          $or: [
            { 
              'hubTracking.sellerHubId': hub.hubId,
              orderStatus: { $in: ['at_seller_hub', 'awaiting_admin_approval'] }
            },
            { 
              'hubTracking.customerHubId': hub.hubId,
              orderStatus: { $in: ['out_for_delivery', 'ready_for_pickup'] }
            }
          ]
        });
        
        // Orders dispatched TO this hub (in transit)
        const dispatchedToHub = await Order.countDocuments({
          'hubTracking.customerHubId': hub.hubId,
          orderStatus: 'shipped'
        });
        
        return {
          hubId: hub.hubId,
          name: hub.name,
          district: hub.district,
          ordersAtHub: ordersAtHub,
          dispatchedToHub: dispatchedToHub,
          totalCapacity: hub.capacity?.maxOrders || 500,
          currentOrders: hub.capacity?.currentOrders || 0
        };
      })
    );
    
    // Group by district
    const hubsByDistrict = {};
    hubsWithCounts.forEach(hub => {
      if (!hubsByDistrict[hub.district]) {
        hubsByDistrict[hub.district] = [];
      }
      hubsByDistrict[hub.district].push(hub);
    });
    
    console.log(`✅ Found ${hubsWithCounts.length} hubs across ${Object.keys(hubsByDistrict).length} districts`);
    
    res.json({
      success: true,
      hubs: hubsWithCounts,
      hubsByDistrict: hubsByDistrict,
      totalHubs: hubsWithCounts.length
    });
    
  } catch (err) {
    console.error("Error fetching hub stats:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
