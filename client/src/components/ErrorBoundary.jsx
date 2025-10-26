import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: "40px", 
          textAlign: "center", 
          background: "#fff", 
          borderRadius: "12px", 
          border: "1px solid #dc3545",
          margin: "20px"
        }}>
          <h2 style={{ color: "#dc3545" }}>⚠️ Something went wrong</h2>
          <p style={{ color: "#6c757d", marginBottom: "20px" }}>
            The page encountered an error, but the application is still running in demo mode.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              padding: "10px 20px",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;























