const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const verify = require("../middleware/verifyFirebaseToken");

// Get buyer notifications with enhanced data
router.get("/buyer", verify, async (req, res) => {
  try {
    console.log("🔔 Fetching buyer notifications for user:", req.user.uid);
    
    const { unreadOnly, limit = 20, page = 1 } = req.query;
    
    let query = { 
      userId: req.user.uid,
      userRole: 'buyer'
    };
    
    if (unreadOnly === 'true') {
      query.read = false;
    }
    
    const skip = (page - 1) * limit;
    
    const [notifications, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('orderId', 'orderNumber orderStatus items hubTracking')
        .lean(),
      Notification.countDocuments({
        userId: req.user.uid,
        userRole: 'buyer',
        read: false
      })
    ]);
    
    console.log(`✅ Found ${notifications.length} buyer notifications, ${unreadCount} unread`);
    
    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(notifications.length / limit),
        count: notifications.length
      }
    });
  } catch (error) {
    console.error("Error fetching buyer notifications:", error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get user notifications
router.get("/", verify, async (req, res) => {
  try {
    const { unreadOnly, limit = 20, page = 1 } = req.query;
    
    let query = { userId: req.user.uid };
    
    if (unreadOnly === 'true') {
      query.read = false;
    }
    
    const skip = (page - 1) * limit;
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('orderId', 'orderNumber orderStatus items');
    
    // Return simple array for easier consumption
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.patch("/:notificationId/read", verify, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.notificationId, userId: req.user.uid },
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    
    res.json({ success: true, notification });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: error.message });
  }
});

// Mark all notifications as read
router.patch("/mark-all-read", verify, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.uid, read: false },
      { read: true }
    );
    
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete notification
router.delete("/:notificationId", verify, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.notificationId,
      userId: req.user.uid
    });
    
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    
    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get unread count
router.get("/unread-count", verify, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.uid,
      read: false
    });
    
    res.json({ success: true, count });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
