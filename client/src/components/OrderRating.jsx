import React, { useState } from 'react';
import { auth } from '../firebase';
import { toast } from 'react-toastify';

const OrderRating = ({ orderId, onRatingSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hovered, setHovered] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (!auth.currentUser) {
      toast.error('Please login to submit rating');
      return;
    }

    try {
      setSubmitting(true);
      console.log('Submitting rating:', { orderId, rating, review });
      
      const token = await auth.currentUser.getIdToken();
      console.log('Got token:', token ? 'Yes' : 'No');
      
      const response = await fetch(`http://localhost:5000/api/orders/${orderId}/rate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating,
          review: review.trim()
        })
      });
      
      console.log('Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Rating submitted successfully:', result);
        toast.success('Thank you for your rating!');
        onRatingSubmitted && onRatingSubmitted();
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Rating submission failed:', error);
        toast.error(error.error || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e0e0e0',
      borderRadius: '12px',
      padding: '24px',
      marginTop: '20px'
    }}>
      <h3 style={{ 
        margin: '0 0 16px 0', 
        color: '#5c4033',
        fontSize: '18px',
        fontWeight: '600'
      }}>
        Rate Your Order
      </h3>
      
      <p style={{ 
        margin: '0 0 20px 0', 
        color: '#666',
        fontSize: '14px'
      }}>
        How was your delivery experience?
      </p>

      <form onSubmit={handleSubmit}>
        {/* Star Rating */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '24px',
                  color: star <= (hovered || rating) ? '#ffc107' : '#ddd',
                  transition: 'color 0.2s',
                  padding: '4px'
                }}
              >
                ★
              </button>
            ))}
            <span style={{ 
              marginLeft: '12px', 
              color: '#666',
              fontSize: '14px'
            }}>
              {rating > 0 && (
                rating === 1 ? 'Poor' :
                rating === 2 ? 'Fair' :
                rating === 3 ? 'Good' :
                rating === 4 ? 'Very Good' :
                'Excellent'
              )}
            </span>
          </div>
        </div>

        {/* Review Text */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#333'
          }}>
            Review (Optional)
          </label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Share your experience with this delivery..."
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              minHeight: '80px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
            maxLength={500}
          />
          <div style={{
            fontSize: '12px',
            color: '#999',
            textAlign: 'right',
            marginTop: '4px'
          }}>
            {review.length}/500
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={submitting || rating === 0}
            style={{
              padding: '12px 24px',
              background: rating === 0 ? '#ccc' : '#5c4033',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: rating === 0 ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderRating;
