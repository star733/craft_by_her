const mongoose = require("mongoose");

const sellerDocumentSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['id_proof', 'business_license', 'bank_proof', 'business_proof', 'kyc_document', 'photo_verification'],
  },
  fileName: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'verified', 'rejected'],
  },
  rejectionReason: {
    type: String,
    default: '',
  }
});

const sellerApplicationSchema = new mongoose.Schema({
  userId: {
    type: String, // Firebase UID (string, not ObjectId)
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  businessName: {
    type: String,
    required: false, // Optional for housewives
    trim: true,
    default: ''
  },
  businessType: {
    type: String,
    required: false, // Optional for housewives
    enum: ['individual', 'partnership', 'private_limited', 'llp', 'homemade', 'other'],
    default: 'homemade'
  },
  licenseNumber: {
    type: String,
    required: false, // Optional for housewives selling homemade products
    trim: true,
    default: ''
  },
  businessRegistrationNumber: {
    type: String,
    trim: true,
  },
  gstin: {
    type: String,
    trim: true,
  },
  address: {
    street: { type: String, required: false, trim: true, default: '' },
    city: { type: String, required: false, trim: true, default: '' },
    state: { type: String, required: false, trim: true, default: '' },
    pincode: { type: String, required: false, trim: true, default: '' },
    country: { type: String, default: 'India', trim: true },
  },
  // Location information (coordinates and district)
  location: {
    coordinates: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null }
    },
    district: { type: String, trim: true, default: null }
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  documents: [sellerDocumentSchema],
  status: {
    type: String,
    default: 'submitted',
    enum: ['submitted', 'under_review', 'approved', 'rejected', 'more_info_required'],
  },
  rejectionReason: {
    type: String,
    default: '',
  },
  adminNotes: {
    type: String,
    default: '',
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  reviewedAt: {
    type: Date,
  },
  approvedAt: {
    type: Date,
  },
  lastUpdatedBy: {
    type: String, // Firebase UID of admin who updated
  },
}, {
  timestamps: true,
});

// Indexes for better performance and uniqueness
sellerApplicationSchema.index({ email: 1 });
sellerApplicationSchema.index({ status: 1 });
sellerApplicationSchema.index({ businessName: 1 });

// Virtual for application status
sellerApplicationSchema.virtual('displayStatus').get(function() {
  const statusMap = {
    'submitted': 'Submitted',
    'under_review': 'Under Review',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'more_info_required': 'More Information Required',
  };
  return statusMap[this.status] || this.status;
});

// Method to update status
sellerApplicationSchema.methods.updateStatus = async function(newStatus, adminId = null, notes = '') {
  this.status = newStatus;
  this.reviewedAt = new Date();
  if (adminId) {
    this.lastUpdatedBy = adminId;
  }
  if (notes) {
    this.adminNotes = notes;
  }
  if (newStatus === 'approved') {
    this.approvedAt = new Date();
  }
  return await this.save();
};

// Static method to get applications by status
sellerApplicationSchema.statics.getByStatus = async function(status) {
  return await this.find({ status }).sort({ createdAt: -1 });
};

// Static method to get pending applications
sellerApplicationSchema.statics.getPendingApplications = async function() {
  return await this.find({ 
    status: { $in: ['submitted', 'under_review', 'more_info_required'] } 
  }).sort({ createdAt: -1 });
};

module.exports = mongoose.model("SellerApplication", sellerApplicationSchema);