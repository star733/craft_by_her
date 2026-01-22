const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    image: { type: String },
    // New hierarchical category structure
    mainCategory: {
      type: String,
      enum: ["Food", "Crafts"],
      required: false, // Optional for backward compatibility
    },
    subCategory: {
      type: String,
      required: false, // Optional for backward compatibility
    },
    // Keep old category field for backward compatibility
    category: {
      type: mongoose.Schema.Types.Mixed, // Allow both string and ObjectId
      required: false, // Made optional to support new structure
    },
    stock: { 
      type: Number, 
      required: true, 
      min: 0,
      default: 0 
    },
    variants: [
      {
        weight: { type: String, required: true }, // e.g. "100g"
        price: { type: Number, required: true },  // e.g. 50
      },
    ],
    isActive: {
      type: Boolean,
      default: true, // Products are active by default
    },
    // Seller ownership fields
    sellerId: {
      type: String,
      required: false, // Optional during migration, will be required later
      index: true, // For fast seller queries
    },
    sellerName: {
      type: String,
      required: false, // Optional during migration
    },
    sellerEmail: {
      type: String,
      required: false, // Optional during migration
    },
    // Admin approval system
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved", // Default to approved for existing products
      index: true,
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    approvedBy: {
      type: String, // Admin UID who approved/rejected
    },
    approvedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
