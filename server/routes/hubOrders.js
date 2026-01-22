const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Hub = require("../models/Hub");
const HubManager = require("../models/HubManager");
const User = require("../models/User");
const verify = require("../middleware/verifyFirebaseToken");
const requireAdmin = require("../middleware/verifyAdmin");
const { sendHubNotification } = require("../utils/hubEmailService");
const { createAdminHubNotification, createOrderDispatchedNotification, createCustomerHubArrivalNotification } = require("../utils/notificationService");

// Helper function to find nearest hub by district
async function findNearestHub(district) {
  const hub = await Hub.findOne({ 
    district: district, 
    status: 'active' 
  });
  return hub;
}

// Helper function to extract district from address
function extractDistrict(address) {
  if (!address) return null;
  
  // Try to match district from city or state field
  const cityLower = (address.city || '').toLowerCase();
  const stateLower = (address.state || '').toLowerCase();
  
  const districts = [
    "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha",
    "Kottayam", "Idukki", "Ernakulam", "Thrissur",
    "Palakkad", "Malappuram", "Kozhikode", "Wayanad",
    "Kannur", "Kasaragod"
  ];
  
  for (const district of districts) {
    if (cityLower.includes(district.toLowerCase()) || 
        stateLower.includes(district.toLowerCase())) {
      return district;
    }
  }
  
  // Default fallback
  return "Ernakulam";
}

// Process order after placement - Move to seller's hub
router.post("/:orderId/move-to-seller-hub", verify, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('items.productId');
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    // Get seller info from first product
    const firstProduct = order.items[0]?.productId;
    if (!firstProduct || !firstProduct.sellerId) {
      return res.status(400).json({ 
        error: "Product seller information not found" 
      });
    }
    
    // Get seller details to find their district
    const User = require("../models/User");
    const seller = await User.findOne({ uid: firstProduct.sellerId });
    
    if (!seller) {
      return res.status(404).json({ error: "Seller not found" });
    }
    
    // Extract seller's district from their address
    const sellerDistrict = seller.addresses && seller.addresses.length > 0
      ? extractDistrict(seller.addresses[0].address)
      : "Ernakulam"; // Default
    
    // Find nearest hub to seller
    const sellerHub = await findNearestHub(sellerDistrict);
    
    if (!sellerHub) {
      return res.status(404).json({ 
        error: `No active hub found in ${sellerDistrict} district` 
      });
    }
    
    // Update order with seller hub info
    order.hubTracking = {
      sellerHubId: sellerHub.hubId,
      sellerHubName: sellerHub.name,
      sellerHubDistrict: sellerHub.district,
      arrivedAtSellerHub: new Date(),
      currentLocation: 'seller_hub',
      approvedByAdmin: false
    };
    
    order.orderStatus = 'at_seller_hub';
    
    await order.save();
    
    // Update hub stats
    await Hub.findOneAndUpdate(
      { hubId: sellerHub.hubId },
      { 
        $inc: { 
          'capacity.currentOrders': 1,
          'stats.ordersInTransit': 1
        } 
      }
    );
    
    // Create admin notification for approval
    try {
      await createAdminHubNotification(order, {
        name: sellerHub.name,
        district: sellerHub.district,
        hubId: sellerHub.hubId
      });
      console.log(`✅ Admin notification created for order ${order.orderNumber}`);
    } catch (notificationError) {
      console.error("Failed to create admin notification:", notificationError);
      // Don't fail the main operation if notification fails
    }
    
    // Send notification to hub manager
    if (sellerHub.managerId) {
      await sendHubNotification({
        type: 'order_arrived_seller_hub',
        order,
        hub: sellerHub,
        managerId: sellerHub.managerId
      });
    }
    
    res.json({
      success: true,
      message: `Order moved to ${sellerHub.name}`,
      order
    });
  } catch (error) {
    console.error("Error moving order to seller hub:", error);
    res.status(500).json({ error: error.message });
  }
});

// Admin approves order - Move to customer's hub
router.post("/:orderId/approve-and-move", verify, requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    if (order.orderStatus !== 'at_seller_hub' && order.orderStatus !== 'awaiting_admin_approval') {
      return res.status(400).json({ 
        error: "Order is not at seller hub or awaiting approval" 
      });
    }
    
    // Extract customer's district from their address
    const customerDistrict = extractDistrict(order.buyerDetails.address);
    
    // Find nearest hub to customer
    const customerHub = await findNearestHub(customerDistrict);
    
    if (!customerHub) {
      return res.status(404).json({ 
        error: `No active hub found in ${customerDistrict} district` 
      });
    }
    
    // Update order
    order.hubTracking.approvedByAdmin = true;
    order.hubTracking.adminApprovedAt = new Date();
    order.hubTracking.adminApprovedBy = req.user.uid;
    order.hubTracking.customerHubId = customerHub.hubId;
    order.hubTracking.customerHubName = customerHub.name;
    order.hubTracking.customerHubDistrict = customerHub.district;
    order.hubTracking.currentLocation = 'in_transit_to_customer_hub';
    order.orderStatus = 'in_transit_to_customer_hub';
    
    await order.save();
    
    // Update seller hub stats (decrease)
    if (order.hubTracking.sellerHubId) {
      await Hub.findOneAndUpdate(
        { hubId: order.hubTracking.sellerHubId },
        { 
          $inc: { 
            'capacity.currentOrders': -1,
            'stats.ordersDispatched': 1
          } 
        }
      );
    }
    
    // Create admin notification for dispatch
    try {
      await createOrderDispatchedNotification(
        order, 
        order.hubTracking.sellerHubName, 
        customerHub.name, 
        req.user.uid
      );
      console.log(`✅ Dispatch notification created for order ${order.orderNumber}`);
    } catch (notificationError) {
      console.error("Failed to create dispatch notification:", notificationError);
    }
    
    // Simulate arrival at customer hub (in real scenario, this would be triggered by logistics)
    setTimeout(async () => {
      try {
        const updatedOrder = await Order.findById(order._id);
        if (updatedOrder && updatedOrder.orderStatus === 'in_transit_to_customer_hub') {
          updatedOrder.hubTracking.arrivedAtCustomerHub = new Date();
          updatedOrder.hubTracking.currentLocation = 'customer_hub';
          updatedOrder.hubTracking.readyForPickup = true;
          updatedOrder.hubTracking.readyForPickupAt = new Date();
          updatedOrder.orderStatus = 'at_customer_hub';
          await updatedOrder.save();
          
          // Update customer hub stats
          await Hub.findOneAndUpdate(
            { hubId: customerHub.hubId },
            { 
              $inc: { 
                'capacity.currentOrders': 1,
                'stats.ordersReadyForPickup': 1
              } 
            }
          );
          
          // Create admin notification for customer hub arrival
          try {
            await createCustomerHubArrivalNotification(updatedOrder, {
              name: customerHub.name,
              district: customerHub.district,
              hubId: customerHub.hubId
            });
            console.log(`✅ Customer hub arrival notification created for order ${updatedOrder.orderNumber}`);
          } catch (notificationError) {
            console.error("Failed to create customer hub arrival notification:", notificationError);
          }
          
          // Send notification to customer and customer hub manager
          if (customerHub.managerId) {
            await sendHubNotification({
              type: 'order_arrived_customer_hub',
              order: updatedOrder,
              hub: customerHub,
              managerId: customerHub.managerId
            });
          }
        }
      } catch (err) {
        console.error("Error updating order arrival:", err);
      }
    }, 5000); // 5 seconds delay for demo
    
    res.json({
      success: true,
      message: `Order approved and moving to ${customerHub.name}`,
      order
    });
  } catch (error) {
    console.error("Error approving and moving order:", error);
    res.status(500).json({ error: error.message });
  }
});

// Customer sets delivery preference
router.patch("/:orderId/delivery-preference", verify, async (req, res) => {
  try {
    const { preference } = req.body; // 'self_pickup' or 'delivery_boy'
    
    if (!['self_pickup', 'delivery_boy'].includes(preference)) {
      return res.status(400).json({ 
        error: "Preference must be 'self_pickup' or 'delivery_boy'" 
      });
    }
    
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    // Verify order belongs to user
    if (order.userId !== req.user.uid) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    if (order.orderStatus !== 'at_customer_hub' && order.orderStatus !== 'ready_for_pickup') {
      return res.status(400).json({ 
        error: "Order is not ready for pickup yet" 
      });
    }
    
    order.deliveryPreference = preference;
    order.orderStatus = 'ready_for_pickup';
    
    await order.save();
    
    res.json({
      success: true,
      message: `Delivery preference set to ${preference}`,
      order
    });
  } catch (error) {
    console.error("Error setting delivery preference:", error);
    res.status(500).json({ error: error.message });
  }
});

// Customer self-pickup confirmation
router.post("/:orderId/self-pickup", verify, async (req, res) => {
  try {
    const { pickedUpBy, idProof } = req.body;
    
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    // Verify order belongs to user
    if (order.userId !== req.user.uid) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    if (order.deliveryPreference !== 'self_pickup') {
      return res.status(400).json({ 
        error: "Order is not set for self-pickup" 
      });
    }
    
    order.selfPickupDetails = {
      pickedUpBy: pickedUpBy || order.buyerDetails.name,
      pickedUpAt: new Date(),
      idProof: idProof || ""
    };
    
    order.orderStatus = 'delivered';
    order.hubTracking.currentLocation = 'delivered';
    
    await order.save();
    
    // Update hub stats
    if (order.hubTracking.customerHubId) {
      await Hub.findOneAndUpdate(
        { hubId: order.hubTracking.customerHubId },
        { 
          $inc: { 
            'capacity.currentOrders': -1,
            'stats.totalOrdersProcessed': 1,
            'stats.ordersReadyForPickup': -1
          } 
        }
      );
    }
    
    res.json({
      success: true,
      message: "Order picked up successfully",
      order
    });
  } catch (error) {
    console.error("Error confirming self-pickup:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get order hub tracking info
router.get("/:orderId/tracking", async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .select('orderNumber orderStatus hubTracking deliveryPreference');
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    // Get hub details
    let sellerHub = null;
    let customerHub = null;
    
    if (order.hubTracking?.sellerHubId) {
      sellerHub = await Hub.findOne({ hubId: order.hubTracking.sellerHubId })
        .select('hubId name district location.address contactInfo');
    }
    
    if (order.hubTracking?.customerHubId) {
      customerHub = await Hub.findOne({ hubId: order.hubTracking.customerHubId })
        .select('hubId name district location.address contactInfo');
    }
    
    res.json({
      success: true,
      tracking: {
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        hubTracking: order.hubTracking,
        deliveryPreference: order.deliveryPreference,
        sellerHub,
        customerHub
      }
    });
  } catch (error) {
    console.error("Error fetching order tracking:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
