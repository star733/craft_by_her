const express = require("express");
const router = express.Router();
const User = require("../models/User");
const verify = require("../middleware/verifyFirebaseToken");

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.adminUser = user;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all users with pagination and filtering
router.get("/", verify, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const status = req.query.status || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Build filter object
    const filter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      if (role === 'user') {
        filter.$or = [
          { role: 'user' },
          { role: 'buyer' } // Handle legacy users
        ];
      } else {
        filter.role = role;
      }
    }
    
    if (status) {
      switch (status) {
        case 'online':
          filter.lastLogin = { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
          break;
        case 'recent':
          filter.lastLogin = { 
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            $lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
          };
          break;
        case 'offline':
          filter.lastLogin = { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
          break;
        case 'inactive':
          filter.isActive = false;
          break;
        case 'verified':
          filter.isEmailVerified = true;
          break;
        case 'unverified':
          filter.isEmailVerified = false;
          break;
      }
    }

    const skip = (page - 1) * limit;
    
    const users = await User.find(filter)
      .select('-activities') // Exclude activities for list view
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / limit);

    // Add status to each user
    const usersWithStatus = users.map(user => ({
      ...user,
      status: getStatus(user)
    }));

    res.json({
      users: usersWithStatus,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get user statistics
router.get("/stats", verify, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: { $ne: false } });
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const buyerUsers = await User.countDocuments({ $or: [{ role: 'user' }, { role: 'buyer' }] });
    
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    const onlineUsers = await User.countDocuments({
      lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    res.json({
      totalUsers,
      activeUsers,
      adminUsers,
      buyerUsers,
      recentUsers,
      onlineUsers
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single user details
router.get("/:userId", verify, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get recent activities (last 20)
    const recentActivities = user.activities.slice(-20).reverse();

    // Also fetch cart, wishlist (with product details), and orders
    const mongoose = require('mongoose');
    const db = require('mongoose').connection.db;

    const [cartDoc, wishDoc, ordersArr] = await Promise.all([
      db.collection('carts').findOne({ userId: user.uid }),
      db.collection('wishlists').findOne({ userId: user.uid }),
      db.collection('orders').find({ userId: user.uid }).sort({ createdAt: -1 }).toArray()
    ]);

    // Enrich cart items with product details
    let cartDetailed = [];
    try {
      if (cartDoc?.items && cartDoc.items.length > 0) {
        const productIds = cartDoc.items.map((item) => {
          try {
            return new mongoose.Types.ObjectId(String(item.productId));
          } catch (_) {
            return null;
          }
        }).filter(Boolean);

        if (productIds.length > 0) {
          const products = await db
            .collection('products')
            .find({ _id: { $in: productIds } })
            .project({ title: 1, image: 1, img: 1, price: 1, variants: 1 })
            .toArray();

          const idToProduct = new Map(products.map((p) => [String(p._id), p]));
          cartDetailed = cartDoc.items.map((item) => {
            const prod = idToProduct.get(String(item.productId)) || {};
            return {
              ...item,
              productId: String(item.productId),
              title: prod.title || 'Product',
              image: prod.image || prod.img || null,
              price: item.price || prod.price || (Array.isArray(prod.variants) && prod.variants[0]?.price) || null,
            };
          });
        }
      }
    } catch (e) {
      console.warn('Cart enrichment failed:', e?.message);
      cartDetailed = cartDoc?.items || [];
    }

    // Enrich wishlist with product details
    let wishlistDetailed = [];
    try {
      const productIds = (wishDoc?.products || []).map((pid) => {
        // Convert to ObjectId when possible; otherwise return null to filter out
        try {
          return new mongoose.Types.ObjectId(String(pid));
        } catch (_) {
          return null;
        }
      }).filter(Boolean);

      if (productIds.length > 0) {
        const products = await db
          .collection('products')
          .find({ _id: { $in: productIds } })
          .project({ title: 1, image: 1, img: 1, price: 1, variants: 1 })
          .toArray();

        const idToProduct = new Map(products.map((p) => [String(p._id), p]));
        wishlistDetailed = (wishDoc.products || []).map((pid) => {
          const prod = idToProduct.get(String(pid)) || {};
          return {
            productId: String(pid),
            title: prod.title || 'Product',
            image: prod.image || prod.img || null,
            price: prod.price || (Array.isArray(prod.variants) && prod.variants[0]?.price) || null,
          };
        });
      }
    } catch (e) {
      console.warn('Wishlist enrichment failed:', e?.message);
      wishlistDetailed = wishDoc?.products || [];
    }

    res.json({
      ...user.toObject(),
      status: getStatus(user),
      recentActivities,
      cart: { items: cartDetailed, totalAmount: cartDoc?.totalAmount || 0 },
      wishlist: { products: wishlistDetailed },
      orders: ordersArr || []
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update user status (activate/deactivate)
router.patch("/:userId/status", verify, requireAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isActive = isActive;
    await user.save();

    res.json({ 
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update user role
router.patch("/:userId/role", verify, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from removing their own admin role
    if (user.uid === req.user.uid && role === 'user') {
      return res.status(400).json({ error: 'Cannot remove your own admin privileges' });
    }

    user.role = role;
    await user.save();

    res.json({ 
      message: `User role updated to ${role}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get user activities
router.get("/:userId/activities", verify, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const action = req.query.action || '';

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let activities = user.activities;
    
    if (action) {
      activities = activities.filter(activity => activity.action === action);
    }

    const skip = (page - 1) * limit;
    const paginatedActivities = activities.slice(skip, skip + limit);
    const totalActivities = activities.length;
    const totalPages = Math.ceil(totalActivities / limit);

    res.json({
      activities: paginatedActivities,
      pagination: {
        currentPage: page,
        totalPages,
        totalActivities,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching user activities:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete user (soft delete)
router.delete("/:userId", verify, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (user.uid === req.user.uid) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Soft delete - mark as inactive
    user.isActive = false;
    await user.addActivity('account_deactivated', { 
      deactivatedBy: req.user.uid,
      reason: 'Admin deletion'
    });
    await user.save();

    res.json({ 
      message: 'User deactivated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to determine user status
function getStatus(user) {
  if (!user.isActive) return 'inactive';
  if (user.lastLogin && Date.now() - user.lastLogin.getTime() < 24 * 60 * 60 * 1000) return 'online';
  if (user.lastLogin && Date.now() - user.lastLogin.getTime() < 7 * 24 * 60 * 60 * 1000) return 'recent';
  return 'offline';
}

module.exports = router;
