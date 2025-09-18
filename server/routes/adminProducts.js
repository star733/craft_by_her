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
    cb(null, path.join(__dirname, "../uploads")); // save to /uploads
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
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

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// ✅ Get all products from MongoDB
router.get("/", async (req, res) => {
  try {
    // Get products directly from MongoDB collection to avoid model conflicts
    const db = mongoose.connection.db;
    const products = await db.collection("products").find({}).sort({ createdAt: -1 }).toArray();
    console.log(`Found ${products.length} products in database`);
    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Add new product to MongoDB
router.post("/", verify, verifyAdmin, upload.single("image"), handleMulterError, async (req, res) => {
  try {
    console.log("=== Product Creation Request ===");
    console.log("Body:", req.body);
    console.log("File:", req.file);
    
    const { title, category, stock, variants } = req.body;
    
    const trimmedTitle = (title || '').trim();
    if (!trimmedTitle) {
      console.log("Missing required field - title:", title);
      return res.status(400).json({ error: "Title is required" });
    }

    if (trimmedTitle.length < 3) {
      return res.status(400).json({ error: "Title must be at least 3 characters" });
    }

    // Letters and spaces only
    if (!/^[A-Za-z\s]+$/.test(trimmedTitle)) {
      return res.status(400).json({ error: "Title can contain letters and spaces only" });
    }

    if (!category) {
      console.log("Missing required field - category:", category);
      return res.status(400).json({ error: "Category is required" });
    }

    if (!stock) {
      console.log("Missing required field - stock:", stock);
      return res.status(400).json({ error: "Stock is required" });
    }

    let parsedVariants = [];
    try {
      parsedVariants = JSON.parse(variants || "[]");
      console.log("Parsed variants:", parsedVariants);
    } catch (parseErr) {
      console.log("Variants parse error:", parseErr);
      return res.status(400).json({ error: "Invalid variants format" });
    }

    // Save to MongoDB directly
    const db = mongoose.connection.db;
    const product = {
      title: trimmedTitle,
      category,
      stock: parseInt(stock),
      variants: parsedVariants,
      image: req.file ? req.file.filename : null,
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

// ✅ Update product in MongoDB
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

// ✅ Delete product from MongoDB
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