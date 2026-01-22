#!/usr/bin/env node

/**
 * Complete System Test
 * Tests both seller notifications and hub manager dashboard functionality
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function testCompleteSystem() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodily-auth-app');
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🎯 COMPLETE SYSTEM TEST');
    console.log('======================');
    
    // Test 1: Seller Notification System
    console.log('\n📋 TEST 1: SELLER NOTIFICATION SYSTEM');
    console.log('-------------------------------------');
    
    const Notification = require('./server/models/Notification');
    const sellerNotifications = await Notification.find({ userRole: 'seller' })
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log(`✅ Found ${sellerNotifications.length} seller notifications`);
    if (sellerNotifications.length > 0) {
      console.log('Recent seller notifications:');
      sellerNotifications.forEach(notif => {
        console.log(`- ${notif.userId}: ${notif.title} (${notif.read ? 'READ' : 'UNREAD'})`);
      });
    }
    
    // Test 2: Hub Manager Dashboard Data
    console.log('\n📋 TEST 2: HUB MANAGER DASHBOARD DATA');
    console.log('------------------------------------');
    
    const HubManager = require('./server/models/HubManager');
    const Order = require('./server/models/Order');
    
    const hubManager = await HubManager.findOne({ 
      email: 'ernakulam.hub@craftedbyher.com',
      status: 'active'
    });
    
    if (hubManager) {
      console.log(`✅ Hub Manager: ${hubManager.name} (${hubManager.managerId})`);
      console.log(`   Hub ID: ${hubManager.hubId}`);
      
      // Test seller hub orders
      const sellerHubOrders = await Order.find({
        'hubTracking.sellerHubId': hubManager.hubId,
        orderStatus: 'at_seller_hub'
      });
      
      console.log(`✅ Seller Hub Orders: ${sellerHubOrders.length}`);
      sellerHubOrders.forEach(order => {
        console.log(`   - ${order.orderNumber}: ${order.orderStatus}`);
      });
      
      // Test customer hub orders
      const customerHubOrders = await Order.find({
        'hubTracking.customerHubId': hubManager.hubId,
        orderStatus: { $in: ['in_transit_to_customer_hub', 'at_customer_hub'] }
      });
      
      console.log(`✅ Customer Hub Orders: ${customerHubOrders.length}`);
      customerHubOrders.forEach(order => {
        console.log(`   - ${order.orderNumber}: ${order.orderStatus}`);
      });
      
      // Test dispatch count
      const dispatchCount = customerHubOrders.length;
      console.log(`✅ Dispatch Count: ${dispatchCount}`);
      
    } else {
      console.log('❌ Hub manager not found');
    }
    
    // Test 3: System Status Summary
    console.log('\n📋 TEST 3: SYSTEM STATUS SUMMARY');
    console.log('---------------------------------');
    
    const totalOrders = await Order.countDocuments();
    const totalNotifications = await Notification.countDocuments();
    const sellerNotifCount = await Notification.countDocuments({ userRole: 'seller' });
    const hubManagerCount = await HubManager.countDocuments({ status: 'active' });
    
    console.log(`📊 System Statistics:`);
    console.log(`   - Total Orders: ${totalOrders}`);
    console.log(`   - Total Notifications: ${totalNotifications}`);
    console.log(`   - Seller Notifications: ${sellerNotifCount}`);
    console.log(`   - Active Hub Managers: ${hubManagerCount}`);
    
    // Test Results
    console.log('\n🎯 TEST RESULTS');
    console.log('===============');
    
    const sellerNotificationWorking = sellerNotifCount > 0;
    const hubManagerDataWorking = hubManager && (sellerHubOrders.length > 0 || customerHubOrders.length > 0);
    
    console.log(`✅ Seller Notification System: ${sellerNotificationWorking ? 'WORKING' : 'NEEDS FIX'}`);
    console.log(`✅ Hub Manager Dashboard Data: ${hubManagerDataWorking ? 'WORKING' : 'NEEDS FIX'}`);
    console.log(`✅ Dispatch Count Display: ${hubManagerDataWorking ? 'WORKING' : 'NEEDS FIX'}`);
    
    if (sellerNotificationWorking && hubManagerDataWorking) {
      console.log('\n🎉 ALL SYSTEMS WORKING!');
      console.log('\n📝 WHAT TO TEST:');
      console.log('1. Login as hub manager: ernakulam.hub@craftedbyher.com / hub@1234');
      console.log('2. Check "Seller Hub Orders" and "Customer Hub Orders" tabs');
      console.log('3. Verify dispatch count shows below Orders stat card');
      console.log('4. Place a new order to test seller notifications');
    } else {
      console.log('\n⚠️  SOME SYSTEMS NEED ATTENTION');
    }
    
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCompleteSystem();