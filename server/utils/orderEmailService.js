const nodemailer = require("nodemailer");

// Email configuration - EXACTLY like seller email service
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = (process.env.SMTP_SECURE || 'false') === 'true';
  const rawPass = process.env.EMAIL_PASS || '';
  const sanitizedPass = (process.env.SMTP_HOST || '').includes('gmail')
    ? rawPass.replace(/\s+/g, '')
    : rawPass;
  
  // Log email configuration for debugging
  console.log('📧 Order Email configuration:', { 
    host, 
    port, 
    secure, 
    user: process.env.EMAIL_USER || 'NOT SET',
    hasPassword: !!process.env.EMAIL_PASS && process.env.EMAIL_PASS !== 'your-app-password'
  });
  
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: sanitizedPass
    }
  });
};

// Check if email is configured
const isEmailConfigured = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;
  return user && pass && user !== 'your-email@gmail.com' && pass !== 'your-app-password-here';
};

console.log("📧 Order Email service status:", isEmailConfigured() ? "CONFIGURED ✅" : "NOT CONFIGURED ⚠️");

// Send order confirmation email to buyer
const sendOrderConfirmationEmail = async (order, buyerEmail) => {
  console.log('\n========================================');
  console.log('🔔 ORDER CONFIRMATION EMAIL FUNCTION CALLED');
  console.log('========================================');
  console.log('Buyer Email:', buyerEmail);
  console.log('Order Number:', order.orderNumber);
  console.log('Email User (FROM):', process.env.EMAIL_USER || 'NOT SET');
  console.log('========================================\n');
  
  try {
    // Validate buyer email
    if (!buyerEmail || !buyerEmail.includes('@')) {
      console.error('❌ INVALID BUYER EMAIL:', buyerEmail);
      return { success: false, error: 'Invalid buyer email address' };
    }
    
    // Create transporter - same as seller emails
    const transporter = createTransporter();
    
    // Professional sender with project name
    const senderName = process.env.SENDER_NAME || 'CraftedByHer';
    const senderEmail = process.env.EMAIL_USER || 'noreply@craftedbyher.com';
    const fromAddress = `${senderName} <${senderEmail}>`;
    
    const itemsList = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          ${item.title} (${item.variant.weight})
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
          ₹${item.variant.price}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
          ₹${item.variant.price * item.quantity}
        </td>
      </tr>
    `).join('');

    const mailOptions = {
      from: fromAddress,
      to: buyerEmail,
      subject: `Order Confirmation - ${order.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #5c4033 0%, #8b6f47 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
            .order-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .total-row { font-weight: bold; font-size: 18px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #5c4033; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🎉 Order Confirmed!</h1>
              <p style="margin: 10px 0 0 0;">Thank you for your order</p>
            </div>
            
            <div class="content">
              <h2>Hi ${order.buyerDetails.name},</h2>
              <p>Your order has been confirmed and is being processed. We'll notify you once it's ready for delivery.</p>
              
              <div class="order-details">
                <h3 style="margin-top: 0;">Order Details</h3>
                <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-IN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
                <p><strong>Payment Method:</strong> ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
                <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
              </div>
              
              <h3>Items Ordered</h3>
              <table class="table">
                <thead>
                  <tr style="background: #f8f9fa;">
                    <th style="padding: 10px; text-align: left;">Item</th>
                    <th style="padding: 10px; text-align: center;">Qty</th>
                    <th style="padding: 10px; text-align: right;">Price</th>
                    <th style="padding: 10px; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsList}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" style="padding: 10px; text-align: right;">Subtotal:</td>
                    <td style="padding: 10px; text-align: right;">₹${order.totalAmount}</td>
                  </tr>
                  <tr>
                    <td colspan="3" style="padding: 10px; text-align: right;">Shipping:</td>
                    <td style="padding: 10px; text-align: right;">₹${order.shippingCharges}</td>
                  </tr>
                  <tr class="total-row">
                    <td colspan="3" style="padding: 10px; text-align: right; border-top: 2px solid #5c4033;">Total:</td>
                    <td style="padding: 10px; text-align: right; border-top: 2px solid #5c4033;">₹${order.finalAmount}</td>
                  </tr>
                </tfoot>
              </table>
              
              <h3>Delivery Address</h3>
              <div class="order-details">
                <p><strong>${order.buyerDetails.name}</strong></p>
                <p>${order.buyerDetails.address.street}</p>
                <p>${order.buyerDetails.address.city}, ${order.buyerDetails.address.state} - ${order.buyerDetails.address.pincode}</p>
                ${order.buyerDetails.address.landmark ? `<p>Landmark: ${order.buyerDetails.address.landmark}</p>` : ''}
                <p>Phone: ${order.buyerDetails.phone}</p>
              </div>
              
              <div style="text-align: center;">
                <a href="http://localhost:5173/orders" class="button">Track Your Order</a>
              </div>
              
              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                If you have any questions about your order, please contact us at support@craftedbyher.com
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 0; color: #666;">© 2024 CraftedByHer. All rights reserved.</p>
              <p style="margin: 10px 0 0 0; color: #666;">Supporting women artisans across Kerala</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    console.log('📧 ATTEMPTING TO SEND ORDER CONFIRMATION EMAIL...');
    console.log('From:', mailOptions.from);
    console.log('To:', mailOptions.to);
    console.log('Subject:', mailOptions.subject);
    
    await transporter.sendMail(mailOptions);
    
    console.log('✅✅✅ ORDER CONFIRMATION EMAIL SENT SUCCESSFULLY! ✅✅✅');
    console.log('========================================\n');
    return { success: true };
  } catch (error) {
    console.error('\n❌❌❌ ORDER EMAIL SENDING FAILED ❌❌❌');
    console.error('Error Type:', error.constructor.name);
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code || 'N/A');
    console.error('========================================\n');
    return { success: false, error: error.message };
  }
};

// Send order notification email to admin
const sendAdminOrderNotification = async (order) => {
  console.log('\n========================================');
  console.log('🔔 ADMIN ORDER NOTIFICATION EMAIL FUNCTION CALLED');
  console.log('========================================');
  console.log('Order Number:', order.orderNumber);
  console.log('========================================\n');
  
  try {
    // Create transporter - same as seller emails
    const transporter = createTransporter();
    
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    
    // Professional sender with project name
    const senderName = process.env.SENDER_NAME || 'CraftedByHer';
    const senderEmail = process.env.EMAIL_USER || 'noreply@craftedbyher.com';
    const fromAddress = `${senderName} <${senderEmail}>`;
    
    const mailOptions = {
      from: fromAddress,
      to: adminEmail,
      subject: `New Order Received - ${order.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #5c4033; color: white; padding: 20px; text-align: center; }
            .content { background: #fff; padding: 20px; border: 1px solid #ddd; }
            .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🔔 New Order Alert</h2>
            </div>
            <div class="content">
              <div class="alert">
                <strong>Action Required:</strong> A new order needs to be processed
              </div>
              <p><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p><strong>Customer:</strong> ${order.buyerDetails.name}</p>
              <p><strong>Total Amount:</strong> ₹${order.finalAmount}</p>
              <p><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
              <p><strong>Items:</strong> ${order.items.length}</p>
              <p style="margin-top: 20px;">
                <a href="http://localhost:5173/admin" style="display: inline-block; padding: 10px 20px; background: #5c4033; color: white; text-decoration: none; border-radius: 5px;">
                  View in Admin Dashboard
                </a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    console.log('📧 ATTEMPTING TO SEND ADMIN NOTIFICATION EMAIL...');
    console.log('From:', mailOptions.from);
    console.log('To:', mailOptions.to);
    console.log('Subject:', mailOptions.subject);
    
    await transporter.sendMail(mailOptions);
    
    console.log('✅✅✅ ADMIN NOTIFICATION EMAIL SENT SUCCESSFULLY! ✅✅✅');
    console.log('========================================\n');
    return { success: true };
  } catch (error) {
    console.error('\n❌❌❌ ADMIN EMAIL SENDING FAILED ❌❌❌');
    console.error('Error Type:', error.constructor.name);
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code || 'N/A');
    console.error('========================================\n');
    return { success: false, error: error.message };
  }
};

// Send OTP email to customer for order pickup
const sendOrderOTPEmail = async (order, otp) => {
  console.log('\n========================================');
  console.log('🔔 ORDER OTP EMAIL FUNCTION CALLED');
  console.log('========================================');
  console.log('Customer Email:', order.buyerDetails.email);
  console.log('Order Number:', order.orderNumber);
  console.log('OTP:', otp);
  console.log('========================================\n');
  
  try {
    // Validate customer email
    if (!order.buyerDetails.email || !order.buyerDetails.email.includes('@')) {
      console.error('❌ INVALID CUSTOMER EMAIL:', order.buyerDetails.email);
      return { success: false, error: 'Invalid customer email address' };
    }
    
    // Create transporter
    const transporter = createTransporter();
    
    // Professional sender with project name
    const senderName = process.env.SENDER_NAME || 'CraftedByHer';
    const senderEmail = process.env.EMAIL_USER || 'noreply@craftedbyher.com';
    const fromAddress = `${senderName} <${senderEmail}>`;
    
    const mailOptions = {
      from: fromAddress,
      to: order.buyerDetails.email,
      subject: `Your Order is Out for Delivery - OTP: ${otp}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
            .otp-box { background: #f8f9fa; border: 2px solid #28a745; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; color: #28a745; letter-spacing: 8px; margin: 10px 0; }
            .order-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
            .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🚚 Out for Delivery!</h1>
              <p style="margin: 10px 0 0 0;">Your order is on its way</p>
            </div>
            
            <div class="content">
              <h2>Hi ${order.buyerDetails.name},</h2>
              <p>Great news! Your order has been approved by our admin and is now <strong>out for delivery</strong> to your nearest hub.</p>
              
              <div class="otp-box">
                <h3 style="margin-top: 0; color: #28a745;">🔐 Your Pickup OTP</h3>
                <div class="otp-code">${otp}</div>
                <p style="margin-bottom: 0; color: #666; font-size: 14px;">Please keep this OTP safe. You'll need it to collect your order.</p>
              </div>
              
              <div class="order-details">
                <h3 style="margin-top: 0;">Order Details</h3>
                <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                <p><strong>Total Amount:</strong> ₹${order.finalAmount}</p>
                <p><strong>Items:</strong> ${order.items.length} item(s)</p>
                <p><strong>Delivery Hub:</strong> ${order.hubTracking.customerHubName}</p>
                <p><strong>Hub District:</strong> ${order.hubTracking.customerHubDistrict}</p>
              </div>
              
              <div class="alert">
                <strong>📍 Next Steps:</strong>
                <ul style="margin: 10px 0;">
                  <li>Your order will arrive at <strong>${order.hubTracking.customerHubName}</strong> within 2-4 hours</li>
                  <li>You'll receive another notification when it's ready for pickup</li>
                  <li>Bring your OTP <strong>${otp}</strong> when collecting your order</li>
                  <li>Valid ID may be required for verification</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost:5173/orders" style="display: inline-block; padding: 12px 30px; background: #28a745; color: white; text-decoration: none; border-radius: 5px;">
                  Track Your Order
                </a>
              </div>
              
              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                <strong>Need Help?</strong><br>
                Contact us at support@craftedbyher.com or call our customer service.
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 0; color: #666;">© 2024 CraftedByHer. All rights reserved.</p>
              <p style="margin: 10px 0 0 0; color: #666;">Supporting women artisans across Kerala</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    console.log('📧 ATTEMPTING TO SEND OTP EMAIL...');
    console.log('From:', mailOptions.from);
    console.log('To:', mailOptions.to);
    console.log('Subject:', mailOptions.subject);
    
    await transporter.sendMail(mailOptions);
    
    console.log('✅✅✅ OTP EMAIL SENT SUCCESSFULLY! ✅✅✅');
    console.log('========================================\n');
    return { success: true };
  } catch (error) {
    console.error('\n❌❌❌ OTP EMAIL SENDING FAILED ❌❌❌');
    console.error('Error Type:', error.constructor.name);
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code || 'N/A');
    console.error('========================================\n');
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOrderConfirmationEmail,
  sendAdminOrderNotification,
  sendOrderOTPEmail
};
