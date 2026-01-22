const express = require("express");
const router = express.Router();
const verify = require("../middleware/verifyFirebaseToken");
const verifyAdmin = require("../middleware/verifyAdmin");
const User = require("../models/User");
const SellerApplication = require("../models/SellerApplication");
const { sendSellerApprovalNotification } = require("../utils/sellerEmailService");

// ✅ Get all seller emails (admin only) - Updated to fetch from database
router.get("/emails", verify, verifyAdmin, async (req, res) => {
  try {
    // Get all approved sellers from seller applications
    const approvedApplications = await SellerApplication.find({ status: 'approved' });
    const approvedSellerEmails = approvedApplications.map(app => app.email);
    
    res.json({ success: true, emails: approvedSellerEmails });
  } catch (err) {
    console.error("Error fetching seller emails:", err);
    res.status(500).json({ success: false, error: "Failed to fetch seller emails" });
  }
});

// ✅ Add a new seller email (admin only) - Updated to work with database approach
router.post("/emails", verify, verifyAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: "Valid email is required" });
    }
    
    // Check if there's already an approved application for this email
    const existingApplication = await SellerApplication.findOne({ 
      email: email.toLowerCase(), 
      status: 'approved' 
    });
    
    if (existingApplication) {
      return res.status(400).json({ success: false, error: "Email already exists in approved seller list" });
    }
    
    // Create or update seller application with approved status
    const application = await SellerApplication.findOneAndUpdate(
      { email: email.toLowerCase() },
      { 
        status: 'approved',
        approvedAt: new Date()
      },
      { upsert: true, new: true }
    );
    
    // Update existing user role if they exist
    const user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      await User.findByIdAndUpdate(user._id, { role: "seller" });
      
      // Send approval notification email to seller
      try {
        await sendSellerApprovalNotification(user.email, user.name);
      } catch (emailError) {
        console.error("Failed to send seller approval email:", emailError);
      }
    }
    
    // Get updated list of approved sellers
    const approvedApplications = await SellerApplication.find({ status: 'approved' });
    const approvedSellerEmails = approvedApplications.map(app => app.email);
    
    res.json({ success: true, message: "Seller email added and approved successfully", emails: approvedSellerEmails });
  } catch (err) {
    console.error("Error adding seller email:", err);
    res.status(500).json({ success: false, error: "Failed to add seller email" });
  }
});

// ✅ Remove a seller email (admin only) - Updated to work with database approach
router.delete("/emails/:email", verify, verifyAdmin, async (req, res) => {
  try {
    const { email } = req.params;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: "Valid email is required" });
    }
    
    // Find and update the seller application status to rejected
    const application = await SellerApplication.findOneAndUpdate(
      { email: email.toLowerCase() },
      { 
        status: 'rejected',
        rejectionReason: 'Removed by admin'
      },
      { new: true }
    );
    
    if (!application) {
      return res.status(404).json({ success: false, error: "Seller application not found" });
    }
    
    // Update existing user role to user if they exist
    const user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      await User.findByIdAndUpdate(user._id, { role: "user" });
    }
    
    // Get updated list of approved sellers
    const approvedApplications = await SellerApplication.find({ status: 'approved' });
    const approvedSellerEmails = approvedApplications.map(app => app.email);
    
    res.json({ success: true, message: "Seller email removed successfully", emails: approvedSellerEmails });
  } catch (err) {
    console.error("Error removing seller email:", err);
    res.status(500).json({ success: false, error: "Failed to remove seller email" });
  }
});

// ✅ Export the seller emails array for use in auth.js
router.getSellerEmails = async () => {
  try {
    const approvedApplications = await SellerApplication.find({ status: 'approved' });
    return approvedApplications.map(app => app.email);
  } catch (err) {
    console.error("Error fetching seller emails:", err);
    return [];
  }
};

// ✅ Export pending approvals for use in auth.js
router.getPendingApprovals = () => {
  // Return empty object since we're now using database
  return {};
};

// ✅ Remove pending approval
router.removePendingApproval = (email) => {
  // No-op since we're now using database
};

module.exports = router;