const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const verify = require("../middleware/verifyFirebaseToken");
const verifyAdmin = require("../middleware/verifyAdmin");
const Order = require("../models/Order");
const Notification = require("../models/Notification");
const Hub = require("../models/Hub");
const HubManager = require("../models/HubManager");
const User = require("../models/User");

// System health check endpoint
router.get("/health", async (req, res) => {
  try {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      status: "healthy",
      services: {},
      metrics: {},
      alerts: []
    };

    // Database connectivity
    try {
      await mongoose.connection.db.admin().ping();
      healthStatus.services.database = {
        status: "healthy",
        responseTime: Date.now(),
        connection: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
      };
    } catch (error) {
      healthStatus.services.database = {
        status: "unhealthy",
        error: error.message
      };
      healthStatus.status = "degraded";
    }

    // Email service check
    const emailConfigured = process.env.EMAIL_USER && process.env.EMAIL_PASS;
    healthStatus.services.email = {
      status: emailConfigured ? "healthy" : "warning",
      configured: emailConfigured,
      provider: process.env.SMTP_HOST || "smtp.gmail.com"
    };

    if (!emailConfigured) {
      healthStatus.alerts.push({
        type: "warning",
        message: "Email service not configured - OTP emails will not be sent",
        recommendation: "Configure EMAIL_USER and EMAIL_PASS in .env file"
      });
    }

    // API endpoints check
    healthStatus.services.api = {
      status: "healthy",
      endpoints: {
        admin: "/api/admin/orders",
        hubManagers: "/api/hub-managers/dashboard/stats",
        notifications: "/api/notifications/buyer",
        health: "/api/system/health"
      }
    };

    // System metrics
    const [
      totalOrders,
      pendingOrders,
      totalNotifications,
      unreadNotifications,
      totalHubs,
      activeHubManagers,
      totalUsers
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ orderStatus: 'at_seller_hub' }),
      Notification.countDocuments(),
      Notification.countDocuments({ read: false }),
      Hub.countDocuments(),
      HubManager.countDocuments({ status: 'active' }),
      User.countDocuments()
    ]);

    healthStatus.metrics = {
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        pendingPercentage: totalOrders > 0 ? ((pendingOrders / totalOrders) * 100).toFixed(1) : 0
      },
      notifications: {
        total: totalNotifications,
        unread: unreadNotifications,
        unreadPercentage: totalNotifications > 0 ? ((unreadNotifications / totalNotifications) * 100).toFixed(1) : 0
      },
      infrastructure: {
        hubs: totalHubs,
        activeHubManagers: activeHubManagers,
        users: totalUsers
      }
    };

    // Performance alerts
    if (pendingOrders > 10) {
      healthStatus.alerts.push({
        type: "warning",
        message: `High number of pending orders: ${pendingOrders}`,
        recommendation: "Review and approve pending orders in admin dashboard"
      });
    }

    if (unreadNotifications > 50) {
      healthStatus.alerts.push({
        type: "info",
        message: `High number of unread notifications: ${unreadNotifications}`,
        recommendation: "Users should check their notifications"
      });
    }

    // Overall system status
    if (healthStatus.alerts.some(alert => alert.type === "error")) {
      healthStatus.status = "unhealthy";
    } else if (healthStatus.alerts.some(alert => alert.type === "warning")) {
      healthStatus.status = "degraded";
    }

    res.json(healthStatus);
  } catch (error) {
    console.error("System health check error:", error);
    res.status(500).json({
      timestamp: new Date().toISOString(),
      status: "unhealthy",
      error: error.message,
      services: {
        database: { status: "unknown" },
        email: { status: "unknown" },
        api: { status: "unknown" }
      }
    });
  }
});

// Detailed system metrics (admin only)
router.get("/metrics", verify, verifyAdmin, async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    const timeRanges = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90
    };
    
    const daysBack = timeRanges[timeRange] || 7;
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Order metrics
    const orderMetrics = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            status: "$orderStatus",
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt"
              }
            }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: "$finalAmount" }
        }
      },
      {
        $sort: { "_id.date": 1 }
      }
    ]);

    // Hub performance metrics
    const hubMetrics = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          "hubTracking.sellerHubId": { $exists: true }
        }
      },
      {
        $group: {
          _id: "$hubTracking.sellerHubId",
          hubName: { $first: "$hubTracking.sellerHubName" },
          totalOrders: { $sum: 1 },
          avgApprovalTime: {
            $avg: {
              $divide: [
                {
                  $subtract: [
                    "$hubTracking.adminApprovedAt",
                    "$hubTracking.arrivedAtSellerHub"
                  ]
                },
                1000 * 60 * 60 // Convert to hours
              ]
            }
          }
        }
      },
      {
        $sort: { totalOrders: -1 }
      }
    ]);

    // Notification metrics
    const notificationMetrics = await Notification.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            type: "$type",
            userRole: "$userRole"
          },
          count: { $sum: 1 },
          readCount: {
            $sum: { $cond: ["$read", 1, 0] }
          }
        }
      }
    ]);

    // System performance
    const systemPerformance = {
      orderProcessingRate: orderMetrics.reduce((sum, metric) => sum + metric.count, 0) / daysBack,
      avgOrderValue: orderMetrics.reduce((sum, metric) => sum + metric.totalAmount, 0) / 
                     orderMetrics.reduce((sum, metric) => sum + metric.count, 0) || 0,
      notificationEngagement: notificationMetrics.reduce((sum, metric) => sum + metric.readCount, 0) /
                              notificationMetrics.reduce((sum, metric) => sum + metric.count, 0) || 0
    };

    res.json({
      success: true,
      timeRange,
      metrics: {
        orders: orderMetrics,
        hubs: hubMetrics,
        notifications: notificationMetrics,
        performance: systemPerformance
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("System metrics error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// System alerts (admin only)
router.get("/alerts", verify, verifyAdmin, async (req, res) => {
  try {
    const alerts = [];
    const now = new Date();

    // Check for old pending orders
    const oldPendingOrders = await Order.countDocuments({
      orderStatus: 'at_seller_hub',
      'hubTracking.arrivedAtSellerHub': {
        $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago
      }
    });

    if (oldPendingOrders > 0) {
      alerts.push({
        id: 'old_pending_orders',
        type: 'warning',
        priority: 'high',
        title: 'Old Pending Orders',
        message: `${oldPendingOrders} orders have been pending approval for more than 24 hours`,
        action: 'Review and approve pending orders',
        createdAt: now.toISOString()
      });
    }

    // Check for failed notifications
    const failedNotifications = await Notification.countDocuments({
      createdAt: { $gte: new Date(now.getTime() - 60 * 60 * 1000) }, // Last hour
      read: false,
      type: { $in: ['admin_approval_required', 'order_dispatched_to_hub'] }
    });

    if (failedNotifications > 10) {
      alerts.push({
        id: 'high_unread_notifications',
        type: 'info',
        priority: 'medium',
        title: 'High Unread Notifications',
        message: `${failedNotifications} notifications remain unread in the last hour`,
        action: 'Check notification system',
        createdAt: now.toISOString()
      });
    }

    // Check hub capacity
    const hubs = await Hub.find({ status: 'active' });
    const overCapacityHubs = hubs.filter(hub => {
      const utilization = (hub.currentStock / hub.capacity) * 100;
      return utilization > 90;
    });

    if (overCapacityHubs.length > 0) {
      alerts.push({
        id: 'hub_over_capacity',
        type: 'warning',
        priority: 'high',
        title: 'Hub Over Capacity',
        message: `${overCapacityHubs.length} hubs are over 90% capacity`,
        action: 'Review hub capacity and consider expansion',
        createdAt: now.toISOString(),
        details: overCapacityHubs.map(hub => ({
          name: hub.name,
          utilization: Math.round((hub.currentStock / hub.capacity) * 100)
        }))
      });
    }

    // Check email configuration
    const emailConfigured = process.env.EMAIL_USER && process.env.EMAIL_PASS;
    if (!emailConfigured) {
      alerts.push({
        id: 'email_not_configured',
        type: 'error',
        priority: 'critical',
        title: 'Email Service Not Configured',
        message: 'OTP emails cannot be sent to customers',
        action: 'Configure EMAIL_USER and EMAIL_PASS in environment variables',
        createdAt: now.toISOString()
      });
    }

    res.json({
      success: true,
      alerts,
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.priority === 'critical').length,
      generatedAt: now.toISOString()
    });
  } catch (error) {
    console.error("System alerts error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;