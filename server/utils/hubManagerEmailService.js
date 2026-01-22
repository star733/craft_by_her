const nodemailer = require("nodemailer");

// Create transporter using the same configuration as other email services
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send hub manager credentials email
const sendHubManagerCredentials = async (managerData) => {
  try {
    console.log("📧 Sending hub manager credentials email to:", managerData.email);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hub Manager Account Created</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #5c4033 0%, #8b5e34 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .credentials-box { background: white; border: 2px solid #5c4033; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .credential-item { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; }
            .credential-label { font-weight: bold; color: #5c4033; }
            .credential-value { font-family: monospace; font-size: 16px; color: #333; background: #e9ecef; padding: 5px 10px; border-radius: 3px; display: inline-block; margin-left: 10px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .button { display: inline-block; background: #5c4033; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏢 Hub Manager Account Created</h1>
                <p>Welcome to CraftedByHer Hub Management System</p>
            </div>
            
            <div class="content">
                <h2>Hello ${managerData.name},</h2>
                
                <p>Your Hub Manager account has been successfully created by the administrator. You can now access the Hub Management Dashboard to oversee operations in your assigned district.</p>
                
                <div class="credentials-box">
                    <h3 style="color: #5c4033; margin-top: 0;">🔐 Your Login Credentials</h3>
                    
                    <div class="credential-item">
                        <span class="credential-label">Email:</span>
                        <span class="credential-value">${managerData.email}</span>
                    </div>
                    
                    <div class="credential-item">
                        <span class="credential-label">Password:</span>
                        <span class="credential-value">${managerData.password}</span>
                    </div>
                    
                    <div class="credential-item">
                        <span class="credential-label">Phone:</span>
                        <span class="credential-value">${managerData.phone}</span>
                    </div>
                    
                    ${managerData.hubName ? `
                    <div class="credential-item">
                        <span class="credential-label">Assigned Hub:</span>
                        <span class="credential-value">${managerData.hubName} - ${managerData.district}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="warning">
                    <strong>⚠️ Important Security Notice:</strong>
                    <ul>
                        <li>Please change your password after your first login</li>
                        <li>Keep your credentials secure and do not share them</li>
                        <li>Contact the administrator if you suspect any unauthorized access</li>
                    </ul>
                </div>
                
                <div style="text-align: center;">
                    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/hub-manager/login" class="button">
                        Login to Hub Manager Dashboard
                    </a>
                </div>
                
                <h3>📋 Your Responsibilities:</h3>
                <ul>
                    <li>Monitor incoming products from sellers</li>
                    <li>Manage outgoing deliveries to customers</li>
                    <li>Maintain accurate inventory records</li>
                    <li>Coordinate with delivery agents</li>
                    <li>Report any issues to the central administration</li>
                </ul>
                
                <h3>📞 Support:</h3>
                <p>If you need any assistance or have questions about your role, please contact:</p>
                <ul>
                    <li>Email: support@craftedbyher.com</li>
                    <li>Phone: +91 9876543210</li>
                    <li>Working Hours: 9:00 AM - 6:00 PM (Mon-Sat)</li>
                </ul>
            </div>
            
            <div class="footer">
                <p>This is an automated email from CraftedByHer Hub Management System.</p>
                <p>© 2024 CraftedByHer. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: `"CraftedByHer Hub Management" <${process.env.EMAIL_USER}>`,
      to: managerData.email,
      subject: "🏢 Hub Manager Account Created - Login Credentials",
      html: htmlContent,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ Hub manager credentials email sent successfully:", result.messageId);
    return { success: true, messageId: result.messageId };

  } catch (error) {
    console.error("❌ Error sending hub manager credentials email:", error);
    return { success: false, error: error.message };
  }
};

// Send hub manager status update email
const sendHubManagerStatusUpdate = async (managerData, newStatus) => {
  try {
    console.log("📧 Sending hub manager status update email to:", managerData.email);

    const statusMessages = {
      active: {
        subject: "✅ Hub Manager Account Activated",
        title: "Account Activated",
        message: "Your Hub Manager account has been activated. You can now access the dashboard.",
        color: "#28a745"
      },
      inactive: {
        subject: "⏸️ Hub Manager Account Deactivated",
        title: "Account Deactivated",
        message: "Your Hub Manager account has been temporarily deactivated. Please contact the administrator for more information.",
        color: "#dc3545"
      }
    };

    const statusInfo = statusMessages[newStatus];

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hub Manager Status Update</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${statusInfo.color}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏢 ${statusInfo.title}</h1>
            </div>
            
            <div class="content">
                <h2>Hello ${managerData.name},</h2>
                <p>${statusInfo.message}</p>
                
                ${newStatus === 'active' ? `
                <p>You can now login to your dashboard using:</p>
                <ul>
                    <li><strong>Email:</strong> ${managerData.email}</li>
                    <li><strong>Dashboard:</strong> <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/hub-manager/login">Hub Manager Login</a></li>
                </ul>
                ` : ''}
                
                <p>If you have any questions, please contact the administrator.</p>
            </div>
            
            <div class="footer">
                <p>© 2024 CraftedByHer. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: `"CraftedByHer Hub Management" <${process.env.EMAIL_USER}>`,
      to: managerData.email,
      subject: statusInfo.subject,
      html: htmlContent,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ Hub manager status update email sent successfully:", result.messageId);
    return { success: true, messageId: result.messageId };

  } catch (error) {
    console.error("❌ Error sending hub manager status update email:", error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendHubManagerCredentials,
  sendHubManagerStatusUpdate
};