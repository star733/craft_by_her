const express = require("express");
const router = express.Router();
const verify = require("../middleware/verifyFirebaseToken");
const User = require("../models/User");

// ✅ Whitelist for admin users
const ADMIN_EMAILS = ["admin1@gmail.com"];

router.post("/sync", verify, async (req, res) => {
  try {
    const { uid, email, name, picture, firebase } = req.user;
    const provider = firebase?.sign_in_provider;

    // ✅ Decide role
    const role = ADMIN_EMAILS.includes((email || "").toLowerCase())
      ? "admin"
      : "user";

    const update = {
      uid,
      email: email || req.body.email || null,
      name: name || req.body.displayName || req.body.name || null,
      phone: req.body.phone || null,
      photoURL: picture || req.body.photoURL || null,
      provider: provider || req.body.provider || "password",
      role,
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

// ✅ Get current user
router.get("/me", verify, async (req, res) => {
  try {
    const me = await User.findOne({ uid: req.user.uid }).lean();
    if (!me) {
      // user not found in DB yet
      return res.status(404).json({ ok: false, message: "User not found. Please sync first." });
    }
    res.json({ ok: true, user: me });
  } catch (e) {
    console.error("[ME ERROR]", e);
    res.status(500).json({ ok: false, message: "Failed to load profile" });
  }
});

module.exports = router;
