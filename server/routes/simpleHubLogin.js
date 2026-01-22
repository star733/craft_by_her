const express = require("express");
const router = express.Router();
const HubManager = require("../models/HubManager");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "hub_manager_jwt_secret_key_2024";

// Test GET route
router.get("/test", (req, res) => {
  console.log("=== SIMPLE HUB TEST ROUTE CALLED ===");
  res.json({ message: "Simple hub route is working!", timestamp: new Date() });
});

// Simple hub manager login
router.post("/login", async (req, res) => {
  try {
    console.log("=== SIMPLE HUB MANAGER LOGIN ===");
    console.log("Request body:", req.body);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log("Missing email or password");
      return res.status(400).json({
        success: false,
        error: "Email and password are required"
      });
    }
    
    // Find manager by email
    const manager = await HubManager.findOne({ 
      email: email.toLowerCase() 
    });
    
    if (!manager) {
      console.log("Manager not found");
      return res.status(401).json({
        success: false,
        error: "Invalid email or password"
      });
    }
    
    console.log("Manager found:", manager.email, "Status:", manager.status);
    
    // Check if manager is active
    if (manager.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: `Account is ${manager.status}. Please contact admin.`
      });
    }
    
    // Verify password
    const isPasswordValid = await manager.comparePassword(password);
    console.log("Password valid:", isPasswordValid);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password"
      });
    }
    
    // Update last login
    manager.lastLogin = new Date();
    await manager.save();
    
    // Generate JWT token
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
    
    // Prepare response (without password)
    const managerResponse = manager.toObject();
    delete managerResponse.password;
    
    console.log("Login successful for:", manager.email);
    
    res.json({
      success: true,
      message: "Login successful",
      token,
      manager: managerResponse,
      expiresIn: "7 days"
    });
    
  } catch (error) {
    console.error("Error during simple hub manager login:", error);
    res.status(500).json({
      success: false,
      error: "Login failed. Please try again."
    });
  }
});

module.exports = router;