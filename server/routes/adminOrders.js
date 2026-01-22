const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const verify = require("../middleware/verifyFirebaseToken");
const verifyAdmin = require("../middleware/verifyAdmin");
const Order = require("../models/Order");
const DeliveryAgent = require("../models/DeliveryAgent");
const Notification = require("../models/Notification");
const { getAdminNotifications, markNotificationAsRead, createOrderDispatchedNotification, createCustomerHubArrivalNotification } = require("../utils/notificationService");

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

// ✅ Get pending hub orders for admin approval
router.get("/hub-orders/pending", verify, verifyAdmin, async (req, res) => {
  try {
    console.log("🔍 Fetching pending hub orders for admin approval...");
    
    // Get orders that are at seller hubs and need admin approval
    const pendingOrders = await Order.find({
      orderStatus: 'at_seller_hub',
      'hubTracking.sellerHubId': { $exists: true, $ne: null }
    })
    .populate('items.productId', 'title image')
    .sort({ 'hubTracking.arrivedAtSellerHub': -1 })
    .lean();
    
    console.log(`Found ${pendingOrders.length} pending hub orders`);
    
    // Format orders for admin display
    const formattedOrders = pendingOrders.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      customer: order.buyerDetails.name,
      customerEmail: order.buyerDetails.email,
      customerPhone: order.buyerDetails.phone,
      customerAddress: order.buyerDetails.address,
      totalAmount: order.finalAmount,
      itemCount: order.items.length,
      items: order.items.map(item => ({
        title: item.title,
        quantity: item.quantity,
        variant: item.variant,
        image: item.image
      })),
      hubInfo: {
        hubId: order.hubTracking.sellerHubId,
        hubName: order.hubTracking.sellerHubName,
        hubDistrict: order.hubTracking.sellerHubDistrict
      },
      arrivedAt: order.hubTracking.arrivedAtSellerHub,
      createdAt: order.createdAt,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus
    }));
    
    res.json({
      success: true,
      orders: formattedOrders,
      count: formattedOrders.length
    });
  } catch (err) {
    console.error("Error fetching pending hub orders:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// ✅ Get approved hub orders for admin tracking
router.get("/approved-hub-orders", verify, verifyAdmin, async (req, res) => {
  try {
    console.log("🔍 Fetching approved hub orders for admin tracking...");
    
    // Get orders that have been approved by admin and are in transit or delivered
    const approvedOrders = await Order.find({
      'hubTracking.approvedByAdmin': true,
      orderStatus: { 
        $in: ['in_transit_to_customer_hub', 'at_customer_hub', 'delivered'] 
      }
    })
    .populate('items.productId', 'title image')
    .sort({ 'hubTracking.adminApprovedAt': -1 })
    .lean();
    
    console.log(`Found ${approvedOrders.length} approved hub orders`);
    
    // Format orders for admin display
    const formattedOrders = approvedOrders.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      customer: order.buyerDetails.name,
      customerEmail: order.buyerDetails.email,
      customerPhone: order.buyerDetails.phone,
      customerAddress: order.buyerDetails.address,
      totalAmount: order.finalAmount,
      itemCount: order.items.length,
      items: order.items.map(item => ({
        title: item.title,
        quantity: item.quantity,
        variant: item.variant,
        image: item.image
      })),
      hubTracking: {
        sellerHubName: order.hubTracking.sellerHubName,
        customerHubName: order.hubTracking.customerHubName,
        approvedAt: order.hubTracking.adminApprovedAt,
        status: order.orderStatus,
        arrivedAtCustomerHub: order.hubTracking.arrivedAtCustomerHub,
        deliveredAt: order.hubTracking.deliveredAt
      },
      orderStatus: order.orderStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus
    }));
    
    res.json({
      success: true,
      orders: formattedOrders,
      count: formattedOrders.length
    });
  } catch (err) {
    console.error("Error fetching approved hub orders:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// ✅ Approve hub order for delivery to customer hub (Admin only)
router.patch("/:orderId/approve-hub-delivery", verify, verifyAdmin, async (req, res) => {
  try {
    console.log("🔍 Admin approving hub order for delivery...");
    console.log("Order ID:", req.params.orderId);
    console.log("Admin UID:", req.user.uid);
    
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      console.error(`❌ Order not found: ${req.params.orderId}`);
      return res.status(404).json({ 
        success: false,
        error: "Order not found" 
      });
    }
    
    console.log(`📦 Order found: ${order.orderNumber}, Status: ${order.orderStatus}`);
    console.log(`📍 Customer address:`, order.buyerDetails.address);
    
    if (order.orderStatus !== 'at_seller_hub') {
      console.error(`❌ Invalid order status: ${order.orderStatus}. Expected: at_seller_hub`);
      return res.status(400).json({ 
        success: false,
        error: `Order is not at seller hub or already processed. Current status: ${order.orderStatus}` 
      });
    }
    
    // Extract customer's district from their address
    const customerDistrict = extractDistrict(order.buyerDetails.address);
    console.log(`🏙️  Customer district determined: ${customerDistrict}`);
    
    // Find nearest hub to customer
    const Hub = require("../models/Hub");
    const allHubs = await Hub.find({ status: 'active' }).select('hubId name district status');
    console.log(`🏢 Available active hubs:`, allHubs.map(h => `${h.name} (${h.district})`).join(', '));
    
    let customerHub = await Hub.findOne({ 
      district: customerDistrict, 
      status: 'active' 
    });
    
    if (!customerHub) {
      console.error(`❌ No active hub found in ${customerDistrict} district`);
      console.log(`💡 Trying case-insensitive search...`);
      
      // Try case-insensitive search
      customerHub = await Hub.findOne({ 
        district: { $regex: new RegExp(`^${customerDistrict}$`, 'i') },
        status: 'active' 
      });
      
      if (!customerHub) {
        console.error(`❌ Still no hub found after case-insensitive search`);
        return res.status(404).json({ 
          success: false,
          error: `No active hub found in ${customerDistrict} district for customer delivery. Available districts: ${allHubs.map(h => h.district).join(', ')}` 
        });
      }
      
      console.log(`✅ Found hub with case-insensitive search: ${customerHub.name}`);
    }
    
    console.log(`✅ Customer hub found: ${customerHub.name} (${customerHub.district})`);
    
    // Update order status and hub tracking (NO OTP generation here - hub manager will generate it)
    order.hubTracking.approvedByAdmin = true;
    order.hubTracking.adminApprovedAt = new Date();
    order.hubTracking.adminApprovedBy = req.user.uid;
    order.hubTracking.customerHubId = customerHub._id.toString();
    order.hubTracking.customerHubName = customerHub.name;
    order.hubTracking.customerHubDistrict = customerHub.district;
    order.hubTracking.currentLocation = 'in_transit_to_customer_hub';
    // OTP will be generated later by hub manager when order arrives at customer hub
    order.orderStatus = 'shipped'; // Customer sees "shipped" status like real e-commerce sites
    order.updatedAt = new Date();
    
    console.log(`💾 Saving order with updated status...`);
    await order.save();
    console.log(`✅ Order ${order.orderNumber} saved successfully!`);
    console.log(`📊 Order details:`);
    console.log(`   - Status: ${order.orderStatus}`);
    console.log(`   - From: ${order.hubTracking.sellerHubName}`);
    console.log(`   - To: ${customerHub.name}`);
    console.log(`   - OTP: Will be generated by hub manager when order arrives`);
    console.log(`   - Approved by: ${req.user.uid}`);
    
    // Create notification for central hub manager about dispatch
    const HubManager = require("../models/HubManager");
    
    const centralHubManager = await HubManager.findOne({ 
      managerId: 'HM0003',
      status: 'active'
    });
    
    // Create admin notification for dispatch
    try {
      await createOrderDispatchedNotification(
        order, 
        order.hubTracking.sellerHubName, 
        customerHub.name, 
        req.user.uid
      );
      console.log(`✅ Admin dispatch notification created for order ${order.orderNumber}`);
    } catch (notificationError) {
      console.error("Failed to create admin dispatch notification:", notificationError);
    }
    
    if (centralHubManager) {
      await Notification.create({
        userId: centralHubManager.managerId,
        userRole: 'hubmanager',
        type: 'order_dispatched_to_customer_hub',
        title: '� Order Dispatched to Customer Hub',
        message: `Order #${order.orderNumber} has been approved by admin and dispatched from ${order.hubTracking.sellerHubName} to ${customerHub.name}. Order will arrive soon and be ready for customer pickup.`,
        orderId: order._id,
        orderNumber: order.orderNumber,
        actionRequired: false,
        metadata: {
          fromHub: order.hubTracking.sellerHubName,
          toHub: customerHub.name,
          customerName: order.buyerDetails.name,
          totalAmount: order.finalAmount,
          approvedBy: req.user.uid,
          itemCount: order.items.length
        }
      });
    }
    
    // Simulate arrival at customer hub (in real scenario, this would be triggered by logistics)
    setTimeout(async () => {
      try {
        const updatedOrder = await Order.findById(order._id);
        if (updatedOrder && updatedOrder.orderStatus === 'shipped') {
          updatedOrder.hubTracking.arrivedAtCustomerHub = new Date();
          updatedOrder.hubTracking.currentLocation = 'customer_hub';
          updatedOrder.hubTracking.readyForPickup = true;
          updatedOrder.hubTracking.readyForPickupAt = new Date();
          updatedOrder.orderStatus = 'out_for_delivery'; // Next status after shipped
          
          // Generate delivery OTP
          const { generateOTP } = require("../utils/deliveryOTPService");
          const deliveryOTP = generateOTP();
          const otpExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
          
          updatedOrder.deliveryOTP = {
            code: deliveryOTP,
            generatedAt: new Date(),
            expiresAt: otpExpiry,
            isUsed: false
          };
          
          await updatedOrder.save();
          
          // Send delivery OTP email to customer
          const { sendDeliveryOTP } = require("../utils/deliveryOTPService");
          try {
            const emailResult = await sendDeliveryOTP(
              updatedOrder.buyerDetails.email,
              updatedOrder.buyerDetails.name,
              updatedOrder.orderNumber,
              deliveryOTP
            );
            if (emailResult.success) {
              console.log(`✅ Delivery OTP email sent to customer: ${updatedOrder.buyerDetails.email}`);
            } else {
              console.error(`❌ Failed to send delivery OTP email: ${emailResult.error}`);
            }
          } catch (emailError) {
            console.error("Error sending delivery OTP email:", emailError);
          }
          
          // Create notification for customer
          await Notification.create({
            userId: updatedOrder.userId,
            userRole: 'buyer',
            title: "Order Ready for Pickup - OTP Sent! 🎁",
            message: `Your order ${updatedOrder.orderNumber} has arrived at ${customerHub.name} and is ready for pickup. Check your email for the delivery OTP.`,
            type: 'order',
            orderId: updatedOrder._id,
            metadata: {
              orderId: updatedOrder.orderNumber,
              hubName: customerHub.name,
              otpSent: true
            }
          });
          
          // Update customer hub stats - increment order count
          const Hub = require("../models/Hub");
          await Hub.findOneAndUpdate(
            { _id: customerHub._id },
            { 
              $inc: { 
                'capacity.currentOrders': 1,
                'stats.ordersReadyForPickup': 1,
                'stats.totalOrdersProcessed': 1
              }
            }
          );
          console.log(`✅ Updated ${customerHub.name} order count`);
          console.log(`✅ Order ${updatedOrder.orderNumber} arrived at customer hub: ${customerHub.name}`);
          console.log(`🔐 Delivery OTP: ${deliveryOTP}`);
        }
      } catch (err) {
        console.error("Error updating order arrival at customer hub:", err);
      }
    }, 3000); // 3 seconds delay for demo
    
    res.json({
      success: true,
      message: `Order approved and dispatched to ${customerHub.name}. OTP sent to customer.`,
      order: {
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        fromHub: order.hubTracking.sellerHubName,
        toHub: customerHub.name,
        approvedAt: order.hubTracking.adminApprovedAt,
        otp: otpData.otp,
        otpExpiresAt: otpData.expiryTime,
        customerEmail: order.buyerDetails.email
      }
    });
  } catch (err) {
    console.error("Error approving hub order:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// Helper function to extract district from address
function extractDistrict(address) {
  if (!address) return "Ernakulam"; // Default
  
  const districts = [
    "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha",
    "Kottayam", "Idukki", "Ernakulam", "Thrissur",
    "Palakkad", "Malappuram", "Kozhikode", "Wayanad",
    "Kannur", "Kasaragod"
  ];
  
  // Handle both string and object addresses
  let searchText = '';
  if (typeof address === 'string') {
    searchText = address.toLowerCase();
  } else if (typeof address === 'object') {
    const cityLower = (address.city || '').toLowerCase();
    const stateLower = (address.state || '').toLowerCase();
    const streetLower = (address.street || '').toLowerCase();
    searchText = `${streetLower} ${cityLower} ${stateLower}`.toLowerCase();
  }
  
  console.log(`🔍 Extracting district from address: "${searchText}"`);
  
  // Try exact or partial match
  for (const district of districts) {
    if (searchText.includes(district.toLowerCase())) {
      console.log(`✅ Found district: ${district}`);
      return district;
    }
  }
  
  console.log(`⚠️  No district match found, using default: Ernakulam`);
  // Default fallback
  return "Ernakulam";
}

// ✅ Get admin notifications
router.get("/notifications", verify, verifyAdmin, async (req, res) => {
  try {
    console.log("🔔 Fetching admin notifications...");
    console.log("Admin UID:", req.user.uid);
    console.log("Query params:", req.query);
    
    const { unreadOnly, page = 1, limit = 20 } = req.query;
    
    const result = await getAdminNotifications({
      unreadOnly: unreadOnly === 'true',
      page: parseInt(page),
      limit: parseInt(limit),
      adminId: req.user.uid
    });
    
    console.log(`Found ${result.notifications.length} notifications for admin ${req.user.uid}`);
    
    res.json(result);
  } catch (err) {
    console.error("Error fetching admin notifications:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// ✅ Mark admin notification as read
router.patch("/notifications/:notificationId/read", verify, verifyAdmin, async (req, res) => {
  try {
    console.log("📖 Marking admin notification as read:", req.params.notificationId);
    
    const notification = await markNotificationAsRead(req.params.notificationId, req.user.uid);
    
    console.log("✅ Admin notification marked as read");
    
    res.json({
      success: true,
      notification
    });
  } catch (err) {
    console.error("Error marking admin notification as read:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;