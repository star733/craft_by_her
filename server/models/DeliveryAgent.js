const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const deliveryAgentSchema = new mongoose.Schema(
  {
    agentId: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function(v) {
          return /^[6-9]\d{9}$/.test(v); // Indian mobile number validation
        },
        message: 'Please enter a valid 10-digit mobile number'
      }
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: 'Please enter a valid email address'
      }
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      minlength: 3,
      maxlength: 20,
      validate: {
        validator: function(v) {
          return /^[a-zA-Z0-9_]+$/.test(v); // Only alphanumeric and underscore
        },
        message: 'Username can only contain letters, numbers, and underscores'
      }
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "pending",
    },
    profileImage: {
      type: String,
      default: null,
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    vehicleInfo: {
      type: {
        type: String,
        enum: ["bicycle", "bike", "scooter", "car", "van"],
        default: ""
      },
      number: {
        type: String,
        default: ""
      }
    },
    documents: {
      aadhar: String,
      license: String,
      vehicleRC: String,
    },
    currentLocation: {
      latitude: Number,
      longitude: Number,
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    readyForDelivery: {
      type: Boolean,
      default: false,
    },
    totalDeliveries: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    earnings: {
      total: {
        type: Number,
        default: 0,
      },
      thisMonth: {
        type: Number,
        default: 0,
      },
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: String, // Admin who created this agent
      required: true,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Generate unique agent ID before saving
deliveryAgentSchema.pre('save', async function(next) {
  try {
    if (this.isNew && !this.agentId) {
      const count = await mongoose.model('DeliveryAgent').countDocuments();
      this.agentId = `DA${String(count + 1).padStart(4, '0')}`; // DA0001, DA0002, etc.
      console.log('Generated agentId:', this.agentId);
    }
    next();
  } catch (error) {
    console.error('Error generating agentId:', error);
    next(error);
  }
});

// Hash password before saving
deliveryAgentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
deliveryAgentSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get agent status with color
deliveryAgentSchema.methods.getStatusInfo = function() {
  const statusMap = {
    active: { text: 'Active', color: '#28a745', bgColor: '#d4edda' },
    inactive: { text: 'Inactive', color: '#dc3545', bgColor: '#f8d7da' },
    pending: { text: 'Pending Approval', color: '#ffc107', bgColor: '#fff3cd' }
  };
  return statusMap[this.status] || statusMap.pending;
};

// Virtual for full name display
deliveryAgentSchema.virtual('displayName').get(function() {
  return `${this.name} (${this.agentId})`;
});

// Virtual for contact info
deliveryAgentSchema.virtual('contactInfo').get(function() {
  return `${this.phone} | ${this.email}`;
});

// Index for better performance
deliveryAgentSchema.index({ status: 1 });
deliveryAgentSchema.index({ isOnline: 1 });
deliveryAgentSchema.index({ 'currentLocation.latitude': 1, 'currentLocation.longitude': 1 });

module.exports = mongoose.model("DeliveryAgent", deliveryAgentSchema);
