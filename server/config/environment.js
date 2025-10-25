// Environment Configuration
// This file sets up environment variables for the application

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Default configuration
const config = {
  // MongoDB Configuration - Keep your existing connection
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/foodily-auth-app",
  
  // Server Configuration
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Razorpay Configuration
  // You need to replace these with your actual Razorpay keys
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || 'rzp_test_your_key_id_here',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_secret_key_here',
  
  // Firebase Configuration
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  
  // JWT Secret
  JWT_SECRET: process.env.JWT_SECRET || 'delivery_jwt_secret_key_for_foodily_auth_2024_secure'
};

// Set environment variables if they're not already set
Object.keys(config).forEach(key => {
  if (!process.env[key]) {
    process.env[key] = config[key];
  }
});

module.exports = config;

