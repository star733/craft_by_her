const mongoose = require('mongoose');
const Order = require('./models/Order');
const DeliveryAgent = require('./models/DeliveryAgent');
const Product = require('./models/Product');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/foodily-auth-app';

async function createCompleteTestData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('\n🧹 Clearing existing data...');
    await Order.deleteMany({});
    await DeliveryAgent.deleteMany({});
    await Product.deleteMany({});
    console.log('✅ Cleared existing data');

    // Create products first
    console.log('\n📦 Creating products...');
    const products = await Product.insertMany([
      {
        title: 'Homemade Pickles',
        category: 'Pickles',
        stock: 50,
        variants: [
          { weight: '250g', price: 150 },
          { weight: '500g', price: 280 }
        ],
        image: 'pickles.jpg'
      },
      {
        title: 'Spice Mix',
        category: 'Spices',
        stock: 30,
        variants: [
          { weight: '100g', price: 80 },
          { weight: '200g', price: 150 }
        ],
        image: 'spices.jpg'
      }
    ]);
    console.log(`✅ Created ${products.length} products`);

    // Create delivery agents (using individual save() to trigger pre-save hooks)
    console.log('\n🚚 Creating delivery agents...');
    const agent1 = new DeliveryAgent({
      agentId: 'DA0001',
      name: 'Rajesh Kumar',
      phone: '9876543210',
      email: 'rajesh@example.com',
      username: 'rajesh_kumar',
      password: 'password123',
      address: {
        street: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001'
      },
      vehicleInfo: {
        type: 'bike',
        number: 'MH01AB1234'
      },
      status: 'active',
      isOnline: true,
      createdBy: 'test_setup'
    });

    const agent2 = new DeliveryAgent({
      agentId: 'DA0002',
      name: 'Priya Sharma',
      phone: '9876543211',
      email: 'priya@example.com',
      username: 'priya_sharma',
      password: 'password123',
      address: {
        street: '456 Park Avenue',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001'
      },
      vehicleInfo: {
        type: 'scooter',
        number: 'DL02CD5678'
      },
      status: 'active',
      isOnline: true,
      createdBy: 'test_setup'
    });

    await agent1.save();
    await agent2.save();
    const agents = [agent1, agent2];
    console.log(`✅ Created ${agents.length} delivery agents`);

    // Create orders
    console.log('\n📋 Creating orders...');
    const orders = await Order.insertMany([
      {
        userId: 'test_user_1',
        items: [
          {
            productId: products[0]._id,
            title: products[0].title,
            image: products[0].image,
            variant: products[0].variants[0],
            quantity: 2
          }
        ],
        buyerDetails: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '9876543210',
          address: {
            street: '123 Customer Street',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
            landmark: 'Near City Mall'
          }
        },
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        orderStatus: 'confirmed',
        totalAmount: 300,
        shippingCharges: 50,
        finalAmount: 350,
        notes: 'Please deliver in the evening'
      },
      {
        userId: 'test_user_2',
        items: [
          {
            productId: products[1]._id,
            title: products[1].title,
            image: products[1].image,
            variant: products[1].variants[0],
            quantity: 1
          }
        ],
        buyerDetails: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '9876543211',
          address: {
            street: '456 Customer Avenue',
            city: 'Delhi',
            state: 'Delhi',
            pincode: '110001',
            landmark: 'Opposite Metro Station'
          }
        },
        paymentMethod: 'online',
        paymentStatus: 'paid',
        orderStatus: 'confirmed',
        totalAmount: 80,
        shippingCharges: 50,
        finalAmount: 130,
        notes: 'Handle with care'
      }
    ]);
    console.log(`✅ Created ${orders.length} orders`);

    // Assign orders to agents
    console.log('\n🔗 Assigning orders to agents...');
    
    // Assign first order to DA0001
    await Order.findByIdAndUpdate(orders[0]._id, {
      $set: {
        'deliveryInfo.agentId': 'DA0001',
        'deliveryInfo.assignedAt': new Date(),
        orderStatus: 'shipped'
      },
      $push: {
        'deliveryInfo.trackingUpdates': {
          status: 'assigned',
          message: 'Order assigned to delivery agent Rajesh Kumar (DA0001)',
          timestamp: new Date()
        }
      }
    });

    // Assign second order to DA0002
    await Order.findByIdAndUpdate(orders[1]._id, {
      $set: {
        'deliveryInfo.agentId': 'DA0002',
        'deliveryInfo.assignedAt': new Date(),
        orderStatus: 'shipped'
      },
      $push: {
        'deliveryInfo.trackingUpdates': {
          status: 'assigned',
          message: 'Order assigned to delivery agent Priya Sharma (DA0002)',
          timestamp: new Date()
        }
      }
    });

    console.log('✅ Assigned orders to agents');

    // Verify setup
    console.log('\n🔍 Verifying setup...');
    const finalOrders = await Order.find({}).populate('items.productId');
    const finalAgents = await DeliveryAgent.find({});
    const assignedOrders = await Order.find({ 'deliveryInfo.agentId': { $exists: true, $ne: null } });

    console.log(`📊 FINAL SUMMARY:`);
    console.log(`- Total products: ${products.length}`);
    console.log(`- Total delivery agents: ${finalAgents.length}`);
    console.log(`- Total orders: ${finalOrders.length}`);
    console.log(`- Assigned orders: ${assignedOrders.length}`);

    console.log('\n🚚 Delivery Agents:');
    finalAgents.forEach((agent, index) => {
      console.log(`${index + 1}. ${agent.name} (${agent.agentId})`);
      console.log(`   Username: ${agent.username}`);
      console.log(`   Password: password123`);
      console.log(`   Status: ${agent.status}`);
      console.log(`   Online: ${agent.isOnline ? 'Yes' : 'No'}`);
    });

    console.log('\n📦 Orders by Agent:');
    const ordersByAgent = {};
    assignedOrders.forEach(order => {
      const agentId = order.deliveryInfo.agentId;
      if (!ordersByAgent[agentId]) {
        ordersByAgent[agentId] = [];
      }
      ordersByAgent[agentId].push(order);
    });

    Object.keys(ordersByAgent).forEach(agentId => {
      const agent = finalAgents.find(a => a.agentId === agentId);
      console.log(`\n${agent.name} (${agentId}) - ${ordersByAgent[agentId].length} orders:`);
      ordersByAgent[agentId].forEach((order, index) => {
        console.log(`  ${index + 1}. Order #${order.orderNumber} - ${order.buyerDetails.name} - ₹${order.finalAmount}`);
      });
    });

    console.log('\n✅ Complete test data setup finished!');
    console.log('\n🔑 LOGIN CREDENTIALS FOR TESTING:');
    console.log('Agent 1: Username: rajesh_kumar, Password: password123 (should see 1 order)');
    console.log('Agent 2: Username: priya_sharma, Password: password123 (should see 1 order)');

  } catch (error) {
    console.error('❌ Error setting up test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the setup
createCompleteTestData();
