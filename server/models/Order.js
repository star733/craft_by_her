const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  orderNumber: {
    type: String,
    unique: true,
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      image: String,
      variant: {
        weight: String,
        price: Number,
      },
      quantity: {
        type: Number,
        required: true,
      },
    },
  ],
  buyerDetails: {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      landmark: String,
    },
  },
  paymentMethod: {
    type: String,
    enum: ["cod", "online"],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
    default: "pending",
  },
  orderStatus: {
    type: String,
    enum: ["pending", "confirmed", "preparing", "assigned", "accepted", "picked_up", "shipped", "in_transit", "delivered", "cancelled", "rejected", "failed"],
    default: "pending",
  },
  // Delivery status tracking for admin dashboard
  deliveryStatus: {
    assigned: {
      type: Boolean,
      default: false,
    },
    accepted: {
      type: Boolean,
      default: false,
    },
    pickedUp: {
      type: Boolean,
      default: false,
    },
    delivered: {
      type: Boolean,
      default: false,
    },
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  shippingCharges: {
    type: Number,
    default: 0,
  },
  finalAmount: {
    type: Number,
    required: true,
  },
  paymentDetails: {
    transactionId: String,
    paymentGateway: String,
    paidAt: Date,
  },
  refundDetails: {
    refundAmount: {
      type: Number,
      default: 0,
    },
    refundStatus: {
      type: String,
      enum: ["not_applicable", "pending", "processing", "completed", "failed"],
      default: "not_applicable",
    },
    refundMethod: {
      type: String,
      enum: ["original_payment", "bank_transfer", "wallet", "not_applicable"],
      default: "not_applicable",
    },
    refundInitiatedAt: {
      type: Date,
      default: null,
    },
    refundCompletedAt: {
      type: Date,
      default: null,
    },
    refundTransactionId: {
      type: String,
      default: null,
    },
    refundReason: {
      type: String,
      default: "",
    },
    refundNotes: {
      type: String,
      default: "",
    },
  },
  deliveryInfo: {
    agentId: {
      type: String,
      ref: "DeliveryAgent",
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    pickedUpAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    estimatedDeliveryTime: {
      type: Date,
      default: null,
    },
    deliveryNotes: {
      type: String,
      default: "",
    },
    customerLocation: {
      latitude: Number,
      longitude: Number,
    },
    trackingUpdates: [{
      status: String,
      message: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
      location: {
        latitude: Number,
        longitude: Number,
      },
    }],
  },
  notes: String,
  rating: {
    value: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    review: {
      type: String,
      default: ""
    },
    ratedAt: {
      type: Date,
      default: null
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Generate order number
orderSchema.pre("save", function (next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    this.orderNumber = `ORD${timestamp}${random}`;
  }
  next();
});

// Ensure orderNumber is always generated
orderSchema.pre("validate", function (next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    this.orderNumber = `ORD${timestamp}${random}`;
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);


