#!/usr/bin/env node

/**
 * Update Razorpay Keys Script
 * This script updates your Razorpay keys while preserving your MongoDB connection
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🔧 Update Razorpay Keys (MongoDB Connection Preserved)');
console.log('=====================================================\n');

console.log('📋 Your current .env file contains:');
console.log('✅ MongoDB Connection: PRESERVED (will not be changed)');
console.log('❌ Razorpay Keys: Placeholder values (need to be updated)\n');

console.log('📋 Instructions:');
console.log('1. Go to https://dashboard.razorpay.com/');
console.log('2. Sign in to your Razorpay account');
console.log('3. Go to Settings > API Keys');
console.log('4. Copy your Key ID and Key Secret');
console.log('5. Enter them below\n');

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function updateRazorpayKeys() {
  try {
    const envPath = path.join(__dirname, '.env');
    
    if (!fs.existsSync(envPath)) {
      console.log('❌ .env file not found!');
      process.exit(1);
    }
    
    // Read current .env file
    const envContent = fs.readFileSync(envPath, 'utf8');
    console.log('📄 Current .env file content:');
    console.log(envContent.replace(/RAZORPAY_KEY_SECRET=.*/, 'RAZORPAY_KEY_SECRET=***hidden***'));
    console.log();
    
    console.log('🔑 Enter your NEW Razorpay credentials:\n');
    
    const keyId = await askQuestion('Razorpay Key ID (starts with rzp_test_ or rzp_live_): ');
    const keySecret = await askQuestion('Razorpay Key Secret: ');
    
    if (!keyId || !keySecret) {
      console.log('\n❌ Both Key ID and Key Secret are required!');
      process.exit(1);
    }
    
    if (!keyId.startsWith('rzp_')) {
      console.log('\n❌ Invalid Key ID format. It should start with "rzp_test_" or "rzp_live_"');
      process.exit(1);
    }
    
    if (keyId === 'rzp_test_1234567890' || keySecret === 'test_secret_key_1234567890') {
      console.log('\n❌ Please enter your REAL Razorpay keys, not the placeholder values!');
      process.exit(1);
    }
    
    // Update the .env file
    const lines = envContent.split('\n');
    let updated = false;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('RAZORPAY_KEY_ID=')) {
        lines[i] = `RAZORPAY_KEY_ID=${keyId}`;
        updated = true;
      } else if (lines[i].startsWith('RAZORPAY_KEY_SECRET=')) {
        lines[i] = `RAZORPAY_KEY_SECRET=${keySecret}`;
        updated = true;
      }
    }
    
    if (!updated) {
      console.log('\n❌ Could not find Razorpay keys in .env file!');
      process.exit(1);
    }
    
    const newContent = lines.join('\n');
    
    console.log('\n📋 Updated configuration:');
    console.log('✅ MongoDB Connection: PRESERVED');
    console.log(`✅ Razorpay Key ID: ${keyId}`);
    console.log(`✅ Razorpay Key Secret: ${'*'.repeat(keySecret.length)}`);
    
    const confirm = await askQuestion('\n✅ Save these changes? (y/n): ');
    
    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
      fs.writeFileSync(envPath, newContent);
      console.log('\n🎉 Razorpay keys updated successfully!');
      console.log('\n📋 Next steps:');
      console.log('1. Restart your server: npm start');
      console.log('2. Test a payment - you should now see the Razorpay gateway');
      console.log('3. Your MongoDB connection remains unchanged');
      console.log('\n✅ Your data is safe - no MongoDB changes were made!');
    } else {
      console.log('\n❌ Update cancelled.');
    }
    
  } catch (error) {
    console.log('\n❌ Update failed:', error.message);
  } finally {
    rl.close();
  }
}

// Run the update
updateRazorpayKeys();

