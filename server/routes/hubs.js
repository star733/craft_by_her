const express = require("express");
const router = express.Router();
const Hub = require("../models/Hub");
const HubManager = require("../models/HubManager");
const verify = require("../middleware/verifyFirebaseToken");
const requireAdmin = require("../middleware/verifyAdmin");

console.log("🔥🔥🔥 HUBS.JS LOADED - ROUTES BEING REGISTERED! 🔥🔥🔥");

// ===== PUBLIC ROUTES =====

// TEST ROUTE - Completely public, no middleware
router.get("/test-public", (req, res) => {
  console.log("🎯 TEST ROUTE HIT!");
  res.json({ success: true, message: "This route works!" });
});

// Get all hubs (for registration - no auth required)
router.get("/", async (req, res) => {
  try {
    const hubs = await Hub.find()
      .select('hubId name district contactNumber address managerId status')
      .sort({ district: 1, name: 1 });
    
    res.json({ success: true, hubs });
  } catch (error) {
    console.error("Error fetching hubs:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all active hubs (Public - for sellers to select hub)
router.get("/public", async (req, res) => {
  try {
    const hubs = await Hub.find({ status: 'active' })
      .select('name district contactNumber address')
      .sort({ district: 1, name: 1 });
    
    res.json(hubs);
  } catch (error) {
    console.error("Error fetching public hubs:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all hubs with detailed statistics (Public - for hub manager dashboard)
router.get("/all-with-stats", async (req, res) => {
  try {
    console.log("📊 Fetching all hubs with stats...");
    const Order = require("../models/Order");
    
    const hubs = await Hub.find({ status: { $ne: 'inactive' } })
      .select('hubId name district location.address contactInfo capacity')
      .lean();
    
    console.log(`✅ Found ${hubs.length} hubs in database`);
    
    // Get order count for each hub
    // Get order count for each hub
    const hubsWithStats = await Promise.all(
      hubs.map(async (hub) => {
        // Count orders at seller hub (products from sellers in this hub)
        // Check both hubId (string) and _id (ObjectId) for backward compatibility
        const ordersAtSellerHub = await Order.countDocuments({
          $or: [
            { 'hubTracking.sellerHubId': hub.hubId },
            { 'hubTracking.sellerHubId': hub._id.toString() }
          ],
          orderStatus: { $in: ['at_seller_hub', 'awaiting_admin_approval'] }
        });
        
        // Count orders dispatched to customer hub (orders being sent to customers in this hub's district)
        // Check both hubId (string) and _id (ObjectId) for backward compatibility
        const dispatchedToCustomerHub = await Order.countDocuments({
          $or: [
            { 'hubTracking.customerHubId': hub.hubId },
            { 'hubTracking.customerHubId': hub._id.toString() }
          ],
          orderStatus: { $in: ['shipped', 'out_for_delivery', 'ready_for_pickup'] }
        });
        
        // Total orders at hub (for capacity calculation)
        const ordersAtHub = await Order.countDocuments({
          $or: [
            { 'hubTracking.sellerHubId': hub.hubId },
            { 'hubTracking.sellerHubId': hub._id.toString() },
            { 'hubTracking.customerHubId': hub.hubId },
            { 'hubTracking.customerHubId': hub._id.toString() }
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
          ordersAtSellerHub,      // Orders from sellers (at seller hub)
          dispatchedToCustomerHub, // Orders to customers (dispatched to customer hub)
          utilization: Math.round(utilization * 10) / 10
        };
      })
    );
    
    console.log(`✅ Returning ${hubsWithStats.length} hubs with stats`);
    
    res.json({
      success: true,
      hubs: hubsWithStats,
      totalHubs: hubsWithStats.length
    });
  } catch (error) {
    console.error("❌ Error fetching all hubs:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== ADMIN ROUTES =====

// Get all hubs with filters (Admin only)
router.get("/admin/all", verify, requireAdmin, async (req, res) => {
  try {
    const { district, status, page = 1, limit = 20 } = req.query;
    
    let query = {};
    
    if (district && district !== 'all') {
      query.district = district;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const skip = (page - 1) * limit;
    
    const [hubs, total] = await Promise.all([
      Hub.find(query)
        .sort({ district: 1, name: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Hub.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      hubs,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: hubs.length,
        totalHubs: total
      }
    });
  } catch (error) {
    console.error("Error fetching hubs:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single hub (Admin only)
router.get("/:hubId", verify, requireAdmin, async (req, res) => {
  try {
    const hub = await Hub.findOne({ hubId: req.params.hubId });
    
    if (!hub) {
      return res.status(404).json({ error: "Hub not found" });
    }
    
    res.json({ success: true, hub });
  } catch (error) {
    console.error("Error fetching hub:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create new hub (Admin only)
router.post("/", verify, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      district,
      location,
      contactInfo,
      capacity,
      operatingHours
    } = req.body;
    
    // Validation
    if (!name || !district || !location || !contactInfo) {
      return res.status(400).json({ 
        error: "Name, district, location, and contact info are required" 
      });
    }
    
    // Check if hub already exists in this district
    const existingHub = await Hub.findOne({ district });
    if (existingHub) {
      return res.status(400).json({ 
        error: `A hub already exists in ${district} district` 
      });
    }
    
    // Generate hubId
    const count = await Hub.countDocuments();
    const hubId = `HUB${String(count + 1).padStart(4, '0')}`;
    
    const hub = new Hub({
      hubId,
      name,
      district,
      location,
      contactInfo,
      capacity: capacity || {},
      operatingHours: operatingHours || {},
      createdBy: req.user.uid
    });
    
    await hub.save();
    
    res.status(201).json({
      success: true,
      message: "Hub created successfully",
      hub
    });
  } catch (error) {
    console.error("Error creating hub:", error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: "A hub with this information already exists" 
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Update hub (Admin only)
router.put("/:hubId", verify, requireAdmin, async (req, res) => {
  try {
    const { hubId } = req.params;
    const updateData = { ...req.body };
    
    // Remove fields that shouldn't be updated
    delete updateData.hubId;
    delete updateData.createdBy;
    delete updateData.stats;
    
    const hub = await Hub.findOneAndUpdate(
      { hubId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!hub) {
      return res.status(404).json({ error: "Hub not found" });
    }
    
    res.json({
      success: true,
      message: "Hub updated successfully",
      hub
    });
  } catch (error) {
    console.error("Error updating hub:", error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Assign manager to hub (Admin only)
router.patch("/:hubId/assign-manager", verify, requireAdmin, async (req, res) => {
  try {
    const { hubId } = req.params;
    const { managerId } = req.body;
    
    if (!managerId) {
      return res.status(400).json({ error: "Manager ID is required" });
    }
    
    // Check if manager exists
    const manager = await HubManager.findOne({ managerId });
    if (!manager) {
      return res.status(404).json({ error: "Hub manager not found" });
    }
    
    // Check if manager is already assigned to another hub
    if (manager.hubId && manager.hubId !== hubId) {
      return res.status(400).json({ 
        error: `Manager is already assigned to hub ${manager.hubId}` 
      });
    }
    
    // Update hub
    const hub = await Hub.findOneAndUpdate(
      { hubId },
      { 
        $set: { 
          managerId: manager.managerId,
          managerName: manager.name
        } 
      },
      { new: true }
    );
    
    if (!hub) {
      return res.status(404).json({ error: "Hub not found" });
    }
    
    // Update manager
    await HubManager.findOneAndUpdate(
      { managerId },
      { 
        $set: { 
          hubId: hub.hubId,
          hubName: hub.name,
          district: hub.district
        } 
      }
    );
    
    res.json({
      success: true,
      message: "Manager assigned to hub successfully",
      hub
    });
  } catch (error) {
    console.error("Error assigning manager:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update hub status (Admin only)
router.patch("/:hubId/status", verify, requireAdmin, async (req, res) => {
  try {
    const { hubId } = req.params;
    const { status } = req.body;
    
    if (!["active", "inactive", "maintenance"].includes(status)) {
      return res.status(400).json({ 
        error: "Status must be 'active', 'inactive', or 'maintenance'" 
      });
    }
    
    const hub = await Hub.findOneAndUpdate(
      { hubId },
      { $set: { status } },
      { new: true }
    );
    
    if (!hub) {
      return res.status(404).json({ error: "Hub not found" });
    }
    
    res.json({
      success: true,
      message: `Hub status updated to ${status}`,
      hub
    });
  } catch (error) {
    console.error("Error updating hub status:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete hub (Admin only)
router.delete("/:hubId", verify, requireAdmin, async (req, res) => {
  try {
    const { hubId } = req.params;
    
    const hub = await Hub.findOneAndDelete({ hubId });
    
    if (!hub) {
      return res.status(404).json({ error: "Hub not found" });
    }
    
    // Unassign manager if exists
    if (hub.managerId) {
      await HubManager.findOneAndUpdate(
        { managerId: hub.managerId },
        { 
          $set: { 
            hubId: null,
            hubName: "",
            district: ""
          } 
        }
      );
    }
    
    res.json({
      success: true,
      message: "Hub deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting hub:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get hub by district (Public - for finding nearest hub)
router.get("/district/:district", async (req, res) => {
  try {
    const hub = await Hub.findOne({ 
      district: req.params.district,
      status: 'active'
    });
    
    if (!hub) {
      return res.status(404).json({ 
        error: `No active hub found in ${req.params.district} district` 
      });
    }
    
    res.json({ success: true, hub });
  } catch (error) {
    console.error("Error fetching hub by district:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all districts with hubs (Public)
router.get("/public/districts", async (req, res) => {
  try {
    const hubs = await Hub.find({ status: 'active' })
      .select('district hubId name')
      .sort({ district: 1 });
    
    const districts = hubs.map(hub => ({
      district: hub.district,
      hubId: hub.hubId,
      hubName: hub.name
    }));
    
    res.json({ success: true, districts });
  } catch (error) {
    console.error("Error fetching districts:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== PUBLIC ROUTE =====

// Check which hub serves a pincode (Public - no auth required)
router.post("/check-pincode", async (req, res) => {
  try {
    const { pincode } = req.body;
    
    if (!pincode || !/^[0-9]{6}$/.test(pincode)) {
      return res.status(400).json({ 
        success: false,
        error: "Please provide a valid 6-digit pincode" 
      });
    }
    
    // Kerala pincode ranges by district (accurate and non-overlapping)
    // Order matters - check specific ranges first to avoid overlaps
    const keralaPincodeMap = {
      'Kasaragod': { ranges: [[671121, 671551]] },
      'Kannur': { ranges: [[670001, 670120], [670301, 670706], [670731, 670734]] },
      'Wayanad': { ranges: [[673571, 673595]] },
      'Kozhikode': { ranges: [[673001, 673570]] },
      'Malappuram': { ranges: [[676101, 676123], [676301, 676320], [676501, 676553]] },
      'Palakkad': { ranges: [[678001, 679593]] },
      'Thrissur': { ranges: [[680001, 680733]] },
      'Ernakulam': { ranges: [[682001, 683579]] },
      'Idukki': { ranges: [[685501, 685620]] },
      'Kottayam': { ranges: [[686001, 686651]] },
      // Alappuzha uses 688xxx series; Pathanamthitta uses 689xxx; Kollam uses 690xxx/691xxx
      'Alappuzha': { ranges: [[688001, 688999]] },
      'Pathanamitta': { ranges: [[689001, 689999]] },
      'Kollam': { ranges: [[690001, 691999]] },
      'Thiruvananthapuram': { ranges: [[695001, 695615]] }
    };
    
    const pincodeNum = parseInt(pincode);
    let matchedDistrict = null;
    
    console.log(`🔍 Checking pincode: ${pincode} (${pincodeNum})`);
    
    // Find which district this pincode belongs to
    for (const [district, data] of Object.entries(keralaPincodeMap)) {
      for (const [start, end] of data.ranges) {
        if (pincodeNum >= start && pincodeNum <= end) {
          console.log(`✅ Matched ${pincode} to ${district} (range: ${start}-${end})`);
          matchedDistrict = district;
          break;
        }
      }
      if (matchedDistrict) break;
    }
    
    console.log(`📍 Final matched district: ${matchedDistrict || 'None'}`);
    
    if (!matchedDistrict) {
      return res.json({
        success: false,
        available: false,
        message: `Sorry, we don't have a hub serving pincode ${pincode} yet. We currently serve Kerala districts only.`,
        pincode
      });
    }
    
    // Find the hub for this district
    const hub = await Hub.findOne({ 
      district: matchedDistrict,
      status: 'active'
    }).select('hubId name district location contactInfo capacity');
    
    if (!hub) {
      return res.json({
        success: false,
        available: false,
        message: `We found that ${pincode} is in ${matchedDistrict}, but we don't have an active hub there yet.`,
        district: matchedDistrict,
        pincode
      });
    }
    
    // Hub found!
    res.json({
      success: true,
      available: true,
      message: `Great! We deliver to ${pincode} through our ${hub.name}.`,
      hub: {
        hubId: hub.hubId,
        name: hub.name,
        district: hub.district,
        address: hub.location?.address,
        phone: hub.contactInfo?.phone,
        email: hub.contactInfo?.email
      },
      district: matchedDistrict,
      pincode
    });
    
  } catch (error) {
    console.error("Error checking pincode:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to check pincode. Please try again." 
    });
  }
});

module.exports = router;
