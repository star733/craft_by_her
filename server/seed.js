// server/seed.js
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");
const rawProducts = require("../client/src/data/products").PRODUCTS;

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      // modern drivers ignore useNewUrlParser/useUnifiedTopology
    });
    console.log("✅ Connected to MongoDB");

    await Product.deleteMany({});
    console.log("🗑 Old products removed");

    const products = rawProducts.map((p) => ({
      title: p.title,
      category: p.category,
      price: p.price,
      image: p.img,   // map client "img" → schema "image"
      tag: p.tag || "",
    }));

    await Product.insertMany(products);
    console.log("🌱 Products seeded successfully");
  } catch (err) {
    console.error("❌ Seeding error:", err);
  } finally {
    mongoose.disconnect();
  }
}

seed();
