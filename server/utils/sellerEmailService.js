const nodemailer = require('nodemailer');

// Email configuration - using Gmail SMTP (you can change this to your preferred email service)
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = (process.env.SMTP_SECURE || 'false') === 'true';
  const rawPass = process.env.EMAIL_PASS || '';
  const sanitizedPass = (process.env.SMTP_HOST || '').includes('gmail')
    ? rawPass.replace(/\s+/g, '')
    : rawPass;
  
  // Log email configuration for debugging (without exposing passwords)
  console.log('Email configuration:', { 
    host, 
    port, 
    secure, 
    user: process.env.EMAIL_USER || 'NOT SET',
    hasPassword: !!process.env.EMAIL_PASS && process.env.EMAIL_PASS !== 'your-app-password'
  });
  
  // Create transporter - let nodemailer handle errors if config is missing
  // This way it works the same as admin notification emails
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

// Send email notification to seller when they are approved
// NOTE: This is ONLY called after admin approval (not on registration)
const sendSellerApprovalNotification = async (sellerEmail, sellerName) => {
  console.log('\n========================================');
  console.log('🔔 SELLER APPROVAL EMAIL FUNCTION CALLED');
  console.log('========================================');
  console.log('Seller Email:', sellerEmail);
  console.log('Seller Name:', sellerName);
  console.log('Email User (FROM):', process.env.EMAIL_USER || 'NOT SET');
  console.log('SMTP Host:', process.env.SMTP_HOST || 'smtp.gmail.com');
  console.log('========================================\n');
  
  try {
    // Validate seller email
    if (!sellerEmail || !sellerEmail.includes('@')) {
      console.error('❌ INVALID SELLER EMAIL:', sellerEmail);
      return { success: false, error: 'Invalid seller email address' };
    }
    
    // EXACTLY like admin notification - just try to create transporter and send
    // If admin emails work, seller emails will work with same config
    const transporter = createTransporter();
    
    // Professional sender with project name
    const senderName = process.env.SENDER_NAME || 'CraftedByHer';
    const senderEmail = process.env.EMAIL_USER || 'noreply@craftedbyher.com';
    const fromAddress = `${senderName} <${senderEmail}>`;
    
    const mailOptions = {
      from: fromAddress,
      to: sellerEmail,
      subject: '🎉 Your seller application has been approved - CraftedByHer',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #5c4033; margin: 0; font-size: 28px;">🎉 CraftedByHer</h1>
              <p style="color: #888; margin: 5px 0 0 0;">Empowering Women Artisans</p>
            </div>
            
            <div style="border-left: 4px solid #5c4033; padding-left: 20px; margin: 20px 0;">
              <h2 style="color: #5c4033; margin: 0 0 10px 0;">Congratulations! Your Application is Approved ✅</h2>
            </div>
            
            <p style="color: #333; line-height: 1.6; font-size: 16px;">Hello <strong>${sellerName || 'Seller'}</strong>,</p>
            
            <p style="color: #333; line-height: 1.6; font-size: 16px;">
              Great news! Your seller application has been <strong style="color: #28a745;">approved</strong> by our admin team. 
              You can now log in to your account and start selling your products on CraftedByHer.
            </p>
            
            <div style="background-color: #f0f8ff; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h3 style="color: #5c4033; margin-top: 0;">🚀 Next Steps:</h3>
              <ul style="color: #333; line-height: 1.8; padding-left: 20px;">
                <li>Log in to your seller dashboard</li>
                <li>Add your products with descriptions and images</li>
                <li>Set prices and manage inventory</li>
                <li>Start receiving orders from customers</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" 
                 style="background-color: #5c4033; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
                Login to Your Account
              </a>
            </div>
            
            <div style="border-top: 2px solid #eee; margin-top: 30px; padding-top: 20px;">
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                If you have any questions or need assistance, please don't hesitate to contact our support team.
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                Best regards,<br/>
                <strong style="color: #5c4033;">The CraftedByHer Team</strong>
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                This is an automated message from CraftedByHer. Please do not reply to this email.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
CraftedByHer - Empowering Women Artisans

Congratulations! Your Application is Approved ✅

Hello ${sellerName || 'Seller'},

Great news! Your seller application has been approved by our admin team. You can now log in to your account and start selling your products on CraftedByHer.

Next Steps:
• Log in to your seller dashboard
• Add your products with descriptions and images
• Set prices and manage inventory
• Start receiving orders from customers

Login URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}/login

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
The CraftedByHer Team

---
This is an automated message from CraftedByHer. Please do not reply to this email.
      `
    };
    
    console.log('📧 ATTEMPTING TO SEND EMAIL...');
    console.log('From:', mailOptions.from);
    console.log('To:', mailOptions.to);
    console.log('Subject:', mailOptions.subject);
    
    // Send the email - same as admin notification
    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅✅✅ EMAIL SENT SUCCESSFULLY! ✅✅✅');
    console.log('Message ID:', result.messageId);
    console.log('Response:', result.response);
    console.log('Accepted recipients:', result.accepted);
    console.log('Rejected recipients:', result.rejected);
    console.log('========================================\n');
    
    return { success: true, messageId: result.messageId, response: result.response };
  } catch (error) {
    console.error('\n❌❌❌ EMAIL SENDING FAILED ❌❌❌');
    console.error('Error Type:', error.constructor.name);
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code || 'N/A');
    console.error('Error Command:', error.command || 'N/A');
    console.error('Error Response:', error.response || 'N/A');
    if (error.stack) {
      console.error('Error Stack:', error.stack);
    }
    console.error('========================================\n');
    return { success: false, error: error.message };
  }
};

// Send email notification to admin when new seller registers
const sendAdminNewSellerNotification = async (sellerData) => {
  try {
    const transporter = createTransporter();
    
    // Get admin email from environment or use default
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'admin@craftedbyher.com';
    
    // Professional sender with project name
    const senderName = process.env.SENDER_NAME || 'CraftedByHer';
    const senderEmail = process.env.EMAIL_USER || 'noreply@craftedbyher.com';
    const fromAddress = `${senderName} <${senderEmail}>`;
    
    const mailOptions = {
      from: fromAddress,
      to: adminEmail,
      subject: `🔔 New Seller Registration - ${sellerData.businessName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #5c4033;">New Seller Registration Request</h2>
          
          <p>Hello Admin,</p>
          
          <p>A new seller has registered and submitted their application for approval.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #5c4033; margin-top: 0;">Seller Details</h3>
            <p><strong>Business Name:</strong> ${sellerData.businessName}</p>
            <p><strong>Email:</strong> ${sellerData.email}</p>
            <p><strong>License Number:</strong> ${sellerData.licenseNumber}</p>
            <p><strong>Phone:</strong> ${sellerData.phone}</p>
            <p><strong>Application ID:</strong> ${sellerData.applicationId}</p>
            <p><strong>Submitted At:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #856404; margin-top: 0;">⚠️ Action Required</h4>
            <p>Please review the seller's application and documents in the admin dashboard. You can approve or reject the application after reviewing their submitted documents.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.ADMIN_DASHBOARD_URL || 'http://localhost:5173/admin'}" 
               style="background-color: #5c4033; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Review Application
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            This is an automated notification from CraftedByHer seller registration system.
          </p>
        </div>
      `
    };
    
    console.log('Attempting to send admin notification email to:', adminEmail);
    const result = await transporter.sendMail(mailOptions);
    console.log('Admin notification email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending admin notification email:', error);
    // Log additional error details for debugging
    if (error.code) console.error('Error code:', error.code);
    if (error.command) console.error('Error command:', error.command);
    if (error.response) console.error('Error response:', error.response);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendSellerApprovalNotification,
  sendAdminNewSellerNotification
};