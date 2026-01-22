// Shared location utilities (used by seller and admin features)

/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Haversine formula to calculate distance between two coordinates (in km)
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in kilometers
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon1 - lon2);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

module.exports = {
  calculateDistance,
};

