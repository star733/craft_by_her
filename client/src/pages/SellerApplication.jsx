import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function SellerApplication() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "individual",
    businessRegistrationNumber: "",
    gstin: "",
    address: {
      street: "",
      city: "",
      state: "",
      pincode: "",
      country: "India"
    },
    phone: ""
  });
  const [documents, setDocuments] = useState({
    idProof: null,
    businessLicense: null,
    bankProof: null
  });
  const [errors, setErrors] = useState({});

  // Check if user is authenticated and get application status
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Check if user already has an application
        try {
          const token = await currentUser.getIdToken(true);
          const response = await fetch("http://localhost:5000/api/seller/applications/my-application", {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setApplicationStatus(data.application);
              // If already approved, redirect to seller dashboard
              if (data.application.status === 'approved') {
                navigate('/seller');
              }
            }
          }
        } catch (err) {
          console.log("No existing application found");
        }
      } else {
        navigate('/login');
      }
    });
    
    return () => unsubscribe();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      // Handle nested fields like address.street
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const handleDocumentChange = (e, docType) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error("Only JPG, PNG, and PDF files are allowed");
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      
      setDocuments(prev => ({
        ...prev,
        [docType]: file
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.businessName.trim()) {
      newErrors.businessName = "Business name is required";
    }
    
    if (!formData.address.street.trim()) {
      newErrors['address.street'] = "Street address is required";
    }
    
    if (!formData.address.city.trim()) {
      newErrors['address.city'] = "City is required";
    }
    
    if (!formData.address.state.trim()) {
      newErrors['address.state'] = "State is required";
    }
    
    if (!formData.address.pincode.trim()) {
      newErrors['address.pincode'] = "Pincode is required";
    } else if (!/^\d{6}$/.test(formData.address.pincode)) {
      newErrors['address.pincode'] = "Pincode must be 6 digits";
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "Phone number must be 10 digits";
    }
    
    // Validate required documents
    if (!documents.idProof) {
      newErrors.idProof = "Identity proof document is required";
    }
    
    if (!documents.businessLicense) {
      newErrors.businessLicense = "Business license document is required";
    }
    
    if (!documents.bankProof) {
      newErrors.bankProof = "Bank proof document is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }
    
    setLoading(true);
    
    try {
      const token = await auth.currentUser.getIdToken(true);
      
      // Create FormData for multipart upload
      const formDataObj = new FormData();
      formDataObj.append('businessName', formData.businessName);
      formDataObj.append('businessType', formData.businessType);
      formDataObj.append('businessRegistrationNumber', formData.businessRegistrationNumber);
      formDataObj.append('gstin', formData.gstin);
      formDataObj.append('address', JSON.stringify(formData.address));
      formDataObj.append('phone', formData.phone);
      
      // Append documents
      if (documents.idProof) {
        formDataObj.append('idProof', documents.idProof);
      }
      
      if (documents.businessLicense) {
        formDataObj.append('businessLicense', documents.businessLicense);
      }
      
      if (documents.bankProof) {
        formDataObj.append('bankProof', documents.bankProof);
      }
      
      const response = await fetch("http://localhost:5000/api/seller/applications/apply", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`
        },
        body: formDataObj
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success("Application submitted successfully! Our admin team will review your documents and notify you of the approval status.");
        // Update application status
        setApplicationStatus({
          id: data.applicationId,
          businessName: formData.businessName,
          status: 'submitted',
          displayStatus: 'Submitted',
          submittedAt: new Date().toISOString()
        });
        
        // Redirect to seller dashboard after successful submission
        setTimeout(() => {
          navigate('/seller');
        }, 3000);
      } else {
        toast.error(data.error || "Failed to submit application");
      }
    } catch (err) {
      console.error("Error submitting application:", err);
      toast.error("Failed to submit application. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="bk-auth-wrapper" style={{ minHeight: "80vh" }}>
        <div className="bk-auth-card">
          <div className="loading">Loading...</div>
        </div>
      </div>
    );
  }

  // If user already has an approved application, redirect to dashboard
  if (applicationStatus && applicationStatus.status === 'approved') {
    return (
      <div className="bk-auth-wrapper" style={{ minHeight: "80vh" }}>
        <div className="bk-auth-card">
          <div className="text-center">
            <h2>Your Application is Approved!</h2>
            <p>You can now access the seller dashboard.</p>
            <button 
              className="bk-btn bk-btn--primary"
              onClick={() => navigate('/seller')}
            >
              Go to Seller Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bk-auth-wrapper" style={{ minHeight: "100vh" }}>
      <div className="bk-auth-card" style={{ maxWidth: "800px" }}>
        <div className="bk-auth-form">
          <h2 className="bk-auth-title">Seller Application</h2>
          
          {applicationStatus ? (
            <div className="application-status-info" style={{ 
              padding: "20px", 
              marginBottom: "20px", 
              backgroundColor: "#f8f9fa", 
              borderRadius: "8px",
              border: "1px solid #dee2e6"
            }}>
              <h3>Current Application Status</h3>
              <p><strong>Status:</strong> {applicationStatus.displayStatus}</p>
              <p><strong>Submitted:</strong> {new Date(applicationStatus.submittedAt).toLocaleDateString()}</p>
              {applicationStatus.rejectionReason && (
                <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#f8d7da", borderRadius: "4px" }}>
                  <strong>Rejection Reason:</strong> {applicationStatus.rejectionReason}
                </div>
              )}
            </div>
          ) : (
            <p>Please fill in the details below to apply as a seller on our platform.</p>
          )}

          <form onSubmit={handleSubmit}>
            {/* Business Information */}
            <div className="bk-section">
              <h3>Business Information</h3>
              
              <div className="bk-field">
                <label className="bk-auth-label">Business Name *</label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  className={`bk-auth-input ${errors.businessName ? "is-invalid" : ""}`}
                  placeholder="Enter your business name"
                />
                {errors.businessName && <span className="field-error">{errors.businessName}</span>}
              </div>
              
              <div className="bk-field">
                <label className="bk-auth-label">Business Type *</label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleChange}
                  className="bk-auth-input"
                >
                  <option value="individual">Individual/Sole Proprietorship</option>
                  <option value="partnership">Partnership</option>
                  <option value="private_limited">Private Limited Company</option>
                  <option value="llp">Limited Liability Partnership (LLP)</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="bk-field">
                <label className="bk-auth-label">Business Registration Number</label>
                <input
                  type="text"
                  name="businessRegistrationNumber"
                  value={formData.businessRegistrationNumber}
                  onChange={handleChange}
                  className="bk-auth-input"
                  placeholder="Enter business registration number (if applicable)"
                />
              </div>
              
              <div className="bk-field">
                <label className="bk-auth-label">GSTIN (if applicable)</label>
                <input
                  type="text"
                  name="gstin"
                  value={formData.gstin}
                  onChange={handleChange}
                  className="bk-auth-input"
                  placeholder="Enter GST Identification Number"
                />
              </div>
            </div>
            
            {/* Address Information */}
            <div className="bk-section">
              <h3>Business Address</h3>
              
              <div className="bk-field">
                <label className="bk-auth-label">Street Address *</label>
                <input
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleChange}
                  className={`bk-auth-input ${errors['address.street'] ? "is-invalid" : ""}`}
                  placeholder="Street address"
                />
                {errors['address.street'] && <span className="field-error">{errors['address.street']}</span>}
              </div>
              
              <div className="bk-field-row">
                <div className="bk-field">
                  <label className="bk-auth-label">City *</label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                    className={`bk-auth-input ${errors['address.city'] ? "is-invalid" : ""}`}
                    placeholder="City"
                  />
                  {errors['address.city'] && <span className="field-error">{errors['address.city']}</span>}
                </div>
                
                <div className="bk-field">
                  <label className="bk-auth-label">State *</label>
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleChange}
                    className={`bk-auth-input ${errors['address.state'] ? "is-invalid" : ""}`}
                    placeholder="State"
                  />
                  {errors['address.state'] && <span className="field-error">{errors['address.state']}</span>}
                </div>
              </div>
              
              <div className="bk-field-row">
                <div className="bk-field">
                  <label className="bk-auth-label">Pincode *</label>
                  <input
                    type="text"
                    name="address.pincode"
                    value={formData.address.pincode}
                    onChange={handleChange}
                    className={`bk-auth-input ${errors['address.pincode'] ? "is-invalid" : ""}`}
                    placeholder="6-digit pincode"
                    maxLength="6"
                  />
                  {errors['address.pincode'] && <span className="field-error">{errors['address.pincode']}</span>}
                </div>
                
                <div className="bk-field">
                  <label className="bk-auth-label">Country</label>
                  <input
                    type="text"
                    name="address.country"
                    value={formData.address.country}
                    onChange={handleChange}
                    className="bk-auth-input"
                    readOnly
                  />
                </div>
              </div>
            </div>
            
            {/* Contact Information */}
            <div className="bk-section">
              <h3>Contact Information</h3>
              
              <div className="bk-field">
                <label className="bk-auth-label">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`bk-auth-input ${errors.phone ? "is-invalid" : ""}`}
                  placeholder="10-digit mobile number"
                  maxLength="10"
                />
                {errors.phone && <span className="field-error">{errors.phone}</span>}
              </div>
            </div>
            
            {/* Document Upload */}
            <div className="bk-section">
              <h3>Required Documents</h3>
              <p className="text-muted">Please upload clear scans or photos of the following documents</p>
              
              <div className="bk-field">
                <label className="bk-auth-label">Identity Proof *</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => handleDocumentChange(e, 'idProof')}
                  className={`bk-auth-input ${errors.idProof ? "is-invalid" : ""}`}
                />
                <small className="text-muted">Upload Aadhar Card, Passport, or Driving License</small>
                {errors.idProof && <span className="field-error">{errors.idProof}</span>}
              </div>
              
              <div className="bk-field">
                <label className="bk-auth-label">Business License *</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => handleDocumentChange(e, 'businessLicense')}
                  className={`bk-auth-input ${errors.businessLicense ? "is-invalid" : ""}`}
                />
                <small className="text-muted">Upload Shop Act License, GST Certificate, or Business Registration</small>
                {errors.businessLicense && <span className="field-error">{errors.businessLicense}</span>}
              </div>
              
              <div className="bk-field">
                <label className="bk-auth-label">Bank Proof *</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => handleDocumentChange(e, 'bankProof')}
                  className={`bk-auth-input ${errors.bankProof ? "is-invalid" : ""}`}
                />
                <small className="text-muted">Upload Bank Passbook, Cancelled Cheque, or Bank Statement</small>
                {errors.bankProof && <span className="field-error">{errors.bankProof}</span>}
              </div>
            </div>
            
            <div className="bk-form-actions">
              <button 
                type="submit" 
                className={`bk-btn bk-btn--primary ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}