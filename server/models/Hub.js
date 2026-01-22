const mongoose = require("mongoose");

const hubSchema = new mongoose.Schema(
  {
    hubId: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: String,
      required: true,
      enum: [
        "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha",
        "Kottayam", "Idukki", "Ernakulam", "Thrissur",
        "Palakkad", "Malappuram", "Kozhikode", "Wayanad",
        "Kannur", "Kasaragod"
      ],
      index: true
    },
    location: {
      address: {
        street: String,
        city: String,
        state: { type: String, default: "Kerala" },
        pincode: String,
        landmark: String
      },
      coordinates: {
        latitude: {
          type: Number,
          required: true
        },
        longitude: {
          type: Number,
          required: true
        }
      }
    },
    contactInfo: {
      phone: {
        type: String,
        required: true,
        validate: {
          validator: function(v) {
            return /^[6-9]\d{9}$/.test(v);
          },
          message: 'Please enter a valid 10-digit mobile number'
        }
      },
      email: {
        type: String,
        required: true,
        lowercase: true,
        validate: {
          validator: function(v) {
            return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
          },
          message: 'Please enter a valid email address'
        }
      },
      alternatePhone: String
    },
    managerId: {
      type: String,
      ref: "HubManager",
      default: null,
      index: true
    },
    managerName: {
      type: String,
      default: ""
    },
    capacity: {
      maxOrders: {
        type: Number,
        default: 500
      },
      currentOrders: {
        type: Number,
        default: 0
      }
    },
    operatingHours: {
      openTime: {
        type: String,
        default: "09:00"
      },
      closeTime: {
        type: String,
        default: "18:00"
      },
      workingDays: {
        type: [String],
        default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
      }
    },
    status: {
      type: String,
      enum: ["active", "inactive", "maintenance"],
      default: "active",
      index: true
    },
    stats: {
      totalOrdersProcessed: {
        type: Number,
        default: 0
      },
      ordersInTransit: {
        type: Number,
        default: 0
      },
      ordersReadyForPickup: {
        type: Number,
        default: 0
      }
    },
    createdBy: {
      type: String,
      required: true
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Generate unique hub ID before saving
hubSchema.pre('save', async function(next) {
  try {
    if (this.isNew && !this.hubId) {
      const count = await mongoose.model('Hub').countDocuments();
      this.hubId = `HUB${String(count + 1).padStart(4, '0')}`; // HUB0001, HUB0002, etc.
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Virtual for availability status
hubSchema.virtual('isAvailable').get(function() {
  return this.status === 'active' && this.capacity.currentOrders < this.capacity.maxOrders;
});

// Virtual for capacity percentage
hubSchema.virtual('capacityPercentage').get(function() {
  return Math.round((this.capacity.currentOrders / this.capacity.maxOrders) * 100);
});

// Index for geospatial queries
hubSchema.index({ 'location.coordinates.latitude': 1, 'location.coordinates.longitude': 1 });

// Static method to find nearest hub by district
hubSchema.statics.findByDistrict = function(district) {
  return this.findOne({ 
    district: district, 
    status: 'active' 
  });
};

// Static method to find nearest hub by coordinates (future enhancement)
hubSchema.statics.findNearestHub = function(latitude, longitude) {
  // For now, return any active hub
  // Can be enhanced with actual distance calculation
  return this.findOne({ status: 'active' });
};

module.exports = mongoose.model("Hub", hubSchema);
