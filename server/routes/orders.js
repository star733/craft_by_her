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
    }).lean();
    
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
    console.log("Request body:", req.body);
    
    const { 
      items, 
      buyerDetails, 
      paymentMethod, 
      notes = "" 
    } = req.body;
    
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
      const itemTotal = item.variant.price * item.quantity;
      totalAmount += itemTotal;
      
      processedItems.push({
        productId: new mongoose.Types.ObjectId(item.productId),
        title: item.title,
        image: item.image,
        variant: {
          weight: item.variant.weight,
          price: item.variant.price,
        },
        quantity: item.quantity,
      });
    }
    
    // Calculate shipping charges (free for orders above ₹500, ₹50 otherwise)
    const shippingCharges = totalAmount >= 500 ? 0 : 50;
    const finalAmount = totalAmount + shippingCharges;
    
    // Create order
    const order = new Order({
      userId: req.user.uid,
      items: processedItems,
      buyerDetails,
      paymentMethod,
      totalAmount,
      shippingCharges,
      finalAmount,
      notes,
      paymentStatus: paymentMethod === "cod" ? "pending" : "pending",
      orderStatus: "pending",
    });
    
    await order.save();
    
    // Clear user's cart after successful order
    await Cart.findOneAndDelete({ userId: req.user.uid });
    
    console.log("✅ Order created successfully:", order.orderNumber);
    
    res.json({
      success: true,
      order: order,
      message: "Order created successfully",
    });
  } catch (err) {
    console.error("Error creating order:", err);
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
    
    order.orderStatus = "cancelled";
    if (order.paymentStatus === "paid") {
      order.paymentStatus = "refunded";
    }
    
    await order.save();
    
    res.json({
      success: true,
      order: order,
      message: "Order cancelled successfully",
    });
  } catch (err) {
    console.error("Error cancelling order:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

