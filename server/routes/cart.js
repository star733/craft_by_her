const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const verify = require("../middleware/verifyFirebaseToken");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

// ✅ Get user's cart
router.get("/", verify, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.uid })
      .populate("items.productId", "title image variants")
      .lean();
    
    if (!cart) {
      return res.json({ items: [], totalAmount: 0 });
    }
    
    res.json(cart);
  } catch (err) {
    console.error("Error fetching cart:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Add item to cart
router.post("/add", verify, async (req, res) => {
  try {
    const { productId, variant, quantity = 1 } = req.body;
    
    console.log("=== CART ADD DEBUG ===");
    console.log("Product ID:", productId);
    console.log("Variant:", variant);
    console.log("Quantity:", quantity);
    console.log("User UID:", req.user.uid);
    
    if (!productId || !variant) {
      console.log("❌ Missing productId or variant");
      return res.status(400).json({ error: "Product ID and variant are required" });
    }
    
    // Verify product exists using direct MongoDB access
    const db = mongoose.connection.db;
    const product = await db.collection("products").findOne({ 
      _id: new mongoose.Types.ObjectId(productId) 
    });
    
    if (!product) {
      console.log("❌ Product not found");
      return res.status(404).json({ error: "Product not found" });
    }
    
    console.log("✅ Product found:", product.title);
    
    // Verify variant exists in product
    let productVariant = null;
    if (product.variants && product.variants.length > 0) {
      // For products with variants, find matching variant
      productVariant = product.variants.find(v => 
        v.weight === variant.weight && 
        String(v.price) === String(variant.price)
      );
    } else if (product.price) {
      // For products without variants, create a default variant
      productVariant = { 
        weight: variant.weight || "1 piece", 
        price: product.price 
      };
    }
    
    if (!productVariant) {
      console.log("❌ Invalid variant");
      console.log("Product variants:", product.variants);
      console.log("Requested variant:", variant);
      console.log("Variant types - weight:", typeof variant.weight, "price:", typeof variant.price);
      if (product.variants && product.variants.length > 0) {
        console.log("First product variant types - weight:", typeof product.variants[0].weight, "price:", typeof product.variants[0].price);
      }
      return res.status(400).json({ error: "Invalid variant" });
    }
    
    console.log("✅ Variant validated:", productVariant);
    
    let cart = await Cart.findOne({ userId: req.user.uid });
    
    if (!cart) {
      console.log("Creating new cart for user:", req.user.uid);
      // Create new cart
      cart = new Cart({
        userId: req.user.uid,
        items: []
      });
    } else {
      console.log("Found existing cart with", cart.items.length, "items");
    }
    
    // Normalizers to ensure stable comparisons
    const normalizeWeight = (w) => String(w || "").trim().toLowerCase();
    const normalizePrice = (p) => Number(p);
    const incoming = {
      productId: productId,
      weight: normalizeWeight(variant.weight),
      price: normalizePrice(variant.price),
    };

    // Check if an equivalent line item already exists (product + weight + price)
    let existingItemIndex = cart.items.findIndex((item) => {
      const sameProduct = item.productId.toString() === incoming.productId;
      const sameWeight = normalizeWeight(item.variant?.weight) === incoming.weight;
      const samePrice = normalizePrice(item.variant?.price) === incoming.price;
      return sameProduct && sameWeight && samePrice;
    });

    // Fallback: if price formatting differs, match by product + weight only
    if (existingItemIndex < 0) {
      existingItemIndex = cart.items.findIndex((item) => {
        const sameProduct = item.productId.toString() === incoming.productId;
        const sameWeight = normalizeWeight(item.variant?.weight) === incoming.weight;
        return sameProduct && sameWeight;
      });
    }
    
    if (existingItemIndex >= 0) {
      console.log("Updating existing item quantity");
      // Update quantity
      cart.items[existingItemIndex].quantity += quantity;
      // Ensure price is a number
      cart.items[existingItemIndex].variant.price = normalizePrice(cart.items[existingItemIndex].variant.price);
    } else {
      console.log("Adding new item to cart");
      // Add new item with proper data types
      cart.items.push({
        productId,
        title: product.title, // Add product title
        image: product.image, // Add product image
        variant: {
          weight: variant.weight,
          price: normalizePrice(variant.price) // Ensure price is a number
        },
        quantity
      });
    }
    
    console.log("Saving cart...");
    await cart.save();
    console.log("✅ Cart saved successfully");
    
    // Return updated cart without populate to avoid errors
    const updatedCart = await Cart.findById(cart._id).lean();
    
    res.json(updatedCart);
  } catch (err) {
    console.error("Error adding to cart:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update item quantity
router.put("/update", verify, async (req, res) => {
  try {
    const { itemId, quantity } = req.body;
    
    if (!itemId || quantity < 1) {
      return res.status(400).json({ error: "Valid item ID and quantity required" });
    }
    
    const cart = await Cart.findOne({ userId: req.user.uid });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }
    
    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ error: "Item not found in cart" });
    }
    
    item.quantity = quantity;
    await cart.save();
    
    const updatedCart = await Cart.findById(cart._id)
      .populate("items.productId", "title image variants")
      .lean();
    
    res.json(updatedCart);
  } catch (err) {
    console.error("Error updating cart:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Remove item from cart
router.delete("/remove/:itemId", verify, async (req, res) => {
  try {
    const { itemId } = req.params;
    
    const cart = await Cart.findOne({ userId: req.user.uid });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }
    
    cart.items.pull(itemId);
    await cart.save();
    
    const updatedCart = await Cart.findById(cart._id)
      .populate("items.productId", "title image variants")
      .lean();
    
    res.json(updatedCart);
  } catch (err) {
    console.error("Error removing from cart:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Clear entire cart
router.delete("/clear", verify, async (req, res) => {
  try {
    await Cart.findOneAndDelete({ userId: req.user.uid });
    res.json({ message: "Cart cleared successfully" });
  } catch (err) {
    console.error("Error clearing cart:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
