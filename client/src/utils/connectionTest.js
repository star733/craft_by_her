// src/utils/connectionTest.js
// Utility to test connection to backend server

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function testServerConnection() {
  try {
    // Test basic connectivity
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.status === 401) {
      // This is expected for unauthenticated requests - server is reachable
      return { 
        success: true, 
        message: "Server is reachable", 
        details: "Connected to server successfully" 
      };
    } else {
      return { 
        success: true, 
        message: "Server is reachable", 
        details: `Server responded with status ${response.status}` 
      };
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return { 
        success: false, 
        message: "Connection timeout", 
        details: "Server did not respond within 5 seconds. Check if server is running." 
      };
    } else if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
      return { 
        success: false, 
        message: "Cannot connect to server", 
        details: "Server is unreachable. Please ensure the server is running on port 5000." 
      };
    } else {
      return { 
        success: false, 
        message: "Connection error", 
        details: error.message 
      };
    }
  }
}

export async function diagnoseConnectionIssues() {
  const diagnostics = {
    apiBase: API_BASE,
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  // Test 1: Check if API_BASE is set correctly
  diagnostics.tests.push({
    name: "API Base URL Configuration",
    status: API_BASE ? "PASS" : "FAIL",
    details: API_BASE ? `Using API base: ${API_BASE}` : "API_BASE is not configured"
  });
  
  // Test 2: Check if we can reach the server
  const connectionTest = await testServerConnection();
  diagnostics.tests.push({
    name: "Server Connectivity",
    status: connectionTest.success ? "PASS" : "FAIL",
    details: connectionTest.details
  });
  
  // Test 3: Check if we're in development environment
  const isDev = import.meta.env.DEV;
  diagnostics.tests.push({
    name: "Development Environment",
    status: "INFO",
    details: isDev ? "Running in development mode" : "Not in development mode"
  });
  
  return diagnostics;
}