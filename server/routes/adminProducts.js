const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const verify = require("../middleware/verifyFirebaseToken");
const verifyAdmin = require("../middleware/verifyAdmin");
const mongoose = require("mongoose");

// 📂 Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// ========================================
// SPECIFIC ROUTES FIRST (before /:id)
// ========================================

// ✅ Test route
router.get("/test", (req, res) => {
  res.json({ message: "Admin products route is working!" });
});

// ✅ Toggle product status - MUST BE BEFORE /:id
router.patch("/toggle-status/:id", verify, verifyAdmin, async (req, res) => {
  try {
    console.log("\n=== 🔄 TOGGLE PRODUCT STATUS ===");
    const productId = req.params.id;
    console.log("Product ID:", productId);
    
    const db = mongoose.connection.db;
    
    const product = await db.collection("products").findOne(
      { _id: new mongoose.Types.ObjectId(productId) }
    );
    
    if (!product) {
      console.log("❌ Product not found");
      return res.status(404).json({ error: "Product not found" });
    }
    
    const currentStatus = product.isActive !== false;
    const newStatus = !currentStatus;
    
    console.log("Current status:", currentStatus);
    console.log("New status:", newStatus);
    
    await db.collection("products").updateOne(
      { _id: new mongoose.Types.ObjectId(productId) },
      { 
        $set: { 
          isActive: newStatus,
          updatedAt: new Date()
        } 
      }
    );

    console.log("✅ Status updated successfully");
    
    res.json({ 
      success: true,
      message: `Product ${newStatus ? 'enabled' : 'disabled'} successfully`,
      isActive: newStatus
    });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Approve product
router.patch("/approve/:id", verify, verifyAdmin, async (req, res) => {
  try {
    console.log("\n=== ✅ APPROVE PRODUCT ===");
    const productId = req.params.id;
    console.log("Product ID:", productId);
    console.log("Admin UID:", req.user.uid);
    
    const db = mongoose.connection.db;
    
    const product = await db.collection("products").findOne(
      { _id: new mongoose.Types.ObjectId(productId) }
    );
    
    if (!product) {
      console.log("❌ Product not found");
      return res.status(404).json({ error: "Product not found" });
    }
    
    await db.collection("products").updateOne(
      { _id: new mongoose.Types.ObjectId(productId) },
      { 
        $set: { 
          approvalStatus: "approved",
          approvedBy: req.user.uid,
          approvedAt: new Date(),
          rejectionReason: "",
          updatedAt: new Date()
        } 
      }
    );

    console.log("✅ Product approved successfully");
    
    res.json({ 
      success: true,
      message: "Product approved successfully"
    });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Reject product
router.patch("/reject/:id", verify, verifyAdmin, async (req, res) => {
  try {
    console.log("\n=== ❌ REJECT PRODUCT ===");
    const productId = req.params.id;
    const { reason } = req.body;
    console.log("Product ID:", productId);
    console.log("Admin UID:", req.user.uid);
    console.log("Rejection reason:", reason);
    
    const db = mongoose.connection.db;
    
    const product = await db.collection("products").findOne(
      { _id: new mongoose.Types.ObjectId(productId) }
    );
    
    if (!product) {
      console.log("❌ Product not found");
      return res.status(404).json({ error: "Product not found" });
    }
    
    await db.collection("products").updateOne(
      { _id: new mongoose.Types.ObjectId(productId) },
      { 
        $set: { 
          approvalStatus: "rejected",
          approvedBy: req.user.uid,
          approvedAt: new Date(),
          rejectionReason: reason || "No reason provided",
          updatedAt: new Date()
        } 
      }
    );

    console.log("✅ Product rejected successfully");
    
    res.json({ 
      success: true,
      message: "Product rejected successfully"
    });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// GENERAL ROUTES
// ========================================

// ✅ Get all products (with seller information)
router.get("/", verify, verifyAdmin, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const products = await db.collection("products")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log(`Admin view: Found ${products.length} products from all sellers`);
    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// ADMIN CANNOT ADD PRODUCTS
// Sellers add products through /api/seller/products
// ========================================

// ✅ Get single product by ID (for viewing details)
router.get("/:id", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const product = await db.collection("products").findOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) }
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(400).json({ error: err.message });
  }
});

// ========================================
// ADMIN CANNOT EDIT PRODUCTS
// Sellers edit their products through /api/seller/products
// ========================================

// ========================================
// ADMIN CAN ONLY TOGGLE STATUS (ENABLE/DISABLE)
// ========================================

// Note: toggle-status route is already above at line ~52

module.exports = router;