const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  orderNumber: {
    type: String,
    required: true,
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
    enum: ["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"],
    default: "pending",
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
  notes: String,
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

module.exports = mongoose.model("Order", orderSchema);


