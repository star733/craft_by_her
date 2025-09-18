const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    image: { type: String },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
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
