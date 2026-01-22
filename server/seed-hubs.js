const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const Hub = require("./models/Hub");

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '.env') });

// Kerala districts with their hub details
const keralaHubs = [
  {
    name: "Thiruvananthapuram Central Hub",
    district: "Thiruvananthapuram",
    location: {
      address: {
        street: "Statue Junction, MG Road",
        city: "Thiruvananthapuram",
        state: "Kerala",
        pincode: "695001",
        landmark: "Near Secretariat"
      },
      coordinates: {
        latitude: 8.5241,
        longitude: 76.9366
      }
    },
    contactInfo: {
      phone: "9876543210",
      email: "hub.tvm@craftedbyher.com",
      alternatePhone: "9876543211"
    }
  },
  {
    name: "Kollam District Hub",
    district: "Kollam",
    location: {
      address: {
        street: "Chinnakada, Main Road",
        city: "Kollam",
        state: "Kerala",
        pincode: "691001",
        landmark: "Near Clock Tower"
      },
      coordinates: {
        latitude: 8.8932,
        longitude: 76.6141
      }
    },
    contactInfo: {
      phone: "9876543212",
      email: "hub.kollam@craftedbyher.com"
    }
  },
  {
    name: "Pathanamthitta Hub",
    district: "Pathanamthitta",
    location: {
      address: {
        street: "Kozhencherry Road",
        city: "Pathanamthitta",
        state: "Kerala",
        pincode: "689645",
        landmark: "Near District Collectorate"
      },
      coordinates: {
        latitude: 9.2648,
        longitude: 76.7870
      }
    },
    contactInfo: {
      phone: "9876543213",
      email: "hub.pathanamthitta@craftedbyher.com"
    }
  },
  {
    name: "Alappuzha Hub",
    district: "Alappuzha",
    location: {
      address: {
        street: "Mullakkal, Beach Road",
        city: "Alappuzha",
        state: "Kerala",
        pincode: "688011",
        landmark: "Near Alappuzha Beach"
      },
      coordinates: {
        latitude: 9.4981,
        longitude: 76.3388
      }
    },
    contactInfo: {
      phone: "9876543214",
      email: "hub.alappuzha@craftedbyher.com"
    }
  },
  {
    name: "Kottayam Central Hub",
    district: "Kottayam",
    location: {
      address: {
        street: "MC Road, Nagampadam",
        city: "Kottayam",
        state: "Kerala",
        pincode: "686001",
        landmark: "Near Kottayam Railway Station"
      },
      coordinates: {
        latitude: 9.5916,
        longitude: 76.5222
      }
    },
    contactInfo: {
      phone: "9876543215",
      email: "hub.kottayam@craftedbyher.com"
    }
  },
  {
    name: "Idukki Hub",
    district: "Idukki",
    location: {
      address: {
        street: "Thodupuzha Road",
        city: "Thodupuzha",
        state: "Kerala",
        pincode: "685584",
        landmark: "Near Thodupuzha Town"
      },
      coordinates: {
        latitude: 9.8944,
        longitude: 76.7172
      }
    },
    contactInfo: {
      phone: "9876543216",
      email: "hub.idukki@craftedbyher.com"
    }
  },
  {
    name: "Ernakulam Central Hub",
    district: "Ernakulam",
    location: {
      address: {
        street: "MG Road, Ravipuram",
        city: "Kochi",
        state: "Kerala",
        pincode: "682016",
        landmark: "Near Ernakulam South Railway Station"
      },
      coordinates: {
        latitude: 9.9312,
        longitude: 76.2673
      }
    },
    contactInfo: {
      phone: "9876543217",
      email: "hub.ernakulam@craftedbyher.com",
      alternatePhone: "9876543218"
    }
  },
  {
    name: "Thrissur Hub",
    district: "Thrissur",
    location: {
      address: {
        street: "Round South, Swaraj Round",
        city: "Thrissur",
        state: "Kerala",
        pincode: "680001",
        landmark: "Near Vadakkumnathan Temple"
      },
      coordinates: {
        latitude: 10.5276,
        longitude: 76.2144
      }
    },
    contactInfo: {
      phone: "9876543219",
      email: "hub.thrissur@craftedbyher.com"
    }
  },
  {
    name: "Palakkad Hub",
    district: "Palakkad",
    location: {
      address: {
        street: "English Church Road",
        city: "Palakkad",
        state: "Kerala",
        pincode: "678001",
        landmark: "Near Palakkad Fort"
      },
      coordinates: {
        latitude: 10.7867,
        longitude: 76.6548
      }
    },
    contactInfo: {
      phone: "9876543220",
      email: "hub.palakkad@craftedbyher.com"
    }
  },
  {
    name: "Malappuram Hub",
    district: "Malappuram",
    location: {
      address: {
        street: "Manjeri Road",
        city: "Malappuram",
        state: "Kerala",
        pincode: "676505",
        landmark: "Near District Collectorate"
      },
      coordinates: {
        latitude: 11.0510,
        longitude: 76.0711
      }
    },
    contactInfo: {
      phone: "9876543221",
      email: "hub.malappuram@craftedbyher.com"
    }
  },
  {
    name: "Kozhikode Central Hub",
    district: "Kozhikode",
    location: {
      address: {
        street: "SM Street, Town Hall",
        city: "Kozhikode",
        state: "Kerala",
        pincode: "673001",
        landmark: "Near Kozhikode Beach"
      },
      coordinates: {
        latitude: 11.2588,
        longitude: 75.7804
      }
    },
    contactInfo: {
      phone: "9876543222",
      email: "hub.kozhikode@craftedbyher.com",
      alternatePhone: "9876543223"
    }
  },
  {
    name: "Wayanad Hub",
    district: "Wayanad",
    location: {
      address: {
        street: "Kalpetta Town",
        city: "Kalpetta",
        state: "Kerala",
        pincode: "673121",
        landmark: "Near Kalpetta Bus Stand"
      },
      coordinates: {
        latitude: 11.6085,
        longitude: 76.0842
      }
    },
    contactInfo: {
      phone: "9876543224",
      email: "hub.wayanad@craftedbyher.com"
    }
  },
  {
    name: "Kannur Hub",
    district: "Kannur",
    location: {
      address: {
        street: "Fort Road, Payyambalam",
        city: "Kannur",
        state: "Kerala",
        pincode: "670001",
        landmark: "Near Kannur Fort"
      },
      coordinates: {
        latitude: 11.8745,
        longitude: 75.3704
      }
    },
    contactInfo: {
      phone: "9876543225",
      email: "hub.kannur@craftedbyher.com"
    }
  },
  {
    name: "Kasaragod Hub",
    district: "Kasaragod",
    location: {
      address: {
        street: "Vidyanagar, NH 66",
        city: "Kasaragod",
        state: "Kerala",
        pincode: "671121",
        landmark: "Near Kasaragod Railway Station"
      },
      coordinates: {
        latitude: 12.4996,
        longitude: 74.9869
      }
    },
    contactInfo: {
      phone: "9876543226",
      email: "hub.kasaragod@craftedbyher.com"
    }
  }
];

async function seedHubs() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/foodily-auth-app";
    console.log("🔌 Connecting to MongoDB...");
    
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB connected");

    // Clear existing hubs (optional - comment out if you want to keep existing data)
    // await Hub.deleteMany({});
    // console.log("🗑️  Cleared existing hubs");

    // Check if hubs already exist
    const existingCount = await Hub.countDocuments();
    if (existingCount > 0) {
      console.log(`ℹ️  ${existingCount} hubs already exist. Skipping seed.`);
      console.log("💡 To re-seed, delete existing hubs first or uncomment the deleteMany line.");
      process.exit(0);
    }

    // Create hubs
    const createdHubs = [];
    for (let i = 0; i < keralaHubs.length; i++) {
      const hubData = keralaHubs[i];
      const hubId = `HUB${String(i + 1).padStart(4, '0')}`;
      
      const hub = new Hub({
        hubId,
        ...hubData,
        status: 'active',
        createdBy: 'system-seed'
      });

      await hub.save();
      createdHubs.push(hub);
      console.log(`✅ Created ${hub.name} (${hub.hubId})`);
    }

    console.log(`\n🎉 Successfully created ${createdHubs.length} hubs across Kerala!`);
    console.log("\n📋 Hub Summary:");
    createdHubs.forEach(hub => {
      console.log(`   ${hub.hubId}: ${hub.name} - ${hub.district}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding hubs:", error);
    process.exit(1);
  }
}

// Run the seed function
seedHubs();
