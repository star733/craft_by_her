const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const verify = require("../middleware/verifyFirebaseToken");
const Order = require("../models/Order");
const Cart = require("../models/Cart");

// ✅ Get user's orders
router.get("/", verify, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.uid })
      .sort({ createdAt: -1 })
      .populate("items.productId", "title image")
      .lean();
    
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get single order details
router.get("/:orderId", verify, async (req, res) => {
  try {
    const order = await Order.findOne({ 
      _id: req.params.orderId,
      userId: req.user.uid 
    })
    .populate("items.productId", "title image")
    .lean();
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    res.json(order);
  } catch (err) {
    console.error("Error fetching order:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Create new order
router.post("/create", verify, async (req, res) => {
  try {
    console.log("=== ORDER CREATION DEBUG ===");
    console.log("User UID:", req.user.uid);
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    const { 
      items, 
      buyerDetails, 
      paymentMethod, 
      notes = "" 
    } = req.body;
    
    console.log("Items received:", JSON.stringify(items, null, 2));
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items are required" });
    }
    
    if (!buyerDetails || !buyerDetails.name || !buyerDetails.email || !buyerDetails.phone) {
      return res.status(400).json({ error: "Buyer details are required" });
    }
    
    if (!paymentMethod || !["cod", "online"].includes(paymentMethod)) {
      return res.status(400).json({ error: "Valid payment method is required" });
    }
    
    // Calculate totals
    let totalAmount = 0;
    const processedItems = [];
    
    for (const item of items) {
      console.log("Processing item:", JSON.stringify(item, null, 2));
      
      const itemTotal = item.variant.price * item.quantity;
      totalAmount += itemTotal;
      
      // Handle productId - it might already be an ObjectId or a string
      let productId;
      console.log("Item productId type:", typeof item.productId, "Value:", item.productId);
      
      if (typeof item.productId === 'string') {
        productId = new mongoose.Types.ObjectId(item.productId);
        console.log("Converted string to ObjectId:", productId);
      } else if (item.productId instanceof mongoose.Types.ObjectId) {
        productId = item.productId;
        console.log("Using existing ObjectId:", productId);
      } else if (item.productId && typeof item.productId === 'object' && (item.productId._id || item.productId.id)) {
        // Support cases where product is populated or nested
        const idValue = item.productId._id || item.productId.id;
        productId = new mongoose.Types.ObjectId(idValue);
        console.log("Extracted ObjectId from nested object:", productId);
      } else {
        console.error("Invalid productId format:", item.productId);
        throw new Error(`Invalid productId format: ${item.productId}`);
      }
      
      const processedItem = {
        productId: productId,
        title: item.title,
        image: item.image,
        variant: {
          weight: item.variant.weight,
          price: item.variant.price,
        },
        quantity: item.quantity,
      };
      
      console.log("Processed item:", JSON.stringify(processedItem, null, 2));
      processedItems.push(processedItem);
    }
    
    // Calculate shipping charges (free for orders above ₹500, ₹50 otherwise)
    const shippingCharges = totalAmount >= 500 ? 0 : 50;
    const finalAmount = totalAmount + shippingCharges;
    
    // Create order
    const orderStatus = paymentMethod === "cod" ? "confirmed" : "pending";
    const paymentStatus = "pending";
    
    console.log("Creating order with status:", { orderStatus, paymentStatus, paymentMethod });
    
    const order = new Order({
      userId: req.user.uid,
      items: processedItems,
      buyerDetails,
      paymentMethod,
      totalAmount: Number(totalAmount),
      shippingCharges: Number(shippingCharges),
      finalAmount: Number(finalAmount),
      notes,
      paymentStatus,
      orderStatus,
    });
    
    await order.save();
    
    console.log("✅ Order created successfully:", {
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod
    });
    
    // Clear user's cart after successful order
    await Cart.findOneAndDelete({ userId: req.user.uid });
    
    // 📧 Send order confirmation email to buyer
    try {
      const { sendOrderConfirmationEmail, sendAdminOrderNotification } = require('../utils/orderEmailService');
      await sendOrderConfirmationEmail(order, buyerDetails.email);
      await sendAdminOrderNotification(order);
    } catch (emailError) {
      console.error("⚠️ Error sending emails (non-critical):", emailError.message);
    }
    
    // 🔔 Create notifications
    try {
      const Notification = require('../models/Notification');
      const Product = require('../models/Product');
      
      // Get seller IDs from products
      const productIds = processedItems.map(item => item.productId);
      console.log("📦 Product IDs in order:", productIds);
      
      const products = await Product.find({ _id: { $in: productIds } }).select('sellerId title');
      console.log("📦 Products found:", products.map(p => ({ id: p._id, title: p.title, sellerId: p.sellerId })));
      
      // Filter out products without sellerId and get unique seller IDs
      const sellerIds = [...new Set(products.map(p => p.sellerId).filter(id => id))];
      console.log("👤 Unique seller IDs:", sellerIds);
      
      if (sellerIds.length === 0) {
        console.warn("⚠️ No seller IDs found in products! Products might not have sellerId field.");
        console.warn("⚠️ Skipping seller notifications. Please ensure products have sellerId field.");
      } else {
        console.log(`🔔 Creating notifications for ${sellerIds.length} sellers...`);
        
        // Create notification for each seller
        for (const sellerId of sellerIds) {
          console.log(`🔔 Creating notification for seller: ${sellerId}`);
          try {
            const notification = await Notification.create({
              userId: sellerId,
              userRole: 'seller',
              type: 'new_order',
              title: '🎉 New Order Received!',
              message: `You have a new order #${order.orderNumber} from ${buyerDetails.name}. Please move the products to your nearest hub.`,
              orderId: order._id,
              orderNumber: order.orderNumber,
              actionRequired: true,
              actionType: 'move_to_hub',
              metadata: {
                orderAmount: order.finalAmount,
                itemCount: order.items.length,
                customerName: buyerDetails.name,
                customerEmail: buyerDetails.email,
                customerPhone: buyerDetails.phone,
                customerAddress: buyerDetails.address
              }
            });
            console.log(`✅ Notification created for seller ${sellerId}:`, notification._id);
          } catch (notifCreateError) {
            console.error(`❌ Failed to create notification for seller ${sellerId}:`, notifCreateError.message);
            console.error(`❌ Error details:`, notifCreateError);
          }
        }
      }
      
      // Create notification for admin
      const adminUsers = await mongoose.model('User').find({ role: 'admin' }).select('uid');
      console.log("👨‍💼 Admin users found:", adminUsers.length);
      
      for (const admin of adminUsers) {
        console.log(`🔔 Creating notification for admin: ${admin.uid}`);
        const notification = await Notification.create({
          userId: admin.uid,
          userRole: 'admin',
          type: 'new_order',
          title: '🔔 New Order Alert',
          message: `New order #${order.orderNumber} received from ${buyerDetails.name}. Total: ₹${order.finalAmount}`,
          orderId: order._id,
          orderNumber: order.orderNumber,
          actionRequired: false,
          actionType: 'none',
          metadata: {
            orderAmount: order.finalAmount,
            customerName: buyerDetails.name
          }
        });
        console.log(`✅ Notification created for admin ${admin.uid}:`, notification._id);
      }
      
      console.log("✅ Notifications created for sellers and admin");
    } catch (notifError) {
      console.error("⚠️ Error creating notifications (non-critical):", notifError);
      console.error("Stack trace:", notifError.stack);
    }
    
    res.json({
      success: true,
      order: order,
      message: "Order created successfully",
    });
  } catch (err) {
    console.error("Error creating order:", err);
    console.error("Error details:", {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update payment status (for online payments)
router.put("/:orderId/payment", verify, async (req, res) => {
  try {
    const { paymentStatus, transactionId, paymentGateway } = req.body;
    
    const order = await Order.findOne({ 
      _id: req.params.orderId,
      userId: req.user.uid 
    });
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    if (order.paymentMethod !== "online") {
      return res.status(400).json({ error: "This order is not for online payment" });
    }
    
    order.paymentStatus = paymentStatus;
    if (paymentStatus === "paid") {
      order.paymentDetails = {
        transactionId,
        paymentGateway: paymentGateway || "dummy_gateway",
        paidAt: new Date(),
      };
      order.orderStatus = "confirmed";
    }
    
    await order.save();
    
    res.json({
      success: true,
      order: order,
      message: "Payment status updated",
    });
  } catch (err) {
    console.error("Error updating payment:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Cancel order
router.put("/:orderId/cancel", verify, async (req, res) => {
  try {
    const { cancelReason } = req.body || {};
    
    const order = await Order.findOne({ 
      _id: req.params.orderId,
      userId: req.user.uid 
    });
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    if (["shipped", "delivered"].includes(order.orderStatus)) {
      return res.status(400).json({ error: "Cannot cancel order that is already shipped or delivered" });
    }
    
    // Cancel the order
    order.orderStatus = "cancelled";
    
    // Handle refund if payment was made
    if (order.paymentStatus === "paid") {
      order.paymentStatus = "refunded";
      
      // Set refund details - automatically mark as completed
      order.refundDetails = {
        refundAmount: order.finalAmount,
        refundStatus: "completed", // Automatically completed
        refundMethod: order.paymentMethod === "online" ? "original_payment" : "not_applicable",
        refundInitiatedAt: new Date(),
        refundCompletedAt: new Date(), // Mark as completed immediately
        refundReason: cancelReason || "Order cancelled by customer",
        refundNotes: "Refund processed automatically. Amount will be credited within 5-7 business days.",
      };
      
      console.log(`💰 Refund completed for order ${order.orderNumber}: ₹${order.finalAmount}`);
    } else {
      // COD order or unpaid - no refund needed
      order.refundDetails = {
        refundAmount: 0,
        refundStatus: "not_applicable",
        refundMethod: "not_applicable",
        refundReason: cancelReason || "Order cancelled by customer",
        refundNotes: "No payment was made - no refund required",
      };
    }
    
    await order.save();
    
    const message = order.paymentStatus === "refunded"
      ? "Order cancelled successfully. Refund will be processed within 5-7 business days."
      : "Order cancelled successfully.";
    
    res.json({
      success: true,
      order: order,
      message: message,
      refundInfo: order.refundDetails,
    });
  } catch (err) {
    console.error("Error cancelling order:", err);
    res.status(500).json({ error: err.message });
  }
});

// ❌ Delete an order (only if it's cancelled)
router.delete("/:orderId", verify, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      userId: req.user.uid,
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.orderStatus !== "cancelled") {
      return res.status(400).json({ error: "Only cancelled orders can be deleted" });
    }

    await Order.deleteOne({ _id: order._id, userId: req.user.uid });

    return res.json({ success: true, message: "Order deleted" });
  } catch (err) {
    console.error("Error deleting order:", err);
    res.status(500).json({ error: err.message });
  }
});

// Mark order as delivered by buyer
router.patch("/:orderId/delivered", verify, async (req, res) => {
  try {
    console.log("=== MARKING ORDER AS DELIVERED ===");
    console.log("Order ID:", req.params.orderId);
    console.log("User ID:", req.user.uid);
    
    const order = await Order.findOne({
      _id: req.params.orderId,
      userId: req.user.uid
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found or not authorized"
      });
    }
    
    // Relaxed: Allow buyer to mark delivered from shipped/in_transit states as a fallback
    if (!["in_transit", "shipped"].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        error: "Order must be shipped or in transit to mark as delivered"
      });
    }
    
    // Update order status to delivered
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.orderId,
      {
        $set: {
          orderStatus: "delivered",
          updatedAt: new Date()
        },
        $push: {
          'deliveryInfo.trackingUpdates': {
            status: 'delivered',
            message: 'Order delivered and confirmed by buyer',
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );
    
    // Update delivery agent stats
    if (order.deliveryInfo?.agentId) {
      const DeliveryAgent = require('../models/DeliveryAgent');
      await DeliveryAgent.findOneAndUpdate(
        { agentId: order.deliveryInfo.agentId },
        {
          $inc: {
            totalDeliveries: 1,
            'earnings.total': 50, // Fixed delivery fee
            'earnings.thisMonth': 50
          }
        }
      );
    }
    
    console.log("Order marked as delivered successfully");
    res.json({
      success: true,
      message: "Order marked as delivered successfully",
      order: updatedOrder
    });
    
  } catch (error) {
    console.error("Error marking order as delivered:", error);
    res.status(500).json({
      success: false,
      error: "Failed to mark order as delivered"
    });
  }
});

// Rate and review delivered order
router.patch("/:orderId/rate", verify, async (req, res) => {
  try {
    console.log("=== RATING ORDER ===");
    console.log("Order ID:", req.params.orderId);
    console.log("User ID:", req.user.uid);
    console.log("Request body:", req.body);
    
    const { rating, review } = req.body;
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      console.log("Invalid rating:", rating);
      return res.status(400).json({
        success: false,
        error: "Rating must be between 1 and 5"
      });
    }
    
    const order = await Order.findOne({
      _id: req.params.orderId,
      userId: req.user.uid,
      orderStatus: "delivered"
    });
    
    console.log("Found order:", order ? "Yes" : "No");
    if (order) {
      console.log("Order status:", order.orderStatus);
      console.log("Already rated:", order.rating && order.rating.value);
    }
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Delivered order not found or not authorized"
      });
    }
    
    // Check if already rated
    if (order.rating && order.rating.value) {
      return res.status(400).json({
        success: false,
        error: "Order has already been rated"
      });
    }
    
    // Update order with rating
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.orderId,
      {
        $set: {
          'rating.value': rating,
          'rating.review': review || "",
          'rating.ratedAt': new Date(),
          updatedAt: new Date()
        }
      },
      { new: true }
    );
    
    console.log("Order rated successfully");
    res.json({
      success: true,
      message: "Order rated successfully",
      order: updatedOrder
    });
    
  } catch (error) {
    console.error("Error rating order:", error);
    res.status(500).json({
      success: false,
      error: "Failed to rate order: " + error.message
    });
  }
});

// ✅ Update order status (for buyer to start tracking)
router.patch("/:orderId/status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    console.log("=== UPDATING ORDER STATUS (BUYER) ===");
    console.log("Order ID:", orderId);
    console.log("New Status:", status);
    
    // Only allow transitioning to in_transit
    if (status !== 'in_transit') {
      return res.status(400).json({ 
        success: false,
        error: "Only status transition to 'in_transit' is allowed from this endpoint" 
      });
    }
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: "Order not found" 
      });
    }
    
    // Only allow if order is currently picked_up or shipped
    if (order.orderStatus !== 'picked_up' && order.orderStatus !== 'shipped') {
      return res.status(400).json({ 
        success: false,
        error: "Order must be picked up before starting delivery" 
      });
    }
    
    order.orderStatus = 'in_transit';
    await order.save();
    
    console.log("Order status updated to in_transit");
    
    res.json({
      success: true,
      message: "Order status updated to in_transit",
      order
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;

