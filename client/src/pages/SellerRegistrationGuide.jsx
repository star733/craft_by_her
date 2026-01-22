import React from "react";
import { Link } from "react-router-dom";

export default function SellerRegistrationGuide() {
  return (
    <div style={{ 
      maxWidth: "800px", 
      margin: "40px auto", 
      padding: "20px",
      fontFamily: "Inter, sans-serif"
    }}>
      <h1 style={{ 
        color: "#5c4033", 
        textAlign: "center", 
        marginBottom: "30px" 
      }}>
        Seller Registration Guide
      </h1>
      
      <div style={{ 
        background: "#fff", 
        padding: "30px", 
        borderRadius: "12px", 
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
      }}>
        <div style={{ 
          padding: "20px", 
          background: "#f8f9fa", 
          borderRadius: "8px", 
          marginBottom: "30px"
        }}>
          <h2 style={{ 
            color: "#5c4033", 
            marginTop: 0 
          }}>
            📝 Before You Begin
          </h2>
          <p>
            Thank you for your interest in becoming a seller on our platform! 
            Please read through this guide to understand the registration process 
            and requirements for sellers.
          </p>
        </div>
        
        <div style={{ marginBottom: "30px" }}>
          <h2 style={{ 
            color: "#5c4033", 
            borderBottom: "2px solid #eee", 
            paddingBottom: "10px" 
          }}>
            Step-by-Step Registration Process
          </h2>
          
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: "20px",
            marginTop: "20px"
          }}>
            <div style={{ 
              display: "flex", 
              gap: "15px",
              padding: "20px",
              border: "1px solid #eee",
              borderRadius: "8px"
            }}>
              <div style={{ 
                background: "#5c4033", 
                color: "white", 
                width: "30px", 
                height: "30px", 
                borderRadius: "50%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                flexShrink: 0
              }}>
                1
              </div>
              <div>
                <h3 style={{ 
                  margin: "0 0 10px 0", 
                  color: "#5c4033" 
                }}>
                  Create Your Account
                </h3>
                <p style={{ 
                  margin: 0, 
                  color: "#666" 
                }}>
                  Visit the <Link to="/register" style={{ color: "#5c4033" }}>registration page</Link> and select "Seller" as your account type. 
                  Fill in your personal information and create a secure password.
                </p>
              </div>
            </div>
            
            <div style={{ 
              display: "flex", 
              gap: "15px",
              padding: "20px",
              border: "1px solid #eee",
              borderRadius: "8px"
            }}>
              <div style={{ 
                background: "#5c4033", 
                color: "white", 
                width: "30px", 
                height: "30px", 
                borderRadius: "50%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                flexShrink: 0
              }}>
                2
              </div>
              <div>
                <h3 style={{ 
                  margin: "0 0 10px 0", 
                  color: "#5c4033" 
                }}>
                  Email Verification
                </h3>
                <p style={{ 
                  margin: 0, 
                  color: "#666" 
                }}>
                  After registration, check your email for a verification link. 
                  Click the link to verify your email address. This step is required 
                  to activate your account.
                </p>
              </div>
            </div>
            
            <div style={{ 
              display: "flex", 
              gap: "15px",
              padding: "20px",
              border: "1px solid #eee",
              borderRadius: "8px"
            }}>
              <div style={{ 
                background: "#5c4033", 
                color: "white", 
                width: "30px", 
                height: "30px", 
                borderRadius: "50%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                flexShrink: 0
              }}>
                3
              </div>
              <div>
                <h3 style={{ 
                  margin: "0 0 10px 0", 
                  color: "#5c4033" 
                }}>
                  Submit Business Details & Documents
                </h3>
                <p style={{ 
                  margin: 0, 
                  color: "#666" 
                }}>
                  After email verification, you'll be redirected to the seller application page where you need to:
                </p>
                <ul style={{ 
                  paddingLeft: "20px", 
                  color: "#666",
                  marginTop: "10px"
                }}>
                  <li>Provide your business information</li>
                  <li>Upload required documents:
                    <ul style={{ paddingLeft: "20px", marginTop: "5px" }}>
                      <li>ID Proof (Aadhar Card, Passport, or Driving License)</li>
                      <li>Business License (Shop Act License, GST Certificate, or Business Registration)</li>
                      <li>Bank Proof (Bank Passbook, Cancelled Cheque, or Bank Statement)</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>

            <div style={{ 
              display: "flex", 
              gap: "15px",
              padding: "20px",
              border: "1px solid #eee",
              borderRadius: "8px"
            }}>
              <div style={{ 
                background: "#5c4033", 
                color: "white", 
                width: "30px", 
                height: "30px", 
                borderRadius: "50%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                flexShrink: 0
              }}>
                4
              </div>
              <div>
                <h3 style={{ 
                  margin: "0 0 10px 0", 
                  color: "#5c4033" 
                }}>
                  Admin Review & Approval
                </h3>
                <p style={{ 
                  margin: 0, 
                  color: "#666" 
                }}>
                  Our admin team will review your application and documents. You will receive an email notification once your account is approved.
                </p>
              </div>
            </div>

            <div style={{ 
              display: "flex", 
              gap: "15px",
              padding: "20px",
              border: "1px solid #eee",
              borderRadius: "8px"
            }}>
              <div style={{ 
                background: "#5c4033", 
                color: "white", 
                width: "30px", 
                height: "30px", 
                borderRadius: "50%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                flexShrink: 0
              }}>
                5
              </div>
              <div>
                <h3 style={{ 
                  margin: "0 0 10px 0", 
                  color: "#5c4033" 
                }}>
                  Access Seller Dashboard
                </h3>
                <p style={{ 
                  margin: 0, 
                  color: "#666" 
                }}>
                  After approval, log in to your account. You will be automatically 
                  redirected to the seller dashboard where you can manage your products 
                  and orders.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div style={{ marginBottom: "30px" }}>
          <h2 style={{ 
            color: "#5c4033", 
            borderBottom: "2px solid #eee", 
            paddingBottom: "10px" 
          }}>
            Seller Requirements
          </h2>
          
          <ul style={{ 
            paddingLeft: "20px", 
            color: "#666" 
          }}>
            <li style={{ marginBottom: "10px" }}>
              <strong>Business Documentation:</strong> You may be required to provide 
              business registration documents or proof of identity.
            </li>
            <li style={{ marginBottom: "10px" }}>
              <strong>Product Quality:</strong> All products must meet quality standards 
              and accurately represent their descriptions.
            </li>
            <li style={{ marginBottom: "10px" }}>
              <strong>Timely Fulfillment:</strong> Orders should be processed and shipped 
              within the agreed timeframes.
            </li>
            <li style={{ marginBottom: "10px" }}>
              <strong>Customer Service:</strong> Respond to customer inquiries promptly 
              and professionally.
            </li>
          </ul>
        </div>
        
        <div style={{ 
          padding: "20px", 
          background: "#fff8e6", 
          border: "1px solid #ffd54f", 
          borderRadius: "8px"
        }}>
          <h3 style={{ 
            margin: "0 0 15px 0", 
            color: "#5c4033", 
            display: "flex", 
            alignItems: "center" 
          }}>
            <span style={{ 
              fontSize: "24px", 
              marginRight: "10px" 
            }}>💡</span>
            Need Help?
          </h3>
          <p style={{ 
            margin: 0, 
            color: "#666" 
          }}>
            If you have any questions during the registration process, please 
            contact our seller support team at <strong>support@foodily.com</strong> 
            or call us at <strong>+91 9876543210</strong>.
          </p>
        </div>
        
        <div style={{ 
          textAlign: "center", 
          marginTop: "30px" 
        }}>
          <Link 
            to="/register" 
            style={{
              background: "#5c4033",
              color: "white",
              padding: "12px 30px",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "16px",
              display: "inline-block"
            }}
          >
            Register as Seller
          </Link>
        </div>
      </div>
    </div>
  );
}