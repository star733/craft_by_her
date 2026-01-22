import React from 'react';

const OrderStatusTracker = ({ order }) => {
  const getStatusSteps = () => {
    const steps = [
      {
        id: 'created',
        title: 'Order Created',
        description: 'Order placed by customer',
        icon: '📦',
        completed: true
      },
      {
        id: 'at_seller_hub',
        title: 'At Seller Hub',
        description: 'Arrived at seller district hub',
        icon: '🏢',
        completed: ['at_seller_hub', 'in_transit_to_customer_hub', 'at_customer_hub', 'delivered'].includes(order.orderStatus)
      },
      {
        id: 'admin_approved',
        title: 'Admin Approved',
        description: 'Approved for dispatch',
        icon: '✅',
        completed: ['in_transit_to_customer_hub', 'at_customer_hub', 'delivered'].includes(order.orderStatus)
      },
      {
        id: 'in_transit',
        title: 'In Transit',
        description: 'Moving to customer hub',
        icon: '🚚',
        completed: ['in_transit_to_customer_hub', 'at_customer_hub', 'delivered'].includes(order.orderStatus),
        active: order.orderStatus === 'in_transit_to_customer_hub'
      },
      {
        id: 'at_customer_hub',
        title: 'At Customer Hub',
        description: 'Ready for pickup',
        icon: '🏪',
        completed: ['at_customer_hub', 'delivered'].includes(order.orderStatus),
        active: order.orderStatus === 'at_customer_hub'
      },
      {
        id: 'delivered',
        title: 'Delivered',
        description: 'Order completed',
        icon: '🎉',
        completed: order.orderStatus === 'delivered',
        active: order.orderStatus === 'delivered'
      }
    ];

    return steps;
  };

  const steps = getStatusSteps();

  return (
    <div style={{ 
      background: '#fff', 
      padding: '24px', 
      borderRadius: '12px', 
      marginBottom: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ 
        margin: '0 0 20px 0', 
        color: '#5c4033',
        fontSize: '18px',
        fontWeight: '600'
      }}>
        📍 Order Tracking - {order.orderNumber}
      </h3>
      
      <div style={{ position: 'relative' }}>
        {/* Progress Line */}
        <div style={{
          position: 'absolute',
          left: '20px',
          top: '30px',
          bottom: '30px',
          width: '2px',
          background: '#e9ecef',
          zIndex: 1
        }}>
          <div style={{
            width: '100%',
            height: `${(steps.filter(s => s.completed).length - 1) * (100 / (steps.length - 1))}%`,
            background: 'linear-gradient(to bottom, #28a745, #20c997)',
            transition: 'height 0.5s ease'
          }} />
        </div>

        {/* Steps */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          {steps.map((step, index) => (
            <div key={step.id} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: index === steps.length - 1 ? '0' : '30px',
              position: 'relative'
            }}>
              {/* Step Icon */}
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                marginRight: '16px',
                background: step.completed 
                  ? 'linear-gradient(135deg, #28a745, #20c997)' 
                  : step.active 
                    ? 'linear-gradient(135deg, #ffc107, #fd7e14)'
                    : '#f8f9fa',
                color: step.completed || step.active ? 'white' : '#6c757d',
                border: step.active ? '3px solid #ffc107' : 'none',
                boxShadow: step.completed || step.active ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                animation: step.active ? 'pulse 2s infinite' : 'none'
              }}>
                {step.icon}
              </div>

              {/* Step Content */}
              <div style={{ flex: 1 }}>
                <h4 style={{ 
                  margin: '0 0 4px 0', 
                  fontSize: '16px',
                  fontWeight: '600',
                  color: step.completed ? '#28a745' : step.active ? '#ffc107' : '#6c757d'
                }}>
                  {step.title}
                  {step.active && (
                    <span style={{
                      marginLeft: '8px',
                      padding: '2px 8px',
                      background: '#ffc107',
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '700'
                    }}>
                      CURRENT
                    </span>
                  )}
                </h4>
                <p style={{ 
                  margin: 0, 
                  fontSize: '14px',
                  color: '#6c757d'
                }}>
                  {step.description}
                </p>
                
                {/* Additional Info */}
                {step.id === 'at_seller_hub' && order.hubTracking?.sellerHubName && (
                  <p style={{ 
                    margin: '4px 0 0 0', 
                    fontSize: '12px',
                    color: '#28a745',
                    fontWeight: '600'
                  }}>
                    📍 {order.hubTracking.sellerHubName}
                  </p>
                )}
                
                {step.id === 'admin_approved' && order.hubTracking?.adminApprovedAt && (
                  <p style={{ 
                    margin: '4px 0 0 0', 
                    fontSize: '12px',
                    color: '#28a745',
                    fontWeight: '600'
                  }}>
                    ⏰ {new Date(order.hubTracking.adminApprovedAt).toLocaleString()}
                  </p>
                )}
                
                {step.id === 'at_customer_hub' && order.hubTracking?.customerHubName && (
                  <p style={{ 
                    margin: '4px 0 0 0', 
                    fontSize: '12px',
                    color: '#28a745',
                    fontWeight: '600'
                  }}>
                    📍 {order.hubTracking.customerHubName}
                    {order.hubTracking?.pickupOTP && (
                      <span style={{
                        marginLeft: '8px',
                        padding: '2px 6px',
                        background: '#28a745',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700'
                      }}>
                        OTP: {order.hubTracking.pickupOTP}
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Timestamp */}
              <div style={{ 
                fontSize: '11px', 
                color: '#999',
                textAlign: 'right',
                minWidth: '80px'
              }}>
                {step.completed && (
                  <>
                    {step.id === 'created' && new Date(order.createdAt).toLocaleDateString()}
                    {step.id === 'at_seller_hub' && order.hubTracking?.arrivedAtSellerHub && 
                      new Date(order.hubTracking.arrivedAtSellerHub).toLocaleDateString()}
                    {step.id === 'admin_approved' && order.hubTracking?.adminApprovedAt && 
                      new Date(order.hubTracking.adminApprovedAt).toLocaleDateString()}
                    {step.id === 'at_customer_hub' && order.hubTracking?.arrivedAtCustomerHub && 
                      new Date(order.hubTracking.arrivedAtCustomerHub).toLocaleDateString()}
                    {step.id === 'delivered' && order.hubTracking?.deliveredAt && 
                      new Date(order.hubTracking.deliveredAt).toLocaleDateString()}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e9ecef'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6c757d', fontWeight: '600' }}>Customer</p>
            <p style={{ margin: 0, fontSize: '14px', color: '#333', fontWeight: '600' }}>
              {order.buyerDetails?.name || 'N/A'}
            </p>
          </div>
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6c757d', fontWeight: '600' }}>Total Amount</p>
            <p style={{ margin: 0, fontSize: '14px', color: '#333', fontWeight: '600' }}>
              ₹{order.finalAmount?.toLocaleString('en-IN') || 'N/A'}
            </p>
          </div>
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6c757d', fontWeight: '600' }}>Items</p>
            <p style={{ margin: 0, fontSize: '14px', color: '#333', fontWeight: '600' }}>
              {order.items?.length || 0} item(s)
            </p>
          </div>
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6c757d', fontWeight: '600' }}>Payment</p>
            <p style={{ margin: 0, fontSize: '14px', color: '#333', fontWeight: '600' }}>
              {order.paymentMethod?.toUpperCase() || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% { box-shadow: 0 4px 12px rgba(255, 193, 7, 0.3); }
          50% { box-shadow: 0 4px 20px rgba(255, 193, 7, 0.6); }
          100% { box-shadow: 0 4px 12px rgba(255, 193, 7, 0.3); }
        }
      `}</style>
    </div>
  );
};

export default OrderStatusTracker;