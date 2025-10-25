# Razorpay Setup Instructions

## 🚀 Quick Setup

Your MongoDB connection is **SAFE** and will **NOT** be removed during this setup.

### Step 1: Get Your Razorpay Keys

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Sign in to your account
3. Navigate to **Settings** > **API Keys**
4. Copy your **Key ID** and **Key Secret**

### Step 2: Configure Your Keys

**Option A: Use the Setup Script (Recommended)**
```bash
cd server
node setup-razorpay.js
```

**Option B: Manual Setup**
1. Create a `.env` file in the `server` directory
2. Add your keys:
```env
# MongoDB Configuration (PRESERVED - DO NOT CHANGE)
MONGO_URI=mongodb://localhost:27017/foodily-auth-app

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_your_actual_key_id
RAZORPAY_KEY_SECRET=your_actual_secret_key

# Server Configuration
PORT=5000
NODE_ENV=development
```

### Step 3: Restart Your Server
```bash
cd server
npm start
```

### Step 4: Test Payment

1. Go to your app and try to make a payment
2. You should now see the actual Razorpay payment gateway
3. Use Razorpay test cards for testing:
   - **Card Number**: 4111 1111 1111 1111
   - **Expiry**: Any future date
   - **CVV**: Any 3 digits

## 🔍 Troubleshooting

### Issue: Still seeing "Payment Successful" without Razorpay gateway

**Solution**: Check that your keys are correctly set:
1. Your Key ID should start with `rzp_test_` or `rzp_live_`
2. Your Key Secret should not contain placeholder text
3. Restart the server after updating keys

### Issue: MongoDB connection lost

**Don't worry!** Your MongoDB connection is preserved. The setup only adds Razorpay keys without touching your database configuration.

## 📋 What This Setup Does

✅ **Preserves** your existing MongoDB connection  
✅ **Adds** proper Razorpay configuration  
✅ **Enables** real Razorpay payment gateway  
✅ **Maintains** all your existing data (products, users, etc.)  

## 🔐 Security Notes

- Never commit your `.env` file to version control
- Use test keys for development
- Use live keys only for production
- Keep your secret keys secure

## 📞 Need Help?

If you encounter any issues:
1. Check that your Razorpay keys are valid
2. Ensure the server restarted after configuration
3. Verify your MongoDB connection is still working
4. Check the server console for any error messages


























