const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Hub = require("../models/Hub");
const Order = require("../models/Order");
const HubManager = require("../models/HubManager");

// ===== AUTHENTICATION ROUTES =====

// Central Hub Manager Login
router.post("/login", async (req, res) => {
  try {
    console.log("=== CENTRAL HUB MANAGER LOGIN ROUTE CALLED ===");
    console.log("Request URL:", req.originalUrl);
    console.log("Request body:", req.body);
    
    const { username, password, email } = req.body;
    
    console.log("Login attempt - username:", username, "email:", email);
    
    // Check if this is a hub manager login (has email) or central manager login (has username)
    if (email && password) {
      console.log("🔐 Hub Manager Login Attempt");
      
      // Import HubManager model
      const HubManager = require("../models/HubManager");
      const jwt = require("jsonwebtoken");
      const JWT_SECRET = process.env.JWT_SECRET || "hub_manager_jwt_secret_key_2024";
      
      // Find manager by email
      const manager = await HubManager.findOne({ 
        email: email.toLowerCase().trim()
      });
      
      if (!manager) {
        console.log("❌ Hub Manager not found");
        return res.status(401).json({
          success: false,
          error: "Invalid email or password"
        });
      }
      
      console.log("✅ Hub Manager found:", {
        managerId: manager.managerId,
        email: manager.email,
        status: manager.status
      });
      
      // Check if manager is active
      if (manager.status !== 'active') {
        console.log("❌ Hub Manager not active, status:", manager.status);
        return res.status(401).json({
          success: false,
          error: `Account is ${manager.status}. Please contact admin.`
        });
      }
      
      // Verify password
      console.log("🔐 Verifying hub manager password...");
      const isPasswordValid = await manager.comparePassword(password);
      console.log("Hub manager password valid:", isPasswordValid);
      
      if (!isPasswordValid) {
        console.log("❌ Invalid hub manager password");
        return res.status(401).json({
          success: false,
          error: "Invalid email or password"
        });
      }
      
      // Update last login
      manager.lastLogin = new Date();
      await manager.save();
      
      // Generate JWT token
      const token = jwt.sign(
        {
          managerId: manager.managerId,
          email: manager.email,
          role: "hubmanager",
          name: manager.name,
          hubId: manager.hubId
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      
      // Prepare response (without password)
      const managerResponse = {
        managerId: manager.managerId,
        name: manager.name,
        email: manager.email,
        phone: manager.phone,
        hubId: manager.hubId,
        hubName: manager.hubName,
        district: manager.district,
        status: manager.status,
        lastLogin: manager.lastLogin
      };
      
      console.log("✅ Hub Manager Login successful for:", manager.email);
      
      return res.json({
        success: true,
        message: "Login successful",
        token,
        manager: managerResponse,
        expiresIn: "7 days"
      });
    }
    
    // Original central hub manager login
    console.log("🔐 Central Hub Manager Login Attempt");
    
    if (!username || !password) {
      console.log("Missing username or password in central hub manager");
      return res.status(400).json({ error: "Username and password are required" });
    }
    
    // For demo purposes, use hardcoded credentials
    // In production, you'd check against database with hashed passwords
    if (username === "centralmanager" && password === "central123") {
      const token = "central_manager_token_" + Date.now(); // Simple token for demo
      
      const managerData = {
        managerId: token,
        username: "centralmanager",
        name: "Central Hub Manager",
        role: "central_manager",
        permissions: ["view_all_hubs", "manage_hubs", "view_all_orders", "manage_orders"]
      };
      
      console.log("✅ Central hub manager login successful");
      
      res.json({
        success: true,
        message: "Login successful",
        token: token,
        manager: managerData
      });
    } else {
      console.log("❌ Invalid credentials");
      res.status(401).json({ error: "Invalid username or password" });
    }
  } catch (error) {
    console.error("Central hub manager login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Test hub manager login (temporary)
router.post("/test-hub-login", async (req, res) => {
  try {
    console.log("=== TEST HUB MANAGER LOGIN ===");
    console.log("Request body:", req.body);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required"
      });
    }
    
    // Import HubManager model
    const HubManager = require("../models/HubManager");
    const jwt = require("jsonwebtoken");
    const JWT_SECRET = process.env.JWT_SECRET || "hub_manager_jwt_secret_key_2024";
    
    // Find manager by email
    const manager = await HubManager.findOne({ 
      email: email.toLowerCase() 
    });
    
    if (!manager) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password"
      });
    }
    
    // Check if manager is active
    if (manager.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: `Account is ${manager.status}. Please contact admin.`
      });
    }
    
    // Verify password
    const isPasswordValid = await manager.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password"
      });
    }
    
    // Update last login
    manager.lastLogin = new Date();
    await manager.save();
    
    // Generate JWT token
    const token = jwt.sign(
      {
        managerId: manager.managerId,
        email: manager.email,
        role: "hubmanager",
        name: manager.name,
        hubId: manager.hubId
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    // Prepare response (without password)
    const managerResponse = manager.toObject();
    delete managerResponse.password;
    
    res.json({
      success: true,
      message: "Login successful",
      token,
      manager: managerResponse,
      expiresIn: "7 days"
    });
    
  } catch (error) {
    console.error("Error during test hub manager login:", error);
    res.status(500).json({
      success: false,
      error: "Login failed. Please try again."
    });
  }
});

// Hub Manager Login (Working Solution)
router.post("/hub-manager-login", async (req, res) => {
  try {
    console.log("🔐 Hub Manager Login via Central Route");
    console.log("Request body:", req.body);
    
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      console.log("❌ Missing email or password");
      return res.status(400).json({
        success: false,
        error: "Email and password are required"
      });
    }
    
    console.log("🔍 Looking for manager with email:", email);
    
    // Import HubManager model
    const HubManager = require("../models/HubManager");
    const jwt = require("jsonwebtoken");
    const JWT_SECRET = process.env.JWT_SECRET || "hub_manager_jwt_secret_key_2024";
    
    // Find manager by email
    const manager = await HubManager.findOne({ 
      email: email.toLowerCase().trim()
    });
    
    if (!manager) {
      console.log("❌ Manager not found");
      return res.status(401).json({
        success: false,
        error: "Invalid email or password"
      });
    }
    
    console.log("✅ Manager found:", {
      managerId: manager.managerId,
      email: manager.email,
      status: manager.status
    });
    
    // Check if manager is active
    if (manager.status !== 'active') {
      console.log("❌ Manager not active, status:", manager.status);
      return res.status(401).json({
        success: false,
        error: `Account is ${manager.status}. Please contact admin.`
      });
    }
    
    // Verify password
    console.log("🔐 Verifying password...");
    const isPasswordValid = await manager.comparePassword(password);
    console.log("Password valid:", isPasswordValid);
    
    if (!isPasswordValid) {
      console.log("❌ Invalid password");
      return res.status(401).json({
        success: false,
        error: "Invalid email or password"
      });
    }
    
    // Update last login
    manager.lastLogin = new Date();
    await manager.save();
    
    // Generate JWT token
    const token = jwt.sign(
      {
        managerId: manager.managerId,
        email: manager.email,
        role: "hubmanager",
        name: manager.name,
        hubId: manager.hubId
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    // Prepare response (without password)
    const managerResponse = {
      managerId: manager.managerId,
      name: manager.name,
      email: manager.email,
      phone: manager.phone,
      hubId: manager.hubId,
      hubName: manager.hubName,
      district: manager.district,
      status: manager.status,
      lastLogin: manager.lastLogin
    };
    
    console.log("✅ Hub Manager Login successful for:", manager.email);
    
    res.json({
      success: true,
      message: "Login successful",
      token,
      manager: managerResponse,
      expiresIn: "7 days"
    });
    
  } catch (error) {
    console.error("❌ Hub manager login error:", error);
    res.status(500).json({
      success: false,
      error: "Login failed. Please try again."
    });
  }
});

// Middleware to verify central hub manager token
const verifyCentralHubManager = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }
    
    // For demo purposes, check if token starts with our prefix
    if (token.startsWith("central_manager_token_")) {
      req.hubManager = {
        managerId: token,
        username: "centralmanager",
        name: "Central Hub Manager",
        role: "central_manager"
      };
      next();
    } else {
      return res.status(401).json({ error: "Invalid token" });
    }
  } catch (error) {
    console.error("Central hub manager verification error:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
};

// ===== CENTRAL HUB MANAGER ROUTES =====

// Get all hubs (for central manager)
router.get("/hubs", verifyCentralHubManager, async (req, res) => {
  try {
    console.log("=== CENTRAL MANAGER: FETCHING ALL HUBS ===");
    
    const { district, status } = req.query;
    let query = {};
    
    if (district && district !== 'all') {
      query.district = district;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const hubs = await Hub.find(query)
      .sort({ district: 1, name: 1 })
      .lean();
    
    console.log(`✅ Found ${hubs.length} hubs`);
    
    res.json(hubs);
  } catch (error) {
    console.error("Error fetching hubs for central manager:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all orders (for central manager)
router.get("/orders", verifyCentralHubManager, async (req, res) => {
  try {
    console.log("=== CENTRAL MANAGER: FETCHING ALL ORDERS ===");
    
    const { district, status, limit = 50 } = req.query;
    let query = {};
    
    if (status && status !== 'all') {
      query.orderStatus = status;
    }
    
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();
    
    // If district filter is applied, filter by hub district
    let filteredOrders = orders;
    if (district && district !== 'all') {
      const districtHubs = await Hub.find({ district }).select('_id');
      const hubIds = districtHubs.map(h => h._id.toString());
      
      filteredOrders = orders.filter(order => {
        const sellerHubId = order.hubTracking?.sellerHubId;
        const customerHubId = order.hubTracking?.customerHubId;
        return hubIds.includes(sellerHubId) || hubIds.includes(customerHubId);
      });
    }
    
    console.log(`✅ Found ${filteredOrders.length} orders`);
    
    res.json(filteredOrders);
  } catch (error) {
    console.error("Error fetching orders for central manager:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard stats
router.get("/stats", verifyCentralHubManager, async (req, res) => {
  try {
    console.log("=== CENTRAL MANAGER: FETCHING DASHBOARD STATS ===");
    
    const { district } = req.query;
    
    // Hub stats
    let hubQuery = {};
    if (district && district !== 'all') {
      hubQuery.district = district;
    }
    
    const [totalHubs, activeHubs] = await Promise.all([
      Hub.countDocuments(hubQuery),
      Hub.countDocuments({ ...hubQuery, status: 'active' })
    ]);
    
    // Order stats
    let orderQuery = {};
    let districtHubIds = [];
    
    if (district && district !== 'all') {
      const districtHubs = await Hub.find({ district }).select('_id');
      districtHubIds = districtHubs.map(h => h._id.toString());
    }
    
    const allOrders = await Order.find(orderQuery).lean();
    
    // Filter orders by district if needed
    let filteredOrders = allOrders;
    if (district && district !== 'all') {
      filteredOrders = allOrders.filter(order => {
        const sellerHubId = order.hubTracking?.sellerHubId;
        const customerHubId = order.hubTracking?.customerHubId;
        return districtHubIds.includes(sellerHubId) || districtHubIds.includes(customerHubId);
      });
    }
    
    const pendingOrders = filteredOrders.filter(o => 
      ['at_seller_hub', 'pending_approval', 'confirmed'].includes(o.orderStatus)
    ).length;
    
    const completedOrders = filteredOrders.filter(o => 
      o.orderStatus === 'delivered'
    ).length;
    
    const stats = {
      totalHubs,
      activeHubs,
      pendingOrders,
      completedOrders,
      totalOrders: filteredOrders.length
    };
    
    console.log("✅ Dashboard stats:", stats);
    
    res.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get hub details with inventory
router.get("/hubs/:hubId", verifyCentralHubManager, async (req, res) => {
  try {
    console.log("=== CENTRAL MANAGER: FETCHING HUB DETAILS ===");
    console.log("Hub ID:", req.params.hubId);
    
    const hub = await Hub.findById(req.params.hubId).lean();
    
    if (!hub) {
      return res.status(404).json({ error: "Hub not found" });
    }
    
    // Get orders at this hub
    const ordersAtHub = await Order.find({
      $or: [
        { 'hubTracking.sellerHubId': req.params.hubId },
        { 'hubTracking.customerHubId': req.params.hubId }
      ]
    }).lean();
    
    // Calculate inventory stats
    const incomingOrders = ordersAtHub.filter(o => 
      o.hubTracking?.sellerHubId === req.params.hubId && 
      o.orderStatus === 'at_seller_hub'
    ).length;
    
    const outgoingOrders = ordersAtHub.filter(o => 
      o.hubTracking?.customerHubId === req.params.hubId && 
      ['shipped', 'in_transit'].includes(o.orderStatus)
    ).length;
    
    const hubDetails = {
      ...hub,
      inventory: {
        incomingOrders,
        outgoingOrders,
        totalOrders: ordersAtHub.length
      }
    };
    
    console.log("✅ Hub details fetched");
    
    res.json(hubDetails);
  } catch (error) {
    console.error("Error fetching hub details:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update hub status
router.patch("/hubs/:hubId/status", verifyCentralHubManager, async (req, res) => {
  try {
    console.log("=== CENTRAL MANAGER: UPDATING HUB STATUS ===");
    console.log("Hub ID:", req.params.hubId);
    console.log("New Status:", req.body.status);
    
    const { status } = req.body;
    
    if (!['active', 'inactive', 'maintenance'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    const hub = await Hub.findByIdAndUpdate(
      req.params.hubId,
      { status, updatedAt: new Date() },
      { new: true }
    );
    
    if (!hub) {
      return res.status(404).json({ error: "Hub not found" });
    }
    
    console.log("✅ Hub status updated");
    
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

// Get order details
router.get("/orders/:orderId", verifyCentralHubManager, async (req, res) => {
  try {
    console.log("=== CENTRAL MANAGER: FETCHING ORDER DETAILS ===");
    console.log("Order ID:", req.params.orderId);
    
    const order = await Order.findById(req.params.orderId).lean();
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    console.log("✅ Order details fetched");
    
    res.json(order);
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;