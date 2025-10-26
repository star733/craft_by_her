const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const adminProducts = require("./routes/adminProducts");
const path = require("path");

require("dotenv").config();
// Load environment configuration
require("./config/environment");

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"], // Vite / CRA
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());

// --- Health check ---
app.get("/", (_, res) => res.send("CraftedByHer API is running 🎉"));

// --- Routes ---
app.use("/api/auth", require("./routes/auth"));
app.use("/api/items", require("./routes/products")); // Changed from /api/products to /api/items
app.use("/api/cart", require("./routes/cart"));
app.use("/api/wishlist", require("./routes/wishlist"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/payment", require("./routes/payment"));
app.use("/api/delivery", require("./routes/deliveryAgents"));
app.use("/api/delivery-orders", require("./routes/deliveryOrders"));
app.use("/api/admin/products", adminProducts);
app.use("/api/admin/orders", require("./routes/adminOrders"));
app.use("/api/admin/users", require("./routes/userManagement"));
app.use("/api/addresses", require("./routes/addresses"));
app.use("/api/recommend", require("./routes/recommendations"));
app.use("/api/delivery-check", require("./routes/deliveryCheck"));
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
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/foodily-auth-app")
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
  })
  .catch((err) => console.error("❌ Mongo error:", err));
