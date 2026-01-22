const express = require("express");
const router = express.Router();
const verify = require("../middleware/verifyFirebaseToken");
const User = require("../models/User");
const SellerApplication = require("../models/SellerApplication");

// Helper function to clean display name (remove codes like "MCA2024-2026")
const cleanDisplayName = (rawName) => {
  if (!rawName) return null;
  
  // Split by space and filter out words containing numbers or all caps codes
  const words = rawName.split(/\s+/);
  const nameWords = words.filter(word => {
    // Remove words with numbers
    if (/\d/.test(word)) return false;
    
    // Remove all-caps words with 3+ characters (like "MCA", "MBA", etc.)
    if (word.length >= 3 && word === word.toUpperCase()) return false;
    
    // Keep the word
    return true;
  });
  
  // If we filtered everything, just take first 2 words
  if (nameWords.length === 0) {
    return rawName.split(/\s+/).slice(0, 2).join(' ');
  }
  
  // Get first 2-3 name words and format to Title Case
  const finalWords = nameWords.slice(0, Math.min(3, nameWords.length));
  return finalWords
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// ✅ Sync seller user data
router.post("/sync", verify, async (req, res) => {
  try {
    const { uid, email, name, picture, firebase } = req.user;
    const provider = firebase?.sign_in_provider;

    // ✅ Check if user is a seller
    const userDoc = await User.findOne({ uid });
    if (!userDoc || userDoc.role !== "seller") {
      return res.status(403).json({ ok: false, message: "Access denied. User is not a seller." });
    }

    // ✅ Check if seller has an approved application
    const application = await SellerApplication.findOne({ userId: uid });
    if (!application || application.status !== 'approved') {
      return res.status(403).json({ 
        ok: false, 
        message: "Access denied. Seller application not approved.",
        applicationStatus: application ? application.status : 'not_submitted'
      });
    }

    // Clean the display name before storing
    const rawName = name || req.body.displayName || req.body.name || null;
    const cleanedName = cleanDisplayName(rawName);

    const update = {
      uid,
      email: email || req.body.email || null,
      name: cleanedName,
      phone: req.body.phone || null,
      photoURL: picture || req.body.photoURL || null,
      provider: provider || req.body.provider || "password",
      role: "seller", // Ensure role is set to seller
      isEmailVerified: firebase?.email_verified || false,
      lastLogin: new Date(),
      updatedAt: new Date(),
    };

    // ✅ Upsert user
    const user = await User.findOneAndUpdate(
      { uid },
      { 
        $set: update, 
        $setOnInsert: { 
          createdAt: new Date(),
          totalOrders: 0,
          totalSpent: 0,
          isActive: true,
          activities: []
        },
        $inc: { loginCount: 1 }
      },
      { upsert: true, new: true }
    );

    // Add login activity (guard against null method or validation issues)
    try {
      if (user && typeof user.addActivity === 'function') {
        await user.addActivity('login', {
          provider: provider || 'password',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }, req.ip, req.get('User-Agent'));
        await user.save();
      }
    } catch (activityErr) {
      console.warn('[SYNC ACTIVITY WARN]', activityErr?.message || activityErr);
    }

    res.json({ ok: true, user });
  } catch (e) {
    console.error("[SYNC ERROR]", e);
    res.status(500).json({ ok: false, message: "Sync failed" });
  }
});

// ✅ Get current seller user
router.get("/me", verify, async (req, res) => {
  try {
    const me = await User.findOne({ uid: req.user.uid, role: "seller" }).lean();
    if (!me) {
      // user not found or not a seller
      return res.status(403).json({ ok: false, message: "Access denied. User is not a seller." });
    }
    
    // ✅ Check if seller has an approved application
    const application = await SellerApplication.findOne({ userId: req.user.uid });
    if (!application || application.status !== 'approved') {
      return res.status(403).json({ 
        ok: false, 
        message: "Access denied. Seller application not approved.",
        applicationStatus: application ? application.status : 'not_submitted'
      });
    }
    
    res.json({ ok: true, user: me });
  } catch (e) {
    console.error("[ME ERROR]", e);
    res.status(500).json({ ok: false, message: "Failed to load profile" });
  }
});

module.exports = router;