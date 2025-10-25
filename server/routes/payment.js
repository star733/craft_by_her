const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const verify = require("../middleware/verifyFirebaseToken");
const Order = require("../models/Order");
const razorpay = require("../config/razorpay");
const crypto = require("crypto");

// Create Razorpay order
router.post("/create-razorpay-order", verify, async (req, res) => {
  try {
    console.log("=== PAYMENT ORDER CREATION DEBUG ===");
    console.log("Request body:", req.body);
    console.log("User UID:", req.user.uid);
    
    const { orderId, amount } = req.body;

    if (!orderId || !amount) {
      console.log("❌ Missing orderId or amount");
      return res.status(400).json({ error: "Order ID and amount are required" });
    }

    console.log("🔍 Looking for order:", orderId);
    
    // First, let's see if the order exists at all
    const anyOrder = await Order.findById(orderId);
    console.log("Order exists:", !!anyOrder);
    if (anyOrder) {
      console.log("Order details:", {
        _id: anyOrder._id,
        userId: anyOrder.userId,
        paymentMethod: anyOrder.paymentMethod,
        paymentStatus: anyOrder.paymentStatus
      });
    }

    // Verify the order exists and belongs to the user
    const order = await Order.findOne({
      _id: orderId,
      userId: req.user.uid,
      paymentMethod: "online",
      paymentStatus: "pending"
    });

    if (!order) {
      console.log("❌ Order not found with criteria");
      console.log("Criteria:", {
        _id: orderId,
        userId: req.user.uid,
        paymentMethod: "online",
        paymentStatus: "pending"
      });
      return res.status(404).json({ error: "Order not found or invalid" });
    }

    console.log("✅ Order found:", order._id);

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100, // Razorpay expects amount in paise
      currency: "INR",
      receipt: order.orderNumber,
      notes: {
        orderId: orderId,
        userId: req.user.uid,
      },
    });

    console.log("=== RAZORPAY ORDER CREATION DEBUG ===");
    console.log("RAZORPAY_KEY_ID:", process.env.RAZORPAY_KEY_ID);
    console.log("Razorpay Order:", razorpayOrder);
    console.log("Key being sent to frontend:", process.env.RAZORPAY_KEY_ID || 'rzp_test_1234567890');
    
    res.json({
      success: true,
      order: razorpayOrder,
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_1234567890',
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ error: "Failed to create payment order" });
  }
});

// Verify payment signature
router.post("/verify-payment", verify, async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ error: "Missing payment details" });
    }

    // Verify the order exists
    const order = await Order.findOne({
      _id: orderId,
      userId: req.user.uid,
      paymentMethod: "online",
      paymentStatus: "pending"
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Verify signature (skip in mock/test mode)
    const isMockMode =
      !process.env.RAZORPAY_KEY_SECRET ||
      process.env.RAZORPAY_KEY_ID === 'rzp_test_1234567890' ||
      process.env.RAZORPAY_KEY_SECRET === 'test_secret_key_1234567890' ||
      String(paymentId).startsWith('mock_') ||
      String(signature).startsWith('mock_');

    if (!isMockMode) {
      // For Razorpay signature verification, we need to use the Razorpay order ID, not our internal order ID
      // The signature is created using razorpay_order_id|razorpay_payment_id
      // We need to get the Razorpay order ID from the request or find it from our order
      const razorpayOrderId = req.body.razorpay_order_id || req.body.orderId;
      
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${paymentId}`)
        .digest("hex");
      
      if (expectedSignature !== signature) {
        console.error("Signature verification failed");
        console.error("Expected:", expectedSignature);
        console.error("Received:", signature);
        console.error("Order ID:", razorpayOrderId);
        console.error("Payment ID:", paymentId);
        return res.status(400).json({ error: "Invalid payment signature" });
      }
    }

    // Update order with payment details
    order.paymentStatus = "paid";
    order.paymentDetails = {
      transactionId: paymentId,
      paymentGateway: "razorpay",
      paidAt: new Date(),
    };
    order.orderStatus = "confirmed";
    order.updatedAt = new Date();

    await order.save();

    res.json({
      success: true,
      order: order,
      message: "Payment verified successfully",
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

// Payment webhook (for production)
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const body = req.body;

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET || 'your_webhook_secret')
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    const event = JSON.parse(body);

    if (event.event === "payment.captured") {
      const { order_id, payment_id } = event.payload.payment.entity;

      // Find order by Razorpay order ID
      const order = await Order.findOne({
        "paymentDetails.transactionId": payment_id,
        paymentStatus: "pending"
      });

      if (order) {
        order.paymentStatus = "paid";
        order.paymentDetails.paidAt = new Date();
        order.orderStatus = "confirmed";
        order.updatedAt = new Date();
        await order.save();
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// Get payment methods
router.get("/methods", (req, res) => {
  res.json({
    success: true,
    methods: [
      {
        id: "cod",
        name: "Cash on Delivery",
        description: "Pay when your order is delivered",
        icon: "💰",
        available: true,
      },
      {
        id: "online",
        name: "Online Payment",
        description: "Pay securely with Razorpay",
        icon: "💳",
        available: true,
        gateways: ["razorpay"],
      },
    ],
  });
});

module.exports = router;

