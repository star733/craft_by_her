const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    userId: { 
      type: String, 
      required: true,
      index: true 
    },
    items: [
      {
        productId: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: "Product", 
          required: true 
        },
        title: { 
          type: String, 
          required: true 
        },
        image: { 
          type: String 
        },
        variant: {
          weight: { type: String, required: true },
          price: { type: Number, required: true }
        },
        quantity: { 
          type: Number, 
          required: true, 
          min: 1 
        }
      }
    ],
    totalAmount: { 
      type: Number, 
      default: 0 
    }
  },
  { timestamps: true }
);

// Calculate total amount before saving
cartSchema.pre('save', function(next) {
  this.totalAmount = this.items.reduce((total, item) => {
    return total + (item.variant.price * item.quantity);
  }, 0);
  next();
});

module.exports = mongoose.model("Cart", cartSchema);
