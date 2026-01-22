const mongoose = require("mongoose");
require("dotenv").config();

async function migrateProducts() {
  try {
    console.log("\n=================================================");
    console.log("🔄 PRODUCT OWNERSHIP MIGRATION SCRIPT");
    console.log("   Dividing products among 3 sellers");
    console.log("=================================================\n");

    // Connect to MongoDB
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/foodily-auth-app";
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    const productsCollection = db.collection("products");

    // Step 1: Find products without sellerId
    console.log("📊 Step 1: Checking existing products...");
    const totalProducts = await productsCollection.countDocuments();
    const productsWithoutSeller = await productsCollection.countDocuments({
      sellerId: { $exists: false }
    });

    console.log(`   Total products: ${totalProducts}`);
    console.log(`   Products without owner: ${productsWithoutSeller}`);
    console.log(`   Products with owner: ${totalProducts - productsWithoutSeller}\n`);

    if (productsWithoutSeller === 0) {
      console.log("✅ All products already have seller ownership!");
      console.log("   No migration needed.\n");
      await mongoose.connection.close();
      return;
    }

    // Step 2: Get 3 approved sellers
    console.log("📊 Step 2: Looking for 3 approved sellers...");
    const sellerApplications = db.collection("sellerapplications");
    const approvedSellers = await sellerApplications.find({
      status: 'approved'
    }).limit(3).toArray();

    if (approvedSellers.length === 0) {
      console.log("   ❌ No approved sellers found!");
      console.log("   Please approve at least 1 seller first.\n");
      await mongoose.connection.close();
      return;
    }

    console.log(`   ✅ Found ${approvedSellers.length} approved seller(s):\n`);
    approvedSellers.forEach((seller, index) => {
      console.log(`      ${index + 1}. ${seller.businessName} (${seller.email})`);
    });
    console.log();

    // Step 3: Get products without seller
    console.log("📊 Step 3: Fetching products to migrate...");
    const productsToMigrate = await productsCollection.find({
      sellerId: { $exists: false }
    }).toArray();

    console.log(`   Found ${productsToMigrate.length} products to distribute\n`);

    // Step 4: Divide products among sellers
    console.log("📊 Step 4: Distributing products among sellers...");
    let updatedCount = 0;

    for (let i = 0; i < productsToMigrate.length; i++) {
      const product = productsToMigrate[i];
      // Distribute products evenly among available sellers (round-robin)
      const sellerIndex = i % approvedSellers.length;
      const seller = approvedSellers[sellerIndex];

      const sellerInfo = {
        sellerId: seller.userId,
        sellerName: seller.businessName || 'Seller',
        sellerEmail: seller.email
      };

      await productsCollection.updateOne(
        { _id: product._id },
        {
          $set: {
            sellerId: sellerInfo.sellerId,
            sellerName: sellerInfo.sellerName,
            sellerEmail: sellerInfo.sellerEmail,
            updatedAt: new Date()
          }
        }
      );

      updatedCount++;
      
      // Show progress every 5 products
      if (updatedCount % 5 === 0 || updatedCount === productsToMigrate.length) {
        console.log(`   ✅ Migrated ${updatedCount}/${productsToMigrate.length} products`);
      }
    }

    console.log();

    // Step 5: Verify migration and show distribution
    console.log("📊 Step 5: Verifying migration...");
    const remainingWithoutSeller = await productsCollection.countDocuments({
      sellerId: { $exists: false }
    });

    if (remainingWithoutSeller === 0) {
      console.log("   ✅ All products now have seller ownership!\n");
    } else {
      console.log(`   ⚠️  ${remainingWithoutSeller} products still without owner\n`);
    }

    // Show distribution per seller
    console.log("📊 Product Distribution:\n");
    for (const seller of approvedSellers) {
      const count = await productsCollection.countDocuments({
        sellerId: seller.userId
      });
      console.log(`   ${seller.businessName}: ${count} products`);
    }
    console.log();

    // Step 6: Show summary
    console.log("=================================================");
    console.log("📊 MIGRATION SUMMARY");
    console.log("=================================================");
    console.log(`Total products:           ${totalProducts}`);
    console.log(`Products migrated:        ${updatedCount}`);
    console.log(`Remaining without owner:  ${remainingWithoutSeller}`);
    console.log(`Distributed among:        ${approvedSellers.length} seller(s)`);
    console.log("=================================================\n");

    if (updatedCount > 0) {
      console.log("✅ Migration completed successfully!");
      console.log("\n📝 NEXT STEPS:");
      console.log("1. ✅ Products distributed among sellers");
      console.log("2. 🔄 Restart your server");
      console.log("3. 🧪 Test each seller dashboard (they see only their products)");
      console.log("4. 🧪 Test admin dashboard (shows all products with seller names)\n");
    }

    await mongoose.connection.close();
    console.log("✅ Database connection closed\n");
    process.exit(0);

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    console.error("\nError details:", error.message);
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      console.error("Error closing connection:", closeError.message);
    }
    process.exit(1);
  }
}

// Run migration
migrateProducts();
