const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const HubManager = require("../models/HubManager");

const JWT_SECRET = process.env.JWT_SECRET || "hub_manager_jwt_secret_key_2024";

// Hub Manager Login Route
router.post("/login", async (req, res) => {
  try {
    console.log("🔐 Hub Manager Login Attempt");
    console.log("Request body:", req.body);
    
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      console.log("❌ Missing email or password");
      return res.status(400).json({
        success: false,
        error: "Email and password are required"
      });
    }
    
    console.log("🔍 Looking for manager with email:", email);
    
    // Find manager by email
    const manager = await HubManager.findOne({ 
      email: email.toLowerCase().trim()
    });
    
    if (!manager) {
      console.log("❌ Manager not found");
      return res.status(401).json({
        success: false,
        error: "Invalid email or password"
      });
    }
    
    console.log("✅ Manager found:", {
      managerId: manager.managerId,
      email: manager.email,
      status: manager.status
    });
    
    // Check if manager is active
    if (manager.status !== 'active') {
      console.log("❌ Manager not active, status:", manager.status);
      return res.status(401).json({
        success: false,
        error: `Account is ${manager.status}. Please contact admin.`
      });
    }
    
    // Verify password
    console.log("🔐 Verifying password...");
    const isPasswordValid = await manager.comparePassword(password);
    console.log("Password valid:", isPasswordValid);
    
    if (!isPasswordValid) {
      console.log("❌ Invalid password");
      return res.status(401).json({
        success: false,
        error: "Invalid email or password"
      });
    }
    
    // Update last login
    manager.lastLogin = new Date();
    await manager.save();
    
    // Generate JWT token
    console.log("🔑 Generating JWT token with secret:", JWT_SECRET);
    const token = jwt.sign(
      {
        managerId: manager.managerId,
        email: manager.email,
        role: "hubmanager",
        name: manager.name,
        hubId: manager.hubId
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    console.log("🔑 Generated token:", token.substring(0, 50) + "...");
    
    // Prepare response (without password)
    const managerResponse = {
      managerId: manager.managerId,
      name: manager.name,
      email: manager.email,
      phone: manager.phone,
      hubId: manager.hubId,
      hubName: manager.hubName,
      district: manager.district,
      status: manager.status,
      lastLogin: manager.lastLogin
    };
    
    console.log("✅ Login successful for:", manager.email);
    
    res.json({
      success: true,
      message: "Login successful",
      token,
      manager: managerResponse,
      expiresIn: "7 days"
    });
    
  } catch (error) {
    console.error("❌ Hub manager login error:", error);
    res.status(500).json({
      success: false,
      error: "Login failed. Please try again."
    });
  }
});

// Test route
router.get("/test", (req, res) => {
  console.log("✅ Hub Manager Auth Test Route Called");
  res.json({ 
    message: "Hub Manager Auth routes are working!", 
    timestamp: new Date(),
    route: "/api/hub-manager-auth/test"
  });
});

module.exports = router;