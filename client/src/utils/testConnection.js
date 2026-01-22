// Simple connection test utility
export async function testConnection() {
  try {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
    console.log("Testing connection to:", API_BASE);
    
    // Test basic connectivity
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log("Connection test result:", response.status, response.statusText);
    return { success: true, status: response.status, message: "Connected successfully" };
  } catch (error) {
    console.error("Connection test failed:", error);
    if (error.name === 'AbortError') {
      return { success: false, message: "Connection timeout - server not responding" };
    } else if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
      return { success: false, message: "Cannot connect to server - connection refused" };
    } else {
      return { success: false, message: "Connection error: " + error.message };
    }
  }
}