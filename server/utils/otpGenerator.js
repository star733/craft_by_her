/**
 * Generate a 6-digit OTP for order pickup
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Validate OTP format
 */
function validateOTP(otp) {
  return /^\d{6}$/.test(otp);
}

/**
 * Generate OTP with expiry time (default 24 hours)
 */
function generateOTPWithExpiry(expiryHours = 24) {
  const otp = generateOTP();
  const expiryTime = new Date();
  expiryTime.setHours(expiryTime.getHours() + expiryHours);
  
  return {
    otp,
    expiryTime,
    isExpired: function() {
      return new Date() > this.expiryTime;
    }
  };
}

module.exports = {
  generateOTP,
  validateOTP,
  generateOTPWithExpiry
};