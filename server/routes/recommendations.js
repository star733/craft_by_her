const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const Product = require("../models/Product");

// Load products data
const loadProducts = () => {
  try {
    const dataPath = path.join(__dirname, "../data/products.json");
    const data = fs.readFileSync(dataPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading products data:", error);
    return [];
  }
};

// KNN-based similarity calculation
const calculateSimilarity = (product1, product2) => {
  let similarity = 0;
  
  // Category similarity (40% weight)
  if (product1.category === product2.category) {
    similarity += 0.4;
  }
  
  // Main ingredient similarity (30% weight)
  if (product1.mainIngredient === product2.mainIngredient) {
    similarity += 0.3;
  }
  
  // Price similarity (20% weight) - smaller difference = higher similarity
  const priceDiff = Math.abs(product1.price - product2.price);
  const maxPrice = Math.max(product1.price, product2.price);
  const priceSimilarity = 1 - (priceDiff / maxPrice);
  similarity += priceSimilarity * 0.2;
  
  // Rating similarity (10% weight) - smaller difference = higher similarity
  const ratingDiff = Math.abs(product1.rating - product2.rating);
  const ratingSimilarity = 1 - (ratingDiff / 5); // Assuming max rating is 5
  similarity += ratingSimilarity * 0.1;
  
  return similarity;
};

// --- Helpers to normalize DB products into recommendation shape ---
function getCategoryName(category) {
  if (!category) return "unknown";
  if (typeof category === "string") return category;
  if (typeof category === "object") return category.name || category.title || category.slug || "unknown";
  return "unknown";
}

function getPriceFromProduct(p) {
  if (!p) return 0;
  if (typeof p.price === "number") return p.price;
  if (Array.isArray(p.variants) && p.variants.length > 0) {
    // Prefer the cheapest variant as base price
    const prices = p.variants.map(v => Number(v.price) || 0).filter(n => n > 0);
    if (prices.length) return Math.min(...prices);
  }
  return 0;
}

function inferIngredientFromTitle(title = "") {
  const t = String(title).toLowerCase();
  const keywords = [
    "turmeric","cumin","coriander","chili","garam","rice","wheat","moong","toor","chana",
    "almond","cashew","walnut","tea","coffee","honey","jaggery","coconut","olive"
  ];
  const found = keywords.find(k => t.includes(k));
  return found || t.split(/\s+/)[0] || "mixed";
}

function normalizeDbProduct(p) {
  return {
    id: String(p._id),
    name: p.title || p.name || "Product",
    category: getCategoryName(p.category),
    price: getPriceFromProduct(p),
    rating: typeof p.rating === "number" ? p.rating : 4.3, // default rating if absent
    mainIngredient: p.mainIngredient || inferIngredientFromTitle(p.title || p.name),
    image: p.image || null,
    description: p.description || ""
  };
}

// Get recommendations for a product (DB-only)
router.get("/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    // Load DB products and normalize (DB-only recommendations)
    const dbProductsRaw = await Product.find({}).lean();
    const dbProducts = dbProductsRaw.map(normalizeDbProduct);

    // Find target product in DB
    const targetProduct = dbProducts.find(p => String(p.id) === String(productId));

    if (!targetProduct) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    // Prefer candidates from the same category
    const sameCategory = dbProducts.filter(p => String(p.id) !== String(productId) && (p.category || "").toString().toLowerCase() === (targetProduct.category || "").toString().toLowerCase());
    const pool = sameCategory.length >= 3
      ? sameCategory
      : dbProducts.filter(p => String(p.id) !== String(productId));

    // Compute similarities within the chosen pool
    const similarities = pool
      .map(product => ({ product, similarity: calculateSimilarity(targetProduct, product) }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    const recommendations = similarities.map(item => ({
      id: item.product.id,
      name: item.product.name,
      category: item.product.category,
      price: item.product.price,
      rating: item.product.rating,
      mainIngredient: item.product.mainIngredient,
      image: item.product.image,
      description: item.product.description,
      similarity: Math.round(item.similarity * 100) / 100
    }));

    return res.json({
      success: true,
      targetProduct: { id: targetProduct.id, name: targetProduct.name, category: targetProduct.category },
      recommendations,
      total: recommendations.length
    });
  } catch (error) {
    console.error("Error getting recommendations:", error);
    return res.status(500).json({ success: false, error: "Failed to get recommendations" });
  }
});

// Get all products (for debugging/testing)
router.get("/", (req, res) => {
  try {
    const products = loadProducts();
    res.json({
      success: true,
      products,
      total: products.length
    });
  } catch (error) {
    console.error("Error loading products:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load products"
    });
  }
});

module.exports = router;
