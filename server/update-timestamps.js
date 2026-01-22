const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const result = await mongoose.connection.db.collection('notifications').updateMany(
    { createdAt: { $exists: false } },
    { $set: { createdAt: new Date(), updatedAt: new Date() } }
  );
  console.log('✅ Updated', result.modifiedCount, 'notifications');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
