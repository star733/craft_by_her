const express = require("express");
const router = express.Router();
const Hub = require("../models/Hub");
const Order = require("../models/Order");

// Get all hubs with statistics - PUBLIC ENDPOINT (no auth required)
router.get("/", async (req, res) => {
  try {
    console.log("📊 PUBLIC: Fetching all hubs...");
    
    const hubs = await Hub.find({ status: { $ne: 'inactive' } })
      .select('hubId name district location.address contactInfo capacity')
      .lean();
    
    console.log(`✅ Found ${hubs.length} hubs in database`);
    
    // Get order count for each hub
    const hubsWithStats = await Promise.all(
      hubs.map(async (hub) => {
        const ordersAtHub = await Order.countDocuments({
          $or: [
            { 'hubTracking.sellerHubId': hub.hubId },
            { 'hubTracking.customerHubId': hub.hubId }
          ]
        });
        
        const maxCapacity = hub.capacity?.maxOrders || 500;
        const currentStock = hub.capacity?.currentOrders || ordersAtHub;
        const utilization = maxCapacity > 0 
          ? (currentStock / maxCapacity) * 100 
          : 0;
        
        return {
          ...hub,
          currentStock,
          capacity: maxCapacity,
          ordersAtHub,
          utilization: Math.round(utilization * 10) / 10
        };
      })
    );
    
    console.log(`✅ PUBLIC: Returning ${hubsWithStats.length} hubs with stats`);
    
    res.json({
      success: true,
      hubs: hubsWithStats,
      totalHubs: hubsWithStats.length,
      message: "14 districts, 14 hubs - one hub per district"
    });
  } catch (error) {
    console.error("❌ Error fetching public hubs:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;