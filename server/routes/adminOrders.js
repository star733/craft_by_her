const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const verify = require("../middleware/verifyFirebaseToken");
const verifyAdmin = require("../middleware/verifyAdmin");
const Order = require("../models/Order");
const DeliveryAgent = require("../models/DeliveryAgent");

// ✅ Get all orders for admin
router.get("/", verify, verifyAdmin, async (req, res) => {
  try {
    console.log("=== ADMIN FETCHING ALL ORDERS ===");
    
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .populate("items.productId", "title image")
      .lean();
    
    console.log(`Found ${orders.length} orders in database`);
    
    // Format orders for admin display
    const formattedOrders = orders.map(order => ({
      _id: order._id,
      id: order._id,
      orderNumber: order.orderNumber,
      customer: order.buyerDetails.name,
      email: order.buyerDetails.email,
      phone: order.buyerDetails.phone,
      buyerDetails: order.buyerDetails,
      total: order.finalAmount,
      totalAmount: order.totalAmount,
      finalAmount: order.finalAmount,
      status: order.orderStatus,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      date: new Date(order.createdAt).toLocaleDateString(),
      items: order.items.map(item => ({
        title: item.title,
        quantity: item.quantity,
        variant: item.variant,
        price: item.variant?.price || 0,
        image: item.image || (item.productId && item.productId.image ? item.productId.image : null)
      })),
      address: order.buyerDetails.address,
      notes: order.notes,
      deliveryInfo: order.deliveryInfo,
      refundDetails: order.refundDetails || null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));
    
    res.json(formattedOrders);
  } catch (err) {
    console.error("Error fetching orders for admin:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get single order details for admin
router.get("/:orderId", verify, verifyAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate("items.productId", "title image")
      .lean();
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    res.json(order);
  } catch (err) {
    console.error("Error fetching order details:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update order status (admin only)
router.put("/:orderId/status", verify, verifyAdmin, async (req, res) => {
  try {
    const { orderStatus, paymentStatus } = req.body;
    
    const updateData = {};
    if (orderStatus) updateData.orderStatus = orderStatus;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    updateData.updatedAt = new Date();
    
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { $set: updateData },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    res.json({ success: true, order });
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Assign delivery agent to order
router.patch("/:orderId/assign-delivery", verify, verifyAdmin, async (req, res) => {
  try {
    console.log("=== ASSIGNING DELIVERY AGENT ===");
    const { orderId } = req.params;
    const { agentId } = req.body;
    
    console.log("Order ID:", orderId);
    console.log("Agent ID:", agentId);
    
    if (!agentId) {
      return res.status(400).json({ 
        success: false,
        error: "Agent ID is required" 
      });
    }
    
    // Verify the agent exists and is active
    const agent = await DeliveryAgent.findOne({ 
      agentId, 
      status: 'active' 
    });
    
    if (!agent) {
      return res.status(404).json({ 
        success: false,
        error: "Delivery agent not found or inactive" 
      });
    }
    
    // Check if agent is ready for delivery
    if (!agent.readyForDelivery) {
      return res.status(400).json({ 
        success: false,
        error: "Agent is not ready for delivery" 
      });
    }
    
    // Update the order
    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        $set: {
          'deliveryInfo.agentId': agentId,
          'deliveryInfo.agentName': agent.name,
          'deliveryInfo.agentPhone': agent.phone,
          'deliveryInfo.assignedAt': new Date(),
          orderStatus: 'assigned'
        }
      },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: "Order not found" 
      });
    }
    
    console.log("Order assigned successfully to agent:", agentId);
    
    res.json({
      success: true,
      message: `Order assigned to ${agent.name} (${agentId})`,
      order
    });
  } catch (err) {
    console.error("Error assigning delivery agent:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// ✅ Get available delivery agents for assignment
router.get("/delivery-agents/available", verify, verifyAdmin, async (req, res) => {
  try {
    console.log("=== FETCHING AVAILABLE DELIVERY AGENTS ===");
    
    // Get all active delivery agents
    const agents = await DeliveryAgent.find({ 
      status: 'active' 
    }).select('-password').lean();
    
    console.log(`Found ${agents.length} active agents`);
    
    // Get order counts for each agent
    const agentsWithStatus = await Promise.all(agents.map(async (agent) => {
      const activeOrdersCount = await Order.countDocuments({
        'deliveryInfo.agentId': agent.agentId,
        orderStatus: { $in: ['assigned', 'accepted', 'picked_up', 'shipped', 'in_transit', 'out_for_delivery'] }
      });

      const pendingAcceptanceCount = await Order.countDocuments({
        'deliveryInfo.agentId': agent.agentId,
        orderStatus: 'assigned'
      });

      const isBusy = activeOrdersCount > 0;
      const isAvailable = agent.isOnline && !isBusy && agent.readyForDelivery;
      const availability = agent.isOnline 
        ? (isBusy ? 'busy' : (agent.readyForDelivery ? 'available' : 'not_ready'))
        : 'offline';

      return {
        ...agent,
        activeOrdersCount,
        pendingAcceptanceCount,
        isBusy,
        isAvailable,
        availability
      };
    }));

    // Sort: Ready and available first, then ready but busy, then not ready, then offline
    agentsWithStatus.sort((a, b) => {
      if (a.readyForDelivery && a.isAvailable && !(b.readyForDelivery && b.isAvailable)) return -1;
      if (!(a.readyForDelivery && a.isAvailable) && b.readyForDelivery && b.isAvailable) return 1;
      if (a.readyForDelivery && !b.readyForDelivery) return -1;
      if (!a.readyForDelivery && b.readyForDelivery) return 1;
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return a.activeOrdersCount - b.activeOrdersCount;
    });

    console.log(`Returning ${agentsWithStatus.length} agents with status`);
    
    res.json({
      success: true,
      agents: agentsWithStatus
    });
  } catch (err) {
    console.error("Error fetching available delivery agents:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// ✅ Process/Complete Refund (Admin only)
router.put("/:orderId/refund/process", verify, verifyAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { refundStatus, refundTransactionId, refundNotes } = req.body;
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    if (order.orderStatus !== "cancelled") {
      return res.status(400).json({ error: "Only cancelled orders can be refunded" });
    }
    
    if (order.paymentStatus !== "refunded") {
      return res.status(400).json({ error: "Order is not marked for refund" });
    }
    
    // Update refund details
    order.refundDetails.refundStatus = refundStatus || "processing";
    
    if (refundTransactionId) {
      order.refundDetails.refundTransactionId = refundTransactionId;
    }
    
    if (refundNotes) {
      order.refundDetails.refundNotes = refundNotes;
    }
    
    if (refundStatus === "completed") {
      order.refundDetails.refundCompletedAt = new Date();
    }
    
    await order.save();
    
    console.log(`✅ Refund ${refundStatus} for order ${order.orderNumber}: ₹${order.refundDetails.refundAmount}`);
    
    res.json({
      success: true,
      message: `Refund ${refundStatus} successfully`,
      order: order,
      refundDetails: order.refundDetails,
    });
  } catch (err) {
    console.error("Error processing refund:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get pending refunds (Admin only)
router.get("/refunds/pending", verify, verifyAdmin, async (req, res) => {
  try {
    const pendingRefunds = await Order.find({
      orderStatus: "cancelled",
      paymentStatus: "refunded",
      "refundDetails.refundStatus": { $in: ["pending", "processing"] }
    })
    .sort({ "refundDetails.refundInitiatedAt": -1 })
    .populate("items.productId", "title image")
    .lean();
    
    console.log(`Found ${pendingRefunds.length} pending refunds`);
    
    res.json({
      success: true,
      refunds: pendingRefunds,
      total: pendingRefunds.length,
    });
  } catch (err) {
    console.error("Error fetching pending refunds:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get refund statistics (Admin only)
router.get("/refunds/stats", verify, verifyAdmin, async (req, res) => {
  try {
    const totalRefunds = await Order.countDocuments({
      orderStatus: "cancelled",
      paymentStatus: "refunded",
    });
    
    const pendingRefunds = await Order.countDocuments({
      orderStatus: "cancelled",
      paymentStatus: "refunded",
      "refundDetails.refundStatus": "pending",
    });
    
    const processingRefunds = await Order.countDocuments({
      orderStatus: "cancelled",
      paymentStatus: "refunded",
      "refundDetails.refundStatus": "processing",
    });
    
    const completedRefunds = await Order.countDocuments({
      orderStatus: "cancelled",
      paymentStatus: "refunded",
      "refundDetails.refundStatus": "completed",
    });
    
    const totalRefundAmount = await Order.aggregate([
      {
        $match: {
          orderStatus: "cancelled",
          paymentStatus: "refunded",
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$refundDetails.refundAmount" }
        }
      }
    ]);
    
    const pendingRefundAmount = await Order.aggregate([
      {
        $match: {
          orderStatus: "cancelled",
          paymentStatus: "refunded",
          "refundDetails.refundStatus": { $in: ["pending", "processing"] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$refundDetails.refundAmount" }
        }
      }
    ]);
    
    res.json({
      success: true,
      stats: {
        totalRefunds,
        pendingRefunds,
        processingRefunds,
        completedRefunds,
        totalRefundAmount: totalRefundAmount[0]?.total || 0,
        pendingRefundAmount: pendingRefundAmount[0]?.total || 0,
      },
    });
  } catch (err) {
    console.error("Error fetching refund stats:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
