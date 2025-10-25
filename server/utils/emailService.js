const nodemailer = require('nodemailer');

// Email configuration - using Gmail SMTP (you can change this to your preferred email service)
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = (process.env.SMTP_SECURE || 'false') === 'true';
  const rawPass = process.env.EMAIL_PASS || 'your-app-password';
  const sanitizedPass = (process.env.SMTP_HOST || '').includes('gmail')
    ? rawPass.replace(/\s+/g, '')
    : rawPass;
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

// Send email notification to seller when order is picked up
const sendPickupNotification = async (order, deliveryAgent) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: 'seller@craftedbyher.com', // Replace with actual seller email
      subject: `Order #${order.orderNumber} - Picked Up by Delivery Agent`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #5c4033;">Order Picked Up Notification</h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #5c4033; margin-top: 0;">Order Details</h3>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Customer:</strong> ${order.buyerDetails.name}</p>
            <p><strong>Total Amount:</strong> ₹${order.finalAmount}</p>
            <p><strong>Pickup Time:</strong> ${new Date(order.deliveryInfo.pickedUpAt).toLocaleString()}</p>
          </div>
          
          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #5c4033; margin-top: 0;">Delivery Agent Details</h3>
            <p><strong>Name:</strong> ${deliveryAgent.name}</p>
            <p><strong>Agent ID:</strong> ${deliveryAgent.agentId}</p>
            <p><strong>Phone:</strong> ${deliveryAgent.phone}</p>
            <p><strong>Vehicle:</strong> ${deliveryAgent.vehicleInfo?.type || 'Not specified'}</p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #856404; margin-top: 0;">Order Items</h4>
            <ul>
              ${order.items.map(item => `
                <li>${item.title} (${item.variant?.weight || 'Standard'}) - Qty: ${item.quantity}</li>
              `).join('')}
            </ul>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            This is an automated notification from CraftedByHer delivery system.
          </p>
        </div>
      `
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('Pickup notification email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending pickup notification email:', error);
    return { success: false, error: error.message };
  }
};

// Send email notification to admin when delivery agent accepts/rejects order
const sendAcceptanceNotification = async (order, deliveryAgent, action) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: 'admin@craftedbyher.com', // Replace with actual admin email
      subject: `Order #${order.orderNumber} - ${action === 'accept' ? 'Accepted' : 'Rejected'} by Delivery Agent`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${action === 'accept' ? '#28a745' : '#dc3545'};">
            Order ${action === 'accept' ? 'Accepted' : 'Rejected'}
          </h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #5c4033; margin-top: 0;">Order Details</h3>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Customer:</strong> ${order.buyerDetails.name}</p>
            <p><strong>Total Amount:</strong> ₹${order.finalAmount}</p>
            <p><strong>Action Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="background-color: ${action === 'accept' ? '#d4edda' : '#f8d7da'}; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: ${action === 'accept' ? '#155724' : '#721c24'}; margin-top: 0;">
              Delivery Agent Details
            </h3>
            <p><strong>Name:</strong> ${deliveryAgent.name}</p>
            <p><strong>Agent ID:</strong> ${deliveryAgent.agentId}</p>
            <p><strong>Phone:</strong> ${deliveryAgent.phone}</p>
            <p><strong>Status:</strong> ${action === 'accept' ? '✅ Accepted' : '❌ Rejected'}</p>
          </div>
          
          ${action === 'reject' ? `
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #856404; margin-top: 0;">⚠️ Action Required</h4>
              <p>This order has been rejected by the assigned delivery agent. Please assign it to another available agent.</p>
            </div>
          ` : ''}
          
          <p style="color: #666; font-size: 14px;">
            This is an automated notification from CraftedByHer delivery system.
          </p>
        </div>
      `
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('Acceptance notification email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending acceptance notification email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPickupNotification,
  sendAcceptanceNotification,
  sendBuyerPickupNotification: async (order) => {
    try {
      const transporter = createTransporter();
      const buyerEmail = order?.buyerDetails?.email;
      if (!buyerEmail) {
        console.warn('No buyer email found on order for pickup notification');
        return { success: false, error: 'No buyer email' };
      }
      const mailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: buyerEmail,
        subject: `Your order #${order.orderNumber} has been picked up 🚚`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1f7a1f;">Good news! Your order is on the way</h2>
            <p>Hello ${order.buyerDetails?.name || 'Customer'},</p>
            <p>Your order <strong>#${order.orderNumber}</strong> has been picked up by our delivery partner and is heading to you.</p>
            <div style="background:#f8f9fa;padding:16px;border-radius:8px;margin:16px 0;border:1px solid #e9ecef;">
              <p style="margin:0 0 6px 0"><strong>Items</strong></p>
              <ul style="margin:0;padding-left:18px;">
                ${Array.isArray(order.items) ? order.items.map(i => `<li>${(i.title || i.productName || i.productId?.title || 'Item')} × ${i.quantity}</li>`).join('') : ''}
              </ul>
              <p style="margin:10px 0 0 0; font-weight:600;">Total: ₹${order.finalAmount}</p>
            </div>
            <p style="color:#555">We’ll keep you posted as your package gets closer. You can also track from your orders page.</p>
            <p style="font-size:12px;color:#888">This is an automated message from CraftedByHer.</p>
          </div>
        `
      };
      const result = await transporter.sendMail(mailOptions);
      console.log('Buyer pickup notification email sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (err) {
      console.error('Error sending buyer pickup email:', err);
      return { success: false, error: err.message };
    }
  }
};


