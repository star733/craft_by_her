import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';

const SystemMonitor = () => {
  const [systemHealth, setSystemHealth] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

  useEffect(() => {
    fetchSystemHealth();
    fetchSystemAlerts();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchSystemHealth();
      fetchSystemAlerts();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/system/health`);
      const data = await response.json();
      setSystemHealth(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching system health:', error);
      setSystemHealth({
        status: 'unhealthy',
        error: 'Unable to connect to server',
        services: {}
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemAlerts = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_BASE}/api/system/alerts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Error fetching system alerts:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return '#28a745';
      case 'warning': return '#ffc107';
      case 'degraded': return '#fd7e14';
      case 'unhealthy': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'degraded': return '🟡';
      case 'unhealthy': return '❌';
      default: return '❓';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div style={{ 
        background: '#fff', 
        padding: '24px', 
        borderRadius: '12px', 
        textAlign: 'center' 
      }}>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>🔄</div>
        <p>Loading system status...</p>
      </div>
    );
  }

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
          🖥️ System Monitor
        </h2>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          fontSize: '12px',
          color: '#666'
        }}>
          <span>Last updated: {lastUpdated?.toLocaleTimeString()}</span>
          <button
            onClick={() => {
              fetchSystemHealth();
              fetchSystemAlerts();
            }}
            style={{
              padding: '6px 12px',
              background: '#5c4033',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div style={{
        padding: '20px',
        background: `linear-gradient(135deg, ${getStatusColor(systemHealth?.status)}15, ${getStatusColor(systemHealth?.status)}05)`,
        border: `2px solid ${getStatusColor(systemHealth?.status)}`,
        borderRadius: '12px',
        marginBottom: '24px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>
          {getStatusIcon(systemHealth?.status)}
        </div>
        <h3 style={{ 
          margin: '0 0 8px 0', 
          color: getStatusColor(systemHealth?.status),
          fontSize: '24px',
          fontWeight: '700',
          textTransform: 'uppercase'
        }}>
          System {systemHealth?.status || 'Unknown'}
        </h3>
        <p style={{ 
          margin: 0, 
          color: '#666',
          fontSize: '14px'
        }}>
          {systemHealth?.status === 'healthy' ? 'All systems operational' :
           systemHealth?.status === 'degraded' ? 'Some issues detected' :
           systemHealth?.status === 'unhealthy' ? 'Critical issues require attention' :
           'System status unknown'}
        </p>
      </div>

      {/* Services Status */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          color: '#5c4033',
          fontSize: '18px',
          fontWeight: '600'
        }}>
          🔧 Services Status
        </h3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '16px' 
        }}>
          {systemHealth?.services && Object.entries(systemHealth.services).map(([serviceName, service]) => (
            <div key={serviceName} style={{
              padding: '16px',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: `2px solid ${getStatusColor(service.status)}`,
              borderLeft: `6px solid ${getStatusColor(service.status)}`
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <h4 style={{ 
                  margin: 0, 
                  fontSize: '16px',
                  fontWeight: '600',
                  textTransform: 'capitalize'
                }}>
                  {serviceName}
                </h4>
                <span style={{ fontSize: '20px' }}>
                  {getStatusIcon(service.status)}
                </span>
              </div>
              
              <div style={{ fontSize: '12px', color: '#666' }}>
                {serviceName === 'database' && (
                  <>
                    <p style={{ margin: '4px 0' }}>
                      Connection: {service.connection || 'unknown'}
                    </p>
                    {service.responseTime && (
                      <p style={{ margin: '4px 0' }}>
                        Response: {Date.now() - service.responseTime}ms
                      </p>
                    )}
                  </>
                )}
                
                {serviceName === 'email' && (
                  <>
                    <p style={{ margin: '4px 0' }}>
                      Configured: {service.configured ? 'Yes' : 'No'}
                    </p>
                    <p style={{ margin: '4px 0' }}>
                      Provider: {service.provider}
                    </p>
                  </>
                )}
                
                {serviceName === 'api' && (
                  <p style={{ margin: '4px 0' }}>
                    Endpoints: {Object.keys(service.endpoints || {}).length} active
                  </p>
                )}
                
                {service.error && (
                  <p style={{ margin: '4px 0', color: '#dc3545', fontWeight: '600' }}>
                    Error: {service.error}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Metrics */}
      {systemHealth?.metrics && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            margin: '0 0 16px 0', 
            color: '#5c4033',
            fontSize: '18px',
            fontWeight: '600'
          }}>
            📊 System Metrics
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px' 
          }}>
            {/* Orders Metrics */}
            <div style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '8px',
              color: 'white'
            }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', opacity: 0.9 }}>
                📦 Orders
              </h4>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
                {systemHealth.metrics.orders?.total || 0}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                {systemHealth.metrics.orders?.pending || 0} pending ({systemHealth.metrics.orders?.pendingPercentage || 0}%)
              </div>
            </div>

            {/* Notifications Metrics */}
            <div style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: '8px',
              color: 'white'
            }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', opacity: 0.9 }}>
                🔔 Notifications
              </h4>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
                {systemHealth.metrics.notifications?.total || 0}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                {systemHealth.metrics.notifications?.unread || 0} unread ({systemHealth.metrics.notifications?.unreadPercentage || 0}%)
              </div>
            </div>

            {/* Infrastructure Metrics */}
            <div style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              borderRadius: '8px',
              color: 'white'
            }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', opacity: 0.9 }}>
                🏢 Infrastructure
              </h4>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                <div>Hubs: {systemHealth.metrics.infrastructure?.hubs || 0}</div>
                <div>Hub Managers: {systemHealth.metrics.infrastructure?.activeHubManagers || 0}</div>
                <div>Users: {systemHealth.metrics.infrastructure?.users || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Alerts */}
      {alerts.length > 0 && (
        <div>
          <h3 style={{ 
            margin: '0 0 16px 0', 
            color: '#5c4033',
            fontSize: '18px',
            fontWeight: '600'
          }}>
            🚨 System Alerts ({alerts.length})
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {alerts.map((alert, index) => (
              <div key={alert.id || index} style={{
                padding: '16px',
                background: '#fff',
                border: `2px solid ${getPriorityColor(alert.priority)}`,
                borderLeft: `6px solid ${getPriorityColor(alert.priority)}`,
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'start',
                  marginBottom: '8px'
                }}>
                  <h4 style={{ 
                    margin: 0, 
                    fontSize: '16px',
                    fontWeight: '600',
                    color: getPriorityColor(alert.priority)
                  }}>
                    {alert.title}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      padding: '2px 8px',
                      background: getPriorityColor(alert.priority),
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '700',
                      textTransform: 'uppercase'
                    }}>
                      {alert.priority}
                    </span>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {new Date(alert.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                
                <p style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '14px',
                  color: '#333'
                }}>
                  {alert.message}
                </p>
                
                {alert.action && (
                  <p style={{ 
                    margin: '0', 
                    fontSize: '13px',
                    color: '#666',
                    fontStyle: 'italic'
                  }}>
                    💡 Action: {alert.action}
                  </p>
                )}
                
                {alert.details && (
                  <div style={{ 
                    marginTop: '12px',
                    padding: '8px',
                    background: '#f8f9fa',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    <strong>Details:</strong>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                      {alert.details.map((detail, idx) => (
                        <li key={idx}>
                          {detail.name}: {detail.utilization}% utilization
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Alerts Message */}
      {alerts.length === 0 && (
        <div style={{
          padding: '20px',
          background: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#155724'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
          <h3 style={{ margin: '0 0 4px 0' }}>No Active Alerts</h3>
          <p style={{ margin: 0, fontSize: '14px' }}>
            All systems are running smoothly
          </p>
        </div>
      )}
    </div>
  );
};

export default SystemMonitor;