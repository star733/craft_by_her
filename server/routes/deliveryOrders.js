const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Order = require("../models/Order");
const DeliveryAgent = require("../models/DeliveryAgent");
const { sendPickupNotification, sendAcceptanceNotification } = require("../utils/emailService");

// JWT Secret (should match the one in deliveryAgents.js)
const JWT_SECRET = process.env.JWT_SECRET || "delivery_jwt_secret_key_for_foodily_auth_2024_secure";

// Middleware to verify delivery boy token
const verifyDeliveryToken = (req, res, next) => {
  console.log("=== TOKEN VERIFICATION ===");
  console.log("Authorization header:", req.headers.authorization);
  
  const token = req.header('Authorization')?.replace('Bearer ', '');
  console.log("Extracted token:", token);
  
  if (!token) {
    console.log("No token provided");
    return res.status(401).json({
      success: false,
      error: "Access denied. No token provided."
    });
  }
  
  try {
    console.log("JWT_SECRET:", JWT_SECRET);
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("Decoded token:", decoded);
    
    if (decoded.role !== 'deliveryboy') {
      console.log("Invalid role:", decoded.role);
      return res.status(403).json({
        success: false,
        error: "Access denied. Invalid role."
      });
    }
    
    req.agent = decoded;
    console.log("Token verified successfully for agent:", decoded.agentId);
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({
      success: false,
      error: "Invalid token."
    });
  }
};

// Test endpoint - GET orders for DA0001 without auth (temporary)
router.get("/test", async (req, res) => {
  try {
    console.log("=== TEST DELIVERY ORDERS ===");
    
    const query = {
      'deliveryInfo.agentId': 'DA0001'
    };
    
    const orders = await Order.find(query)
      .populate('items.productId', 'title image')
      .sort({ createdAt: -1 });

    console.log("Orders found for DA0001:", orders.length);
    
    res.json({
      success: true,
      message: `Found ${orders.length} orders for DA0001`,
      orders: orders.map(order => ({
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        agentId: order.deliveryInfo?.agentId,
        customer: order.buyerDetails?.name,
        total: order.finalAmount
      }))
    });
  } catch (err) {
    console.error("Test endpoint error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get orders assigned to delivery boy
router.get("/", verifyDeliveryToken, async (req, res) => {
  try {
    console.log("=== DELIVERY ORDERS REQUEST ===");
    console.log("Agent from token:", req.agent);
    console.log("Agent ID:", req.agent.agentId);
    
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

    console.log("Orders found:", orders.length);
    console.log("Orders:", orders.map(o => ({ orderNumber: o.orderNumber, status: o.orderStatus, agentId: o.deliveryInfo?.agentId })));
    
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

// Get single order details
router.get("/:orderId", verifyDeliveryToken, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      'deliveryInfo.agentId': req.agent.agentId
    }).populate('items.productId', 'title image');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found or not assigned to you"
      });
    }
    
    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Accept or reject delivery assignment
router.patch("/:orderId/accept", verifyDeliveryToken, async (req, res) => {
  try {
    const { action } = req.body; // "accept" or "reject"
    
    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        error: "Action must be 'accept' or 'reject'"
      });
    }
    
    const order = await Order.findOne({
      _id: req.params.orderId,
      'deliveryInfo.agentId': req.agent.agentId
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found or not assigned to you"
      });
    }
    
    const status = action === "accept" ? "accepted" : "rejected";
    const orderStatus = action === "accept" ? "accepted" : "rejected";
    
    const updateData = {
      orderStatus: orderStatus
    };
    
    if (action === "accept") {
      updateData['deliveryInfo.acceptedAt'] = new Date();
      updateData['deliveryStatus.accepted'] = true;
    } else {
      // If rejected, reset the assignment
      updateData['deliveryInfo.agentId'] = null;
      updateData['deliveryInfo.assignedAt'] = null;
      updateData['deliveryStatus.assigned'] = false;
    }
    
    // Add tracking update
    const trackingUpdate = {
      status,
      message: `Order ${action}ed by delivery agent`,
      timestamp: new Date()
    };
    
    updateData.$push = {
      'deliveryInfo.trackingUpdates': trackingUpdate
    };
    
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.orderId,
      updateData,
      { new: true }
    );
    
    // Get delivery agent details for email notification
    const deliveryAgent = await DeliveryAgent.findOne({ agentId: req.agent.agentId });
    
    // Send email notification to admin
    if (deliveryAgent) {
      await sendAcceptanceNotification(updatedOrder, deliveryAgent, action);
    }
    
    res.json({
      success: true,
      message: `Order ${action}ed successfully`,
      order: updatedOrder
    });
  } catch (error) {
    console.error("Error accepting/rejecting order:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update order status (pickup, delivered, etc.)
router.patch("/:orderId/status", verifyDeliveryToken, async (req, res) => {
  try {
    const { status, notes, location } = req.body;
    
    // Validate status
    const validStatuses = ["accepted", "rejected", "picked_up", "in_transit", "delivered", "failed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status. Must be one of: " + validStatuses.join(", ")
      });
    }
    
    const order = await Order.findOne({
      _id: req.params.orderId,
      'deliveryInfo.agentId': req.agent.agentId
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found or not assigned to you"
      });
    }
    
    // Update order status and delivery info
    let orderStatus = status; // Use the status directly as orderStatus
    if (status === "picked_up") {
      orderStatus = "picked_up";
    } else if (status === "in_transit") {
      orderStatus = "in_transit";
    } else if (status === "delivered") {
      orderStatus = "delivered";
    } else if (status === "accepted") {
      orderStatus = "accepted";
    } else if (status === "rejected") {
      orderStatus = "rejected";
    }
    
    const updateData = {
      orderStatus: orderStatus
    };

    // Update delivery timestamps and status flags
    if (status === "accepted") {
      updateData['deliveryInfo.acceptedAt'] = new Date();
      updateData['deliveryStatus.accepted'] = true;
    } else if (status === "picked_up") {
      updateData['deliveryInfo.pickedUpAt'] = new Date();
      updateData['deliveryStatus.pickedUp'] = true;
      updateData.orderStatus = "shipped";
    } else if (status === "delivered") {
      updateData['deliveryInfo.deliveredAt'] = new Date();
      updateData['deliveryStatus.delivered'] = true;
      updateData.orderStatus = "delivered";
    }
    
    // Add notes if provided
    if (notes) {
      updateData['deliveryInfo.deliveryNotes'] = notes;
    }
    
    // Add tracking update
    const trackingUpdate = {
      status,
      message: notes || `Order ${status.replace('_', ' ')}`,
      timestamp: new Date(),
      location: location || null
    };
    
    updateData.$push = {
      'deliveryInfo.trackingUpdates': trackingUpdate
    };
    
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.orderId,
      updateData,
      { new: true }
    );
    
    // Send pickup notifications when picked up
    if (status === "picked_up") {
      const deliveryAgent = await DeliveryAgent.findOne({ agentId: req.agent.agentId });
      if (deliveryAgent) {
        // Notify seller/admin
        await sendPickupNotification(updatedOrder, deliveryAgent);
      }
      // Notify buyer
      try {
        const { sendBuyerPickupNotification } = require('../utils/emailService');
        await sendBuyerPickupNotification(updatedOrder);
      } catch (e) {
        console.error('Failed to send buyer pickup notification:', e);
      }

      // Kick off the 1-minute tracking simulation (best-effort fire-and-forget)
      try {
        fetch('http://localhost:3000/start', { method: 'POST' }).catch(() => {});
      } catch (_) {}
    }
    
    // Update delivery agent stats if delivered
    if (status === "delivered") {
      await DeliveryAgent.findOneAndUpdate(
        { agentId: req.agent.agentId },
        {
          $inc: {
            totalDeliveries: 1,
            'earnings.total': 50, // Fixed delivery fee - can be made dynamic
            'earnings.thisMonth': 50
          }
        }
      );
    }
    
    res.json({
      success: true,
      message: `Order ${status.replace('_', ' ')} successfully`,
      order: updatedOrder
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Share live location (updates agent's current location)
router.patch("/location", verifyDeliveryToken, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: "Latitude and longitude are required"
      });
    }
    
    // Update agent's current location
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

// Update delivery location for specific order
router.patch("/:orderId/location", verifyDeliveryToken, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: "Latitude and longitude are required"
      });
    }
    
    const order = await Order.findOne({
      _id: req.params.orderId,
      'deliveryInfo.agentId': req.agent.agentId
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found or not assigned to you"
      });
    }
    
    // Add location tracking update
    const trackingUpdate = {
      status: "location_update",
      message: "Delivery agent location updated",
      timestamp: new Date(),
      location: { latitude, longitude }
    };
    
    await Order.findByIdAndUpdate(
      req.params.orderId,
      {
        $push: {
          'deliveryInfo.trackingUpdates': trackingUpdate
        }
      }
    );
    
    res.json({
      success: true,
      message: "Location updated successfully"
    });
  } catch (error) {
    console.error("Error updating delivery location:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get delivery statistics for dashboard
router.get("/stats/dashboard", verifyDeliveryToken, async (req, res) => {
  try {
    const agentId = req.agent.agentId;
    
    // Get delivery statistics
    const [totalOrders, deliveredOrders, pendingOrders, agent] = await Promise.all([
      Order.countDocuments({ 'deliveryInfo.agentId': agentId }),
      Order.countDocuments({ 
        'deliveryInfo.agentId': agentId, 
        orderStatus: 'delivered' 
      }),
      Order.countDocuments({ 
        'deliveryInfo.agentId': agentId, 
        orderStatus: { $in: ['shipped', 'picked_up', 'in_transit'] }
      }),
      DeliveryAgent.findOne({ agentId }).select('totalDeliveries rating earnings')
    ]);
    
    const stats = {
      totalOrders,
      deliveredOrders,
      pendingOrders,
      totalDeliveries: agent?.totalDeliveries || 0,
      rating: agent?.rating || 0,
      totalEarnings: agent?.earnings?.total || 0,
      monthlyEarnings: agent?.earnings?.thisMonth || 0
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

// Get delivery statistics
router.get("/stats/summary", verifyDeliveryToken, async (req, res) => {
  try {
    const agentId = req.agent.agentId;
    
    // Get delivery statistics
    const [totalOrders, deliveredOrders, pendingOrders, agent] = await Promise.all([
      Order.countDocuments({ 'deliveryInfo.agentId': agentId }),
      Order.countDocuments({ 
        'deliveryInfo.agentId': agentId, 
        orderStatus: 'delivered' 
      }),
      Order.countDocuments({ 
        'deliveryInfo.agentId': agentId, 
        orderStatus: { $in: ['shipped', 'picked_up', 'in_transit'] }
      }),
      DeliveryAgent.findOne({ agentId }).select('totalDeliveries rating earnings')
    ]);
    
    const stats = {
      totalOrders,
      deliveredOrders,
      pendingOrders,
      totalDeliveries: agent?.totalDeliveries || 0,
      rating: agent?.rating || 0,
      totalEarnings: agent?.earnings?.total || 0,
      monthlyEarnings: agent?.earnings?.thisMonth || 0
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

module.exports = router;
