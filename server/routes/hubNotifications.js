const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");

// Test route
router.get("/test", (req, res) => {
  console.log("🧪 HUB NOTIFICATIONS TEST ROUTE CALLED");
  res.json({ success: true, message: "Hub notifications route is working!" });
});

// Get notifications for hub manager (no auth required for testing)
router.get("/", async (req, res) => {
  try {
    console.log("🔔 HUB NOTIFICATIONS ENDPOINT CALLED");
    console.log("Query params:", req.query);
    
    const managerId = req.query.managerId;
    
    if (!managerId) {
      return res.status(400).json({
        success: false,
        error: "Manager ID required as query parameter"
      });
    }
    
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

// Mark notification as read
router.patch("/:notificationId/read", async (req, res) => {
  try {
    console.log("📖 MARKING NOTIFICATION AS READ:", req.params.notificationId);
    
    const notification = await Notification.findByIdAndUpdate(
      req.params.notificationId,
      { read: true, readAt: new Date() },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: "Notification not found"
      });
    }
    
    console.log("✅ Notification marked as read");
    
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

// Get orders by hub district
router.get("/orders-by-district", async (req, res) => {
  try {
    console.log("📦 GETTING ORDERS BY DISTRICT");
    
    const Order = require("../models/Order");
    
    // Get all orders that are at hubs
    const orders = await Order.find({
      $or: [
        { "hubTracking.sellerHubId": { $exists: true, $ne: null } },
        { "hubTracking.customerHubId": { $exists: true, $ne: null } }
      ]
    }).populate('items.productId', 'title image');
    
    // Group orders by district
    const ordersByDistrict = {};
    
    orders.forEach(order => {
      // Add to seller hub district if order is at seller hub
      if (order.hubTracking.sellerHubDistrict && 
          ['at_seller_hub', 'awaiting_admin_approval'].includes(order.orderStatus)) {
        const district = order.hubTracking.sellerHubDistrict;
        if (!ordersByDistrict[district]) ordersByDistrict[district] = [];
        ordersByDistrict[district].push({
          ...order.toObject(),
          hubType: 'seller',
          hubName: order.hubTracking.sellerHubName
        });
      }
      
      // Add to customer hub district if order is at customer hub
      if (order.hubTracking.customerHubDistrict && 
          ['at_customer_hub', 'ready_for_pickup'].includes(order.orderStatus)) {
        const district = order.hubTracking.customerHubDistrict;
        if (!ordersByDistrict[district]) ordersByDistrict[district] = [];
        ordersByDistrict[district].push({
          ...order.toObject(),
          hubType: 'customer',
          hubName: order.hubTracking.customerHubName
        });
      }
    });
    
    console.log(`✅ Found orders in ${Object.keys(ordersByDistrict).length} districts`);
    
    res.json({
      success: true,
      ordersByDistrict
    });
  } catch (error) {
    console.error("Error fetching orders by district:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get seller hub orders (orders at seller hubs)
router.get("/seller-hub-orders", async (req, res) => {
  try {
    console.log("📦 GETTING SELLER HUB ORDERS");
    
    const Order = require("../models/Order");
    
    // Get orders at seller hubs (waiting for admin approval)
    const orders = await Order.find({
      orderStatus: { $in: ['at_seller_hub', 'awaiting_admin_approval'] },
      "hubTracking.sellerHubId": { $exists: true, $ne: null }
    })
    .populate('items.productId', 'title image')
    .sort({ createdAt: -1 })
    .lean();
    
    console.log(`✅ Found ${orders.length} seller hub orders`);
    
    res.json({
      success: true,
      orders: orders.map(order => ({
        ...order,
        hubName: order.hubTracking?.sellerHubName,
        hubDistrict: order.hubTracking?.sellerHubDistrict
      })),
      count: orders.length
    });
  } catch (error) {
    console.error("Error fetching seller hub orders:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get customer hub orders (orders at customer hubs)
router.get("/customer-hub-orders", async (req, res) => {
  try {
    console.log("📦 GETTING CUSTOMER HUB ORDERS");
    
    const Order = require("../models/Order");
    
    // Get orders at customer hubs (ready for pickup/delivery)
    const orders = await Order.find({
      orderStatus: { $in: ['at_customer_hub', 'out_for_delivery', 'ready_for_pickup'] },
      "hubTracking.customerHubId": { $exists: true, $ne: null }
    })
    .populate('items.productId', 'title image')
    .sort({ createdAt: -1 })
    .lean();
    
    console.log(`✅ Found ${orders.length} customer hub orders`);
    
    res.json({
      success: true,
      orders: orders.map(order => ({
        ...order,
        hubName: order.hubTracking?.customerHubName,
        hubDistrict: order.hubTracking?.customerHubDistrict
      })),
      count: orders.length
    });
  } catch (error) {
    console.error("Error fetching customer hub orders:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get approved orders (admin approved orders)
router.get("/approved-orders", async (req, res) => {
  try {
    console.log("📦 GETTING APPROVED ORDERS");
    
    const Order = require("../models/Order");
    
    // Get orders approved by admin (shipped or in transit)
    const orders = await Order.find({
      'hubTracking.approvedByAdmin': true,
      orderStatus: { $in: ['shipped', 'in_transit_to_customer_hub'] }
    })
    .populate('items.productId', 'title image')
    .sort({ 'hubTracking.adminApprovedAt': -1 })
    .lean();
    
    console.log(`✅ Found ${orders.length} approved orders`);
    
    res.json({
      success: true,
      orders: orders.map(order => ({
        ...order,
        sellerHubName: order.hubTracking?.sellerHubName,
        customerHubName: order.hubTracking?.customerHubName,
        approvedAt: order.hubTracking?.adminApprovedAt
      })),
      count: orders.length
    });
  } catch (error) {
    console.error("Error fetching approved orders:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get delivered orders count
router.get("/delivered-orders-count", async (req, res) => {
  try {
    console.log("📦 GETTING DELIVERED ORDERS COUNT");
    
    const Order = require("../models/Order");
    
    // Count all delivered orders
    const count = await Order.countDocuments({
      orderStatus: 'delivered'
    });
    
    console.log(`✅ Total delivered orders: ${count}`);
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error("Error fetching delivered orders count:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get dashboard stats (all order counts)
router.get("/dashboard-stats", async (req, res) => {
  try {
    console.log("📊 GETTING DASHBOARD STATS");
    
    const Order = require("../models/Order");
    
    // Get all relevant order counts
    const [
      sellerHubOrdersCount,
      inTransitCount,
      customerHubOrdersCount,
      awaitingPickupCount,
      deliveredCount
    ] = await Promise.all([
      // Orders at seller hubs
      Order.countDocuments({
        orderStatus: { $in: ['at_seller_hub', 'awaiting_admin_approval'] }
      }),
      // Orders in transit
      Order.countDocuments({
        orderStatus: 'in_transit_to_customer_hub'
      }),
      // Orders at customer hubs
      Order.countDocuments({
        orderStatus: { $in: ['at_customer_hub', 'out_for_delivery'] }
      }),
      // Orders awaiting pickup
      Order.countDocuments({
        orderStatus: 'ready_for_pickup'
      }),
      // Delivered orders
      Order.countDocuments({
        orderStatus: 'delivered'
      })
    ]);
    
    console.log(`✅ Dashboard stats calculated`);
    
    res.json({
      success: true,
      stats: {
        ordersAtSellerHubs: sellerHubOrdersCount,
        ordersInTransit: inTransitCount,
        ordersAtCustomerHubs: customerHubOrdersCount,
        ordersAwaitingPickup: awaitingPickupCount,
        deliveredOrders: deliveredCount
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;