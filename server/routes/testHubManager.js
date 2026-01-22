const express = require("express");
const router = express.Router();

// Simple test route
router.get("/test", (req, res) => {
  console.log("=== TEST HUB MANAGER ROUTE CALLED ===");
  res.json({ message: "Test hub manager route is working!", timestamp: new Date() });
});

// Simple login test route
router.post("/login", (req, res) => {
  console.log("=== TEST HUB MANAGER LOGIN ROUTE CALLED ===");
  console.log("Request body:", req.body);
  
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: "Email and password are required (from test route)"
    });
  }
  
  res.json({
    success: true,
    message: "Test login route working",
    received: { email, password }
  });
});

module.exports = router;