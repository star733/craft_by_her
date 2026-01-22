const mongoose = require("mongoose");
require("dotenv").config();

const approveExistingProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    
    // Update all products that don't have approvalStatus to set it as "approved"
    const result = await db.collection("products").updateMany(
      { approvalStatus: { $exists: false } },
      { 
        $set: { 
          approvalStatus: "approved",
          approvedBy: "system",
          approvedAt: new Date()
        } 
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} existing products to approved status`);

    await mongoose.connection.close();
    console.log("✅ Database connection closed");
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
};

approveExistingProducts();
