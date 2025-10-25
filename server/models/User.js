const mongoose = require("mongoose");

const userActivitySchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['login', 'logout', 'register', 'profile_update', 'password_change', 'order_placed', 'cart_add', 'wishlist_add', 'product_view']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: String,
  userAgent: String,
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

const userSchema = new mongoose.Schema(
  {
    uid: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    photoURL: {
      type: String,
      default: ""
    },
    provider: {
      type: String,
      default: "password",
      enum: ['password', 'google', 'facebook', 'twitter']
    },
    role: {
      type: String,
      default: "user",
      enum: ["user", "admin"],
      index: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    lastLogin: {
      type: Date,
      default: null
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    loginCount: {
      type: Number,
      default: 0
    },
    totalOrders: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    preferences: {
      newsletter: {
        type: Boolean,
        default: true
      },
      notifications: {
        type: Boolean,
        default: true
      }
    },
    // Saved delivery addresses
    addresses: [
      {
        label: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' },
        name: { type: String, trim: true },
        phone: { type: String, trim: true },
        address: {
          street: { type: String, trim: true },
          city: { type: String, trim: true },
          state: { type: String, trim: true },
          pincode: { type: String, trim: true },
          landmark: { type: String, trim: true }
        },
        isDefault: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
      }
    ],
    activities: [userActivitySchema],
    registrationIP: String,
    registrationUserAgent: String
  },
  {
    timestamps: true
  }
);

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ createdAt: -1 });

// Virtual for user status
userSchema.virtual('status').get(function() {
  if (!this.isActive) return 'inactive';
  if (this.lastLogin && Date.now() - this.lastLogin.getTime() < 24 * 60 * 60 * 1000) return 'online';
  if (this.lastLogin && Date.now() - this.lastLogin.getTime() < 7 * 24 * 60 * 60 * 1000) return 'recent';
  return 'offline';
});

// Method to add activity
userSchema.methods.addActivity = function(action, details = {}, ipAddress = '', userAgent = '') {
  this.activities.push({
    action,
    details,
    ipAddress,
    userAgent,
    timestamp: new Date()
  });
  
  // Keep only last 100 activities
  if (this.activities.length > 100) {
    this.activities = this.activities.slice(-100);
  }
  
  this.lastActivity = new Date();
  return this.save();
};

// Method to update login info
userSchema.methods.updateLoginInfo = function(ipAddress = '', userAgent = '') {
  this.lastLogin = new Date();
  this.loginCount += 1;
  this.lastActivity = new Date();
  
  this.addActivity('login', {}, ipAddress, userAgent);
  return this.save();
};

// Static method to get user stats
userSchema.statics.getStats = async function() {
  const totalUsers = await this.countDocuments();
  const activeUsers = await this.countDocuments({ isActive: true });
  const verifiedUsers = await this.countDocuments({ isEmailVerified: true });
  const adminUsers = await this.countDocuments({ role: 'admin' });
  
  const recentUsers = await this.countDocuments({
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  });
  
  const onlineUsers = await this.countDocuments({
    lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  });
  
  return {
    totalUsers,
    activeUsers,
    verifiedUsers,
    adminUsers,
    recentUsers,
    onlineUsers
  };
};

module.exports = mongoose.model("User", userSchema);