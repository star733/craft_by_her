import React from "react";
import SellerDashboardOverview from "./SellerDashboardOverview";

const EnhancedSellerDashboard = ({ products, orders, stats, onSectionClick }) => {
  return (
    <>
      <SellerDashboardOverview products={products} orders={orders} stats={stats} onSectionClick={onSectionClick} />
      
      {/* Action Cards */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
        gap: "20px", 
        marginTop: "30px" 
      }}>
        <div style={{ 
          background: "linear-gradient(135deg, #8b5e34 0%, #6f4518 100%)", 
          padding: "20px", 
          borderRadius: "12px", 
          color: "white",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(92, 64, 51, 0.15)"
        }}
        onClick={() => onSectionClick("products")}>
          <div style={{ fontSize: "24px", marginBottom: "10px" }}>📦</div>
          <h3 style={{ margin: "0 0 10px 0", color: "white" }}>Product Management</h3>
          <p style={{ margin: "0", fontSize: "14px", opacity: "0.9" }}>
            Add, edit, and manage your product listings
          </p>
          <div style={{ marginTop: "15px", fontSize: "24px", fontWeight: "bold" }}>
            {products.length} Products
          </div>
        </div>
        
        <div style={{ 
          background: "linear-gradient(135deg, #a67c52 0%, #8b5e34 100%)", 
          padding: "20px", 
          borderRadius: "12px", 
          color: "white",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(92, 64, 51, 0.15)"
        }}
        onClick={() => onSectionClick("orders")}>
          <div style={{ fontSize: "24px", marginBottom: "10px" }}>🧾</div>
          <h3 style={{ margin: "0 0 10px 0", color: "white" }}>Order Management</h3>
          <p style={{ margin: "0", fontSize: "14px", opacity: "0.9" }}>
            Process and track customer orders
          </p>
          <div style={{ marginTop: "15px", fontSize: "24px", fontWeight: "bold" }}>
            {stats.activeOrders} Active Orders
          </div>
        </div>
        
        <div style={{ 
          background: "linear-gradient(135deg, #c4a57b 0%, #a67c52 100%)", 
          padding: "20px", 
          borderRadius: "12px", 
          color: "white",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(92, 64, 51, 0.15)"
        }}
        onClick={() => onSectionClick("analytics")}>
          <div style={{ fontSize: "24px", marginBottom: "10px" }}>📊</div>
          <h3 style={{ margin: "0 0 10px 0", color: "white" }}>Business Analytics</h3>
          <p style={{ margin: "0", fontSize: "14px", opacity: "0.9" }}>
            Track sales performance and insights
          </p>
          <div style={{ marginTop: "15px", fontSize: "24px", fontWeight: "bold" }}>
            ₹{stats.totalRevenue.toLocaleString('en-IN')}
          </div>
        </div>
      </div>
      
      {/* Recent Activity Feed */}
      <div style={{ 
        background: "#fff", 
        padding: "24px", 
        borderRadius: "12px", 
        marginTop: "30px" 
      }}>
        <h2 style={{ marginBottom: "20px" }}>Recent Activity</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {orders.slice(0, 5).map(order => (
            <div key={order._id} style={{ 
              display: "flex", 
              alignItems: "center", 
              padding: "15px", 
              border: "1px solid #eee", 
              borderRadius: "8px" 
            }}>
              <div style={{ 
                width: "40px", 
                height: "40px", 
                borderRadius: "50%", 
                background: "#f0f0f0", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                marginRight: "15px" 
              }}>
                🧾
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "600" }}>
                  New order #{order.orderNumber || order._id?.substring(0, 8)}
                </div>
                <div style={{ fontSize: "14px", color: "#666" }}>
                  {order.customer || 'Customer'} placed an order
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: "600" }}>
                  ₹{(order.finalAmount || order.total || 0).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: "12px", color: "#999" }}>
                  {new Date(order.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default EnhancedSellerDashboard;