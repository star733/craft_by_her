/**
 * KYC Verification Utilities
 * Enhanced verification for women-only seller platform
 */

/**
 * Extract gender from ID number patterns
 * Many government IDs encode gender in specific digits
 */
const extractGenderFromId = (idType, idNumber) => {
  try {
    const normalized = idNumber.replace(/\s/g, '').toUpperCase();
    
    switch(idType) {
      case 'aadhar':
        // Aadhar card doesn't directly encode gender in the number
        // But can be verified through UIDAI API (requires integration)
        return { 
          canDetect: false, 
          gender: null,
          requiresManualVerification: true,
          note: 'Aadhar requires document verification or UIDAI API'
        };
        
      case 'pan':
        // PAN card 4th character indicates gender in some cases
        // But not consistently - requires document verification
        const fourthChar = normalized[3];
        return {
          canDetect: false,
          gender: null,
          requiresManualVerification: true,
          note: 'PAN requires document verification'
        };
        
      case 'driving_license':
        // Format varies by state, no consistent gender encoding
        return {
          canDetect: false,
          gender: null,
          requiresManualVerification: true,
          note: 'Driving license requires document verification'
        };
        
      case 'voter_id':
        // Voter ID doesn't encode gender in number
        return {
          canDetect: false,
          gender: null,
          requiresManualVerification: true,
          note: 'Voter ID requires document verification'
        };
        
      default:
        return {
          canDetect: false,
          gender: null,
          requiresManualVerification: true,
          note: 'Unknown ID type'
        };
    }
  } catch (error) {
    console.error('Error extracting gender from ID:', error);
    return {
      canDetect: false,
      gender: null,
      requiresManualVerification: true,
      error: error.message
    };
  }
};

/**
 * Validate name for typical female names (basic check, not foolproof)
 * This is NOT reliable - only for flagging suspicious cases
 */
const checkNamePattern = (name) => {
  const normalized = name.toLowerCase().trim();
  
  // Common female name patterns in India (very basic, not comprehensive)
  const femaleIndicators = [
    'devi', 'kumari', 'bai', 'begum', 'bibi',
    'a$', 'i$', 'e$', // Many female names end with a, i, e
  ];
  
  const maleIndicators = [
    'kumar', 'singh', 'raj', 'deep', 'sharma',
    'er$', // Many male names end with 'er'
  ];
  
  let femaleScore = 0;
  let maleScore = 0;
  
  femaleIndicators.forEach(pattern => {
    if (pattern.includes('$')) {
      const regex = new RegExp(pattern);
      if (regex.test(normalized)) femaleScore++;
    } else {
      if (normalized.includes(pattern)) femaleScore++;
    }
  });
  
  maleIndicators.forEach(pattern => {
    if (pattern.includes('$')) {
      const regex = new RegExp(pattern);
      if (regex.test(normalized)) maleScore++;
    } else {
      if (normalized.includes(pattern)) maleScore++;
    }
  });
  
  return {
    likelyFemale: femaleScore > maleScore,
    likelyMale: maleScore > femaleScore,
    uncertain: femaleScore === maleScore,
    confidence: 'low', // Name alone is not reliable
    note: 'Name pattern checking is not reliable - requires document verification'
  };
};

/**
 * Check for common fraud patterns in applications
 */
const detectFraudPatterns = async (application) => {
  const flags = [];
  
  // Check 1: Suspicious file names (e.g., downloaded from internet)
  const documents = application.documents || [];
  documents.forEach(doc => {
    const suspiciousPatterns = [
      'sample', 'template', 'example', 'test', 'fake',
      'download', 'copy', 'internet', 'random'
    ];
    
    const fileName = (doc.fileName || '').toLowerCase();
    suspiciousPatterns.forEach(pattern => {
      if (fileName.includes(pattern)) {
        flags.push({
          type: 'SUSPICIOUS_FILENAME',
          severity: 'MEDIUM',
          message: `Suspicious file name: ${doc.fileName}`,
          document: doc.type
        });
      }
    });
  });
  
  // Check 2: Same phone number used multiple times
  const SellerApplication = require('../models/SellerApplication');
  const samePhone = await SellerApplication.find({ 
    phone: application.phone,
    _id: { $ne: application._id }
  });
  
  if (samePhone.length > 0) {
    flags.push({
      type: 'DUPLICATE_PHONE',
      severity: 'HIGH',
      message: `Phone number used in ${samePhone.length} other application(s)`,
      count: samePhone.length
    });
  }
  
  // Check 3: Recent rejection with same details
  const recentRejections = await SellerApplication.find({
    $or: [
      { email: application.email },
      { phone: application.phone }
    ],
    status: 'rejected',
    rejectedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
  });
  
  if (recentRejections.length > 0) {
    flags.push({
      type: 'RECENT_REJECTION',
      severity: 'HIGH',
      message: `User has ${recentRejections.length} rejected application(s) in last 30 days`,
      count: recentRejections.length
    });
  }
  
  // Check 4: Multiple applications from same IP (would need to track IP)
  // This would require storing IP address during registration
  
  return {
    hasFraudFlags: flags.length > 0,
    flags: flags,
    riskScore: calculateRiskScore(flags)
  };
};

/**
 * Calculate risk score based on fraud flags
 */
const calculateRiskScore = (flags) => {
  let score = 0;
  
  flags.forEach(flag => {
    switch(flag.severity) {
      case 'LOW': score += 1; break;
      case 'MEDIUM': score += 3; break;
      case 'HIGH': score += 5; break;
      case 'CRITICAL': score += 10; break;
    }
  });
  
  // Risk levels:
  // 0-2: Low risk
  // 3-5: Medium risk
  // 6-9: High risk
  // 10+: Critical risk
  
  if (score === 0) return { level: 'LOW', score: 0, message: 'No fraud indicators detected' };
  if (score <= 2) return { level: 'LOW', score, message: 'Minor concerns detected' };
  if (score <= 5) return { level: 'MEDIUM', score, message: 'Moderate risk - additional verification recommended' };
  if (score <= 9) return { level: 'HIGH', score, message: 'High risk - thorough verification required' };
  return { level: 'CRITICAL', score, message: 'Critical risk - likely fraudulent application' };
};

/**
 * Admin verification checklist generator
 */
const generateVerificationChecklist = (application) => {
  return {
    applicationId: application._id,
    businessName: application.businessName,
    kycDetails: application.kycDetails,
    checklist: [
      {
        id: 'photo_match',
        task: 'Verify photo matches ID document',
        critical: true,
        description: 'Compare selfie with photo on government ID. Look for facial features, age match.',
        status: 'pending'
      },
      {
        id: 'gender_verification',
        task: 'Verify gender from ID document',
        critical: true,
        description: 'Check gender field on ID card. Most IDs have M/F marker. Ensure it shows Female.',
        status: 'pending'
      },
      {
        id: 'document_authenticity',
        task: 'Check document authenticity',
        critical: true,
        description: 'Look for security features, holograms, fonts, spacing. Check if ID looks photoshopped.',
        status: 'pending'
      },
      {
        id: 'name_consistency',
        task: 'Verify name consistency',
        critical: true,
        description: 'Ensure name matches across ID, business license, and application.',
        status: 'pending'
      },
      {
        id: 'id_format',
        task: 'Validate ID number format',
        critical: true,
        description: `Verify ${application.kycDetails?.idType} number follows correct format and checksum.`,
        status: 'pending'
      },
      {
        id: 'business_verification',
        task: 'Verify business legitimacy',
        critical: false,
        description: 'Check if business license is valid and matches business name.',
        status: 'pending'
      },
      {
        id: 'cross_reference',
        task: 'Cross-reference with government databases (if available)',
        critical: false,
        description: 'Use UIDAI/PAN verification APIs to validate ID authenticity.',
        status: 'pending'
      }
    ],
    recommendations: [
      '✅ Verify the photo shows a female matching the ID document',
      '✅ Check ID document shows "Female" or "F" in gender field',
      '✅ Look for signs of document tampering or photoshopping',
      '✅ Verify ID number with government database if API available',
      '✅ Contact applicant via video call for additional verification if suspicious',
      '⚠️ Reject immediately if gender mismatch or fake documents detected'
    ]
  };
};

module.exports = {
  extractGenderFromId,
  checkNamePattern,
  detectFraudPatterns,
  calculateRiskScore,
  generateVerificationChecklist
};
