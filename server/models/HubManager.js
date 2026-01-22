const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const hubManagerSchema = new mongoose.Schema(
  {
    managerId: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
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
    phone: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function(v) {
          return /^[6-9]\d{9}$/.test(v);
        },
        message: 'Please enter a valid 10-digit mobile number'
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
          return /^[a-zA-Z0-9_]+$/.test(v);
        },
        message: 'Username can only contain letters, numbers, and underscores'
      }
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    hubId: {
      type: String,
      ref: "Hub",
      default: null,
      index: true
    },
    hubName: {
      type: String,
      default: ""
    },
    district: {
      type: String,
      default: ""
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
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    stats: {
      ordersProcessed: {
        type: Number,
        default: 0
      },
      ordersInHub: {
        type: Number,
        default: 0
      },
      ordersDispatched: {
        type: Number,
        default: 0
      }
    },
    createdBy: {
      type: String,
      required: true,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Generate unique manager ID before saving
hubManagerSchema.pre('save', async function(next) {
  try {
    if (this.isNew && !this.managerId) {
      const count = await mongoose.model('HubManager').countDocuments();
      this.managerId = `HM${String(count + 1).padStart(4, '0')}`; // HM0001, HM0002, etc.
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Hash password before saving
hubManagerSchema.pre('save', async function(next) {
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
hubManagerSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual for display name
hubManagerSchema.virtual('displayName').get(function() {
  return `${this.name} (${this.managerId})`;
});

module.exports = mongoose.model("HubManager", hubManagerSchema);
