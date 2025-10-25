const API_BASE_URL = 'http://localhost:5000';

/**
 * Get product recommendations based on similarity
 * @param {string} productId - The ID of the product to get recommendations for
 * @returns {Promise<Object>} - Returns recommendations data
 */
export const getRecommendations = async (productId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/recommend/${productId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    throw error;
  }
};

/**
 * Get all products (for testing/debugging)
 * @returns {Promise<Object>} - Returns all products data
 */
export const getAllProducts = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/recommend/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching all products:', error);
    throw error;
  }
};



