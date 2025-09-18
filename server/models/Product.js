const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    image: { type: String },
    category: {
      type: mongoose.Schema.Types.Mixed, // Allow both string and ObjectId
      required: true,
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
