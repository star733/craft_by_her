// middleware/verifyAdmin.js
const User = require("../models/User");

module.exports = async function verifyAdmin(req, res, next) {
  try {
    const me = await User.findOne({ uid: req.user.uid }).lean();
    console.log("[verifyAdmin]", req.user.uid, "=>", me?.role);

    if (!me || me.role !== "admin") {
      return res.status(403).json({ ok: false, message: "Admins only" });
    }

    next();
  } catch (err) {
    console.error("verifyAdmin error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
};
