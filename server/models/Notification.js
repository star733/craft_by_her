const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  userRole: {
    type: String,
    enum: ['seller', 'admin', 'buyer', 'hubmanager'],
    required: true
  },
  type: {
    type: String,
    enum: [
      'new_order', 
      'order_moved_to_hub', 
      'order_approved', 
      'order_shipped', 
      'order_delivered', 
      'order_cancelled', 
      'product_arrived_at_hub',
      'order_arrived_seller_hub',
      'order_dispatched_to_customer_hub',
      'order_arrived_customer_hub',
      'admin_approval_required',
      'order_dispatched_to_hub',
      'order_arrived_at_hub'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  orderNumber: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  actionRequired: {
    type: Boolean,
    default: false
  },
  actionType: {
    type: String,
    enum: ['move_to_hub', 'approve_order', 'ship_order', 'approve_hub_delivery', 'prepare_for_pickup', 'none'],
    default: 'none'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for faster queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userRole: 1, read: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
