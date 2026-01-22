const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const verify = require("../middleware/verifyFirebaseToken");

/**
 * User behavior tracking
 * Tracks user interactions for analytics and recommendations
 */

// ✅ Track user interaction
router.post("/", verify, async (req, res) => {
  try {
    const { action, productId, metadata = {} } = req.body;
    
    if (!action) {
      return res.status(400).json({
        success: false,
        error: "Action is required"
      });
    }

    const User = mongoose.model('User');
    const user = await User.findOne({ uid: req.user.uid });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    // Add activity to user's activity log
    const activityData = {
      action,
      details: {
        productId: productId || null,
        ...metadata
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    // Use the addActivity method if available
    if (typeof user.addActivity === 'function') {
      await user.addActivity(
        action,
        activityData.details,
        activityData.ipAddress,
        activityData.userAgent
      );
    } else {
      // Fallback: manually add activity
      user.activities.push({
        action: activityData.action,
        details: activityData.details,
        ipAddress: activityData.ipAddress,
        userAgent: activityData.userAgent,
        timestamp: new Date()
      });
      
      // Keep only last 100 activities
      if (user.activities.length > 100) {
        user.activities = user.activities.slice(-100);
      }
      
      user.lastActivity = new Date();
      await user.save();
    }

    res.json({
      success: true,
      message: "Interaction tracked successfully"
    });
  } catch (error) {
    console.error("Error tracking interaction:", error);
    res.status(500).json({
      success: false,
      error: "Failed to track interaction"
    });
  }
});

// ✅ Track interaction without authentication (for anonymous tracking)
router.post("/anonymous", async (req, res) => {
  try {
    const { action, productId, userId, metadata = {} } = req.body;
    
    if (!action) {
      return res.status(400).json({
        success: false,
        error: "Action is required"
      });
    }

    // For anonymous tracking, we just log it
    // Could be stored in a separate collection or just logged
    console.log(`[ANONYMOUS TRACKING] Action: ${action}, ProductId: ${productId}, UserId: ${userId || 'anonymous'}`);

    res.json({
      success: true,
      message: "Interaction tracked successfully"
    });
  } catch (error) {
    console.error("Error tracking anonymous interaction:", error);
    res.status(500).json({
      success: false,
      error: "Failed to track interaction"
    });
  }
});

// ✅ Get user tracking statistics (for admin/analytics)
router.get("/stats", verify, async (req, res) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findOne({ uid: req.user.uid });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    const activities = user.activities || [];
    
    // Count activities by type
    const activityCounts = {};
    activities.forEach(activity => {
      activityCounts[activity.action] = (activityCounts[activity.action] || 0) + 1;
    });

    res.json({
      success: true,
      stats: {
        totalActivities: activities.length,
        activityCounts,
        lastActivity: user.lastActivity,
        loginCount: user.loginCount,
        totalOrders: user.totalOrders,
        totalSpent: user.totalSpent
      }
    });
  } catch (error) {
    console.error("Error fetching tracking stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch tracking stats"
    });
  }
});

module.exports = router;








