const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const verify = require("../middleware/verifyFirebaseToken");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

// ✅ Get user's cart
router.get("/", verify, async (req, res) => {
  try {
    let cartDoc = await Cart.findOne({ userId: req.user.uid });

    if (!cartDoc) {
      return res.json({ items: [], totalAmount: 0 });
    }

    // Consolidate duplicates if any exist (normalize weight/price strictly)
    const normalizeWeight = (w) => String(w || "").trim().toLowerCase();
    const normalizePrice = (p) => Number(p);
    const keyFor = (it) => {
      const pid = it.productId.toString();
      const w = normalizeWeight(it.variant?.weight);
      const p = normalizePrice(it.variant?.price);
      return `${pid}__${w}__${p}`;
    };
    const grouped = new Map();
    let mutated = false;
    for (const it of cartDoc.items) {
      // Ensure item variant is normalized in-place
      if (it?.variant) {
        if (typeof it.variant.weight === "string") {
          const nw = normalizeWeight(it.variant.weight);
          if (nw !== it.variant.weight) mutated = true;
          it.variant.weight = nw;
        }
        const np = normalizePrice(it.variant.price);
        if (np !== it.variant.price) mutated = true;
        it.variant.price = np;
      }

      const k = keyFor(it);
      if (!grouped.has(k)) {
        grouped.set(k, { ...it.toObject(), quantity: Number(it.quantity || 1) });
      } else {
        grouped.get(k).quantity += Number(it.quantity || 1);
        mutated = true;
      }
    }
    if (mutated) {
      cartDoc.items = Array.from(grouped.values());
      cartDoc.markModified("items");
      await cartDoc.save();
    }

    const cart = await Cart.findById(cartDoc._id)
      .populate("items.productId", "title image variants")
      .lean();

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
    
    // Verify/resolve variant from product with tolerant matching
    let productVariant = null;
    const toNormWeight = (w) => String(w || "").trim().toLowerCase();
    const toNormPrice = (p) => Number(p);
    if (product.variants && product.variants.length > 0) {
      // 1) exact match on weight + price (normalized)
      productVariant = product.variants.find((v) =>
        toNormWeight(v.weight) === toNormWeight(variant.weight) &&
        toNormPrice(v.price) === toNormPrice(variant.price)
      );
      // 2) fallback: match on weight only
      if (!productVariant) {
        productVariant = product.variants.find((v) =>
          toNormWeight(v.weight) === toNormWeight(variant.weight)
        );
      }
      // 3) ultimate fallback: first available variant
      if (!productVariant) {
        productVariant = product.variants[0];
      }
    } else if (product.price) {
      // For products without variants, create a default variant
      productVariant = {
        weight: variant.weight || "1 piece",
        price: product.price,
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
      weight: normalizeWeight(productVariant.weight),
      price: normalizePrice(productVariant.price),
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
          weight: productVariant.weight,
          price: normalizePrice(productVariant.price) // Ensure price is a number
        },
        quantity: Number(quantity) || 1
      });
    }
    
    // Consolidate duplicate line items (same product + weight + price)
    const groupKey = (it) => {
      const pid = it.productId.toString();
      const w = String(it.variant?.weight || "").trim().toLowerCase();
      const p = Number(it.variant?.price);
      return `${pid}__${w}__${p}`;
    };

    const grouped = new Map();
    for (const it of cart.items) {
      const key = groupKey(it);
      if (!grouped.has(key)) {
        grouped.set(key, { ...it.toObject(), quantity: Number(it.quantity || 1) });
      } else {
        grouped.get(key).quantity += Number(it.quantity || 1);
      }
    }
    cart.items = Array.from(grouped.values());

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
