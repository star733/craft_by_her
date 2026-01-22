const nodemailer = require("nodemailer");
const HubManager = require("../models/HubManager");
const User = require("../models/User");

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Check if email is configured
const isEmailConfigured = () => {
  return (
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS &&
    process.env.EMAIL_USER !== "your-email@gmail.com" &&
    process.env.EMAIL_PASS !== "your-app-password-here"
  );
};

// Send notification when order arrives at seller hub
async function sendOrderArrivedSellerHubNotification(order, hub, managerId) {
  if (!isEmailConfigured()) {
    console.log("⚠️  Email not configured. Skipping seller hub notification.");
    return { success: false, message: "Email not configured" };
  }

  try {
    const manager = await HubManager.findOne({ managerId });
    if (!manager) {
      console.log("Hub manager not found");
      return { success: false, message: "Manager not found" };
    }

    const mailOptions = {
      from: `${process.env.SENDER_NAME || "CraftedByHer"} <${process.env.EMAIL_USER}>`,
      to: manager.email,
      subject: `📦 New Order Arrived at ${hub.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .order-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📦 New Order Arrived</h1>
              <p>Order #${order.orderNumber}</p>
            </div>
            <div class="content">
              <p>Hello ${manager.name},</p>
              
              <p>A new order has arrived at <strong>${hub.name}</strong> and is awaiting admin approval.</p>
              
              <div class="order-box">
                <h3>Order Details:</h3>
                <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                <p><strong>Total Amount:</strong> ₹${order.finalAmount}</p>
                <p><strong>Items:</strong> ${order.items.length} item(s)</p>
                <p><strong>Status:</strong> At Seller Hub - Awaiting Admin Approval</p>
              </div>
              
              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Order is currently at your hub</li>
                <li>Waiting for admin approval</li>
                <li>Once approved, it will be moved to customer's hub</li>
              </ul>
              
              <div class="footer">
                <p>This is an automated notification from CraftedByHer Hub Management System</p>
                <p>Hub: ${hub.name}, ${hub.district}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`✅ Seller hub notification sent to ${manager.email}`);
    return { success: true, message: "Notification sent" };
  } catch (error) {
    console.error("Error sending seller hub notification:", error);
    return { success: false, message: error.message };
  }
}

// Send notification when order arrives at customer hub
async function sendOrderArrivedCustomerHubNotification(order, hub, managerId) {
  if (!isEmailConfigured()) {
    console.log("⚠️  Email not configured. Skipping customer hub notification.");
    return { success: false, message: "Email not configured" };
  }

  try {
    // Send to hub manager
    const manager = await HubManager.findOne({ managerId });
    if (manager) {
      const managerMailOptions = {
        from: `${process.env.SENDER_NAME || "CraftedByHer"} <${process.env.EMAIL_USER}>`,
        to: manager.email,
        subject: `📦 Order Ready for Pickup at ${hub.name}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .order-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Order Arrived at Your Hub</h1>
                <p>Order #${order.orderNumber}</p>
              </div>
              <div class="content">
                <p>Hello ${manager.name},</p>
                
                <p>An order has arrived at <strong>${hub.name}</strong> and is ready for customer pickup or delivery.</p>
                
                <div class="order-box">
                  <h3>Order Details:</h3>
                  <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                  <p><strong>Customer:</strong> ${order.buyerDetails.name}</p>
                  <p><strong>Phone:</strong> ${order.buyerDetails.phone}</p>
                  <p><strong>Total Amount:</strong> ₹${order.finalAmount}</p>
                  <p><strong>Status:</strong> Ready for Pickup/Delivery</p>
                </div>
                
                <p><strong>Next Steps:</strong></p>
                <ul>
                  <li>Customer will choose self-pickup or delivery</li>
                  <li>Prepare the order for handover</li>
                  <li>Verify customer identity during pickup</li>
                </ul>
                
                <div class="footer">
                  <p>This is an automated notification from CraftedByHer Hub Management System</p>
                  <p>Hub: ${hub.name}, ${hub.district}</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      const transporter = createTransporter();
      await transporter.sendMail(managerMailOptions);
      console.log(`✅ Customer hub notification sent to manager ${manager.email}`);
    }

    // Send to customer
    const customerMailOptions = {
      from: `${process.env.SENDER_NAME || "CraftedByHer"} <${process.env.EMAIL_USER}>`,
      to: order.buyerDetails.email,
      subject: `🎉 Your Order is Ready for Pickup!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .order-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
            .hub-box { background: #e0f2fe; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Your Order is Ready!</h1>
              <p>Order #${order.orderNumber}</p>
            </div>
            <div class="content">
              <p>Hello ${order.buyerDetails.name},</p>
              
              <p>Great news! Your order has arrived at <strong>${hub.name}</strong> and is ready for you.</p>
              
              <div class="order-box">
                <h3>Order Details:</h3>
                <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                <p><strong>Total Amount:</strong> ₹${order.finalAmount}</p>
                <p><strong>Items:</strong> ${order.items.length} item(s)</p>
              </div>
              
              <div class="hub-box">
                <h3>📍 Pickup Location:</h3>
                <p><strong>${hub.name}</strong></p>
                <p>${hub.location.address.street || ''}</p>
                <p>${hub.location.address.city}, ${hub.district}</p>
                <p>📞 ${hub.contactInfo.phone}</p>
                <p>⏰ ${hub.operatingHours.openTime} - ${hub.operatingHours.closeTime}</p>
              </div>
              
              <p><strong>Choose Your Delivery Option:</strong></p>
              <p>Please log in to your account to choose:</p>
              <ul>
                <li><strong>Self Pickup:</strong> Visit the hub and collect your order</li>
                <li><strong>Home Delivery:</strong> We'll assign a delivery agent to bring it to you</li>
              </ul>
              
              <center>
                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/orders" class="button">View Order</a>
              </center>
              
              <div class="footer">
                <p>Thank you for shopping with CraftedByHer!</p>
                <p>Supporting women artisans across Kerala</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const transporter = createTransporter();
    await transporter.sendMail(customerMailOptions);
    console.log(`✅ Customer notification sent to ${order.buyerDetails.email}`);

    return { success: true, message: "Notifications sent" };
  } catch (error) {
    console.error("Error sending customer hub notification:", error);
    return { success: false, message: error.message };
  }
}

// Main notification dispatcher
async function sendHubNotification({ type, order, hub, managerId }) {
  switch (type) {
    case 'order_arrived_seller_hub':
      return await sendOrderArrivedSellerHubNotification(order, hub, managerId);
    case 'order_arrived_customer_hub':
      return await sendOrderArrivedCustomerHubNotification(order, hub, managerId);
    default:
      console.log(`Unknown notification type: ${type}`);
      return { success: false, message: "Unknown notification type" };
  }
}

module.exports = {
  sendHubNotification,
  sendOrderArrivedSellerHubNotification,
  sendOrderArrivedCustomerHubNotification
};
