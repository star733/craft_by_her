const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000", "http://localhost:5175"], // Vite / CRA
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Health check ---
app.get("/", (_, res) => res.send("CraftedByHer API is running 🎉"));

// --- Routes ---
const sellerManagement = require("./routes/sellerManagement");
const adminProducts = require("./routes/adminProducts");

app.use("/api/auth", require("./routes/auth"));
app.use("/api/seller/auth", require("./routes/sellerAuth"));
app.use("/api/seller/products", require("./routes/sellerProducts"));
app.use("/api/seller/orders", require("./routes/sellerOrders"));
app.use("/api/seller/management", sellerManagement);
app.use("/api/seller/applications", require("./routes/sellerApplications"));
app.use("/api/items", require("./routes/products")); // Changed from /api/products to /api/items
app.use("/api/cart", require("./routes/cart"));
app.use("/api/wishlist", require("./routes/wishlist"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/payment", require("./routes/payment"));
app.use("/api/delivery", require("./routes/deliveryAgents"));
app.use("/api/delivery-agents", require("./routes/deliveryAgents"));
app.use("/api/delivery-orders", require("./routes/deliveryOrders"));
app.use("/api/admin/products", adminProducts);
app.use("/api/admin/orders", require("./routes/adminOrders"));
app.use("/api/admin/users", require("./routes/userManagement"));
// Hub manager routes (login + management)
app.use("/api/hub-managers", require("./routes/hubManagers"));
// Optional: legacy auth-only routes
app.use("/api/hub-manager-auth", require("./routes/hubManagerAuth"));
// Hub manager dashboard notifications + orders by district
app.use("/api/hub-notifications", require("./routes/hubNotifications"));
// Delivery OTP routes (generate and verify OTP for order delivery)
app.use("/api/delivery-otp", require("./routes/deliveryOTP"));
app.use("/api/addresses", require("./routes/addresses"));
app.use("/api/recommend", require("./routes/recommendations"));
app.use("/api/tracking", require("./routes/tracking")); // User behavior tracking
app.use("/api/sales-prediction", require("./routes/salesPredictionSimple")); // JavaScript ML (No Python needed!)
app.use("/api/hubs", require("./routes/hubs")); // Public hub + pincode APIs
app.use("/api/delivery-check", require("./routes/deliveryCheck"));
app.use("/api/content", require("./routes/content")); // Content platform (videos, posts)
app.use("/api/profile", require("./routes/userProfile")); // User profiles and social features
// Removed adminCategories route to fix the ObjectId error

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
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      
      // Check email configuration
      const emailConfigured = process.env.EMAIL_USER && 
                             process.env.EMAIL_PASS && 
                             process.env.EMAIL_USER !== 'your-email@gmail.com' &&
                             process.env.EMAIL_PASS !== 'your-app-password-here';
      
      if (emailConfigured) {
        console.log('📧 Email service: CONFIGURED ✅');
      } else {
        console.log('⚠️  Email service: NOT CONFIGURED');
        console.log('📝 Seller approval emails will NOT work until configured');
        console.log('📖 See QUICK_EMAIL_FIX.md or EMAIL_SETUP_COMPLETE_GUIDE.md');
      }
    });
  })
  .catch((err) => console.error("❌ Mongo error:", err));