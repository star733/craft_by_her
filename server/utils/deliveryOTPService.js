// OTP Email Service for order delivery verification
const nodemailer = require("nodemailer");

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email to customer
async function sendDeliveryOTP(customerEmail, customerName, orderId, otp) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"CraftedByHer Delivery" <${process.env.EMAIL_USER}>`,
      to: customerEmail,
      subject: `🎁 Your Order ${orderId} is Ready for Pickup - OTP Verification`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #8b5e34 0%, #6d4c29 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #ffffff;
              padding: 30px;
              border: 1px solid #ddd;
              border-top: none;
            }
            .otp-box {
              background: #f8f9fa;
              border: 2px dashed #8b5e34;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 25px 0;
            }
            .otp-code {
              font-size: 36px;
              font-weight: bold;
              color: #8b5e34;
              letter-spacing: 8px;
              font-family: 'Courier New', monospace;
            }
            .info-box {
              background: #fff8f0;
              border-left: 4px solid #8b5e34;
              padding: 15px;
              margin: 20px 0;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              text-align: center;
              border-radius: 0 0 10px 10px;
              color: #666;
              font-size: 14px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: #8b5e34;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">🎁 Order Ready for Pickup!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your CraftedByHer order has arrived</p>
          </div>
          
          <div class="content">
            <p>Dear <strong>${customerName}</strong>,</p>
            
            <p>Great news! Your order <strong>${orderId}</strong> has reached your local hub and is ready for pickup.</p>
            
            <div class="otp-box">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your Delivery OTP</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">Valid for 24 hours</p>
            </div>
            
            <div class="info-box">
              <strong>📍 How to collect your order:</strong>
              <ol style="margin: 10px 0;">
                <li>Visit your nearest CraftedByHer hub</li>
                <li>Provide this OTP to the hub manager</li>
                <li>Verify your identity and collect your order</li>
              </ol>
            </div>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>Do not share this OTP with anyone</li>
              <li>This OTP is valid for 24 hours</li>
              <li>You'll need to show a valid ID at the hub</li>
            </ul>
            
            <p style="margin-top: 25px;">If you have any questions, please contact our support team.</p>
            
            <p style="margin-top: 25px;">
              Thank you for supporting women artisans! 🌟
            </p>
          </div>
          
          <div class="footer">
            <p><strong>CraftedByHer</strong> - Empowering Women Artisans</p>
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </body>
        </html>
      `,
      text: `
Dear ${customerName},

Your order ${orderId} has reached your local hub and is ready for pickup!

Your Delivery OTP: ${otp}
(Valid for 24 hours)

How to collect your order:
1. Visit your nearest CraftedByHer hub
2. Provide this OTP to the hub manager
3. Verify your identity and collect your order

Important:
- Do not share this OTP with anyone
- This OTP is valid for 24 hours
- You'll need to show a valid ID at the hub

Thank you for supporting women artisans!

CraftedByHer Team
      `.trim(),
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log("✅ Delivery OTP email sent successfully:");
    console.log("   To:", customerEmail);
    console.log("   Order ID:", orderId);
    console.log("   Message ID:", info.messageId);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("❌ Error sending delivery OTP email:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  sendDeliveryOTP,
  generateOTP
};
