// middleware/verifySeller.js
const User = require("../models/User");
const SellerApplication = require("../models/SellerApplication");

module.exports = async function verifySeller(req, res, next) {
  try {
    const me = await User.findOne({ uid: req.user.uid }).lean();
    console.log("[verifySeller]", req.user.uid, "=>", me?.role);

    if (!me || me.role !== "seller") {
      return res.status(403).json({ ok: false, message: "Sellers only" });
    }

    // Ensure the seller's application is approved before allowing access
    const application = await SellerApplication.findOne({ userId: req.user.uid }).lean();
    if (!application || application.status !== "approved") {
      return res.status(403).json({
        ok: false,
        message: "Seller application is not approved yet",
        applicationStatus: application ? application.status : "not_submitted",
      });
    }

    next();
  } catch (err) {
    console.error("verifySeller error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
};