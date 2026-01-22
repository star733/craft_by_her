const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Notification = require("../models/Notification");
const { sendDeliveryOTP, generateOTP } = require("../utils/deliveryOTPService");

// Generate and send OTP when hub manager requests it (order must be at customer hub)
router.post("/generate-otp", async (req, res) => {
  try {
    const { orderNumber } = req.body;
    
    console.log(`🔐 OTP Generation Request from Hub Manager`);
    console.log(`   Order Number: ${orderNumber}`);
    
    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        error: "Order number is required"
      });
    }
    
    // Find order by orderNumber
    const order = await Order.findOne({ orderNumber: orderNumber.trim() });
    
    if (!order) {
      console.log(`❌ Order not found: ${orderNumber}`);
      return res.status(404).json({
        success: false,
        error: "Order not found"
      });
    }
    
    console.log(`✅ Order found: ${order.orderNumber}`);
    
    // Check if order is at customer hub (must be shipped, in transit, or at customer hub)
    const validStatuses = ['shipped', 'in_transit_to_customer_hub', 'at_customer_hub', 'out_for_delivery', 'ready_for_pickup'];
    if (!validStatuses.includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        error: `Order is not at customer hub yet. Current status: ${order.orderStatus}`
      });
    }
    
    // Check if OTP already generated and not used
    if (order.hubTracking?.pickupOTP && !order.hubTracking?.otpUsed) {
      return res.status(400).json({
        success: false,
        error: "OTP already generated for this order. Please use the existing OTP or wait until it's used.",
        existingOTP: order.hubTracking.pickupOTP
      });
    }
    
    // Generate 6-digit OTP (no expiry - valid until used)
    const { generateOTP } = require("../utils/otpGenerator");
    const otp = generateOTP();
    
    console.log(`🔐 Generated OTP ${otp} for order ${order.orderNumber} (no expiry - valid until used)`);
    
    // Update order with OTP in hubTracking
    if (!order.hubTracking) {
      order.hubTracking = {};
    }
    order.hubTracking.pickupOTP = otp;
    order.hubTracking.otpGeneratedAt = new Date();
    order.hubTracking.otpExpiresAt = null; // No expiry
    order.hubTracking.otpUsed = false;
    
    // Update order status to ready_for_pickup if not already
    if (order.orderStatus === 'shipped' || order.orderStatus === 'in_transit_to_customer_hub') {
      order.orderStatus = 'at_customer_hub';
      order.hubTracking.currentLocation = 'at_customer_hub';
    }
    
    await order.save();
    console.log(`✅ OTP saved to order ${order.orderNumber}`);
    
    // Send OTP email to customer from admin's email
    const { sendOrderOTPEmail } = require("../utils/orderEmailService");
    try {
      const emailResult = await sendOrderOTPEmail(order, otp);
      if (emailResult.success) {
        console.log(`✅ OTP email sent to customer: ${order.buyerDetails?.email || order.userEmail}`);
      } else {
        console.error(`❌ Failed to send OTP email: ${emailResult.error}`);
        // Still return success since OTP is generated, but warn about email
        return res.json({
          success: true,
          message: "OTP generated successfully, but email sending failed. Please contact customer directly.",
          otp: otp,
          emailSent: false
        });
      }
    } catch (emailError) {
      console.error("Error sending OTP email:", emailError);
      return res.json({
        success: true,
        message: "OTP generated successfully, but email sending failed. Please contact customer directly.",
        otp: otp,
        emailSent: false
      });
    }
    
    // Create notification for customer
    try {
      await Notification.create({
        userId: order.userId || order.buyerDetails?.email,
        userRole: 'buyer',
        type: 'order_ready_for_pickup',
        title: '📦 Order Ready for Pickup - OTP Sent',
        message: `Your order ${order.orderNumber} is ready for pickup at ${order.hubTracking?.customerHubName || 'your hub'}. Check your email for the OTP.`,
        orderId: order._id,
        orderNumber: order.orderNumber,
        read: false,
        metadata: {
          hubName: order.hubTracking?.customerHubName,
          otpSent: true
        }
      });
    } catch (notifError) {
      console.error("Error creating notification:", notifError);
    }
    
    res.json({
      success: true,
      message: "OTP generated and sent to customer's email",
      emailSent: true
    });
    
  } catch (error) {
    console.error("❌ Error generating OTP:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Verify OTP (using hubTracking.pickupOTP) and mark order as delivered
router.post("/orders/:orderId/verify-otp", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { otp } = req.body;

    console.log("🔐 OTP Verification Request (hub pickup OTP)");
    console.log("   Order ID (orderNumber):", orderId);
    console.log("   Provided OTP:", otp);

    if (!otp) {
      return res.status(400).json({
        success: false,
        error: "OTP is required",
      });
    }

    // Orders in all flows use orderNumber like ORD847416054
    const order = await Order.findOne({ orderNumber: orderId });

    if (!order) {
      console.log("❌ Order not found for orderNumber:", orderId);
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    // If already delivered, don't allow re‑use
    if (order.orderStatus === "delivered" || order.hubTracking?.otpUsed) {
      return res.status(400).json({
        success: false,
        error: "This order has already been delivered.",
      });
    }

    const hubTracking = order.hubTracking || {};
    const storedOtp = (hubTracking.pickupOTP || "").toString().trim();
    const providedOtp = otp.toString().trim();

    console.log("   Stored OTP:", storedOtp);

    if (!storedOtp) {
      return res.status(400).json({
        success: false,
        error: "No OTP has been generated for this order yet. Please generate OTP first.",
      });
    }

    // Compare OTPs (no expiry check - OTP is valid until used)
    if (storedOtp !== providedOtp) {
      console.log(`❌ Invalid OTP. Expected: ${storedOtp}, Got: ${providedOtp}`);
      return res.status(400).json({
        success: false,
        error: "Invalid OTP. Please check and try again.",
      });
    }

    console.log("✅ OTP verified successfully for order", order.orderNumber);

    // Mark OTP as used and update order status
    order.hubTracking.otpUsed = true;
    order.hubTracking.otpUsedAt = new Date();
    order.hubTracking.currentLocation = "delivered";
    order.hubTracking.deliveredAt = new Date();

    order.orderStatus = "delivered";
    order.deliveryDate = new Date();

    await order.save();

    console.log(`✅ Order ${order.orderNumber} marked as delivered`);

    // Create notifications
    await Promise.all([
      // Notify customer
      Notification.create({
        userId: order.userId,
        userRole: "buyer",
        title: "Order Delivered Successfully! 🎉",
        message: `Your order ${order.orderNumber} has been delivered successfully. Thank you for shopping with CraftedByHer!`,
        type: "order_delivered",
        orderId: order._id,
        orderNumber: order.orderNumber,
        metadata: {
          orderNumber: order.orderNumber,
          deliveredAt: new Date(),
        },
      }),

      // Notify hub manager
      Notification.create({
        userId: order.hubTracking?.customerHubId,
        userRole: "hubmanager",
        title: "Order Delivered",
        message: `Order ${order.orderNumber} has been successfully delivered to the customer.`,
        type: "order_delivered",
        orderId: order._id,
        orderNumber: order.orderNumber,
        metadata: {
          orderNumber: order.orderNumber,
          customerName: order.buyerDetails?.name,
        },
      }),
    ]);

    console.log("✅ Delivery notifications created");

    res.json({
      success: true,
      message: "Order delivered successfully!",
      order: {
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        deliveryDate: order.deliveryDate,
      },
    });
  } catch (error) {
    console.error("❌ Error verifying OTP:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get orders ready for OTP verification at a specific hub
router.get("/orders/ready-for-pickup/:hubId", async (req, res) => {
  try {
    const { hubId } = req.params;
    
    const orders = await Order.find({
      $or: [
        { 'hubTracking.customerHubId': hubId },
        { 'hubTracking.customerHubId': hubId.toString() }
      ],
      orderStatus: { $in: ['out_for_delivery', 'ready_for_pickup'] }
    })
    .select('orderId userName userEmail orderStatus deliveryOTP hubTracking totalAmount createdAt')
    .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      orders,
      count: orders.length
    });
    
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
