const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const DeliveryAgent = require("../models/DeliveryAgent");
const verify = require("../middleware/verifyFirebaseToken");
const requireAdmin = require("../middleware/verifyAdmin");

// JWT Secret (loaded from environment configuration)
const JWT_SECRET = process.env.JWT_SECRET || "delivery_jwt_secret_key_for_foodily_auth_2024_secure";

// ===== ADMIN ROUTES =====

// Get all delivery agents (Admin only)
router.get("/", verify, requireAdmin, async (req, res) => {
  try {
    console.log("=== FETCHING DELIVERY AGENTS ===");
    console.log("Query params:", req.query);
    console.log("User:", req.user?.uid);
    
    const { status, search, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Search by name, phone, email, or agentId
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { agentId: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    const Order = require("../models/Order");

    const [agents, total] = await Promise.all([
      DeliveryAgent.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      DeliveryAgent.countDocuments(query)
    ]);

    // Enrich with busy/availability info
    const agentsWithStatus = await Promise.all(agents.map(async (agent) => {
      const activeOrdersCount = await Order.countDocuments({
        'deliveryInfo.agentId': agent.agentId,
        orderStatus: { $in: ['assigned', 'accepted', 'picked_up', 'shipped', 'in_transit', 'out_for_delivery'] }
      });

      const isBusy = activeOrdersCount > 0;
      const isAvailable = agent.isOnline && !isBusy;
      const availability = agent.isOnline ? (isBusy ? 'busy' : 'available') : 'offline';

      return {
        ...agent.toObject(),
        activeOrdersCount,
        isBusy,
        isAvailable,
        availability
      };
    }));

    res.json({
      success: true,
      agents: agentsWithStatus,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: agentsWithStatus.length,
        totalAgents: total
      }
    });
  } catch (error) {
    console.error("Error fetching delivery agents:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single delivery agent (Admin only)
router.get("/:agentId", verify, requireAdmin, async (req, res) => {
  try {
    const agent = await DeliveryAgent.findOne({ 
      agentId: req.params.agentId 
    }).select('-password');
    
    if (!agent) {
      return res.status(404).json({ error: "Delivery agent not found" });
    }
    
    res.json({ success: true, agent });
  } catch (error) {
    console.error("Error fetching delivery agent:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create new delivery agent (Admin only)
router.post("/", verify, requireAdmin, async (req, res) => {
  try {
    console.log("=== CREATING DELIVERY AGENT ===");
    console.log("Request body:", req.body);
    console.log("User:", req.user?.uid);
    
    const {
      name,
      phone,
      email,
      username,
      password,
      address,
      vehicleInfo,
      status = "pending"
    } = req.body;
    
    // Validation
    if (!name || !phone || !email || !username || !password) {
      console.log("Validation failed - missing required fields");
      return res.status(400).json({ 
        success: false,
        error: "Name, phone, email, username, and password are required" 
      });
    }
    
    // Check if username, email, or phone already exists
    const existingAgent = await DeliveryAgent.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() },
        { phone: phone }
      ]
    });
    
    if (existingAgent) {
      let field = 'details';
      if (existingAgent.username === username.toLowerCase()) field = 'username';
      else if (existingAgent.email === email.toLowerCase()) field = 'email';
      else if (existingAgent.phone === phone) field = 'phone';
      
      return res.status(400).json({ 
        error: `A delivery agent with this ${field} already exists` 
      });
    }
    
    // Generate agentId first
    const count = await DeliveryAgent.countDocuments();
    const agentId = `DA${String(count + 1).padStart(4, '0')}`;
    
    console.log("Generated agentId:", agentId);
    
    // Create new delivery agent
    const agent = new DeliveryAgent({
      agentId,
      name: name.trim(),
      phone: phone.trim(),
      email: email.toLowerCase().trim(),
      username: username.toLowerCase().trim(),
      password,
      address: address || {},
      vehicleInfo: vehicleInfo || { type: "", number: "" },
      status,
      createdBy: req.user.uid
    });
    
    await agent.save();
    
    // Return agent without password
    const agentResponse = agent.toObject();
    delete agentResponse.password;
    
    res.status(201).json({
      success: true,
      message: "Delivery agent created successfully",
      agent: agentResponse
    });
  } catch (error) {
    console.error("Error creating delivery agent:", error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        error: `A delivery agent with this ${field} already exists` 
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Update delivery agent (Admin only)
router.put("/:agentId", verify, requireAdmin, async (req, res) => {
  try {
    const { agentId } = req.params;
    const updateData = { ...req.body };
    
    // Remove sensitive fields that shouldn't be updated this way
    delete updateData.password;
    delete updateData.agentId;
    delete updateData.createdBy;
    
    const agent = await DeliveryAgent.findOneAndUpdate(
      { agentId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!agent) {
      return res.status(404).json({ error: "Delivery agent not found" });
    }
    
    res.json({
      success: true,
      message: "Delivery agent updated successfully",
      agent
    });
  } catch (error) {
    console.error("Error updating delivery agent:", error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        error: `A delivery agent with this ${field} already exists` 
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Update agent status (Admin only)
router.patch("/:agentId/status", verify, requireAdmin, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status } = req.body;
    
    if (!["active", "inactive", "pending"].includes(status)) {
      return res.status(400).json({ 
        error: "Status must be 'active', 'inactive', or 'pending'" 
      });
    }
    
    const agent = await DeliveryAgent.findOneAndUpdate(
      { agentId },
      { $set: { status } },
      { new: true }
    ).select('-password');
    
    if (!agent) {
      return res.status(404).json({ error: "Delivery agent not found" });
    }
    
    res.json({
      success: true,
      message: `Delivery agent ${status === 'active' ? 'activated' : status === 'inactive' ? 'deactivated' : 'set to pending'}`,
      agent
    });
  } catch (error) {
    console.error("Error updating agent status:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete delivery agent (Admin only)
router.delete("/:agentId", verify, requireAdmin, async (req, res) => {
  try {
    const { agentId } = req.params;
    
    const agent = await DeliveryAgent.findOneAndDelete({ agentId });
    
    if (!agent) {
      return res.status(404).json({ error: "Delivery agent not found" });
    }
    
    res.json({
      success: true,
      message: "Delivery agent deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting delivery agent:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== DELIVERY BOY ROUTES =====

// Delivery boy login
router.post("/login", async (req, res) => {
  try {
    console.log("=== DELIVERY BOY LOGIN ATTEMPT ===");
    const { username, password } = req.body;
    console.log("Login attempt for username:", username);
    console.log("Request body:", req.body);
    console.log("Database connection state:", mongoose.connection.readyState);
    
    if (!username || !password) {
      console.log("Missing username or password");
      return res.status(400).json({
        success: false,
        error: "Username and password are required"
      });
    }
    
    // Find agent by username
    const agent = await DeliveryAgent.findOne({ 
      username: username.toLowerCase() 
    });
    
    console.log("Agent found:", agent ? `${agent.name} (${agent.agentId})` : "Not found");
    
    if (!agent) {
      console.log("Agent not found in database");
      return res.status(401).json({
        success: false,
        error: "Invalid username or password"
      });
    }
    
    console.log("Agent status:", agent.status);
    
    // Check if agent is active
    if (agent.status !== 'active') {
      console.log(`Agent status is ${agent.status}, not active`);
      return res.status(401).json({
        success: false,
        error: `Account is ${agent.status}. Please contact admin.`
      });
    }
    
    // Verify password
    console.log("Verifying password...");
    const isPasswordValid = await agent.comparePassword(password);
    console.log("Password valid:", isPasswordValid);
    
    if (!isPasswordValid) {
      console.log("Password verification failed");
      return res.status(401).json({
        success: false,
        error: "Invalid username or password"
      });
    }
    
    // Update last login
    agent.lastLogin = new Date();
    await agent.save();
    
    // Generate JWT token
    const token = jwt.sign(
      {
        agentId: agent.agentId,
        username: agent.username,
        role: "deliveryboy",
        name: agent.name
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    // Prepare response (without password)
    const agentResponse = agent.toObject();
    delete agentResponse.password;
    
    res.json({
      success: true,
      message: "Login successful",
      token,
      agent: agentResponse,
      expiresIn: "7 days"
    });
    
  } catch (error) {
    console.error("Error during delivery boy login:", error);
    res.status(500).json({
      success: false,
      error: "Login failed. Please try again."
    });
  }
});

// Verify delivery boy token (middleware for delivery boy routes)
const verifyDeliveryToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Access denied. No token provided."
    });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role !== 'deliveryboy') {
      return res.status(403).json({
        success: false,
        error: "Access denied. Invalid role."
      });
    }
    
    req.agent = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: "Invalid token."
    });
  }
};

// Get delivery boy profile
router.get("/profile/me", verifyDeliveryToken, async (req, res) => {
  try {
    const agent = await DeliveryAgent.findOne({ 
      agentId: req.agent.agentId 
    }).select('-password');
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: "Agent profile not found"
      });
    }
    
    res.json({
      success: true,
      agent
    });
  } catch (error) {
    console.error("Error fetching agent profile:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update delivery boy location
router.patch("/location", verifyDeliveryToken, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: "Latitude and longitude are required"
      });
    }
    
    const agent = await DeliveryAgent.findOneAndUpdate(
      { agentId: req.agent.agentId },
      {
        $set: {
          'currentLocation.latitude': latitude,
          'currentLocation.longitude': longitude,
          'currentLocation.lastUpdated': new Date()
        }
      },
      { new: true }
    ).select('-password');
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: "Agent not found"
      });
    }
    
    res.json({
      success: true,
      message: "Location updated successfully",
      location: agent.currentLocation
    });
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update online status
router.patch("/status/online", verifyDeliveryToken, async (req, res) => {
  try {
    const { isOnline } = req.body;
    
    const agent = await DeliveryAgent.findOneAndUpdate(
      { agentId: req.agent.agentId },
      { $set: { isOnline: Boolean(isOnline) } },
      { new: true }
    ).select('-password');
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: "Agent not found"
      });
    }
    
    res.json({
      success: true,
      message: `Status updated to ${isOnline ? 'online' : 'offline'}`,
      isOnline: agent.isOnline
    });
  } catch (error) {
    console.error("Error updating online status:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update ready for delivery status
router.patch("/status/ready", verifyDeliveryToken, async (req, res) => {
  try {
    const { readyForDelivery } = req.body;
    
    const agent = await DeliveryAgent.findOneAndUpdate(
      { agentId: req.agent.agentId },
      { $set: { readyForDelivery: Boolean(readyForDelivery) } },
      { new: true }
    ).select('-password');
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: "Agent not found"
      });
    }
    
    res.json({
      success: true,
      message: `Ready for delivery status updated to ${readyForDelivery ? 'ready' : 'not ready'}`,
      readyForDelivery: agent.readyForDelivery
    });
  } catch (error) {
    console.error("Error updating ready for delivery status:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get delivery statistics
router.get("/stats/dashboard", verifyDeliveryToken, async (req, res) => {
  try {
    const Order = require("../models/Order");
    const agentId = req.agent.agentId;
    
    const [agent, totalOrders, deliveredOrders, pendingOrders] = await Promise.all([
      DeliveryAgent.findOne({ agentId }).select('totalDeliveries rating earnings'),
      Order.countDocuments({ 'deliveryInfo.agentId': agentId }),
      Order.countDocuments({ 
        'deliveryInfo.agentId': agentId, 
        orderStatus: 'delivered' 
      }),
      Order.countDocuments({ 
        'deliveryInfo.agentId': agentId, 
        orderStatus: { $in: ['shipped', 'preparing', 'confirmed'] }
      })
    ]);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: "Agent not found"
      });
    }
    
    const stats = {
      totalDeliveries: agent.totalDeliveries,
      rating: agent.rating,
      totalEarnings: agent.earnings.total,
      monthlyEarnings: agent.earnings.thisMonth,
      totalOrders,
      deliveredOrders,
      pendingOrders
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("Error fetching delivery stats:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get orders assigned to delivery boy
router.get("/orders", verifyDeliveryToken, async (req, res) => {
  try {
    const Order = require("../models/Order");
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = {
      'deliveryInfo.agentId': req.agent.agentId
    };
    
    // Filter by status if provided
    if (status && status !== 'all') {
      query.orderStatus = status;
    }
    
    const skip = (page - 1) * limit;
    
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
    console.error("Error fetching delivery orders:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
