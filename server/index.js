const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const adminProducts = require("./routes/adminProducts");
const path = require("path");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
// CORS (dev): always allow any origin (no credentials)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json());

// --- Health check ---
app.get("/", (_, res) => res.send("CraftedByHer API is running 🎉"));

// --- Routes ---
app.use("/api/auth", require("./routes/auth"));
app.use("/api/items", require("./routes/products")); // Changed from /api/products to /api/items
app.use("/api/cart", require("./routes/cart"));
app.use("/api/wishlist", require("./routes/wishlist"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/admin/products", adminProducts);
app.use("/api/admin/users", require("./routes/userManagement"));
// Removed adminCategories route to fix the ObjectId error

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- MongoDB Connection ---
mongoose.set("debug", true);

// Clear model cache to avoid conflicts
mongoose.models = {};
mongoose.modelSchemas = {};

mongoose.connection.on("connected", () => console.log("Mongoose connected"));
mongoose.connection.on("error", (err) => console.error("Mongoose error:", err));
mongoose.connection.on("disconnected", () => console.log("Mongoose disconnected"));

mongoose
  .connect(process.env.MONGO_URI, { dbName: "foodily" })
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
  })
  .catch((err) => console.error("❌ Mongo error:", err));
