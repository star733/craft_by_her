const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Get products directly from database (only active AND approved products for public)
router.get("/", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    
    // First, get all approved sellers
    const approvedSellers = await db.collection("sellerapplications")
      .find({ status: "approved" })
      .toArray();
    const approvedSellerIds = approvedSellers.map(s => s.userId);
    
    // Only show products that are:
    // 1. Active (isActive is true or undefined for old products)
    // 2. Approved (approvalStatus is "approved" or undefined for old products)
    // OR from approved sellers (even if pending)
    const products = await db.collection("products").find({
      $and: [
        {
          $or: [
            { isActive: true },
            { isActive: { $exists: false } } // Include old products without isActive field
          ]
        },
        {
          $or: [
            { approvalStatus: "approved" },
            { approvalStatus: { $exists: false } }, // Include old products without approvalStatus field
            // Include pending products from approved sellers
            { 
              approvalStatus: "pending",
              sellerId: { $in: approvedSellerIds }
            }
          ]
        }
      ]
    }).sort({ createdAt: -1 }).toArray();
    
    console.log(`Public API: Found ${products.length} active products (approved + pending from approved sellers)`);
    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get single product (only if active AND approved, or from approved seller)
router.get("/:id", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    
    // First, get all approved sellers
    const approvedSellers = await db.collection("sellerapplications")
      .find({ status: "approved" })
      .toArray();
    const approvedSellerIds = approvedSellers.map(s => s.userId);
    
    const product = await db.collection("products").findOne({ 
      _id: new mongoose.Types.ObjectId(req.params.id),
      $and: [
        {
          $or: [
            { isActive: true },
            { isActive: { $exists: false } } // Include old products without isActive field
          ]
        },
        {
          $or: [
            { approvalStatus: "approved" },
            { approvalStatus: { $exists: false } }, // Include old products without approvalStatus field
            // Include pending products from approved sellers
            { 
              approvalStatus: "pending",
              sellerId: { $in: approvedSellerIds }
            }
          ]
        }
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

// Utility endpoint to auto-approve existing pending products from approved sellers
router.post("/auto-approve-seller-products", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    
    // Get all approved sellers
    const approvedSellers = await db.collection("sellerapplications")
      .find({ status: "approved" })
      .toArray();
    const approvedSellerIds = approvedSellers.map(s => s.userId);
    
    if (approvedSellerIds.length === 0) {
      return res.json({ 
        success: true, 
        message: "No approved sellers found",
        updated: 0 
      });
    }
    
    // Update pending products from approved sellers
    const result = await db.collection("products").updateMany(
      {
        approvalStatus: "pending",
        sellerId: { $in: approvedSellerIds }
      },
      {
        $set: {
          approvalStatus: "approved",
          approvedBy: "system",
          approvedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`Auto-approved ${result.modifiedCount} pending products from approved sellers`);
    
    res.json({
      success: true,
      message: `Auto-approved ${result.modifiedCount} products from approved sellers`,
      updated: result.modifiedCount
    });
  } catch (err) {
    console.error("Error auto-approving products:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;