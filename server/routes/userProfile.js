const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const verify = require("../middleware/verifyFirebaseToken");

/**
 * User profiles and social features
 * Placeholder for future profile features
 */

// ✅ Get user profile
router.get("/:userId", verify, async (req, res) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findOne({ uid: req.params.userId })
      .select('uid email name photoURL role totalOrders totalSpent createdAt')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    res.json({
      success: true,
      profile: user
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user profile"
    });
  }
});

// ✅ Update user profile
router.put("/:userId", verify, async (req, res) => {
  try {
    // Only allow users to update their own profile
    if (req.params.userId !== req.user.uid) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized to update this profile"
      });
    }

    const User = mongoose.model('User');
    const { name, photoURL } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (photoURL) updateData.photoURL = photoURL;

    const user = await User.findOneAndUpdate(
      { uid: req.params.userId },
      { $set: updateData },
      { new: true }
    ).select('uid email name photoURL role');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      profile: user
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update user profile"
    });
  }
});

module.exports = router;








