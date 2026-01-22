#!/usr/bin/env node

/**
 * Create 14 Hubs for Kerala's 14 Districts
 * One hub per district as per user requirement
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import models
const Hub = require("./models/Hub");
const HubManager = require("./models/HubManager");

console.log("🏢 CREATING 14 KERALA DISTRICT HUBS");
console.log("===================================");

async function createKeralaHubs() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/foodily-auth-app");
    console.log("✅ Connected to MongoDB");

    // Kerala's 14 districts with their details
    const keralaDistricts = [
      {
        district: "Thiruvananthapuram",
        hubId: "HUB-TVM-001",
        name: "Thiruvananthapuram Central Hub",
        city: "Thiruvananthapuram",
        pincode: "695001",
        icon: "🏛️"
      },
      {
        district: "Kollam",
        hubId: "HUB-KLM-001", 
        name: "Kollam Central Hub",
        city: "Kollam",
        pincode: "691001",
        icon: "⚓"
      },
      {
        district: "Pathanamthitta",
        hubId: "HUB-PTA-001",
        name: "Pathanamthitta Central Hub", 
        city: "Pathanamthitta",
        pincode: "689645",
        icon: "⛪"
      },
      {
        district: "Alappuzha",
        hubId: "HUB-ALP-001",
        name: "Alappuzha Central Hub",
        city: "Alappuzha", 
        pincode: "688001",
        icon: "🌴"
      },
      {
        district: "Kottayam",
        hubId: "HUB-KTM-001",
        name: "Kottayam Central Hub",
        city: "Kottayam",
        pincode: "686001", 
        icon: "📚"
      },
      {
        district: "Idukki",
        hubId: "HUB-IDK-001",
        name: "Idukki Central Hub",
        city: "Painavu",
        pincode: "685603",
        icon: "⛰️"
      },
      {
        district: "Ernakulam", 
        hubId: "HUB-ERN-001",
        name: "Ernakulam Central Hub",
        city: "Kochi",
        pincode: "682001",
        icon: "🏙️"
      },
      {
        district: "Thrissur",
        hubId: "HUB-TSR-001", 
        name: "Thrissur Central Hub",
        city: "Thrissur",
        pincode: "680001",
        icon: "🎭"
      },
      {
        district: "Palakkad",
        hubId: "HUB-PKD-001",
        name: "Palakkad Central Hub",
        city: "Palakkad",
        pincode: "678001",
        icon: "🌾"
      },
      {
        district: "Malappuram",
        hubId: "HUB-MPM-001",
        name: "Malappuram Central Hub", 
        city: "Malappuram",
        pincode: "676505",
        icon: "🕌"
      },
      {
        district: "Kozhikode",
        hubId: "HUB-KZK-001",
        name: "Kozhikode Central Hub",
        city: "Kozhikode",
        pincode: "673001", 
        icon: "🏖️"
      },
      {
        district: "Wayanad",
        hubId: "HUB-WYD-001",
        name: "Wayanad Central Hub",
        city: "Kalpetta",
        pincode: "673121",
        icon: "🌲"
      },
      {
        district: "Kannur", 
        hubId: "HUB-KNR-001",
        name: "Kannur Central Hub",
        city: "Kannur",
        pincode: "670001",
        icon: "🏰"
      },
      {
        district: "Kasaragod",
        hubId: "HUB-KSD-001", 
        name: "Kasaragod Central Hub",
        city: "Kasaragod",
        pincode: "671121",
        icon: "🏝️"
      }
    ];

    console.log(`\n🏢 Creating ${keralaDistricts.length} district hubs...`);

    // Clear existing hubs first
    await Hub.deleteMany({});
    console.log("🧹 Cleared existing hubs");

    // Create hubs for each district
    for (const districtData of keralaDistricts) {
      const hubData = {
        hubId: districtData.hubId,
        name: districtData.name,
        district: districtData.district,
        location: {
          address: {
            street: "Central Hub Location",
            city: districtData.city,
            state: "Kerala",
            pincode: districtData.pincode
          },
          coordinates: {
            latitude: 0, // You can add real coordinates later
            longitude: 0
          }
        },
        contactInfo: {
          phone: "+91 9876543210",
          email: `${districtData.district.toLowerCase()}.hub@craftedbyher.com`,
          whatsapp: "+91 9876543210"
        },
        capacity: {
          maxOrders: 1000,
          currentOrders: Math.floor(Math.random() * 200), // Random current load
          maxWeight: 5000,
          currentWeight: Math.floor(Math.random() * 1000)
        },
        operatingHours: {
          monday: { open: "09:00", close: "18:00", isOpen: true },
          tuesday: { open: "09:00", close: "18:00", isOpen: true },
          wednesday: { open: "09:00", close: "18:00", isOpen: true },
          thursday: { open: "09:00", close: "18:00", isOpen: true },
          friday: { open: "09:00", close: "18:00", isOpen: true },
          saturday: { open: "09:00", close: "16:00", isOpen: true },
          sunday: { open: "10:00", close: "14:00", isOpen: true }
        },
        facilities: ["Storage", "Packaging", "Quality Check", "Customer Pickup"],
        status: "active",
        managerId: null, // Will be assigned when hub managers are created
        managerName: "",
        createdBy: "system_setup"
      };

      await Hub.findOneAndUpdate(
        { hubId: districtData.hubId },
        hubData,
        { upsert: true, new: true }
      );

      console.log(`✅ ${districtData.icon} ${districtData.district} Hub created`);
    }

    console.log(`\n📊 KERALA HUB SYSTEM SUMMARY`);
    console.log(`============================`);
    console.log(`🏢 Total Hubs: ${keralaDistricts.length}`);
    console.log(`🗺️ Districts Covered: ${keralaDistricts.length}`);
    console.log(`📍 One Hub Per District: ✅`);
    
    console.log(`\n🎯 HUB STRUCTURE:`);
    keralaDistricts.forEach(district => {
      console.log(`   ${district.icon} ${district.district} → ${district.hubId}`);
    });

    console.log(`\n✅ KERALA 14-DISTRICT HUB SYSTEM READY!`);
    console.log(`Each district now has exactly one central hub for both:`);
    console.log(`   📦 Seller Hub Orders (products arriving from sellers)`);
    console.log(`   🛒 Customer Hub Orders (products ready for customer pickup)`);

  } catch (error) {
    console.error("❌ Error creating Kerala hubs:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the script
createKeralaHubs();