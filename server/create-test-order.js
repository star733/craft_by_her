// Script to create a test order for testing notifications
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function createTestOrder() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const Notification = mongoose.model('Notification', new mongoose.Schema({}, { strict: false }));

    // Find Red Velvet product
    console.log('\n📦 Searching for Red Velvet product...');
    const redVelvet = await Product.findOne({ title: /red velvet/i });
    
    if (!redVelvet) {
      console.log('❌ Red Velvet product not found');
      process.exit(1);
    }

    console.log('✅ Found Red Velvet product:', redVelvet.title);

    // Find Micah (seller)
    console.log('\n👤 Searching for Micah (seller)...');
    const micah = await User.findOne({ name: /micah/i });
    
    if (!micah) {
      console.log('❌ Micah user not found');
      process.exit(1);
    }

    console.log('✅ Found Micah:', micah.name);

    // Find a buyer (any user that's not Micah)
    console.log('\n👤 Searching for a buyer...');
    const buyer = await User.findOne({ 
      uid: { $ne: micah.uid },
      role: { $ne: 'admin' }
    });
    
    if (!buyer) {
      console.log('❌ No buyer found');
      process.exit(1);
    }

    console.log('✅ Found buyer:', buyer.name || buyer.email);

    // Generate order number
    const orderCount = await Order.countDocuments();
    const orderNumber = `ORD-${String(orderCount + 1).padStart(6, '0')}`;

    // Create test order
    console.log('\n📦 Creating test order...');
    const testOrder = await Order.create({
      userId: buyer.uid,
      orderNumber: orderNumber,
      items: [{
        productId: redVelvet._id,
        title: redVelvet.title,
        image: redVelvet.image,
        variant: {
          weight: redVelvet.variants[0].weight,
          price: redVelvet.variants[0].price
        },
        quantity: 1
      }],
      buyerDetails: {
        name: buyer.name || 'Test Buyer',
        email: buyer.email,
        phone: '9876543210',
        address: '123 Test Street',
        city: 'Kasaragod',
        state: 'Kerala',
        pincode: '671121'
      },
      paymentMethod: 'cod',
      totalAmount: redVelvet.variants[0].price,
      shippingCharges: 0,
      finalAmount: redVelvet.variants[0].price,
      paymentStatus: 'pending',
      orderStatus: 'confirmed',
      notes: 'Test order created by script'
    });

    console.log('✅ Test order created:', orderNumber);
    console.log('  - Order ID:', testOrder._id);
    console.log('  - Buyer:', buyer.name || buyer.email);
    console.log('  - Product:', redVelvet.title);
    console.log('  - Amount: ₹', testOrder.finalAmount);

    // Create notification for seller
    console.log('\n🔔 Creating notification for seller...');
    const notification = await Notification.create({
      userId: micah.uid,
      userRole: 'seller',
      type: 'new_order',
      title: '🎉 New Order Received!',
      message: `You have a new order #${orderNumber}. Please move the products to your nearest hub.`,
      orderId: testOrder._id,
      orderNumber: orderNumber,
      actionRequired: true,
      actionType: 'move_to_hub',
      metadata: {
        orderAmount: testOrder.finalAmount,
        itemCount: testOrder.items.length
      }
    });

    console.log('✅ Notification created for Micah');
    console.log('  - Notification ID:', notification._id);

    console.log('\n✅ All done! Test order and notification created successfully.');
    console.log('\n📋 Next steps:');
    console.log('  1. Login as Micah (seller)');
    console.log('  2. Check notification bell');
    console.log('  3. Click "View Order & Move to Hub"');
    console.log('  4. Test the complete flow');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestOrder();
