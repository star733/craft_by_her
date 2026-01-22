import React, { useState, useEffect } from 'react';

const AdminAnalytics = ({ orders = [], pendingHubOrders = [], approvedHubOrders = [] }) => {
  const [timeRange, setTimeRange] = useState('7d');
  const [analytics, setAnalytics] = useState({
    totalOrders: 0,
    pendingApprovals: 0,
    approvedToday: 0,
    avgApprovalTime: 0,
    hubUtilization: 0,
    customerSatisfaction: 0
  });

  useEffect(() => {
    calculateAnalytics();
  }, [orders, pendingHubOrders, approvedHubOrders, timeRange]);

  const calculateAnalytics = () => {
    const now = new Date();
    const timeRanges = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90
    };
    
    const daysBack = timeRanges[timeRange];
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Filter orders by time range
    const filteredOrders = orders.filter(order => 
      new Date(order.createdAt) >= startDate
    );

    // Calculate metrics
    const totalOrders = filteredOrders.length;
    const pendingApprovals = pendingHubOrders.length;
    
    // Approved today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const approvedToday = approvedHubOrders.filter(order => {
      const approvedDate = new Date(order.hubTracking?.adminApprovedAt || order.updatedAt);
      return approvedDate >= today;
    }).length;

    // Average approval time (in hours)
    const approvedOrders = approvedHubOrders.filter(order => 
      order.hubTracking?.adminApprovedAt && order.hubTracking?.arrivedAtSellerHub
    );
    
    let avgApprovalTime = 0;
    if (approvedOrders.length > 0) {
      const totalApprovalTime = approvedOrders.reduce((sum, order) => {
        const arrivedAt = new Date(order.hubTracking.arrivedAtSellerHub);
        const approvedAt = new Date(order.hubTracking.adminApprovedAt);
        return sum + (approvedAt - arrivedAt);
      }, 0);
      avgApprovalTime = totalApprovalTime / approvedOrders.length / (1000 * 60 * 60); // Convert to hours
    }

    // Mock hub utilization and customer satisfaction for demo
    const hubUtilization = Math.min(95, 60 + (totalOrders * 2));
    const customerSatisfaction = Math.max(85, 98 - (pendingApprovals * 2));

    setAnalytics({
      totalOrders,
      pendingApprovals,
      approvedToday,
      avgApprovalTime: Math.round(avgApprovalTime * 10) / 10,
      hubUtilization,
      customerSatisfaction
    });
  };

  const getStatusColor = (value, type) => {
    switch (type) {
      case 'pending':
        return value > 5 ? '#dc3545' : value > 2 ? '#ffc107' : '#28a745';
      case 'time':
        return value > 24 ? '#dc3545' : value > 12 ? '#ffc107' : '#28a745';
      case 'utilization':
        return value > 90 ? '#dc3545' : value > 75 ? '#ffc107' : '#28a745';
      case 'satisfaction':
        return value < 80 ? '#dc3545' : value < 90 ? '#ffc107' : '#28a745';
      default:
        return '#28a745';
    }
  };

  const formatTime = (hours) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  return (
    <div style={{ 
      background: '#fff', 
      padding: '24px', 
      borderRadius: '12px', 
      marginBottom: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px' 
      }}>
        <h2 style={{ 
          margin: 0, 
          color: '#5c4033',
          fontSize: '20px',
          fontWeight: '600'
        }}>
          📊 Admin Analytics Dashboard
        </h2>
        
        {/* Time Range Selector */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {['1d', '7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #5c4033',
                background: timeRange === range ? '#5c4033' : 'white',
                color: timeRange === range ? 'white' : '#5c4033',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
            >
              {range === '1d' ? 'Today' : 
               range === '7d' ? '7 Days' :
               range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Total Orders */}
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>📦 Total Orders</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '4px' }}>
              {analytics.totalOrders}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              Last {timeRange === '1d' ? '24 hours' : timeRange}
            </div>
          </div>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            fontSize: '80px',
            opacity: 0.1
          }}>📦</div>
        </div>

        {/* Pending Approvals */}
        <div style={{
          padding: '20px',
          background: `linear-gradient(135deg, ${getStatusColor(analytics.pendingApprovals, 'pending')} 0%, ${getStatusColor(analytics.pendingApprovals, 'pending')}dd 100%)`,
          borderRadius: '12px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>⚠️ Pending Approvals</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '4px' }}>
              {analytics.pendingApprovals}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              {analytics.pendingApprovals === 0 ? 'All clear!' : 'Needs attention'}
            </div>
          </div>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            fontSize: '80px',
            opacity: 0.1
          }}>⚠️</div>
        </div>

        {/* Approved Today */}
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
          borderRadius: '12px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>✅ Approved Today</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '4px' }}>
              {analytics.approvedToday}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              Orders processed
            </div>
          </div>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            fontSize: '80px',
            opacity: 0.1
          }}>✅</div>
        </div>

        {/* Average Approval Time */}
        <div style={{
          padding: '20px',
          background: `linear-gradient(135deg, ${getStatusColor(analytics.avgApprovalTime, 'time')} 0%, ${getStatusColor(analytics.avgApprovalTime, 'time')}dd 100%)`,
          borderRadius: '12px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>⏱️ Avg Approval Time</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '4px' }}>
              {analytics.avgApprovalTime > 0 ? formatTime(analytics.avgApprovalTime) : 'N/A'}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              {analytics.avgApprovalTime <= 12 ? 'Excellent' : 
               analytics.avgApprovalTime <= 24 ? 'Good' : 'Needs improvement'}
            </div>
          </div>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            fontSize: '80px',
            opacity: 0.1
          }}>⏱️</div>
        </div>
      </div>

      {/* Performance Indicators */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '20px' 
      }}>
        {/* Hub Utilization */}
        <div style={{
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '12px',
          border: '1px solid #e9ecef'
        }}>
          <h4 style={{ 
            margin: '0 0 16px 0', 
            color: '#5c4033',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            🏢 Hub Utilization
          </h4>
          
          <div style={{ marginBottom: '12px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '14px', color: '#666' }}>Overall Capacity</span>
              <span style={{ 
                fontSize: '18px', 
                fontWeight: 'bold',
                color: getStatusColor(analytics.hubUtilization, 'utilization')
              }}>
                {analytics.hubUtilization}%
              </span>
            </div>
            
            <div style={{
              width: '100%',
              height: '8px',
              background: '#e9ecef',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${analytics.hubUtilization}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${getStatusColor(analytics.hubUtilization, 'utilization')}, ${getStatusColor(analytics.hubUtilization, 'utilization')}dd)`,
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
          
          <p style={{ 
            margin: 0, 
            fontSize: '12px', 
            color: '#666' 
          }}>
            {analytics.hubUtilization > 90 ? '⚠️ High utilization - consider expansion' :
             analytics.hubUtilization > 75 ? '📊 Good utilization levels' :
             '✅ Optimal capacity available'}
          </p>
        </div>

        {/* Customer Satisfaction */}
        <div style={{
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '12px',
          border: '1px solid #e9ecef'
        }}>
          <h4 style={{ 
            margin: '0 0 16px 0', 
            color: '#5c4033',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            😊 Customer Satisfaction
          </h4>
          
          <div style={{ marginBottom: '12px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '14px', color: '#666' }}>Satisfaction Score</span>
              <span style={{ 
                fontSize: '18px', 
                fontWeight: 'bold',
                color: getStatusColor(analytics.customerSatisfaction, 'satisfaction')
              }}>
                {analytics.customerSatisfaction}%
              </span>
            </div>
            
            <div style={{
              width: '100%',
              height: '8px',
              background: '#e9ecef',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${analytics.customerSatisfaction}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${getStatusColor(analytics.customerSatisfaction, 'satisfaction')}, ${getStatusColor(analytics.customerSatisfaction, 'satisfaction')}dd)`,
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
          
          <p style={{ 
            margin: 0, 
            fontSize: '12px', 
            color: '#666' 
          }}>
            {analytics.customerSatisfaction >= 90 ? '🌟 Excellent customer experience' :
             analytics.customerSatisfaction >= 80 ? '👍 Good customer feedback' :
             '⚠️ Customer experience needs improvement'}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ 
        marginTop: '24px',
        padding: '16px',
        background: 'linear-gradient(135deg, #f5f1eb 0%, #e8dcc6 100%)',
        borderRadius: '8px',
        border: '1px solid #d4c5a9'
      }}>
        <h4 style={{ 
          margin: '0 0 12px 0', 
          color: '#5c4033',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          🚀 Quick Actions
        </h4>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button style={{
            padding: '8px 16px',
            background: analytics.pendingApprovals > 0 ? '#dc3545' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: analytics.pendingApprovals > 0 ? 'pointer' : 'not-allowed',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            {analytics.pendingApprovals > 0 ? `⚡ Review ${analytics.pendingApprovals} Pending` : '✅ No Pending Orders'}
          </button>
          
          <button style={{
            padding: '8px 16px',
            background: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            📊 Export Report
          </button>
          
          <button style={{
            padding: '8px 16px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            🔄 Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;