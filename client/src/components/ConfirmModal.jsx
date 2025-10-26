import React from 'react';

export default function ConfirmModal({ isOpen, onConfirm, onCancel, title, message, confirmText = "Confirm", cancelText = "Cancel", type = "warning" }) {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: '#fee2e2',
          icon: '🗑️',
          confirmBg: '#dc3545',
          confirmColor: '#fff',
          confirmShadow: '0 4px 12px rgba(220, 53, 69, 0.3)'
        };
      case 'success':
        return {
          iconBg: '#e6f4ea',
          icon: '✓',
          confirmBg: '#28a745',
          confirmColor: '#fff',
          confirmShadow: '0 4px 12px rgba(40, 167, 69, 0.3)'
        };
      case 'warning':
      default:
        return {
          iconBg: '#fff7e6',
          icon: '⚡',
          confirmBg: '#5c4033',
          confirmColor: '#fff',
          confirmShadow: '0 4px 12px rgba(92, 64, 51, 0.3)'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '450px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        animation: 'slideIn 0.2s ease-out'
      }}>
        {/* Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: styles.iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '32px'
        }}>
          {styles.icon}
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#333',
          marginBottom: '12px',
          textAlign: 'center'
        }}>
          {title}
        </h2>

        {/* Message */}
        <p style={{
          fontSize: '16px',
          color: '#666',
          marginBottom: '32px',
          textAlign: 'center',
          lineHeight: '1.5'
        }}>
          {message}
        </p>

        {/* Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '12px 32px',
              borderRadius: '8px',
              border: '2px solid #ddd',
              backgroundColor: '#fff',
              color: '#666',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              minWidth: '120px'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#f5f5f5';
              e.target.style.borderColor = '#999';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#fff';
              e.target.style.borderColor = '#ddd';
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '12px 32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: styles.confirmBg,
              color: styles.confirmColor,
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              minWidth: '120px',
              boxShadow: styles.confirmShadow
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              const shadowColor = type === 'danger' ? 'rgba(220, 53, 69, 0.4)' : 
                                  type === 'success' ? 'rgba(40, 167, 69, 0.4)' : 
                                  'rgba(92, 64, 51, 0.4)';
              e.target.style.boxShadow = `0 6px 20px ${shadowColor}`;
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = styles.confirmShadow;
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

