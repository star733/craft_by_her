const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Get products directly from database (only active products for public)
router.get("/", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    // Only show products that are active (isActive is true or undefined for old products)
    const products = await db.collection("products").find({
      $or: [
        { isActive: true },
        { isActive: { $exists: false } } // Include old products without isActive field
      ]
    }).sort({ createdAt: -1 }).toArray();
    console.log(`Public API: Found ${products.length} active products`);
    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get single product (only if active)
router.get("/:id", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const product = await db.collection("products").findOne({ 
      _id: new mongoose.Types.ObjectId(req.params.id),
      $or: [
        { isActive: true },
        { isActive: { $exists: false } } // Include old products without isActive field
      ]
    });
    
    if (!product) {
      return res.status(404).json({ error: "Product not found or has been disabled" });
    }
    
    res.json(product);
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;