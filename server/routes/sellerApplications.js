const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const verify = require("../middleware/verifyFirebaseToken");
const verifyAdmin = require("../middleware/verifyAdmin");
const User = require("../models/User");
const SellerApplication = require("../models/SellerApplication");

// Ensure uploads directory exists
const uploadsBaseDir = path.join(__dirname, "../../uploads");
const sellerDocumentsDir = path.join(__dirname, "../../uploads/seller_documents");

if (!fs.existsSync(uploadsBaseDir)) {
  fs.mkdirSync(uploadsBaseDir, { recursive: true });
  console.log("Created uploads directory");
}

if (!fs.existsSync(sellerDocumentsDir)) {
  fs.mkdirSync(sellerDocumentsDir, { recursive: true });
  console.log("Created seller_documents directory");
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure directory exists
    if (!fs.existsSync(sellerDocumentsDir)) {
      fs.mkdirSync(sellerDocumentsDir, { recursive: true });
    }
    cb(null, sellerDocumentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image and pdf files
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only image and PDF files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// ✅ Register seller (new registration endpoint)
router.post("/register", verify, (req, res, next) => {
  // No files required for simple registration
  upload.fields([])(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({ 
        success: false, 
        error: "File upload error: " + err.message 
      });
    }
    next();
  });
}, async (req, res) => {
  console.log("=== SELLER REGISTRATION STARTED ===");
  console.log("User UID:", req.user?.uid);
  console.log("Request body:", req.body);
  
  try {
    const {
      email,
      phone
    } = req.body;

    // Validate required fields
    if (!email || !phone) {
      console.error("Missing required fields");
      return res.status(400).json({ 
        success: false, 
        error: "Please provide email and phone number" 
      });
    }

    // Check if user already has an application
    const existingApplication = await SellerApplication.findOne({ userId: req.user.uid });
    if (existingApplication) {
      console.log("User already has an application:", existingApplication._id);
      return res.status(400).json({ 
        success: false, 
        error: "You have already submitted an application" 
      });
    }

    // ✅ Check for duplicate email (extra safety)
    const duplicateEmail = await SellerApplication.findOne({ 
      email: email.toLowerCase().trim() 
    });
    if (duplicateEmail) {
      console.log("⚠️ Duplicate email detected:", email);
      return res.status(400).json({ 
        success: false, 
        error: "This email is already registered with another seller application." 
      });
    }

    console.log("Creating new seller application...");
    
    // Create new seller application
    const application = new SellerApplication({
      userId: req.user.uid,
      email: email.toLowerCase().trim(),
      businessName: '',
      licenseNumber: '',
      phone: phone.trim(),
      businessType: 'homemade',
      address: {
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
      },
      documents: [],
      status: 'submitted'
    });

    console.log("Saving application to database...");
    await application.save();
    console.log("Application saved successfully:", application._id);

    // Notify admin about new seller application
    try {
      const { sendAdminNewSellerNotification } = require("../utils/sellerEmailService");
      await sendAdminNewSellerNotification({
        businessName: 'New Seller',
        email: application.email,
        licenseNumber: 'Not Required',
        phone: application.phone,
        applicationId: application._id
      });
      console.log("Admin notification email sent for new seller application");
    } catch (emailError) {
      console.error("Failed to send admin notification email:", emailError);
    }

    console.log("=== SELLER REGISTRATION COMPLETED - AWAITING ADMIN APPROVAL ===");
    res.json({ 
      success: true, 
      message: "Seller registration successful. Your application is pending admin approval. You'll receive an email after admin reviews your application.",
      applicationId: application._id
    });
  } catch (err) {
    console.error("=== Error registering seller ===");
    console.error("Error type:", err.constructor.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    
    // Handle multer errors specifically
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err.code, err.message);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false, 
          error: "File size too large. Maximum file size is 5MB." 
        });
      }
      return res.status(400).json({ 
        success: false, 
        error: "File upload error: " + err.message 
      });
    }
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      console.error("Validation error:", err.errors);
      return res.status(400).json({ 
        success: false, 
        error: "Validation error: " + Object.values(err.errors).map(e => e.message).join(", ")
      });
    }
    
    // Generic error
    res.status(500).json({ 
      success: false, 
      error: err.message || "Failed to register seller. Please try again or contact support." 
    });
  }
});

// ✅ Submit seller application (existing endpoint for additional documents)
router.post("/apply", verify, upload.fields([
  { name: 'idDocument', maxCount: 1 },
  { name: 'businessLicense', maxCount: 1 },
  { name: 'bankProof', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      businessName,
      businessType,
      businessRegistrationNumber,
      gstin,
      address,
      phone
    } = req.body;

    // Validate required fields
    if (!businessName || !businessType || !address || !phone) {
      return res.status(400).json({ 
        success: false, 
        error: "Business name, type, address, and phone are required" 
      });
    }

    // Parse address JSON if it's a string
    let parsedAddress = address;
    if (typeof address === 'string') {
      try {
        parsedAddress = JSON.parse(address);
      } catch (e) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid address format" 
        });
      }
    }

    // Check if user already has an application
    const existingApplication = await SellerApplication.findOne({ userId: req.user.uid });
    if (existingApplication) {
      // Update existing application instead of creating new one
      const { geocodeAddress } = require('../utils/locationUtils');
      const geocodedLocation = geocodeAddress(parsedAddress);
      
      existingApplication.businessName = businessName;
      existingApplication.businessType = businessType;
      existingApplication.businessRegistrationNumber = businessRegistrationNumber || '';
      existingApplication.gstin = gstin || '';
      existingApplication.address = parsedAddress;
      existingApplication.location = {
        coordinates: {
          latitude: geocodedLocation.coordinates.latitude,
          longitude: geocodedLocation.coordinates.longitude
        },
        district: geocodedLocation.district
      };
      existingApplication.phone = phone;
      
      // Add new documents if provided
      if (documents.length > 0) {
        existingApplication.documents.push(...documents);
      }
      
      await existingApplication.save();
      
      // If seller is already approved, also update User location
      if (existingApplication.status === 'approved') {
        const User = mongoose.model('User');
        const user = await User.findOne({ uid: req.user.uid });
        if (user) {
          user.sellerLocation = {
            address: parsedAddress,
            coordinates: geocodedLocation.coordinates,
            district: geocodedLocation.district
          };
          await user.save();
        }
      }
      
      return res.json({ 
        success: true, 
        message: "Seller application updated successfully.",
        applicationId: existingApplication._id
      });
    }

    // Process uploaded files
    const documents = [];
    
    if (req.files?.idProof?.[0]) {
      documents.push({
        type: 'id_proof',
        fileName: req.files.idProof[0].originalname,
        filePath: `/uploads/seller_documents/${req.files.idProof[0].filename}`
      });
    }
    
    if (req.files?.businessLicense?.[0]) {
      documents.push({
        type: 'business_license',
        fileName: req.files.businessLicense[0].originalname,
        filePath: `/uploads/seller_documents/${req.files.businessLicense[0].filename}`
      });
    }
    
    if (req.files?.bankProof?.[0]) {
      documents.push({
        type: 'bank_proof',
        fileName: req.files.bankProof[0].originalname,
        filePath: `/uploads/seller_documents/${req.files.bankProof[0].filename}`
      });
    }

    // Geocode address to get coordinates and district
    const { geocodeAddress } = require('../utils/locationUtils');
    const geocodedLocation = geocodeAddress(parsedAddress);
    
    console.log("=== GEOCODING SELLER ADDRESS ===");
    console.log("Address:", parsedAddress);
    console.log("Geocoded location:", geocodedLocation);

    // Create new seller application
    const application = new SellerApplication({
      userId: req.user.uid,
      email: req.user.email,
      businessName,
      businessType,
      businessRegistrationNumber: businessRegistrationNumber || '',
      gstin: gstin || '',
      address: parsedAddress,
      location: {
        coordinates: {
          latitude: geocodedLocation.coordinates.latitude,
          longitude: geocodedLocation.coordinates.longitude
        },
        district: geocodedLocation.district
      },
      phone,
      documents
    });

    await application.save();

    res.json({ 
      success: true, 
      message: "Seller application submitted successfully. Our admin team will review your application and notify you of the status.",
      applicationId: application._id
    });
  } catch (err) {
    console.error("Error submitting seller application:", err);
    
    // Handle multer errors specifically
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false, 
          error: "File size too large. Maximum file size is 5MB." 
        });
      }
      return res.status(400).json({ 
        success: false, 
        error: "File upload error: " + err.message 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: "Failed to submit seller application" 
    });
  }
});

// ✅ Get seller application status (for sellers)
router.get("/my-application", verify, async (req, res) => {
  try {
    // Find application by Firebase UID (userId is now a string)
    const application = await SellerApplication.findOne({ userId: req.user.uid });
    
    if (!application) {
      return res.status(404).json({ 
        success: false, 
        error: "No application found" 
      });
    }

    res.json({ 
      success: true, 
      application: {
        id: application._id,
        businessName: application.businessName,
        email: application.email,
        licenseNumber: application.licenseNumber,
        phone: application.phone,
        status: application.status,
        displayStatus: application.displayStatus || application.status,
        submittedAt: application.submittedAt || application.createdAt,
        reviewedAt: application.reviewedAt,
        approvedAt: application.approvedAt,
        rejectionReason: application.rejectionReason,
        adminNotes: application.adminNotes
      }
    });
  } catch (err) {
    console.error("Error fetching seller application:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch application status" 
    });
  }
});

// ✅ Get all seller applications (admin only)
router.get("/", verify, verifyAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status ? { status } : {};
    
    console.log("Fetching seller applications with query:", query);
    
    // Find applications - userId is now a string (Firebase UID), not ObjectId
    const applications = await SellerApplication.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean(); // Use lean() for better performance
      
    console.log(`Found ${applications.length} applications`);
      
    // Try to get user info for each application if needed
    const applicationsWithUserInfo = await Promise.all(
      applications.map(async (app) => {
        // Try to find user by Firebase UID
        const user = await User.findOne({ uid: app.userId }).lean();
        return {
          ...app,
          userInfo: user ? {
            name: user.name,
            email: user.email,
            phone: user.phone
          } : null
        };
      })
    );
      
    const total = await SellerApplication.countDocuments(query);
    
    res.json({ 
      success: true, 
      applications: applicationsWithUserInfo,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (err) {
    console.error("Error fetching seller applications:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch seller applications" 
    });
  }
});

// ✅ Get specific seller application (admin only)
router.get("/:id", verify, verifyAdmin, async (req, res) => {
  try {
    const application = await SellerApplication.findById(req.params.id).lean();
      
    if (!application) {
      return res.status(404).json({ 
        success: false, 
        error: "Application not found" 
      });
    }

    // Try to get user info if available
    const user = await User.findOne({ uid: application.userId }).lean();
    const applicationWithUserInfo = {
      ...application,
      userInfo: user ? {
        name: user.name,
        email: user.email,
        phone: user.phone
      } : null
    };

    res.json({ 
      success: true, 
      application: applicationWithUserInfo
    });
  } catch (err) {
    console.error("Error fetching seller application:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch application" 
    });
  }
});

// ✅ Update seller application status (admin only)
router.put("/:id/status", verify, verifyAdmin, async (req, res) => {
  try {
    const { status, rejectionReason, adminNotes } = req.body;
    
    // Validate status
    const validStatuses = ['submitted', 'under_review', 'approved', 'rejected', 'more_info_required'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid status" 
      });
    }

    const application = await SellerApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ 
        success: false, 
        error: "Application not found" 
      });
    }

    // Update status - lastUpdatedBy is now stored as Firebase UID string
    application.status = status;
    application.reviewedAt = new Date();
    if (req.user.uid) {
      // Store admin's Firebase UID as string
      application.lastUpdatedBy = req.user.uid;
    }
    if (adminNotes) {
      application.adminNotes = adminNotes;
    }
    if (status === 'approved') {
      application.approvedAt = new Date();
    }
    await application.save();
    
    console.log("=== APPLICATION STATUS UPDATE ===");
    console.log("Status change request:", { status, applicationId: application._id });
    
    // If approved, update user role and send notification
    if (status === 'approved') {
      console.log("=== APPROVING SELLER APPLICATION - EMAIL WILL BE SENT TO SELLER ===");
      console.log("Application details:", {
        applicationId: application._id,
        userId: application.userId,
        email: application.email,
        businessName: application.businessName
      });
      
      // Update user role using userId (which is the Firebase UID string)
      const user = await User.findOne({ uid: application.userId });
      
      // ALWAYS use the email from the application (the email seller registered with)
      const sellerEmail = application.email;
      const sellerName = application.businessName || (user ? user.name : 'Seller');
      
      if (user) {
        // Update user role and seller location from application
        const updateData = { role: "seller" };
        
        // Copy location data from application to user
        if (application.location && application.location.coordinates) {
          updateData.sellerLocation = {
            address: application.address,
            coordinates: application.location.coordinates,
            district: application.location.district
          };
          console.log("Copying seller location to User model:", updateData.sellerLocation);
        }
        
        await User.findByIdAndUpdate(user._id, updateData);
        console.log("User found and role updated to seller. Email:", sellerEmail);
      } else {
        console.log("User not found in database, will use application email:", sellerEmail);
      }
      
      console.log("📧 Will send approval email to seller's registered email:", sellerEmail);
      
      // Send approval notification email to seller
      console.log("=== ATTEMPTING TO SEND APPROVAL EMAIL ===");
      console.log("Recipient:", sellerEmail);
      console.log("Seller Name:", sellerName);
      
      let emailSent = false;
      let emailError = null;
      let emailMessageId = null;
      
      // CRITICAL: Always attempt to send email when approving
      console.log("🚀 STARTING EMAIL SEND PROCESS...");
      try {
        const { sendSellerApprovalNotification } = require("../utils/sellerEmailService");
        console.log("📧 Email service function loaded, calling now...");
        
        const emailResult = await sendSellerApprovalNotification(sellerEmail, sellerName);
        
        console.log("📬 Email result received:", {
          success: emailResult?.success,
          hasMessageId: !!emailResult?.messageId,
          error: emailResult?.error
        });
        
        if (emailResult && emailResult.success) {
          console.log("✅✅✅ SELLER APPROVAL EMAIL SENT SUCCESSFULLY! ✅✅✅");
          console.log("Email Message ID:", emailResult.messageId);
          console.log("Email Response:", emailResult.response);
          emailSent = true;
          emailMessageId = emailResult.messageId;
        } else {
          console.error("❌ EMAIL SENDING FAILED - Result indicates failure");
          console.error("Error from email service:", emailResult?.error || "Unknown error");
          emailError = emailResult?.error || "Email service returned failure";
        }
      } catch (emailException) {
        console.error("❌❌❌ EXCEPTION WHILE SENDING SELLER APPROVAL EMAIL ❌❌❌");
        console.error("Exception Type:", emailException.constructor.name);
        console.error("Error message:", emailException.message);
        console.error("Error stack:", emailException.stack);
        emailError = emailException.message || "Unknown exception";
      }
      
      console.log("📊 EMAIL SEND SUMMARY:");
      console.log("  - Email Sent:", emailSent);
      console.log("  - Message ID:", emailMessageId);
      console.log("  - Error:", emailError);
      
      console.log("=== APPROVAL PROCESS COMPLETED ===");
      
      // Return response with email status
      return res.json({ 
        success: true, 
        message: emailSent 
          ? "Application approved successfully and email sent to seller" 
          : `Application approved successfully but email failed: ${emailError || "Unknown error"}`,
        application,
        emailSent,
        emailError: emailError || null
      });
    }
    
    // If rejected, send notification to seller
    if (status === 'rejected' && rejectionReason) {
      application.rejectionReason = rejectionReason;
      await application.save();
      
      // TODO: Send rejection notification email to seller
    }

    res.json({ 
      success: true, 
      message: "Application status updated successfully",
      application
    });
  } catch (err) {
    console.error("Error updating seller application status:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update application status" 
    });
  }
});

module.exports = router;