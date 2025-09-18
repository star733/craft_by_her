const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Get products directly from database
router.get("/", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const products = await db.collection("products").find({}).sort({ createdAt: -1 }).toArray();
    console.log(`Public API: Found ${products.length} products`);
    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get single product
router.get("/:id", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const product = await db.collection("products").findOne({ 
      _id: new mongoose.Types.ObjectId(req.params.id) 
    });
    
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    res.json(product);
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;