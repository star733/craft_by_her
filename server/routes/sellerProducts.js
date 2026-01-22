const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const verify = require("../middleware/verifyFirebaseToken");
const verifySeller = require("../middleware/verifySeller");
const multer = require("multer");
const path = require("path");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, "product-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Handle Multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large. Maximum size is 5MB." });
    }
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// ========================================
// SELLER PRODUCT ROUTES
// ========================================

// ✅ Get all products for the seller (only THEIR products)
router.get("/", verify, verifySeller, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const sellerId = req.user.uid;
    
    // Filter products by seller ID
    const products = await db.collection("products")
      .find({ sellerId: sellerId })
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log(`Seller ${sellerId}: Found ${products.length} products`);
    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Add new product (seller can add products)
router.post("/", verify, verifySeller, upload.single("image"), handleMulterError, async (req, res) => {
  try {
    console.log("=== Product Creation Request ===");
    const { title, mainCategory, subCategory, category, stock, variants } = req.body;
    
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

    // Support both new (mainCategory/subCategory) and legacy (category) structure
    if (!mainCategory && !category) {
      return res.status(400).json({ error: "Main category is required" });
    }

    if (mainCategory && !subCategory) {
      return res.status(400).json({ error: "Sub category is required when main category is provided" });
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
    
    // Get seller info from authenticated user
    const sellerId = req.user.uid;
    const sellerEmail = req.user.email;
    
    // Get seller name from seller application
    const sellerApp = await db.collection("sellerapplications").findOne({ userId: sellerId });
    const sellerName = sellerApp?.businessName || req.user.name || 'Unknown Seller';
    
    // Auto-approve products from approved sellers
    const isSellerApproved = sellerApp && sellerApp.status === 'approved';
    const approvalStatus = isSellerApproved ? "approved" : "pending";
    
    const product = {
      title: trimmedTitle,
      stock: parseInt(stock),
      variants: parsedVariants,
      image: req.file ? req.file.filename : null,
      isActive: true,
      // Seller ownership
      sellerId: sellerId,
      sellerName: sellerName,
      sellerEmail: sellerEmail,
      // Admin approval - auto-approve if seller is approved, otherwise pending
      approvalStatus: approvalStatus,
      rejectionReason: "",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // If auto-approved, set approvedBy and approvedAt
    if (isSellerApproved) {
      product.approvedBy = 'system'; // Auto-approved for approved sellers
      product.approvedAt = new Date();
    }

    // Add new category structure if provided
    if (mainCategory) {
      product.mainCategory = mainCategory;
      product.subCategory = subCategory;
    }
    
    // Keep legacy category for backward compatibility
    if (category) {
      product.category = category;
    }

    const result = await db.collection("products").insertOne(product);
    product._id = result.insertedId;

    console.log("Product created successfully:", product);
    res.json(product);
  } catch (err) {
    console.error("Error saving product:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update product (seller can update ONLY their own products)
router.put("/:id", verify, verifySeller, upload.single("image"), handleMulterError, async (req, res) => {
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
    
    const db = mongoose.connection.db;
    const sellerId = req.user.uid;
    
    // Verify product belongs to this seller
    const existingProduct = await db.collection("products").findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
      sellerId: sellerId
    });
    
    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found or you don't have permission to edit it" });
    }
    
    const updates = {
      title: rawTitle,
      stock: parseInt(req.body.stock),
      variants: JSON.parse(req.body.variants),
      updatedAt: new Date()
    };

    // Support both new and legacy category structure
    if (req.body.mainCategory) {
      updates.mainCategory = req.body.mainCategory;
      updates.subCategory = req.body.subCategory;
    }
    
    if (req.body.category) {
      updates.category = req.body.category;
    }

    if (req.file) updates.image = req.file.filename;

    const result = await db.collection("products").updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id), sellerId: sellerId },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Product not found or you don't have permission" });
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

// ✅ Delete product (seller can delete ONLY their own products)
router.delete("/:id", verify, verifySeller, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const sellerId = req.user.uid;
    
    // Only delete if product belongs to this seller
    const result = await db.collection("products").deleteOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
      sellerId: sellerId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Product not found or you don't have permission to delete it" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Toggle product status (enable/disable) - only for seller's own products
router.patch("/toggle-status/:id", verify, verifySeller, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const sellerId = req.user.uid;
    
    // Verify product belongs to this seller
    const product = await db.collection("products").findOne({ 
      _id: new mongoose.Types.ObjectId(req.params.id),
      sellerId: sellerId
    });
    
    if (!product) {
      return res.status(404).json({ error: "Product not found or you don't have permission" });
    }
    
    // Toggle isActive status
    const newStatus = !(product.isActive !== false); // Default to true if undefined
    
    const result = await db.collection("products").updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: { isActive: newStatus, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    res.json({ 
      success: true, 
      message: newStatus ? "Product enabled successfully" : "Product disabled successfully",
      isActive: newStatus
    });
  } catch (err) {
    console.error("Toggle status error:", err);
    res.status(500).json({ error: "Failed to update product status" });
  }
});

module.exports = router;