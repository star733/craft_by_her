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
          required: false 
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

// Calculate total amount and ensure required fields before saving
cartSchema.pre('save', async function(next) {
  try {
    // Calculate total amount
    this.totalAmount = this.items.reduce((total, item) => {
      return total + (item.variant.price * item.quantity);
    }, 0);

    // Ensure all items have required fields (title, image if available)
    const db = mongoose.connection.db;
    const productIds = this.items
      .filter(item => !item.title && mongoose.Types.ObjectId.isValid(item.productId))
      .map(item => new mongoose.Types.ObjectId(item.productId));
    
    if (productIds.length > 0) {
      const products = await db.collection("products")
        .find({ _id: { $in: productIds } })
        .project({ title: 1, image: 1 })
        .toArray();
      
      const productMap = new Map(products.map(p => [p._id.toString(), p]));
      
      this.items.forEach(item => {
        const product = productMap.get(item.productId.toString());
        if (product) {
          if (!item.title) item.title = product.title;
          if (!item.image && product.image) item.image = product.image;
        }
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("Cart", cartSchema);
