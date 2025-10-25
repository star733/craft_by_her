const express = require("express");
const router = express.Router();
const verify = require("../middleware/verifyFirebaseToken");
const User = require("../models/User");

// Get all saved addresses for current user
router.get("/", verify, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid }).lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ addresses: user.addresses || [] });
  } catch (err) {
    console.error("Error fetching addresses:", err);
    res.status(500).json({ error: err.message });
  }
});

// Add a new address
router.post("/", verify, async (req, res) => {
  try {
    const { label = "Home", name, phone, address, isDefault = false } = req.body || {};
    if (!address || !address.street || !address.city || !address.state || !address.pincode) {
      return res.status(400).json({ error: "Complete address is required" });
    }

    const user = await User.findOne({ uid: req.user.uid });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Normalize invalid role values to pass schema enum validation
    if (!['user', 'admin'].includes(user.role)) {
      user.role = 'user';
    }

    const newAddress = {
      label,
      name: name || user.name,
      phone: phone || user.phone || "",
      address,
      isDefault: Boolean(isDefault),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // If making default, unset existing defaults
    if (newAddress.isDefault && Array.isArray(user.addresses)) {
      user.addresses = user.addresses.map((a) => ({ ...a.toObject?.() || a, isDefault: false }));
    }

    user.addresses = [...(user.addresses || []), newAddress];
    await user.save();

    res.status(201).json({ message: "Address saved", addresses: user.addresses });
  } catch (err) {
    console.error("Error adding address:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update an address
router.put("/:addressId", verify, async (req, res) => {
  try {
    const { addressId } = req.params;
    const { label, name, phone, address, isDefault } = req.body || {};

    const user = await User.findOne({ uid: req.user.uid });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Normalize invalid role values to pass schema enum validation
    if (!['user', 'admin'].includes(user.role)) {
      user.role = 'user';
    }

    const addr = user.addresses.id(addressId);
    if (!addr) return res.status(404).json({ error: "Address not found" });

    if (label) addr.label = label;
    if (name !== undefined) addr.name = name;
    if (phone !== undefined) addr.phone = phone;
    if (address) addr.address = { ...addr.address, ...address };

    if (typeof isDefault === "boolean") {
      if (isDefault) {
        user.addresses.forEach((a) => (a.isDefault = false));
        addr.isDefault = true;
      } else {
        addr.isDefault = false;
      }
    }

    addr.updatedAt = new Date();
    await user.save();

    res.json({ message: "Address updated", addresses: user.addresses });
  } catch (err) {
    console.error("Error updating address:", err);
    res.status(500).json({ error: err.message });
  }
});

// Set default address
router.patch("/:addressId/default", verify, async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findOne({ uid: req.user.uid });
    if (!user) return res.status(404).json({ error: "User not found" });

    const addr = user.addresses.id(addressId);
    if (!addr) return res.status(404).json({ error: "Address not found" });

    user.addresses.forEach((a) => (a.isDefault = false));
    addr.isDefault = true;
    addr.updatedAt = new Date();
    await user.save();

    res.json({ message: "Default address set", addresses: user.addresses });
  } catch (err) {
    console.error("Error setting default:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete an address
router.delete("/:addressId", verify, async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findOne({ uid: req.user.uid });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Normalize invalid role values to pass schema enum validation
    if (!['user', 'admin'].includes(user.role)) {
      user.role = 'user';
    }

    const addr = user.addresses.id(addressId);
    if (!addr) return res.status(404).json({ error: "Address not found" });

    addr.deleteOne();
    await user.save();

    res.json({ message: "Address removed", addresses: user.addresses });
  } catch (err) {
    console.error("Error removing address:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;