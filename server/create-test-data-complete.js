#!/usr/bin/env node

/**
 * Create Complete Test Data for Product Movement Control System
 * This script creates realistic test data to demonstrate the complete workflow
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import models
const Order = require("./models/Order");
const Hub = require("./models/Hub");
const HubManager = require("./models/HubManager");
const Notification = require("./models/Notification");
const User = require("./models/User");

console.log("🎬 CREATING COMPLETE TEST DATA");
console.log("===============================");

async function createTestData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/foodily-auth-app");
    console.log("✅ Connected to MongoDB");

    // Clear existing test data
    console.log("\n🧹 Cleaning existing test data...");
    await Order.deleteMany({ orderNumber: { $regex: /^TEST-/ } });
    await Notification.deleteMany({ orderId: { $exists: true } });
    console.log("✅ Cleaned existing test data");

    // Create test hubs if they don't exist
    console.log("\n🏢 Creating test hubs...");
    const hubs = [
      {
        hubId: "HUB-ERN-001",
        name: "Ernakulam Central Hub",
        district: "Ernakulam",
        address: {
          street: "MG Road",
          city: "Kochi",
          state: "Kerala",
          pincode: "682001"
        },
        capacity: 1000,
        currentStock: 150,
        status: "active"
      },
      {
        hubId: "HUB-TVM-001", 
        name: "Thiruvananthapuram Hub",
        district: "Thiruvananthapuram",
        address: {
          street: "Statue Junction",
          city: "Thiruvananthapuram",
          state: "Kerala",
          pincode: "695001"
        },
        capacity: 800,
        currentStock: 120,
        status: "active"
      },
      {
        hubId: "HUB-KTM-001",
        name: "Kottayam Hub", 
        district: "Kottayam",
        address: {
          street: "MC Road",
          city: "Kottayam",
          state: "Kerala",
          pincode: "686001"
        },
        capacity: 600,
        currentStock: 80,
        status: "active"
      }
    ];

    for (const hubData of hubs) {
      await Hub.findOneAndUpdate(
        { hubId: hubData.hubId },
        hubData,
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Created/Updated ${hubs.length} test hubs`);

    // Create test hub managers if they don't exist
    console.log("\n👨‍💼 Creating test hub managers...");
    const hubManagers = [
      {
        managerId: "HM-ERN-001",
        name: "Rajesh Kumar",
        email: "rajesh.ernakulam@craftedbyher.com",
        phone: "+91 9876543210",
        username: "rajesh_ern",
        password: "password123",
        hubId: "HUB-ERN-001",
        district: "Ernakulam",
        status: "active"
      },
      {
        managerId: "HM-TVM-001",
        name: "Priya Nair",
        email: "priya.tvm@craftedbyher.com", 
        phone: "+91 9876543211",
        username: "priya_tvm",
        password: "password123",
        hubId: "HUB-TVM-001",
        district: "Thiruvananthapuram",
        status: "active"
      },
      {
        managerId: "HM-KTM-001",
        name: "Suresh Menon",
        email: "suresh.ktm@craftedbyher.com",
        phone: "+91 9876543212", 
        username: "suresh_ktm",
        password: "password123",
        hubId: "HUB-KTM-001",
        district: "Kottayam",
        status: "active"
      }
    ];

    for (const managerData of hubManagers) {
      await HubManager.findOneAndUpdate(
        { managerId: managerData.managerId },
        managerData,
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Created/Updated ${hubManagers.length} test hub managers`);

    // Create test orders with different statuses
    console.log("\n📦 Creating test orders...");
    const testOrders = [
      // 1. Order at seller hub (waiting for admin approval)
      {
        orderNumber: "TEST-ORD-001",
        userId: "test-user-001",
        buyerDetails: {
          name: "Meera Krishnan",
          email: "meera@example.com",
          phone: "+91 9876543220",
          address: {
            street: "123 Marine Drive",
            city: "Kochi",
            state: "Kerala",
            pincode: "682001"
          }
        },
        items: [
          {
            title: "Handmade Spice Mix",
            quantity: 2,
            variant: { weight: "250g", price: 150 },
            image: "spices.jpg"
          },
          {
            title: "Organic Honey",
            quantity: 1,
            variant: { weight: "500g", price: 300 },
            image: "honey.jpg"
          }
        ],
        totalAmount: 600,
        shippingCharges: 50,
        finalAmount: 650,
        paymentMethod: "cod",
        paymentStatus: "pending",
        orderStatus: "at_seller_hub",
        hubTracking: {
          sellerHubId: "HUB-ERN-001",
          sellerHubName: "Ernakulam Central Hub",
          sellerHubDistrict: "Ernakulam",
          arrivedAtSellerHub: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          currentLocation: "seller_hub"
        },
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
      },

      // 2. Another order at seller hub (waiting for admin approval)
      {
        orderNumber: "TEST-ORD-002",
        userId: "test-user-002",
        buyerDetails: {
          name: "Arjun Pillai",
          email: "arjun@example.com",
          phone: "+91 9876543221",
          address: {
            street: "456 Fort Road",
            city: "Thiruvananthapuram",
            state: "Kerala",
            pincode: "695001"
          }
        },
        items: [
          {
            title: "Traditional Pickles",
            quantity: 3,
            variant: { weight: "200g", price: 120 },
            image: "pickles.jpg"
          }
        ],
        totalAmount: 360,
        shippingCharges: 40,
        finalAmount: 400,
        paymentMethod: "online",
        paymentStatus: "paid",
        orderStatus: "at_seller_hub",
        hubTracking: {
          sellerHubId: "HUB-KTM-001",
          sellerHubName: "Kottayam Hub",
          sellerHubDistrict: "Kottayam",
          arrivedAtSellerHub: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          currentLocation: "seller_hub"
        },
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },

      // 3. Order dispatched to customer hub (approved by admin)
      {
        orderNumber: "TEST-ORD-003",
        userId: "test-user-003",
        buyerDetails: {
          name: "Lakshmi Nair",
          email: "lakshmi@example.com",
          phone: "+91 9876543222",
          address: {
            street: "789 Beach Road",
            city: "Kochi",
            state: "Kerala",
            pincode: "682002"
          }
        },
        items: [
          {
            title: "Handwoven Basket",
            quantity: 1,
            variant: { size: "Medium", price: 500 },
            image: "basket.jpg"
          }
        ],
        totalAmount: 500,
        shippingCharges: 60,
        finalAmount: 560,
        paymentMethod: "online",
        paymentStatus: "paid",
        orderStatus: "in_transit_to_customer_hub",
        hubTracking: {
          sellerHubId: "HUB-TVM-001",
          sellerHubName: "Thiruvananthapuram Hub",
          sellerHubDistrict: "Thiruvananthapuram",
          arrivedAtSellerHub: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          adminApprovedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          approvedByAdmin: true,
          customerHubId: "HUB-ERN-001",
          customerHubName: "Ernakulam Central Hub",
          customerHubDistrict: "Ernakulam",
          currentLocation: "in_transit_to_customer_hub",
          pickupOTP: "123456",
          otpGeneratedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          otpExpiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000), // 22 hours from now
          otpUsed: false
        },
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000) // 8 hours ago
      },

      // 4. Order at customer hub (ready for pickup)
      {
        orderNumber: "TEST-ORD-004",
        userId: "test-user-004",
        buyerDetails: {
          name: "Ravi Kumar",
          email: "ravi@example.com",
          phone: "+91 9876543223",
          address: {
            street: "321 Hill Station Road",
            city: "Kottayam",
            state: "Kerala",
            pincode: "686002"
          }
        },
        items: [
          {
            title: "Coconut Oil",
            quantity: 2,
            variant: { volume: "1L", price: 250 },
            image: "coconut-oil.jpg"
          }
        ],
        totalAmount: 500,
        shippingCharges: 50,
        finalAmount: 550,
        paymentMethod: "cod",
        paymentStatus: "pending",
        orderStatus: "at_customer_hub",
        hubTracking: {
          sellerHubId: "HUB-ERN-001",
          sellerHubName: "Ernakulam Central Hub",
          sellerHubDistrict: "Ernakulam",
          arrivedAtSellerHub: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
          adminApprovedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          approvedByAdmin: true,
          customerHubId: "HUB-KTM-001",
          customerHubName: "Kottayam Hub",
          customerHubDistrict: "Kottayam",
          arrivedAtCustomerHub: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          currentLocation: "customer_hub",
          readyForPickup: true,
          readyForPickupAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          pickupOTP: "789012",
          otpGeneratedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
          otpExpiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000), // 18 hours from now
          otpUsed: false
        },
        createdAt: new Date(Date.now() - 15 * 60 * 60 * 1000) // 15 hours ago
      },

      // 5. Delivered order
      {
        orderNumber: "TEST-ORD-005",
        userId: "test-user-005",
        buyerDetails: {
          name: "Sita Devi",
          email: "sita@example.com",
          phone: "+91 9876543224",
          address: {
            street: "654 Temple Street",
            city: "Thiruvananthapuram",
            state: "Kerala",
            pincode: "695003"
          }
        },
        items: [
          {
            title: "Handmade Soap Set",
            quantity: 1,
            variant: { type: "Herbal", price: 200 },
            image: "soap.jpg"
          }
        ],
        totalAmount: 200,
        shippingCharges: 30,
        finalAmount: 230,
        paymentMethod: "online",
        paymentStatus: "paid",
        orderStatus: "delivered",
        hubTracking: {
          sellerHubId: "HUB-KTM-001",
          sellerHubName: "Kottayam Hub",
          sellerHubDistrict: "Kottayam",
          arrivedAtSellerHub: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
          adminApprovedAt: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 hours ago
          approvedByAdmin: true,
          customerHubId: "HUB-TVM-001",
          customerHubName: "Thiruvananthapuram Hub",
          customerHubDistrict: "Thiruvananthapuram",
          arrivedAtCustomerHub: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
          deliveredAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          currentLocation: "delivered",
          pickupOTP: "345678",
          otpGeneratedAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
          otpExpiresAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // Expired (used)
          otpUsed: true,
          otpUsedAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
        },
        createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000) // 30 hours ago
      }
    ];

    // Insert test orders
    for (const orderData of testOrders) {
      await Order.findOneAndUpdate(
        { orderNumber: orderData.orderNumber },
        orderData,
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Created/Updated ${testOrders.length} test orders`);

    // Create admin notifications for pending orders
    console.log("\n🔔 Creating admin notifications...");
    const pendingOrders = testOrders.filter(order => order.orderStatus === 'at_seller_hub');
    
    for (const order of pendingOrders) {
      await Notification.findOneAndUpdate(
        { 
          orderId: (await Order.findOne({ orderNumber: order.orderNumber }))._id,
          type: 'admin_approval_required'
        },
        {
          userId: 'admin-user-id', // Replace with actual admin user ID
          userRole: 'admin',
          type: 'admin_approval_required',
          title: '🏢 New Order Awaiting Approval',
          message: `Order #${order.orderNumber} from ${order.buyerDetails.name} has arrived at ${order.hubTracking.sellerHubName} and requires your approval for dispatch to customer hub.`,
          orderId: (await Order.findOne({ orderNumber: order.orderNumber }))._id,
          orderNumber: order.orderNumber,
          read: false,
          actionRequired: true,
          actionType: 'approve_hub_delivery',
          metadata: {
            hubName: order.hubTracking.sellerHubName,
            hubDistrict: order.hubTracking.sellerHubDistrict,
            customerName: order.buyerDetails.name,
            customerPhone: order.buyerDetails.phone,
            totalAmount: order.finalAmount,
            itemCount: order.items.length,
            arrivedAt: order.hubTracking.arrivedAtSellerHub
          },
          createdAt: order.hubTracking.arrivedAtSellerHub
        },
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Created ${pendingOrders.length} admin notifications`);

    // Create buyer notifications for orders with OTP
    console.log("\n📱 Creating buyer notifications...");
    const ordersWithOTP = testOrders.filter(order => 
      order.hubTracking && order.hubTracking.pickupOTP && !order.hubTracking.otpUsed
    );
    
    for (const order of ordersWithOTP) {
      await Notification.findOneAndUpdate(
        {
          userId: order.userId,
          orderId: (await Order.findOne({ orderNumber: order.orderNumber }))._id,
          type: 'order_shipped'
        },
        {
          userId: order.userId,
          userRole: 'buyer',
          type: 'order_shipped',
          title: '🚚 Order Out for Delivery',
          message: `Your order #${order.orderNumber} is out for delivery to ${order.hubTracking.customerHubName}. Your pickup OTP is ${order.hubTracking.pickupOTP}.`,
          orderId: (await Order.findOne({ orderNumber: order.orderNumber }))._id,
          orderNumber: order.orderNumber,
          read: false,
          actionRequired: false,
          actionType: 'none',
          metadata: {
            otp: order.hubTracking.pickupOTP,
            hubName: order.hubTracking.customerHubName,
            hubDistrict: order.hubTracking.customerHubDistrict,
            customerName: order.buyerDetails.name,
            totalAmount: order.finalAmount,
            dispatchedAt: order.hubTracking.adminApprovedAt,
            expectedArrival: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours from now
          },
          createdAt: order.hubTracking.adminApprovedAt || new Date()
        },
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Created ${ordersWithOTP.length} buyer notifications`);

    // Display summary
    console.log("\n📊 TEST DATA SUMMARY");
    console.log("====================");
    
    const orderCounts = await Promise.all([
      Order.countDocuments({ orderStatus: 'at_seller_hub', orderNumber: { $regex: /^TEST-/ } }),
      Order.countDocuments({ orderStatus: 'in_transit_to_customer_hub', orderNumber: { $regex: /^TEST-/ } }),
      Order.countDocuments({ orderStatus: 'at_customer_hub', orderNumber: { $regex: /^TEST-/ } }),
      Order.countDocuments({ orderStatus: 'delivered', orderNumber: { $regex: /^TEST-/ } })
    ]);

    console.log(`📦 Orders at seller hub (pending admin approval): ${orderCounts[0]}`);
    console.log(`🚚 Orders in transit to customer hub: ${orderCounts[1]}`);
    console.log(`🏪 Orders at customer hub (ready for pickup): ${orderCounts[2]}`);
    console.log(`✅ Orders delivered: ${orderCounts[3]}`);
    console.log(`🏢 Total hubs: ${hubs.length}`);
    console.log(`👨‍💼 Total hub managers: ${hubManagers.length}`);

    console.log("\n🎯 WHAT YOU CAN TEST NOW:");
    console.log("=========================");
    console.log("1. 👨‍💼 Admin Dashboard:");
    console.log("   - Go to http://localhost:5173/admin");
    console.log("   - Click 'Product Movement Control'");
    console.log(`   - See ${orderCounts[0]} pending orders with RED notifications`);
    console.log("   - Click 'Approve & Dispatch' to test the workflow");
    
    console.log("\n2. 🏢 Hub Manager Dashboard:");
    console.log("   - Go to http://localhost:5173/hub-manager/login");
    console.log("   - Login with: username: rajesh_ern, password: password123");
    console.log(`   - See 'Dispatch: ${orderCounts[1] + orderCounts[2]}' stat (orders coming to Ernakulam hub)`);
    console.log("   - Check notifications for incoming dispatches");
    
    console.log("\n3. 👤 Customer Dashboard:");
    console.log("   - Go to http://localhost:5173/login");
    console.log("   - Login as test-user-003 or test-user-004");
    console.log("   - See OTP notifications in GREEN boxes");
    console.log("   - OTPs: 123456 (for TEST-ORD-003), 789012 (for TEST-ORD-004)");

    console.log("\n✅ TEST DATA CREATION COMPLETE!");
    console.log("Your system now has realistic data to demonstrate the complete workflow.");

  } catch (error) {
    console.error("❌ Error creating test data:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the script
createTestData();