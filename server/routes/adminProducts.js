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

// ========================================
// GENERAL ROUTES
// ========================================

// ✅ Get all products
router.get("/", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const products = await db.collection("products").find({}).sort({ createdAt: -1 }).toArray();
    console.log(`Found ${products.length} products in database`);
    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Add new product
router.post("/", verify, verifyAdmin, upload.single("image"), handleMulterError, async (req, res) => {
  try {
    console.log("=== Product Creation Request ===");
    const { title, category, stock, variants } = req.body;
    
    const trimmedTitle = (title || '').trim();
    if (!trimmedTitle) {
      return res.status(400).json({ error: "Title is required" });
    }

    if (trimmedTitle.length < 3) {
      return res.status(400).json({ error: "Title must be at least 3 characters" });
    }

    if (!/^[A-Za-z\s]+$/.test(trimmedTitle)) {
      return res.status(400).json({ error: "Title can contain letters and spaces only" });
    }

    if (!category) {
      return res.status(400).json({ error: "Category is required" });
    }

    if (!stock) {
      return res.status(400).json({ error: "Stock is required" });
    }

    let parsedVariants = [];
    try {
      parsedVariants = JSON.parse(variants || "[]");
    } catch (parseErr) {
      return res.status(400).json({ error: "Invalid variants format" });
    }

    const db = mongoose.connection.db;
    const product = {
      title: trimmedTitle,
      category,
      stock: parseInt(stock),
      variants: parsedVariants,
      image: req.file ? req.file.filename : null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection("products").insertOne(product);
    product._id = result.insertedId;

    console.log("Product created successfully:", product);
    res.json(product);
  } catch (err) {
    console.error("Error saving product:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update product
router.put("/:id", verify, verifyAdmin, upload.single("image"), handleMulterError, async (req, res) => {
  try {
    const rawTitle = (req.body.title || '').trim();
    if (!rawTitle) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (rawTitle.length < 3) {
      return res.status(400).json({ error: "Title must be at least 3 characters" });
    }
    if (!/^[A-Za-z\s]+$/.test(rawTitle)) {
      return res.status(400).json({ error: "Title can contain letters and spaces only" });
    }

    const updates = {
      title: rawTitle,
      category: req.body.category,
      stock: parseInt(req.body.stock),
      variants: JSON.parse(req.body.variants),
      updatedAt: new Date()
    };

    if (req.file) updates.image = req.file.filename;

    const db = mongoose.connection.db;
    const result = await db.collection("products").updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const updatedProduct = await db.collection("products").findOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) }
    );

    res.json(updatedProduct);
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(400).json({ error: err.message });
  }
});

// ✅ Delete product (kept for backward compatibility)
router.delete("/:id", verify, verifyAdmin, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const result = await db.collection("products").deleteOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) }
    );

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
