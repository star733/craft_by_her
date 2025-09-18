// src/utils/validate.js
export const validateEmail = (email) => {
    if (!email || !email.trim()) return "Email is required.";
    // Valid email with a dot-TLD of 2–10 letters (e.g. .com, .net, .in, .co.in)
    const re = /^[^\s@]+@([^\s@]+\.)+[A-Za-z]{2,10}$/;
    if (!re.test(email.trim())) return "Please enter a valid email (e.g. name@example.com, .net, .in).";
    return "";
  };
  
  export const validatePassword = (pw, min = 8) => {
    if (!pw) return "Password is required.";
    if (pw.length < min) return `Password must be at least ${min} characters.`;
    return "";
  };
  
  export const validateName = (name) => {
    if (!name || !name.trim()) return "Full name is required.";
    const trimmed = name.trim();
    if (trimmed.length < 2) return "Please enter your full name.";
    // Disallow email-like values and numbers/symbols-heavy strings
    if (/@|\.[A-Za-z]{2,}/.test(trimmed)) return "Please enter your full name (not an email).";
    if (!/^[A-Za-z][A-Za-z\s'.-]{1,}$/.test(trimmed)) return "Use letters and spaces only for your name.";
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
  