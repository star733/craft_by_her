import React, { useState, useEffect } from 'react';

/**
 * Sales Prediction Dashboard Component
 * =====================================
 * Displays ML-based sales predictions in the admin dashboard
 * 
 * SAFETY: Only reads predictions - never modifies database
 */

const SalesPredictionDashboard = () => {
  const [predictions, setPredictions] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMonths, setSelectedMonths] = useState(3);

  const API_BASE = 'http://localhost:5000/api/sales-prediction'; // Works without Python!

  // Load historical data on mount
  useEffect(() => {
    loadMonthlyData();
  }, []);

  // Load historical monthly sales data
  const loadMonthlyData = async () => {
    try {
      const response = await fetch(`${API_BASE}/monthly-data`);
      const data = await response.json();
      
      if (data.success) {
        setMonthlyData(data.data);
      }
    } catch (err) {
      console.error('Error loading monthly data:', err);
    }
  };

  // Train the ML model
  const handleTrainModel = async () => {
    setTraining(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Model trained successfully! You can now make predictions.');
        loadPredictions(); // Auto-load predictions after training
      } else {
        setError(data.error || 'Training failed');
        alert('❌ Training failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      setError('Failed to train model: ' + err.message);
      alert('❌ Error: ' + err.message);
    } finally {
      setTraining(false);
    }
  };

  // Load predictions for next N months
  const loadPredictions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/predict-next-months/${selectedMonths}`);
      const data = await response.json();

      if (data.success) {
        setPredictions(data.predictions);
      } else {
        setError(data.error || 'Prediction failed');
        if (data.message && data.message.includes('train')) {
          alert('⚠️ Please train the model first!');
        }
      }
    } catch (err) {
      setError('Failed to load predictions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📊 Sales Analytics & Forecasting</h2>
      <p style={styles.subtitle}>AI-powered insights from your sales data</p>

      {/* Control Panel */}
      <div style={styles.controlPanel}>
        <div style={styles.selectGroup}>
          <label style={styles.label}>Forecast Period:</label>
          <select
            value={selectedMonths}
            onChange={(e) => setSelectedMonths(parseInt(e.target.value))}
            style={styles.select}
          >
            <option value={1}>Next 1 month</option>
            <option value={3}>Next 3 months</option>
            <option value={6}>Next 6 months</option>
            <option value={12}>Next 12 months</option>
          </select>
        </div>

        <button
          onClick={loadPredictions}
          disabled={loading || training}
          style={{
            ...styles.button,
            ...styles.predictButton,
            ...(loading ? styles.buttonDisabled : {})
          }}
        >
          {loading ? '🔄 Analyzing...' : '📈 Generate Forecast'}
        </button>

        {/* Hidden auto-train on first load */}
        {monthlyData.length > 0 && predictions.length === 0 && !loading && (
          <button
            onClick={handleTrainModel}
            disabled={training}
            style={{
              ...styles.button,
              ...styles.trainButton,
              fontSize: '12px',
              padding: '8px 16px',
              opacity: 0.7
            }}
          >
            {training ? '🔄 Initializing...' : '🔧 Initialize ML Model'}
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div style={styles.error}>
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      {/* Historical Data Summary */}
      {monthlyData.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>📊 Sales Performance Overview</h3>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Data Period</div>
              <div style={styles.statValue}>{monthlyData.length}</div>
              <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
                {monthlyData.length === 1 ? 'month' : 'months'}
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Orders</div>
              <div style={styles.statValue}>
                {monthlyData.reduce((sum, d) => sum + d.order_count, 0)}
              </div>
              <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
                completed
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Revenue</div>
              <div style={styles.statValue}>
                ₹{monthlyData.reduce((sum, d) => sum + d.total_sales, 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
                all-time
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Avg Monthly Sales</div>
              <div style={styles.statValue}>
                ₹{(monthlyData.reduce((sum, d) => sum + d.total_sales, 0) / monthlyData.length).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
                per month
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Predictions Display */}
      {predictions.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>🔮 Sales Forecast</h3>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
            AI-predicted revenue based on historical trends
          </p>
          <div style={styles.predictionsGrid}>
            {predictions.map((pred, index) => (
              <div key={pred.month_number} style={styles.predictionCard}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                  Month {index + 1}
                </div>
                <div style={styles.predictionMonth}>{pred.month_name}</div>
                <div style={styles.predictionAmount}>
                  {pred.predicted_sales_formatted}
                </div>
                <div style={styles.predictionLabel}>Expected Revenue</div>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: '#f0f8ff',
            borderLeft: '4px solid #667eea',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#555'
          }}>
            💡 <strong>Note:</strong> Predictions are based on machine learning analysis of your historical sales patterns. 
            Accuracy improves with more data over time.
          </div>
        </div>
      )}

      {/* Instructions */}
      {predictions.length === 0 && !loading && monthlyData.length > 0 && (
        <div style={styles.instructions}>
          <h4>📊 Sales Forecasting</h4>
          <p style={{ color: '#666', lineHeight: '1.6' }}>
            Our AI analyzes your historical sales data to predict future revenue trends. 
            This helps you plan inventory, staffing, and business strategies.
          </p>
          <div style={{ marginTop: '16px', padding: '16px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <strong style={{ color: '#667eea' }}>💼 Business Insights:</strong>
            <ul style={{ marginTop: '8px', paddingLeft: '20px', lineHeight: '1.8' }}>
              <li>Plan inventory based on predicted demand</li>
              <li>Optimize marketing budgets for high-sales months</li>
              <li>Prepare for seasonal variations</li>
              <li>Make data-driven business decisions</li>
            </ul>
          </div>
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#999' }}>
              Select a forecast period above and click <strong>"Generate Forecast"</strong>
            </p>
          </div>
        </div>
      )}

      {/* No data state */}
      {monthlyData.length === 0 && !loading && (
        <div style={{
          ...styles.instructions,
          textAlign: 'center',
          padding: '40px 24px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <h4>No Sales Data Available</h4>
          <p style={{ color: '#666', marginTop: '12px' }}>
            You need at least a few delivered orders to generate sales forecasts.
          </p>
          <p style={{ color: '#999', fontSize: '14px', marginTop: '8px' }}>
            Complete some orders and check back here for AI-powered insights!
          </p>
        </div>
      )}
    </div>
  );
};

// Styles
const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'Arial, sans-serif'
  },
  title: {
    margin: '0 0 8px 0',
    color: '#333',
    fontSize: '28px'
  },
  subtitle: {
    margin: '0 0 24px 0',
    color: '#666',
    fontSize: '14px'
  },
  controlPanel: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  button: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    color: '#fff'
  },
  trainButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  predictButton: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  selectGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    color: '#666',
    fontWeight: '500'
  },
  select: {
    padding: '10px 16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  error: {
    padding: '16px',
    background: '#fee',
    border: '1px solid #fcc',
    borderRadius: '8px',
    color: '#c33',
    marginBottom: '24px'
  },
  section: {
    marginBottom: '32px'
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    color: '#444',
    fontSize: '20px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  statCard: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    borderRadius: '12px',
    color: '#fff',
    textAlign: 'center'
  },
  statLabel: {
    fontSize: '13px',
    opacity: 0.9,
    marginBottom: '8px'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 'bold'
  },
  predictionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px'
  },
  predictionCard: {
    background: '#fff',
    border: '2px solid #e0e0e0',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    transition: 'all 0.3s',
    cursor: 'pointer'
  },
  predictionMonth: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '12px'
  },
  predictionAmount: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: '8px'
  },
  predictionLabel: {
    fontSize: '13px',
    color: '#999'
  },
  instructions: {
    background: '#f9f9f9',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '24px',
    marginTop: '24px'
  }
};

export default SalesPredictionDashboard;

