import React from "react";

const SellerDashboardOverview = ({ products, orders, stats, onSectionClick }) => {
  // Calculate additional metrics
  const totalProducts = products.length;
  const activeOrders = stats.activeOrders;
  const totalRevenue = stats.totalRevenue;
  
  // Calculate weekly growth
  const thisWeekOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return orderDate >= oneWeekAgo;
  }).length;
  
  const lastWeekOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return orderDate >= twoWeeksAgo && orderDate < oneWeekAgo;
  }).length;
  
  const orderGrowth = lastWeekOrders > 0 ? 
    (((thisWeekOrders - lastWeekOrders) / lastWeekOrders) * 100).toFixed(1) : 
    (thisWeekOrders > 0 ? 100 : 0);
  
  // Calculate top selling products
  const topProducts = products
    .slice()
    .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
    .slice(0, 5);
  
  // Calculate average order value
  const paidOrders = orders.filter(order => order.paymentStatus === 'paid');
  const avgOrderValue = paidOrders.length > 0 ? 
    (paidOrders.reduce((sum, order) => sum + (order.finalAmount || order.total || 0), 0) / paidOrders.length).toFixed(0) : 
    0;

  return (
    <>
      {/* Top Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "20px", marginBottom: "30px" }}>
        <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", borderLeft: "4px solid #5c4033" }}>
          <div style={{fontSize: "13px", color: "#666", marginBottom: "8px"}}>📦 Total Products</div>
          <h3 style={{fontSize: "32px", margin: "0", color: "#5c4033"}}>{totalProducts}</h3>
          <small style={{color: '#999', fontSize: '12px'}}>Active listings</small>
        </div>
        <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", borderLeft: "4px solid #FF6B6B" }}>
          <div style={{fontSize: "13px", color: "#666", marginBottom: "8px"}}>🚀 Active Orders</div>
          <h3 style={{fontSize: "32px", margin: "0", color: "#FF6B6B"}}>{activeOrders}</h3>
          <small style={{color: '#999', fontSize: '12px'}}>Processing now</small>
        </div>
        <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", borderLeft: "4px solid #4ECDC4" }}>
          <div style={{fontSize: "13px", color: "#666", marginBottom: "8px"}}>💰 Total Revenue</div>
          <h3 style={{fontSize: "32px", margin: "0", color: "#4ECDC4"}}>₹{totalRevenue.toLocaleString('en-IN')}</h3>
          <small style={{color: '#999', fontSize: '12px'}}>Lifetime earnings</small>
        </div>
        <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", borderLeft: "4px solid #17a2b8" }}>
          <div style={{fontSize: "13px", color: "#666", marginBottom: "8px"}}>📈 Weekly Growth</div>
          <h3 style={{fontSize: "32px", margin: "0", color: orderGrowth >= 0 ? "#28a745" : "#dc3545"}}>{orderGrowth}%</h3>
          <small style={{color: '#999', fontSize: '12px'}}>
            {orderGrowth >= 0 ? 'Increase' : 'Decrease'} from last week
          </small>
        </div>
      </div>

      {/* Charts and Analytics */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", marginBottom: "30px" }}>
        <div style={{ background: "#fff", padding: "20px", borderRadius: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ margin: "0", fontSize: "18px", color: "#5c4033" }}>Sales Overview</h2>
            <div style={{ display: "flex", gap: "10px" }}>
              <button style={{ padding: "6px 12px", fontSize: "12px", background: "#f0f0f0", border: "none", borderRadius: "4px" }}>
                7 Days
              </button>
              <button style={{ padding: "6px 12px", fontSize: "12px", background: "#5c4033", color: "white", border: "none", borderRadius: "4px" }}>
                30 Days
              </button>
              <button style={{ padding: "6px 12px", fontSize: "12px", background: "#f0f0f0", border: "none", borderRadius: "4px" }}>
                90 Days
              </button>
            </div>
          </div>
          <div style={{ height: "250px", background: "#f8f9fa", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: "#666", margin: "0" }}>Sales chart visualization would appear here</p>
          </div>
        </div>
        
        <div style={{ background: "#fff", padding: "20px", borderRadius: "12px" }}>
          <h2 style={{ marginBottom: "20px", fontSize: "18px", color: "#5c4033" }}>Key Metrics</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#f8f9fa", borderRadius: "8px" }}>
              <span style={{ fontSize: "14px", color: "#666" }}>Avg. Order Value</span>
              <b style={{ fontSize: "20px", color: "#5c4033" }}>₹{avgOrderValue}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#f8f9fa", borderRadius: "8px" }}>
              <span style={{ fontSize: "14px", color: "#666" }}>Conversion Rate</span>
              <b style={{ fontSize: "20px", color: "#28a745" }}>12.5%</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#f8f9fa", borderRadius: "8px" }}>
              <span style={{ fontSize: "14px", color: "#666" }}>Customer Retention</span>
              <b style={{ fontSize: "20px", color: "#17a2b8" }}>68%</b>
            </div>
          </div>
        </div>
      </div>

      {/* Top Products and Recent Orders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
        <div style={{ background: "#fff", padding: "20px", borderRadius: "12px" }}>
          <h2 style={{ marginBottom: "20px", fontSize: "18px", color: "#5c4033" }}>Top Selling Products</h2>
          {topProducts.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {topProducts.map((product, index) => (
                <div key={product._id} style={{ display: "flex", alignItems: "center", padding: "10px", borderBottom: "1px solid #eee" }}>
                  <div style={{ width: "30px", height: "30px", background: "#f0f0f0", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "10px" }}>
                    {index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", fontSize: "14px" }}>{product.title}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>{product.category}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: "600" }}>₹{(product.price || 0).toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>{product.soldCount || 0} sold</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: "center", color: "#666", padding: "20px" }}>No sales data available yet</p>
          )}
        </div>
        
        <div style={{ background: "#fff", padding: "20px", borderRadius: "12px" }}>
          <h2 style={{ marginBottom: "20px", fontSize: "18px", color: "#5c4033" }}>Recent Orders</h2>
          {orders.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {orders.slice(0, 5).map(order => {
                const firstItem = order.items?.[0] || {};
                const customerName = order.customer || order.userName || 'Customer';
                const totalAmount = order.finalAmount || order.total || 0;
                
                return (
                  <div key={order._id} style={{ display: "flex", alignItems: "center", padding: "10px", borderBottom: "1px solid #eee" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "600", fontSize: "14px" }}>{firstItem.title || 'Order'}</div>
                      <div style={{ fontSize: "12px", color: "#666" }}>{customerName}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: "600" }}>₹{totalAmount.toLocaleString('en-IN')}</div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        <span style={{
                          padding: "2px 6px",
                          borderRadius: "4px",
                          backgroundColor: order.orderStatus === 'delivered' ? "#d4edda" : 
                                          order.orderStatus === 'pending' ? "#fff3cd" : 
                                          "#f8d7da",
                          color: order.orderStatus === 'delivered' ? "#155724" : 
                                 order.orderStatus === 'pending' ? "#856404" : 
                                 "#721c24",
                          fontSize: "10px"
                        }}>
                          {order.orderStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ textAlign: "center", color: "#666", padding: "20px" }}>No orders yet</p>
          )}
        </div>
      </div>

      {/* Quick Actions for Sellers */}
      <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", marginBottom: "30px" }}>
        <h2 style={{ marginBottom: "20px", fontSize: "18px", color: "#5c4033" }}>Seller Quick Actions</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "15px" }}>
          <div style={{ 
            padding: "20px", 
            border: "1px solid #eee", 
            borderRadius: "8px", 
            background: "#f8f9fa",
            cursor: "pointer",
            textAlign: "center",
            transition: "all 0.2s ease"
          }}
          onClick={() => onSectionClick("products")}
          onMouseEnter={(e) => e.target.style.background = "#e9ecef"}
          onMouseLeave={(e) => e.target.style.background = "#f8f9fa"}
          >
            <div style={{ fontSize: "24px", marginBottom: "10px" }}>➕</div>
            <div style={{ fontWeight: "600", color: "#5c4033" }}>Add Product</div>
            <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>Create new listings</div>
          </div>
          <div style={{ 
            padding: "20px", 
            border: "1px solid #eee", 
            borderRadius: "8px", 
            background: "#f8f9fa",
            cursor: "pointer",
            textAlign: "center",
            transition: "all 0.2s ease"
          }}
          onClick={() => onSectionClick("orders")}
          onMouseEnter={(e) => e.target.style.background = "#e9ecef"}
          onMouseLeave={(e) => e.target.style.background = "#f8f9fa"}
          >
            <div style={{ fontSize: "24px", marginBottom: "10px" }}>🧾</div>
            <div style={{ fontWeight: "600", color: "#5c4033" }}>View Orders</div>
            <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>Manage customer orders</div>
          </div>
          <div style={{ 
            padding: "20px", 
            border: "1px solid #eee", 
            borderRadius: "8px", 
            background: "#f8f9fa",
            cursor: "pointer",
            textAlign: "center",
            transition: "all 0.2s ease"
          }}
          onClick={() => onSectionClick("analytics")}
          onMouseEnter={(e) => e.target.style.background = "#e9ecef"}
          onMouseLeave={(e) => e.target.style.background = "#f8f9fa"}
          >
            <div style={{ fontSize: "24px", marginBottom: "10px" }}>📊</div>
            <div style={{ fontWeight: "600", color: "#5c4033" }}>Analytics</div>
            <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>View sales reports</div>
          </div>
        </div>
      </div>
      
      {/* Performance Insights */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px", marginBottom: "30px" }}>
        
        <div style={{ background: "#fff", padding: "20px", borderRadius: "12px" }}>
          <h2 style={{ marginBottom: "20px", fontSize: "18px", color: "#5c4033" }}>Customer Satisfaction</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#f8f9fa", borderRadius: "8px" }}>
              <span style={{ fontSize: "14px", color: "#666" }}>Average Rating</span>
              <b style={{ fontSize: "20px", color: "#ffc107" }}>4.2 ★</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#f8f9fa", borderRadius: "8px" }}>
              <span style={{ fontSize: "14px", color: "#666" }}>Positive Reviews</span>
              <b style={{ fontSize: "20px", color: "#28a745" }}>85%</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#f8f9fa", borderRadius: "8px" }}>
              <span style={{ fontSize: "14px", color: "#666" }}>Response Rate</span>
              <b style={{ fontSize: "20px", color: "#17a2b8" }}>92%</b>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SellerDashboardOverview;