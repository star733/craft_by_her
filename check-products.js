const mongoose = require('mongoose');
require('dotenv').config();

async function checkProducts() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodily-auth-app');
    console.log('✅ Connected to MongoDB');
    
    const Product = require('./server/models/Product');
    const products = await Product.find({}).select('title sellerId').limit(5);
    
    console.log('\n📦 Sample products:');
    products.forEach(p => {
      console.log(`- ${p.title}: sellerId = ${p.sellerId || 'MISSING'}`);
    });
    
    const totalProducts = await Product.countDocuments();
    const productsWithSeller = await Product.countDocuments({ sellerId: { $exists: true, $ne: null } });
    
    console.log(`\n📊 Product Statistics:`);
    console.log(`Total products: ${totalProducts}`);
    console.log(`Products with sellerId: ${productsWithSeller}`);
    console.log(`Products missing sellerId: ${totalProducts - productsWithSeller}`);
    
    if (productsWithSeller === 0) {
      console.log('\n⚠️  WARNING: No products have sellerId field!');
      console.log('This means seller notifications will not work.');
      console.log('Products need to be assigned to sellers.');
    }
    
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkProducts();