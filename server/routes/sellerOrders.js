const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const verify = require("../middleware/verifyFirebaseToken");
const verifySeller = require("../middleware/verifySeller");

// Import models
const Hub = require("../models/Hub");
const Order = require("../models/Order");
const User = require("../models/User");
const HubManager = require("../models/HubManager");
const Notification = require("../models/Notification");
const SellerApplication = require("../models/SellerApplication");
const Product = require("../models/Product");

// ✅ Get notifications for seller (must be before /:id route)
router.get("/notifications", verify, verifySeller, async (req, res) => {
  try {
    const { unreadOnly, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {
      userId: req.user.uid,
      userRole: 'seller'
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
        userId: req.user.uid,
        userRole: 'seller',
        read: false 
      })
    ]);
    
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
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ Get notification details with full order information (must be before /:id route)
router.get("/notifications/:id/details", verify, verifySeller, async (req, res) => {
  try {
    
    // Get the notification
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.uid,
      userRole: 'seller'
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: "Notification not found"
      });
    }
    
    // Mark as read
    if (!notification.read) {
      notification.read = true;
      notification.readAt = new Date();
      await notification.save();
    }
    
    // Get order details if notification has orderId
    let orderDetails = null;
    if (notification.orderId) {
      const order = await Order.findById(notification.orderId).lean();
      
      if (order) {
        // Get product details for each item
        const itemsWithDetails = await Promise.all(
          order.items.map(async (item) => {
            let productDetails = item;
            if (item.productId) {
              const product = await Product.findById(item.productId)
                .select('title image images')
                .lean();
              if (product) {
                productDetails = {
                  ...item,
                  title: item.title || product.title,
                  image: item.image || product.image || (product.images && product.images[0])
                };
              }
            }
            return productDetails;
          })
        );
        
        orderDetails = {
          ...order,
          items: itemsWithDetails
        };
      }
    }
    
    res.json({
      success: true,
      notification,
      orderDetails
    });
  } catch (error) {
    console.error("Error fetching notification details:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ Get all orders for the seller
router.get("/", verify, verifySeller, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    // For now, sellers can see all orders (similar to admin)
    // In a more complex system, you might filter by products owned by the seller
    const orders = await db.collection("orders").find({}).sort({ createdAt: -1 }).toArray();
    console.log(`Found ${orders.length} orders in database`);
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get nearest hub for seller
router.get("/nearest-hub", verify, verifySeller, async (req, res) => {
  console.log("📍 GET /api/seller/orders/nearest-hub - Request received");
  console.log("Seller UID:", req.user?.uid);
  
  try {
    const { calculateDistance } = require('../utils/locationUtils');
    
    // Get seller details
    const seller = await User.findOne({ uid: req.user.uid });
    if (!seller) {
      console.log("❌ Seller not found in database");
      return res.status(404).json({ 
        success: false,
        error: "Seller not found" 
      });
    }
    
    console.log(`✅ Found seller: ${seller.name} (${seller.email})`);
    
    // Check if seller has location data
    let sellerLocation = seller.sellerLocation;
    
    if (!sellerLocation || !sellerLocation.coordinates || 
        !sellerLocation.coordinates.latitude || !sellerLocation.coordinates.longitude) {
      
      console.log("❌ Seller location missing or incomplete");
      console.log("Current location data:", JSON.stringify(sellerLocation, null, 2));
      
      // Try to get location from SellerApplication
      const application = await SellerApplication.findOne({ userId: req.user.uid });
      
      if (application && application.location && application.location.coordinates) {
        // Migrate location from application to User
        sellerLocation = {
          address: application.address,
          coordinates: application.location.coordinates,
          district: application.location.district
        };
        
        // Update User with location
        await User.findByIdAndUpdate(seller._id, {
          sellerLocation: sellerLocation
        });
        
        console.log(`✅ Auto-migrated location for seller ${req.user.uid} from application`);
      } else {
        console.log("❌ No valid location found in SellerApplication either");
        return res.status(400).json({ 
          success: false,
          error: "Seller location not set. Please update your location in Account Settings.",
          sellerLocationMissing: true
        });
      }
    }
    
    const sellerLat = sellerLocation.coordinates.latitude;
    const sellerLon = sellerLocation.coordinates.longitude;
    const sellerDistrict = sellerLocation.district;
    
    console.log("✅ Seller location verified:");
    console.log(`   - Coordinates: ${sellerLat}, ${sellerLon}`);
    console.log(`   - District: ${sellerDistrict}`);
    
    // Get all active hubs
    const hubs = await Hub.find({ status: 'active' })
      .select('hubId name district location contactInfo')
      .lean();
    
    console.log(`✅ Found ${hubs.length} active hubs`);
    
    if (hubs.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "No active hubs found" 
      });
    }
    
    // Calculate distance to each hub and find nearest
    let nearestHub = null;
    let minDistance = Infinity;
    const hubsWithDistance = [];
    
    for (const hub of hubs) {
      if (!hub.location || !hub.location.coordinates || 
          !hub.location.coordinates.latitude || !hub.location.coordinates.longitude) {
        console.warn(`Hub ${hub.name} (${hub.hubId}) missing coordinates, skipping`);
        hubsWithDistance.push({
          ...hub,
          distance: null,
          isNearest: false
        });
        continue;
      }
      
      const hubLat = hub.location.coordinates.latitude;
      const hubLon = hub.location.coordinates.longitude;
      
      const distance = calculateDistance(sellerLat, sellerLon, hubLat, hubLon);
      
      hubsWithDistance.push({
        ...hub,
        distance: Math.round(distance * 10) / 10,
        isNearest: false
      });
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestHub = hub;
      }
    }
    
    // Mark nearest hub
    if (nearestHub) {
      const nearestIndex = hubsWithDistance.findIndex(h => h.hubId === nearestHub.hubId);
      if (nearestIndex !== -1) {
        hubsWithDistance[nearestIndex].isNearest = true;
      }
    }
    
    // Sort by distance
    hubsWithDistance.sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
    
    console.log(`✅ Nearest hub found: ${nearestHub?.name || 'None'} (${Math.round(minDistance * 10) / 10} km)`);
    
    res.json({
      success: true,
      hubs: hubsWithDistance,
      nearestHub: nearestHub ? {
        hubId: nearestHub.hubId,
        name: nearestHub.name,
        district: nearestHub.district,
        distance: Math.round(minDistance * 10) / 10
      } : null,
      sellerInfo: {
        district: sellerDistrict,
        city: seller.sellerLocation.address?.city || null,
        state: seller.sellerLocation.address?.state || null,
        coordinates: {
          latitude: sellerLat,
          longitude: sellerLon
        }
      }
    });
  } catch (err) {
    console.error("❌ Error getting nearest hub:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// ✅ Get a specific order
router.get("/:id", verify, verifySeller, async (req, res) => {
  try {
    console.log("=== FETCHING ORDER FOR SELLER ===");
    console.log("Order ID from params:", req.params.id);
    console.log("Order ID type:", typeof req.params.id);
    console.log("Seller UID:", req.user.uid);
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log("❌ Invalid ObjectId format");
      return res.status(400).json({ error: "Invalid order ID format" });
    }
    
    const order = await Order.findById(req.params.id).lean();
    
    if (!order) {
      console.log("❌ Order not found");
      return res.status(404).json({ error: "Order not found" });
    }
    
    console.log("✅ Order found:", order.orderNumber);
    console.log("  - Items:", order.items.length);
    console.log("  - Status:", order.orderStatus);
    console.log("  - Buyer:", order.buyerDetails.name);
    
    // Manually populate product details for each item
    for (let item of order.items) {
      if (item.productId) {
        try {
          const product = await Product.findById(item.productId).select('title image variants').lean();
          if (product) {
            item.productDetails = product;
            console.log(`  - Product populated: ${product.title}`);
          } else {
            console.log(`  - Product not found for ID: ${item.productId}`);
          }
        } catch (productError) {
          console.log(`  - Error fetching product ${item.productId}:`, productError.message);
        }
      }
    }
    
    res.json(order);
  } catch (err) {
    console.error("❌ Error fetching order:", err);
    console.error("Stack trace:", err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update order status
router.patch("/:id/status", verify, verifySeller, async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validate status
    const validStatuses = [
      "pending", "confirmed", "preparing", "assigned", 
      "accepted", "picked_up", "shipped", "in_transit", 
      "delivered", "cancelled", "rejected", "failed"
    ];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    const db = mongoose.connection.db;
    const result = await db.collection("orders").updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { 
        $set: { 
          orderStatus: status,
          updatedAt: new Date()
        },
        $push: {
          "deliveryInfo.trackingUpdates": {
            status: status,
            message: `Order status updated to ${status}`,
            timestamp: new Date()
          }
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    const updatedOrder = await db.collection("orders").findOne({ 
      _id: new mongoose.Types.ObjectId(req.params.id) 
    });
    
    res.json(updatedOrder);
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Mark all notifications as read
router.patch("/notifications/read-all", verify, verifySeller, async (req, res) => {
  try {
    
    await Notification.updateMany(
      { 
        userId: req.user.uid,
        userRole: 'seller',
        read: false
      },
      { 
        read: true,
        readAt: new Date()
      }
    );
    
    res.json({
      success: true,
      message: "All notifications marked as read"
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});



// ✅ Move order products to hub
router.patch("/:id/move-to-hub", verify, verifySeller, async (req, res) => {
  try {
    const { hubId } = req.body;
    
    console.log("=== MOVING ORDER TO HUB ===");
    console.log("Order ID from params:", req.params.id);
    console.log("Order ID type:", typeof req.params.id);
    console.log("Order ID length:", req.params.id.length);
    console.log("Hub ID:", hubId);
    console.log("Seller UID:", req.user.uid);
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log("❌ Invalid ObjectId format:", req.params.id);
      return res.status(400).json({ 
        success: false,
        error: "Invalid order ID format" 
      });
    }
    
    if (!hubId) {
      return res.status(400).json({ 
        success: false,
        error: "Hub ID is required" 
      });
    }
    
    console.log("✅ Step 1: Validation passed");
    
    // Find hub by hubId field (not MongoDB _id)
    console.log("🔍 Step 2: Finding hub...");
    const hub = await Hub.findOne({ hubId: hubId });
    if (!hub) {
      console.log(`❌ Hub not found with hubId: ${hubId}`);
      return res.status(404).json({ 
        success: false,
        error: "Hub not found" 
      });
    }
    
    console.log(`✅ Step 2: Found hub: ${hub.name} (${hub.hubId})`);
    
    // Get order
    console.log("🔍 Step 3: Finding order...");
    const order = await Order.findById(req.params.id);
    if (!order) {
      console.log(`❌ Order not found with ID: ${req.params.id}`);
      return res.status(404).json({ 
        success: false,
        error: "Order not found" 
      });
    }
    
    console.log(`✅ Step 3: Found order: ${order.orderNumber}`);
    
    // Check if already at hub
    if (order.hubTracking?.sellerHubId) {
      return res.status(400).json({ 
        success: false,
        error: "Order already moved to hub" 
      });
    }
    
    console.log("✅ Step 4: Order can be moved");
    
    // Get seller details for notification
    console.log("🔍 Step 5: Finding seller...");
    const seller = await User.findOne({ uid: req.user.uid });
    const sellerName = seller?.name || req.user.name || 'Seller';
    
    console.log(`✅ Step 5: Found seller: ${sellerName}`);
    
    // Update order with hub tracking
    console.log("🔍 Step 6: Updating order...");
    order.hubTracking = {
      sellerHubId: hub._id.toString(),
      sellerHubName: hub.name,
      sellerHubDistrict: hub.district,
      arrivedAtSellerHub: new Date(),
      currentLocation: 'seller_hub'
    };
    order.orderStatus = 'at_seller_hub';
    order.updatedAt = new Date();
    
    await order.save();
    
    console.log("✅ Step 6: Order updated with hub tracking");
    
    // Find central hub manager (HM0003) who manages all hubs
    console.log("🔍 Step 7: Finding central hub manager...");
    const centralHubManager = await HubManager.findOne({ 
      managerId: 'HM0003',
      status: 'active'
    });
    
    if (centralHubManager) {
      console.log(`✅ Step 7: Found central hub manager: ${centralHubManager.name} (${centralHubManager.managerId})`);
      
      // Create notification for central hub manager
      console.log("🔍 Step 8: Creating central hub manager notification...");
      try {
        const notification = await Notification.create({
          userId: centralHubManager.managerId,
          userRole: 'hubmanager',
          type: 'product_arrived_at_hub',
          title: '📦 New Products Arrived at Hub',
          message: `Order #${order.orderNumber} with ${order.items.length} item(s) has arrived at ${hub.name} (${hub.district}). Customer: ${order.buyerDetails.name} (${order.buyerDetails.address.city || 'Location not specified'})`,
          orderId: order._id,
          orderNumber: order.orderNumber,
          actionRequired: false,
          metadata: {
            hubName: hub.name,
            hubId: hub.hubId,
            hubDistrict: hub.district,
            sellerName: sellerName,
            itemCount: order.items.length,
            customerName: order.buyerDetails.name,
            customerDistrict: order.buyerDetails.address.city || order.buyerDetails.address.state,
            customerCity: order.buyerDetails.address.city,
            customerAddress: `${order.buyerDetails.address.street || ''}, ${order.buyerDetails.address.city || ''}, ${order.buyerDetails.address.state || ''} - ${order.buyerDetails.address.pincode || ''}`,
            totalAmount: order.totalAmount,
            orderDate: order.createdAt,
            items: order.items.map(item => ({
              title: item.title,
              quantity: item.quantity,
              variant: item.variant,
              image: item.image
            }))
          }
        });
        
        console.log(`✅ Step 8: Central hub manager notification created: ${notification._id}`);
      } catch (notificationError) {
        console.error("❌ Step 8: Central hub manager notification failed:", notificationError);
        // Don't fail the whole operation if notification fails
      }
    } else {
      console.log(`⚠️ Step 7: Central hub manager (HM0003) not found or inactive`);
    }
    
    // Create notification for admin users
    console.log("🔍 Step 9: Creating admin notifications...");
    try {
      const adminUsers = await User.find({ role: 'admin' }).select('uid name');
      console.log(`📧 Creating notifications for ${adminUsers.length} admin(s)`);
      
      for (const admin of adminUsers) {
        await Notification.create({
          userId: admin.uid,
          userRole: 'admin',
          type: 'order_moved_to_hub',
          title: '📦 Order Moved to Hub',
          message: `Order #${order.orderNumber} has been moved to ${hub.name} hub by ${sellerName}. Please review and approve for delivery to customer.`,
          orderId: order._id,
          orderNumber: order.orderNumber,
          actionRequired: true,
          actionType: 'approve_order',
          metadata: {
            hubName: hub.name,
            hubId: hub.hubId,
            hubDistrict: hub.district,
            sellerName: sellerName,
            customerCity: order.buyerDetails.address.city,
            totalAmount: order.totalAmount
          }
        });
      }
      
      console.log("✅ Step 9: Admin notifications created");
    } catch (adminNotificationError) {
      console.error("❌ Step 9: Admin notifications failed:", adminNotificationError);
      // Don't fail the whole operation if notification fails
    }
    
    console.log("🎉 Move to hub completed successfully!");
    
    res.json({
      success: true,
      message: `Order moved to ${hub.name} hub successfully`,
      order: order,
      hubInfo: {
        hubId: hub.hubId,
        name: hub.name,
        district: hub.district
      }
    });
  } catch (err) {
    console.error("❌ CRITICAL ERROR in move-to-hub:", err);
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

module.exports = router;