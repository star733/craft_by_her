// src/utils/validate.js
export const validateEmail = (email) => {
    if (!email || !email.trim()) return "Email is required.";
    // Require a final TLD of at least 3 letters (blocks .co, .io, etc if undesired)
    const re = /^[^\s@]+@([^\s@]+\.)+[A-Za-z]{3,}$/;
    if (!re.test(email.trim())) return "Please enter a valid email address (use a domain like .com).";
    return "";
  };
  
  export const validatePassword = (pw, min = 8) => {
    if (!pw) return "Password is required.";
    if (pw.length < min) return `Password must be at least ${min} characters.`;
    return "";
  };
  
  export const validateName = (name) => {
    if (!name || !name.trim()) return "Full name is required.";
    if (name.trim().length < 2) return "Please enter your full name.";
    return "";
  };
  
  export const validatePhone = (phone) => {
    if (!phone) return "Phone number is required.";
    if (!/^[0-9]{10}$/.test(phone)) return "Enter a valid 10-digit phone number.";
    return "";
  };
  
  // one-shot forms
  export const validateLogin = ({ email, password }) =>
    validateEmail(email) || validatePassword(password);
  
  export const validateRegister = ({ name, phone, email, password }) =>
    validateName(name) || validatePhone(phone) || validateEmail(email) || validatePassword(password);
  