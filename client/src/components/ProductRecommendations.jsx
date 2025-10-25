import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecommendations } from '../api/recommendationAPI';

const ProductRecommendations = ({ productId, title = "Recommended Products" }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!productId) return;
      
      try {
        setLoading(true);
        setError(null);
        const data = await getRecommendations(productId);
        
        if (data.success) {
          setRecommendations(data.recommendations || []);
        } else {
          setError(data.error || 'Failed to load recommendations');
        }
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [productId]);

  const handleProductClick = (recommendedProductId) => {
    navigate(`/products/${recommendedProductId}`);
  };

  if (loading) {
    return (
      <div style={{ 
        background: '#fff', 
        padding: '24px', 
        borderRadius: '12px', 
        border: '1px solid #e0e0e0',
        marginTop: '24px'
      }}>
        <h3 style={{ 
          margin: '0 0 20px 0', 
          color: '#5c4033',
          fontSize: '20px',
          fontWeight: '600'
        }}>
          {title}
        </h3>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: '40px' 
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #5c4033',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        background: '#fff', 
        padding: '24px', 
        borderRadius: '12px', 
        border: '1px solid #e0e0e0',
        marginTop: '24px'
      }}>
        <h3 style={{ 
          margin: '0 0 20px 0', 
          color: '#5c4033',
          fontSize: '20px',
          fontWeight: '600'
        }}>
          {title}
        </h3>
        <div style={{ 
          textAlign: 'center', 
          color: '#666',
          padding: '20px'
        }}>
          <p>⚠️ {error}</p>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div style={{ 
        background: '#fff', 
        padding: '24px', 
        borderRadius: '12px', 
        border: '1px solid #e0e0e0',
        marginTop: '24px'
      }}>
        <h3 style={{ 
          margin: '0 0 20px 0', 
          color: '#5c4033',
          fontSize: '20px',
          fontWeight: '600'
        }}>
          {title}
        </h3>
        <div style={{ 
          textAlign: 'center', 
          color: '#666',
          padding: '20px'
        }}>
          <p>No recommendations found</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      background: '#fff', 
      padding: '24px', 
      borderRadius: '12px', 
      border: '1px solid #e0e0e0',
      marginTop: '24px'
    }}>
      <h3 style={{ 
        margin: '0 0 20px 0', 
        color: '#5c4033',
        fontSize: '20px',
        fontWeight: '600'
      }}>
        {title}
      </h3>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {recommendations.map((product) => (
          <div
            key={product.id}
            onClick={() => handleProductClick(product.id)}
            style={{
              background: '#f9f9f9',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              e.target.style.borderColor = '#5c4033';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
              e.target.style.borderColor = '#e0e0e0';
            }}
          >
            {/* Product Image */}
            <div style={{
              width: '100%',
              height: '120px',
              background: '#f5f5f5',
              borderRadius: '6px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              {product.image ? (
                <img
                  src={`http://localhost:5000/uploads/${product.image}`}
                  alt={product.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div style={{
                display: product.image ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                color: '#999',
                fontSize: '12px'
              }}>
                No Image
              </div>
            </div>

            {/* Product Info */}
            <h4 style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: '#333',
              lineHeight: '1.3',
              height: '36px',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}>
              {product.name}
            </h4>

            <div style={{
              fontSize: '12px',
              color: '#666',
              marginBottom: '8px',
              textTransform: 'capitalize'
            }}>
              {product.category}
            </div>

            {/* Rating */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              marginBottom: '8px'
            }}>
              <div style={{ display: 'flex', gap: '2px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    style={{
                      fontSize: '12px',
                      color: star <= Math.round(product.rating) ? '#ffc107' : '#ddd'
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span style={{ fontSize: '12px', color: '#666' }}>
                {product.rating}
              </span>
            </div>

            {/* Price */}
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#5c4033'
            }}>
              ₹{product.price}
            </div>

            {/* Similarity Score (for debugging) */}
            {product.similarity && (
              <div style={{
                fontSize: '10px',
                color: '#999',
                marginTop: '4px'
              }}>
                {Math.round(product.similarity * 100)}% match
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductRecommendations;
