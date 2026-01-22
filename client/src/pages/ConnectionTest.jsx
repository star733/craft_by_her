// src/pages/ConnectionTest.jsx
import React, { useState, useEffect } from "react";
import { diagnoseConnectionIssues } from "../utils/connectionTest";
import { Link } from "react-router-dom";

export default function ConnectionTest() {
  const [diagnostics, setDiagnostics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        setLoading(true);
        const results = await diagnoseConnectionIssues();
        setDiagnostics(results);
      } catch (err) {
        setError("Failed to run diagnostics: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    runDiagnostics();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Running Connection Diagnostics...</h2>
        <p>Please wait while we check your connection to the server.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Error</h2>
        <p style={{ color: "red" }}>{error}</p>
        <Link to="/login" style={{ color: "#5c4033", textDecoration: "none" }}>
          ← Back to Login
        </Link>
      </div>
    );
  }

  const allTestsPassed = diagnostics.tests.every(test => test.status === "PASS" || test.status === "INFO");

  return (
    <div style={{ 
      maxWidth: "800px", 
      margin: "0 auto", 
      padding: "20px",
      fontFamily: "Arial, sans-serif"
    }}>
      <h1 style={{ color: "#5c4033", textAlign: "center" }}>Connection Diagnostics</h1>
      
      <div style={{ 
        background: allTestsPassed ? "#e8f5e9" : "#ffebee", 
        border: `1px solid ${allTestsPassed ? "#4caf50" : "#f44336"}`,
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "20px"
      }}>
        <h2 style={{ 
          color: allTestsPassed ? "#2e7d32" : "#c62828",
          textAlign: "center",
          margin: "0 0 10px 0"
        }}>
          {allTestsPassed ? "✅ All Tests Passed" : "❌ Connection Issues Detected"}
        </h2>
        <p style={{ textAlign: "center", margin: "0" }}>
          {allTestsPassed 
            ? "Your connection to the server is working correctly." 
            : "There are issues with your connection to the server."}
        </p>
      </div>

      <div style={{ 
        background: "white", 
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "20px"
      }}>
        <h3 style={{ color: "#5c4033", margin: "0 0 15px 0" }}>Diagnostics Summary</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <strong>API Base URL:</strong>
          </div>
          <div>{diagnostics.apiBase}</div>
          
          <div>
            <strong>Timestamp:</strong>
          </div>
          <div>{new Date(diagnostics.timestamp).toLocaleString()}</div>
        </div>
      </div>

      <div style={{ 
        background: "white", 
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        padding: "20px"
      }}>
        <h3 style={{ color: "#5c4033", margin: "0 0 15px 0" }}>Test Results</h3>
        {diagnostics.tests.map((test, index) => (
          <div 
            key={index} 
            style={{ 
              padding: "15px",
              marginBottom: "10px",
              background: test.status === "PASS" ? "#f1f8e9" : 
                         test.status === "FAIL" ? "#ffebee" : "#e3f2fd",
              border: `1px solid ${
                test.status === "PASS" ? "#81c784" : 
                test.status === "FAIL" ? "#e57373" : "#64b5f6"
              }`,
              borderRadius: "6px"
            }}
          >
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              marginBottom: "8px"
            }}>
              <strong>{test.name}</strong>
              <span style={{ 
                padding: "4px 8px",
                borderRadius: "4px",
                background: test.status === "PASS" ? "#4caf50" : 
                           test.status === "FAIL" ? "#f44336" : "#2196f3",
                color: "white",
                fontSize: "12px"
              }}>
                {test.status}
              </span>
            </div>
            <div>{test.details}</div>
          </div>
        ))}
      </div>

      {!allTestsPassed && (
        <div style={{ 
          background: "#fff3e0", 
          border: "1px solid #ff9800",
          borderRadius: "8px",
          padding: "20px",
          marginTop: "20px"
        }}>
          <h3 style={{ color: "#ef6c00", margin: "0 0 10px 0" }}>Troubleshooting Steps</h3>
          <ol>
            <li>Ensure the backend server is running on port 5000</li>
            <li>Check that you have internet connectivity</li>
            <li>Verify that the VITE_API_BASE_URL in your .env.local file is correct</li>
            <li>If you're using a different port, update the .env.local file accordingly</li>
            <li>Try refreshing the page after ensuring the server is running</li>
          </ol>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: "30px" }}>
        <Link 
          to="/login" 
          style={{
            display: "inline-block",
            padding: "10px 20px",
            background: "#5c4033",
            color: "white",
            textDecoration: "none",
            borderRadius: "6px",
            fontWeight: "bold"
          }}
        >
          ← Back to Login
        </Link>
      </div>
    </div>
  );
}