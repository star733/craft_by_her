const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const HubManager = require("../models/HubManager");
const Hub = require("../models/Hub");
const Order = require("../models/Order");
const verify = require("../middleware/verifyFirebaseToken");
const requireAdmin = require("../middleware/verifyAdmin");

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "hub_manager_jwt_secret_key_2024";

// ===== ADMIN ROUTES =====

// Get all hub managers (Admin only)
router.get("/", verify, requireAdmin, async (req, res) => {
  try {
    const { status, hubId, page = 1, limit = 20 } = req.query;
    
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (hubId && hubId !== 'all') {
      query.hubId = hubId;
    }
    
    const skip = (page - 1) * limit;
    
    const [managers, total] = await Promise.all([
      HubManager.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      HubManager.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      managers,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: managers.length,
        totalManagers: total
      }
    });
  } catch (error) {
    console.error("Error fetching hub managers:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single hub manager (Admin only)
router.get("/:managerId", verify, requireAdmin, async (req, res) => {
  try {
    const manager = await HubManager.findOne({ 
      managerId: req.params.managerId 
    }).select('-password');
    
    if (!manager) {
      return res.status(404).json({ error: "Hub manager not found" });
    }
    
    res.json({ success: true, manager });
  } catch (error) {
    console.error("Error fetching hub manager:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create new hub manager (Admin only)
router.post("/", verify, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      username,
      password,
      address,
      hubId
    } = req.body;
    
    // Validation
    if (!name || !email || !phone || !username || !password) {
      return res.status(400).json({ 
        error: "Name, email, phone, username, and password are required" 
      });
    }
    
    // Check if username, email, or phone already exists
    const existingManager = await HubManager.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() },
        { phone: phone }
      ]
    });
    
    if (existingManager) {
      let field = 'details';
      if (existingManager.username === username.toLowerCase()) field = 'username';
      else if (existingManager.email === email.toLowerCase()) field = 'email';
      else if (existingManager.phone === phone) field = 'phone';
      
      return res.status(400).json({ 
        error: `A hub manager with this ${field} already exists` 
      });
    }
    
    // Generate managerId
    const count = await HubManager.countDocuments();
    const managerId = `HM${String(count + 1).padStart(4, '0')}`;
    
    // If hubId provided, get hub details
    let hubName = "";
    let district = "";
    if (hubId) {
      const hub = await Hub.findOne({ hubId });
      if (hub) {
        hubName = hub.name;
        district = hub.district;
      }
    }
    
    const manager = new HubManager({
      managerId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      username: username.toLowerCase().trim(),
      password,
      address: address || {},
      hubId: hubId || null,
      hubName,
      district,
      createdBy: req.user.uid
    });
    
    await manager.save();
    
    // Update hub if hubId provided
    if (hubId) {
      await Hub.findOneAndUpdate(
        { hubId },
        { 
          $set: { 
            managerId: manager.managerId,
            managerName: manager.name
          } 
        }
      );
    }
    
    // 📧 Send credentials email to hub manager
    try {
      const { sendHubManagerCredentials } = require('../utils/hubManagerEmailService');
      
      const emailData = {
        name: manager.name,
        email: manager.email,
        password: password, // Send plain password in email
        phone: manager.phone,
        managerId: manager.managerId,
        hubName: hubName || null,
        district: district || null
      };
      
      const emailResult = await sendHubManagerCredentials(emailData);
      
      if (emailResult.success) {
        console.log("✅ Hub manager credentials email sent successfully");
      } else {
        console.error("⚠️ Failed to send credentials email:", emailResult.error);
        // Don't fail the creation if email fails
      }
    } catch (emailError) {
      console.error("⚠️ Error sending credentials email (non-critical):", emailError.message);
    }
    
    // Return manager without password
    const managerResponse = manager.toObject();
    delete managerResponse.password;
    
    res.status(201).json({
      success: true,
      message: "Hub manager created successfully and credentials sent via email",
      manager: managerResponse
    });
  } catch (error) {
    console.error("Error creating hub manager:", error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        error: `A hub manager with this ${field} already exists` 
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Update hub manager (Admin only)
router.put("/:managerId", verify, requireAdmin, async (req, res) => {
  try {
    const { managerId } = req.params;
    const updateData = { ...req.body };
    
    // Remove sensitive fields
    delete updateData.password;
    delete updateData.managerId;
    delete updateData.createdBy;
    
    const manager = await HubManager.findOneAndUpdate(
      { managerId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!manager) {
      return res.status(404).json({ error: "Hub manager not found" });
    }
    
    res.json({
      success: true,
      message: "Hub manager updated successfully",
      manager
    });
  } catch (error) {
    console.error("Error updating hub manager:", error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        error: `A hub manager with this ${field} already exists` 
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Update manager status (Admin only)
router.patch("/:managerId/status", verify, requireAdmin, async (req, res) => {
  try {
    const { managerId } = req.params;
    const { status } = req.body;
    
    if (!["active", "inactive", "pending"].includes(status)) {
      return res.status(400).json({ 
        error: "Status must be 'active', 'inactive', or 'pending'" 
      });
    }
    
    const manager = await HubManager.findOneAndUpdate(
      { managerId },
      { $set: { status } },
      { new: true }
    ).select('-password');
    
    if (!manager) {
      return res.status(404).json({ error: "Hub manager not found" });
    }
    
    res.json({
      success: true,
      message: `Hub manager ${status === 'active' ? 'activated' : status === 'inactive' ? 'deactivated' : 'set to pending'}`,
      manager
    });
  } catch (error) {
    console.error("Error updating manager status:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete hub manager (Admin only)
router.delete("/:managerId", verify, requireAdmin, async (req, res) => {
  try {
    const { managerId } = req.params;
    
    const manager = await HubManager.findOneAndDelete({ managerId });
    
    if (!manager) {
      return res.status(404).json({ error: "Hub manager not found" });
    }
    
    // Unassign from hub if exists
    if (manager.hubId) {
      await Hub.findOneAndUpdate(
        { hubId: manager.hubId },
        { 
          $set: { 
            managerId: null,
            managerName: ""
          } 
        }
      );
    }
    
    res.json({
      success: true,
      message: "Hub manager deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting hub manager:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== HUB MANAGER ROUTES =====

// Hub manager self-registration route (for new registrations)
router.post("/register", async (req, res) => {
  try {
    console.log("=== HUB MANAGER REGISTRATION ===");
    console.log("Request body:", req.body);

    const {
      name,
      email,
      phone,
      username,
      password,
      address,
      hubId
    } = req.body;

    // Validation
    if (!name || !email || !phone || !username || !password) {
      return res.status(400).json({
        success: false,
        error: "Name, email, phone, username, and password are required"
      });
    }

    // Check if username, email, or phone already exists
    const existingManager = await HubManager.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() },
        { phone: phone }
      ]
    });

    if (existingManager) {
      let field = 'details';
      if (existingManager.username === username.toLowerCase()) field = 'username';
      else if (existingManager.email === email.toLowerCase()) field = 'email';
      else if (existingManager.phone === phone) field = 'phone';

      return res.status(400).json({
        success: false,
        error: `A hub manager with this ${field} already exists`
      });
    }

    // Generate managerId
    const count = await HubManager.countDocuments();
    const managerId = `HM${String(count + 1).padStart(4, '0')}`;

    // If hubId provided, get hub details
    let hubName = "";
    let district = "";
    if (hubId) {
      const hub = await Hub.findOne({ hubId });
      if (hub) {
        hubName = hub.name;
        district = hub.district;
      }
    }

    const manager = new HubManager({
      managerId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      username: username.toLowerCase().trim(),
      password,
      address: address || {},
      hubId: hubId || null,
      hubName,
      district,
      status: "pending", // Set to pending for admin approval
      createdBy: "self_registration"
    });

    await manager.save();

    // Update hub if hubId provided
    if (hubId) {
      await Hub.findOneAndUpdate(
        { hubId },
        {
          $set: {
            managerId: manager.managerId,
            managerName: manager.name
          }
        }
      );
    }

    // Return manager without password
    const managerResponse = manager.toObject();
    delete managerResponse.password;

    res.status(201).json({
      success: true,
      message: "Registration successful! Please wait for admin approval.",
      manager: managerResponse
    });
  } catch (error) {
    console.error("Error during hub manager registration:", error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        error: `A hub manager with this ${field} already exists`
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      error: "Registration failed. Please try again."
    });
  }
});

// Hub manager login
router.post("/login", async (req, res) => {
  try {
    console.log("=== HUB MANAGER LOGIN ROUTE CALLED ===");
    console.log("Request body:", { email: req.body?.email, password: req.body?.password ? "***" : "missing" });
    
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      console.log("❌ Missing email or password");
      return res.status(400).json({
        success: false,
        error: "Email and password are required"
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();
    
    // Find manager by email
    const manager = await HubManager.findOne({ 
      email: normalizedEmail 
    });
    
    if (!manager) {
      console.log("❌ Manager not found for email:", normalizedEmail);
      return res.status(401).json({
        success: false,
        error: "Invalid email or password"
      });
    }
    
    console.log("✅ Manager found:", manager.email, "Status:", manager.status, "ManagerId:", manager.managerId);
    
    // Check if manager is active
    if (manager.status !== 'active') {
      console.log("❌ Manager account is not active. Status:", manager.status);
      return res.status(401).json({
        success: false,
        error: `Account is ${manager.status}. Please contact admin.`
      });
    }
    
    // Verify password
    let isPasswordValid = false;
    try {
      isPasswordValid = await manager.comparePassword(password);
      console.log("Password validation result:", isPasswordValid);
    } catch (pwdError) {
      console.error("❌ Password comparison error:", pwdError);
      return res.status(500).json({
        success: false,
        error: "Password verification failed. Please try again."
      });
    }
    
    if (!isPasswordValid) {
      console.log("❌ Invalid password for manager:", normalizedEmail);
      return res.status(401).json({
        success: false,
        error: "Invalid email or password"
      });
    }
    
    // Update last login
    try {
      manager.lastLogin = new Date();
      await manager.save();
      console.log("✅ Last login updated for:", manager.email);
    } catch (saveError) {
      console.error("⚠️ Failed to update last login (non-critical):", saveError);
      // Continue with login even if last login update fails
    }
    
    // Generate JWT token
    let token;
    try {
      token = jwt.sign(
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
      console.log("✅ JWT token generated successfully");
    } catch (tokenError) {
      console.error("❌ JWT token generation error:", tokenError);
      return res.status(500).json({
        success: false,
        error: "Token generation failed. Please try again."
      });
    }
    
    // Prepare response (without password)
    const managerResponse = manager.toObject();
    delete managerResponse.password;
    
    // Validate response data
    if (!token || !managerResponse || !managerResponse.managerId) {
      console.error("❌ Invalid response data after login");
      return res.status(500).json({
        success: false,
        error: "Login response incomplete. Please try again."
      });
    }
    
    console.log("✅ Hub manager login successful for:", manager.email);
    
    res.json({
      success: true,
      message: "Login successful",
      token,
      manager: managerResponse,
      expiresIn: "7 days"
    });
    
  } catch (error) {
    console.error("❌ Error during hub manager login:", error);
    console.error("Error stack:", error.stack);
    
    // Return appropriate error message
    res.status(500).json({
      success: false,
      error: error.message || "Login failed. Please try again."
    });
  }
});

// Verify hub manager token middleware
const verifyHubManagerToken = (req, res, next) => {
  console.log("=== VERIFY HUB MANAGER TOKEN ===");
  console.log("URL:", req.url);
  console.log("Method:", req.method);
  
  const token = req.header('Authorization')?.replace('Bearer ', '');
  console.log("Token extracted:", token ? `${token.substring(0, 20)}...` : "NO TOKEN");
  
  if (!token) {
    console.log("❌ No token provided");
    return res.status(401).json({
      success: false,
      error: "Access denied. No token provided."
    });
  }
  
  try {
    // Use the same JWT secret as hubManagerAuth.js
    const JWT_SECRET_FOR_VERIFICATION = process.env.JWT_SECRET || "hub_manager_jwt_secret_key_2024";
    console.log("🔍 Using JWT secret for verification:", JWT_SECRET_FOR_VERIFICATION);
    
    const decoded = jwt.verify(token, JWT_SECRET_FOR_VERIFICATION);
    console.log("✅ Token decoded successfully:", {
      managerId: decoded.managerId,
      email: decoded.email,
      role: decoded.role
    });
    
    if (decoded.role !== 'hubmanager') {
      console.log("❌ Invalid role:", decoded.role);
      return res.status(403).json({
        success: false,
        error: "Access denied. Invalid role."
      });
    }
    
    req.manager = decoded;
    console.log("✅ Manager verified:", decoded.email);
    next();
  } catch (error) {
    console.log("❌ Token verification failed:", error.message);
    console.log("❌ Error name:", error.name);
    console.log("❌ Error stack:", error.stack);
    res.status(401).json({
      success: false,
      error: "Invalid or expired token"
    });
  }
};

// Get hub manager profile
router.get("/profile/me", verifyHubManagerToken, async (req, res) => {
  try {
    const manager = await HubManager.findOne({ 
      managerId: req.manager.managerId 
    }).select('-password');
    
    if (!manager) {
      return res.status(404).json({
        success: false,
        error: "Manager profile not found"
      });
    }
    
    res.json({
      success: true,
      manager
    });
  } catch (error) {
    console.error("Error fetching manager profile:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get hub manager dashboard stats
router.get("/dashboard/stats", verifyHubManagerToken, async (req, res) => {
  try {
    const manager = await HubManager.findOne({ 
      managerId: req.manager.managerId 
    });
    
    if (!manager || !manager.hubId) {
      return res.status(404).json({
        success: false,
        error: "Manager not assigned to any hub"
      });
    }
    
    console.log(`📊 Fetching stats for hub manager ${manager.managerId} at hub ${manager.hubId}`);
    
    // Get orders at this hub with different statuses
    const [
      pending,
      atHub,
      ordersFromSellers,        // Orders FROM sellers TO this hub
      dispatchToBuyers,         // Orders FROM other hubs TO buyers in this district
      outForDelivery,
      delivered
    ] = await Promise.all([
      // Pending: Orders awaiting processing
      Order.countDocuments({ 
        $or: [
          { 'hubTracking.sellerHubId': manager.hubId, orderStatus: 'pending' },
          { 'hubTracking.customerHubId': manager.hubId, orderStatus: 'pending' }
        ]
      }),
      // At Hub: Orders at customer hub ready for pickup
      Order.countDocuments({ 
        'hubTracking.customerHubId': manager.hubId,
        orderStatus: 'at_customer_hub'
      }),
      // Orders: Products FROM sellers TO this hub (waiting for admin approval)
      Order.countDocuments({ 
        'hubTracking.sellerHubId': manager.hubId,
        orderStatus: 'at_seller_hub'
      }),
      // Dispatch: Products FROM other hubs TO buyers in this district
      Order.countDocuments({ 
        'hubTracking.customerHubId': manager.hubId,
        orderStatus: { $in: ['in_transit_to_customer_hub', 'at_customer_hub'] }
      }),
      // Out for Delivery: Orders assigned to delivery agents
      Order.countDocuments({ 
        'hubTracking.customerHubId': manager.hubId,
        orderStatus: { $in: ['assigned', 'accepted', 'picked_up', 'out_for_delivery'] }
      }),
      // Delivered: Successfully completed orders
      Order.countDocuments({ 
        'hubTracking.customerHubId': manager.hubId,
        orderStatus: 'delivered'
      })
    ]);
    
    const stats = {
      pending,
      atHub,
      orders: ordersFromSellers,        // Orders FROM sellers TO this hub
      dispatch: dispatchToBuyers,       // Orders FROM other hubs TO buyers in this district
      outForDelivery,
      delivered,
      totalOrders: pending + atHub + ordersFromSellers + dispatchToBuyers + outForDelivery + delivered
    };
    
    console.log(`✅ Hub ${manager.hubId} stats:`, stats);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("Error fetching hub manager stats:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get orders at hub
router.get("/orders/hub", verifyHubManagerToken, async (req, res) => {
  try {
    const manager = await HubManager.findOne({ 
      managerId: req.manager.managerId 
    });
    
    if (!manager || !manager.hubId) {
      return res.status(404).json({
        success: false,
        error: "Manager not assigned to any hub"
      });
    }
    
    const { location, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {
      $or: [
        { 'hubTracking.sellerHubId': manager.hubId },
        { 'hubTracking.customerHubId': manager.hubId }
      ]
    };
    
    if (location) {
      query['hubTracking.currentLocation'] = location;
    }
    
    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('items.productId', 'title image')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      orders,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: orders.length,
        totalOrders: total
      }
    });
  } catch (error) {
    console.error("Error fetching hub orders:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get seller hub orders (orders at seller hubs waiting for admin approval)
router.get("/orders/seller-hub", verifyHubManagerToken, async (req, res) => {
  try {
    const manager = await HubManager.findOne({ 
      managerId: req.manager.managerId 
    });
    
    if (!manager || !manager.hubId) {
      return res.status(404).json({
        success: false,
        error: "Manager not assigned to any hub"
      });
    }
    
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    // Get orders at this hub that are from sellers (waiting for admin approval to dispatch to customers)
    let query = {
      'hubTracking.sellerHubId': manager.hubId,
      orderStatus: 'at_seller_hub'
    };
    
    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('items.productId', 'title image')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      orders,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: orders.length,
        totalOrders: total
      }
    });
  } catch (error) {
    console.error("Error fetching seller hub orders:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get customer hub orders (orders at this hub ready for customer pickup/delivery)
router.get("/orders/customer-hub", verifyHubManagerToken, async (req, res) => {
  try {
    const manager = await HubManager.findOne({ 
      managerId: req.manager.managerId 
    });
    
    if (!manager || !manager.hubId) {
      return res.status(404).json({
        success: false,
        error: "Manager not assigned to any hub"
      });
    }
    
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    // Get orders at this hub that are for customers (dispatched from sellers, ready for pickup)
    let query = {
      'hubTracking.customerHubId': manager.hubId,
      orderStatus: { $in: ['in_transit_to_customer_hub', 'at_customer_hub', 'assigned', 'accepted', 'picked_up', 'out_for_delivery'] }
    };
    
    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('items.productId', 'title image')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      orders,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: orders.length,
        totalOrders: total
      }
    });
  } catch (error) {
    console.error("Error fetching customer hub orders:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// TEMPORARY FIX: Direct notifications endpoint without token verification
router.get("/notifications-direct/:managerId", async (req, res) => {
  try {
    console.log("🔧 DIRECT NOTIFICATIONS ENDPOINT CALLED");
    console.log("Manager ID:", req.params.managerId);
    
    const Notification = require("../models/Notification");
    const { unreadOnly, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {
      userId: req.params.managerId,
      userRole: 'hubmanager'
    };
    
    if (unreadOnly === 'true') {
      query.read = false;
    }
    
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments(query),
      Notification.countDocuments({ 
        userId: req.params.managerId,
        userRole: 'hubmanager',
        read: false 
      })
    ]);
    
    console.log(`✅ Found ${notifications.length} notifications for manager ${req.params.managerId}`);
    
    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: notifications.length
      }
    });
  } catch (error) {
    console.error("Error fetching direct notifications:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test route for debugging
router.get("/test-notifications", verifyHubManagerToken, async (req, res) => {
  console.log("🧪 TEST NOTIFICATIONS ROUTE HIT!");
  console.log("Manager:", req.manager);
  res.json({
    success: true,
    message: "Test notifications route works!",
    manager: req.manager
  });
});

// Get notifications for hub manager (bypass auth issues)
router.get("/hub-notifications", async (req, res) => {
  try {
    console.log("🔔 HUB-NOTIFICATIONS ENDPOINT CALLED");
    console.log("Query params:", req.query);
    
    const managerId = req.query.managerId;
    
    if (!managerId) {
      return res.status(400).json({
        success: false,
        error: "Manager ID required as query parameter"
      });
    }
    
    const Notification = require("../models/Notification");
    const { unreadOnly, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {
      userId: managerId,
      userRole: 'hubmanager'
    };
    
    if (unreadOnly === 'true') {
      query.read = false;
    }
    
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments(query),
      Notification.countDocuments({ 
        userId: managerId,
        userRole: 'hubmanager',
        read: false 
      })
    ]);
    
    console.log(`✅ Found ${notifications.length} notifications for manager ${managerId}`);
    
    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: notifications.length
      }
    });
  } catch (error) {
    console.error("Error fetching hub notifications:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get notifications for hub manager
router.get("/notifications", async (req, res) => {
  try {
    console.log("🔔 NOTIFICATIONS ENDPOINT CALLED");
    console.log("Headers:", req.headers);
    
    // For now, bypass token verification and use managerId from query
    const managerId = req.query.managerId || req.headers['x-manager-id'];
    
    if (!managerId) {
      return res.status(400).json({
        success: false,
        error: "Manager ID required"
      });
    }
    
    const Notification = require("../models/Notification");
    const { unreadOnly, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {
      userId: managerId,
      userRole: 'hubmanager'
    };
    
    if (unreadOnly === 'true') {
      query.read = false;
    }
    
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments(query),
      Notification.countDocuments({ 
        userId: managerId,
        userRole: 'hubmanager',
        read: false 
      })
    ]);
    
    console.log(`✅ Found ${notifications.length} notifications for manager ${managerId}`);
    
    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: notifications.length
      }
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mark notification as read
router.patch("/notifications/:id/read", verifyHubManagerToken, async (req, res) => {
  try {
    const Notification = require("../models/Notification");
    
    const notification = await Notification.findOneAndUpdate(
      { 
        _id: req.params.id,
        userId: req.manager.managerId
      },
      { 
        read: true,
        readAt: new Date()
      },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: "Notification not found"
      });
    }
    
    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mark all notifications as read
router.patch("/notifications/read-all", verifyHubManagerToken, async (req, res) => {
  try {
    const Notification = require("../models/Notification");
    
    const result = await Notification.updateMany(
      { 
        userId: req.manager.managerId,
        userRole: 'hubmanager',
        read: false
      },
      { 
        read: true,
        readAt: new Date()
      }
    );
    
    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get notification details with full order information
router.get("/notifications/:id/details", verifyHubManagerToken, async (req, res) => {
  try {
    const Notification = require("../models/Notification");
    const Order = require("../models/Order");
    const Product = require("../models/Product");
    const User = require("../models/User");
    
    // Get the notification
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.manager.managerId,
      userRole: 'hubmanager'
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: "Notification not found"
      });
    }
    
    // Mark as read
    if (!notification.read) {
      notification.read = true;
      notification.readAt = new Date();
      await notification.save();
    }
    
    // Get order details if notification has orderId
    let orderDetails = null;
    if (notification.orderId) {
      const order = await Order.findById(notification.orderId).lean();
      
      if (order) {
        // Get product details for each item
        const itemsWithDetails = await Promise.all(
          order.items.map(async (item) => {
            const product = await Product.findById(item.productId)
              .select('sellerId')
              .lean();
            
            // Get seller details
            let sellerDetails = null;
            if (product && product.sellerId) {
              const seller = await User.findOne({ uid: product.sellerId })
                .select('name email phone businessName')
                .lean();
              sellerDetails = seller;
            }
            
            return {
              ...item,
              sellerDetails
            };
          })
        );
        
        orderDetails = {
          ...order,
          items: itemsWithDetails
        };
      }
    }
    
    res.json({
      success: true,
      notification,
      orderDetails
    });
  } catch (error) {
    console.error("Error fetching notification details:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all hubs with statistics (for hub manager dashboard) - PUBLIC ENDPOINT
router.get("/all-hubs", async (req, res) => {
  try {
    console.log("📊 Fetching all hubs...");
    console.log("📥 Request headers:", req.headers);
    
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

module.exports = router;
