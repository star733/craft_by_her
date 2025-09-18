const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
  {
    userId: { 
      type: String, 
      required: true,
      index: true 
    },
    products: [
      { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Product" 
      }
    ]
  },
  { timestamps: true }
);

// Ensure unique products per user
wishlistSchema.index({ userId: 1, products: 1 }, { unique: true });

module.exports = mongoose.model("Wishlist", wishlistSchema);


