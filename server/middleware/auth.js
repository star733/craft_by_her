const admin = require("../firebaseAdmin");

// Authentication middleware for content and profile routes
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    
    try {
      // Verify Firebase token
      const decoded = await admin.auth().verifyIdToken(token);
      
      // Attach user info to request (use uid as id for compatibility)
      req.user = {
        id: decoded.uid,  // Main ID field
        uid: decoded.uid, // Firebase UID
        email: decoded.email,
        name: decoded.name
      };
      
      next();
    } catch (verifyError) {
      console.error("Token verification error:", verifyError.message);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    res.status(401).json({ message: "Authentication failed" });
  }
};

module.exports = auth;
