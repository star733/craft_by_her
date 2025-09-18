const express = require("express");
const router = express.Router();
const verify = require("../middleware/verifyFirebaseToken");
const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");

// ✅ Get user's wishlist
router.get("/", verify, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ userId: req.user.uid })
      .populate("products", "title image variants")
      .lean();
    
    if (!wishlist) {
      return res.json({ products: [] });
    }
    
    res.json(wishlist);
  } catch (err) {
    console.error("Error fetching wishlist:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Add product to wishlist
router.post("/add", verify, async (req, res) => {
  try {
    const { productId } = req.body;
    
    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }
    
    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    let wishlist = await Wishlist.findOne({ userId: req.user.uid });
    
    if (!wishlist) {
      // Create new wishlist
      wishlist = new Wishlist({
        userId: req.user.uid,
        products: []
      });
    }
    
    // Check if product already exists in wishlist
    if (wishlist.products.includes(productId)) {
      return res.status(400).json({ error: "Product already in wishlist" });
    }
    
    wishlist.products.push(productId);
    await wishlist.save();
    
    // Return updated wishlist with populated data
    const updatedWishlist = await Wishlist.findById(wishlist._id)
      .populate("products", "title image variants")
      .lean();
    
    res.json(updatedWishlist);
  } catch (err) {
    console.error("Error adding to wishlist:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Remove product from wishlist
router.delete("/remove/:productId", verify, async (req, res) => {
  try {
    const { productId } = req.params;
    
    const wishlist = await Wishlist.findOne({ userId: req.user.uid });
    if (!wishlist) {
      return res.status(404).json({ error: "Wishlist not found" });
    }
    
    wishlist.products.pull(productId);
    await wishlist.save();
    
    const updatedWishlist = await Wishlist.findById(wishlist._id)
      .populate("products", "title image variants")
      .lean();
    
    res.json(updatedWishlist);
  } catch (err) {
    console.error("Error removing from wishlist:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Check if product is in wishlist
router.get("/check/:productId", verify, async (req, res) => {
  try {
    const { productId } = req.params;
    
    const wishlist = await Wishlist.findOne({ 
      userId: req.user.uid,
      products: productId 
    });
    
    res.json({ inWishlist: !!wishlist });
  } catch (err) {
    console.error("Error checking wishlist:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Clear entire wishlist
router.delete("/clear", verify, async (req, res) => {
  try {
    await Wishlist.findOneAndDelete({ userId: req.user.uid });
    res.json({ message: "Wishlist cleared successfully" });
  } catch (err) {
    console.error("Error clearing wishlist:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
