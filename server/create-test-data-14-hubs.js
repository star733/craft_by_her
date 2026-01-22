#!/usr/bin/env node

/**
 * Create Test Data for 14-Hub System
 * Orders and dispatch happen in the same hubs (one per district)
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import models
const Order = require("./models/Order");
const Notification = require("./models/Notification");

console.log("📦 CREATING TEST DATA FOR 14-HUB SYSTEM");
console.log("=======================================");

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

    // Create test orders for the 14-hub system
    console.log("\n📦 Creating test orders for 14-hub system...");
    const testOrders = [
      // 1. Order from seller at Ernakulam hub (waiting for admin approval)
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
          }
        ],
        totalAmount: 300,
        shippingCharges: 50,
        finalAmount: 350,
        paymentMethod: "cod",
        paymentStatus: "pending",
        orderStatus: "at_seller_hub",
        hubTracking: {
          sellerHubId: "HUB-ERN-001", // Ernakulam hub receives from seller
          sellerHubName: "Ernakulam Central Hub",
          sellerHubDistrict: "Ernakulam",
          arrivedAtSellerHub: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          currentLocation: "seller_hub"
        },
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
      },

      // 2. Order from Kottayam seller going to Ernakulam buyer (DISPATCH to Ernakulam)
      {
        orderNumber: "TEST-ORD-002",
        userId: "test-user-002",
        buyerDetails: {
          name: "Arjun Pillai",
          email: "arjun@example.com",
          phone: "+91 9876543221",
          address: {
            street: "456 Fort Road",
            city: "Kochi", // Ernakulam buyer
            state: "Kerala",
            pincode: "682002"
          }
        },
        items: [
          {
            title: "Traditional Pickles from Kottayam",
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
        orderStatus: "at_customer_hub",
        hubTracking: {
          sellerHubId: "HUB-KTM-001", // From Kottayam seller
          sellerHubName: "Kottayam Central Hub",
          sellerHubDistrict: "Kottayam",
          arrivedAtSellerHub: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          adminApprovedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          approvedByAdmin: true,
          customerHubId: "HUB-ERN-001", // To Ernakulam buyer (DISPATCH)
          customerHubName: "Ernakulam Central Hub",
          customerHubDistrict: "Ernakulam",
          arrivedAtCustomerHub: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          currentLocation: "customer_hub",
          readyForPickup: true,
          readyForPickupAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          pickupOTP: "123456",
          otpGeneratedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          otpExpiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000), // 22 hours from now
          otpUsed: false
        },
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000) // 8 hours ago
      },

      // 3. Order from Thiruvananthapuram seller going to Ernakulam buyer (DISPATCH to Ernakulam)
      {
        orderNumber: "TEST-ORD-003",
        userId: "test-user-003",
        buyerDetails: {
          name: "Lakshmi Nair",
          email: "lakshmi@example.com",
          phone: "+91 9876543222",
          address: {
            street: "789 Beach Road",
            city: "Kochi", // Ernakulam buyer
            state: "Kerala",
            pincode: "682003"
          }
        },
        items: [
          {
            title: "Handwoven Basket from Thiruvananthapuram",
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
          sellerHubId: "HUB-TVM-001", // From Thiruvananthapuram seller
          sellerHubName: "Thiruvananthapuram Central Hub",
          sellerHubDistrict: "Thiruvananthapuram",
          arrivedAtSellerHub: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
          adminApprovedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          approvedByAdmin: true,
          customerHubId: "HUB-ERN-001", // To Ernakulam buyer (DISPATCH)
          customerHubName: "Ernakulam Central Hub",
          customerHubDistrict: "Ernakulam",
          currentLocation: "in_transit_to_customer_hub",
          pickupOTP: "789012",
          otpGeneratedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          otpExpiresAt: new Date(Date.now() + 23 * 60 * 60 * 1000), // 23 hours from now
          otpUsed: false
        },
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
      },

      // 4. Order from Thiruvananthapuram seller staying in Thiruvananthapuram (ORDER for TVM hub)
      {
        orderNumber: "TEST-ORD-004",
        userId: "test-user-004",
        buyerDetails: {
          name: "Ravi Kumar",
          email: "ravi@example.com",
          phone: "+91 9876543223",
          address: {
            street: "321 Hill Station Road",
            city: "Thiruvananthapuram", // TVM buyer
            state: "Kerala",
            pincode: "695001"
          }
        },
        items: [
          {
            title: "Local TVM Coconut Oil",
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
        orderStatus: "at_seller_hub",
        hubTracking: {
          sellerHubId: "HUB-TVM-001", // TVM seller to TVM hub (ORDER)
          sellerHubName: "Thiruvananthapuram Central Hub",
          sellerHubDistrict: "Thiruvananthapuram",
          arrivedAtSellerHub: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
          currentLocation: "seller_hub"
        },
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
      },

      // 5. Another order from Palakkad seller going to Ernakulam buyer (DISPATCH to Ernakulam)
      {
        orderNumber: "TEST-ORD-005",
        userId: "test-user-005",
        buyerDetails: {
          name: "Sita Devi",
          email: "sita@example.com",
          phone: "+91 9876543224",
          address: {
            street: "654 Temple Street",
            city: "Kochi", // Ernakulam buyer
            state: "Kerala",
            pincode: "682004"
          }
        },
        items: [
          {
            title: "Handmade Soap Set from Palakkad",
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
        orderStatus: "at_customer_hub",
        hubTracking: {
          sellerHubId: "HUB-PKD-001", // From Palakkad seller
          sellerHubName: "Palakkad Central Hub",
          sellerHubDistrict: "Palakkad",
          arrivedAtSellerHub: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
          adminApprovedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          approvedByAdmin: true,
          customerHubId: "HUB-ERN-001", // To Ernakulam buyer (DISPATCH)
          customerHubName: "Ernakulam Central Hub",
          customerHubDistrict: "Ernakulam",
          arrivedAtCustomerHub: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          currentLocation: "customer_hub",
          readyForPickup: true,
          readyForPickupAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
          pickupOTP: "345678",
          otpGeneratedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
          otpExpiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000), // 18 hours from now
          otpUsed: false
        },
        createdAt: new Date(Date.now() - 15 * 60 * 60 * 1000) // 15 hours ago
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

    // Display summary
    console.log("\n📊 TEST DATA SUMMARY (14-HUB SYSTEM)");
    console.log("====================================");
    
    const orderCounts = await Promise.all([
      Order.countDocuments({ orderStatus: 'at_seller_hub', orderNumber: { $regex: /^TEST-/ } }),
      Order.countDocuments({ orderStatus: { $in: ['in_transit_to_customer_hub', 'at_customer_hub'] }, orderNumber: { $regex: /^TEST-/ } })
    ]);

    console.log(`📦 Orders from sellers (waiting for admin approval): ${orderCounts[0]}`);
    console.log(`🛒 Orders ready for customer pickup: ${orderCounts[1]}`);
    console.log(`🏢 Hub System: 14 districts, 14 hubs (one per district)`);

    console.log(`\n🎯 EXPECTED FOR ERNAKULAM HUB MANAGER:`);
    console.log(`   📦 Orders: 1 (from Ernakulam sellers)`);
    console.log(`   🚚 Dispatch: 3 (to Ernakulam buyers from Kottayam + TVM + Palakkad)`);

    console.log(`\n🎯 HUB WORKFLOW (CORRECTED):`);
    console.log(`   📦 ORDERS: Products FROM sellers TO their district hub (waiting for admin approval)`);
    console.log(`   🚚 DISPATCH: Products FROM other district hubs TO buyers in this district`);
    console.log(`   `);
    console.log(`   Example for Ernakulam Hub Manager:`);
    console.log(`   📦 Orders: Ernakulam sellers → Ernakulam hub`);
    console.log(`   🚚 Dispatch: Kottayam/TVM/Palakkad sellers → Ernakulam buyers (via Ernakulam hub)`);

    console.log(`\n✅ 14-HUB SYSTEM TEST DATA READY!`);

  } catch (error) {
    console.error("❌ Error creating test data:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the script
createTestData();