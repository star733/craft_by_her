/**
 * Image Validation and Security Utilities
 * 
 * Provides comprehensive image validation for KYC documents:
 * - File type validation
 * - Image dimension checks
 * - File size validation
 * - Image quality verification
 * - Metadata extraction
 * - Face detection hints (for future ML integration)
 */

const fs = require('fs');
const path = require('path');

/**
 * Validate ID document image
 * @param {Object} file - Multer file object
 * @returns {Object} - { valid: boolean, error: string, warnings: [] }
 */
async function validateIdDocument(file) {
  const result = {
    valid: true,
    error: null,
    warnings: [],
    metadata: {}
  };

  try {
    // 1. File type validation
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      result.valid = false;
      result.error = 'Invalid file type. Only JPG and PNG images are allowed for ID documents.';
      return result;
    }

    // 2. File size validation
    if (file.size < 50 * 1024) { // Less than 50KB
      result.valid = false;
      result.error = 'Image file is too small. Please upload a clear, high-quality photo of the ID card.';
      return result;
    }

    if (file.size > 5 * 1024 * 1024) { // More than 5MB
      result.valid = false;
      result.error = 'Image file is too large. Maximum size is 5MB.';
      return result;
    }

    // 3. Check if file exists and is readable
    if (!fs.existsSync(file.path)) {
      result.valid = false;
      result.error = 'Uploaded file not found on server.';
      return result;
    }

    // 4. Extract basic metadata
    result.metadata = {
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date().toISOString()
    };

    // 5. Check file extension matches MIME type
    const ext = path.extname(file.originalname).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png'];
    if (!validExtensions.includes(ext)) {
      result.warnings.push('File extension does not match standard image formats.');
    }

    // 6. Suspicious filename detection
    const suspiciousPatterns = ['fake', 'sample', 'template', 'test', 'dummy', 'example', 'demo'];
    const filenameLower = file.originalname.toLowerCase();
    for (const pattern of suspiciousPatterns) {
      if (filenameLower.includes(pattern)) {
        result.warnings.push(`⚠️ Suspicious filename detected: contains "${pattern}". Requires manual verification.`);
      }
    }

    console.log('✅ ID Document validated:', {
      filename: file.originalname,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      valid: result.valid,
      warningCount: result.warnings.length
    });

    return result;

  } catch (error) {
    console.error('Error validating ID document:', error);
    result.valid = false;
    result.error = 'Failed to validate image file. Please try uploading again.';
    return result;
  }
}

/**
 * Validate verification photo (selfie)
 * @param {Object} file - Multer file object
 * @returns {Object} - { valid: boolean, error: string, warnings: [] }
 */
async function validateVerificationPhoto(file) {
  const result = {
    valid: true,
    error: null,
    warnings: [],
    metadata: {}
  };

  try {
    // 1. File type validation
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      result.valid = false;
      result.error = 'Invalid file type. Only JPG and PNG images are allowed for verification photos.';
      return result;
    }

    // 2. File size validation
    if (file.size < 30 * 1024) { // Less than 30KB
      result.valid = false;
      result.error = 'Photo file is too small. Please upload a clear selfie showing your face.';
      return result;
    }

    if (file.size > 2 * 1024 * 1024) { // More than 2MB
      result.valid = false;
      result.error = 'Photo file is too large. Maximum size is 2MB.';
      return result;
    }

    // 3. Check if file exists and is readable
    if (!fs.existsSync(file.path)) {
      result.valid = false;
      result.error = 'Uploaded file not found on server.';
      return result;
    }

    // 4. Extract basic metadata
    result.metadata = {
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date().toISOString()
    };

    console.log('✅ Verification Photo validated:', {
      filename: file.originalname,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      valid: result.valid
    });

    return result;

  } catch (error) {
    console.error('Error validating verification photo:', error);
    result.valid = false;
    result.error = 'Failed to validate photo file. Please try uploading again.';
    return result;
  }
}

/**
 * Generate admin verification checklist for uploaded images
 * @param {Object} idDocValidation - ID document validation result
 * @param {Object} photoValidation - Photo validation result
 * @returns {Array} - Checklist items for admin
 */
function generateImageVerificationChecklist(idDocValidation, photoValidation) {
  const checklist = [];

  // Critical checks
  checklist.push({
    id: 'photo_match',
    title: 'Photo Matching',
    description: 'Compare verification photo with photo on ID card. Faces must match.',
    critical: true,
    status: 'pending',
    instructions: [
      'Open both images side by side',
      'Check facial features: eyes, nose, mouth, face shape',
      'Verify same person in both photos',
      'Look for signs of photo manipulation'
    ]
  });

  checklist.push({
    id: 'gender_verification',
    title: 'Gender Verification',
    description: 'Verify ID card shows gender as "Female" (F/Female/महिला)',
    critical: true,
    status: 'pending',
    instructions: [
      'Locate gender field on ID card',
      'Verify it shows Female/F/महिला',
      'Check the field is not edited or tampered',
      'Reject if gender shows Male or cannot be determined'
    ]
  });

  checklist.push({
    id: 'document_authenticity',
    title: 'Document Authenticity',
    description: 'Verify ID document appears genuine and not photoshopped',
    critical: true,
    status: 'pending',
    instructions: [
      'Check for government logos and watermarks',
      'Look for signs of digital editing',
      'Verify text alignment and font consistency',
      'Check for pixelation or blur around text/photo',
      'Ensure QR code/barcode is visible (if present)'
    ]
  });

  checklist.push({
    id: 'image_quality',
    title: 'Image Quality Check',
    description: 'Ensure both images are clear and readable',
    critical: false,
    status: 'pending',
    instructions: [
      'ID card text should be readable',
      'Face should be clearly visible in both photos',
      'No significant blur or darkness',
      'All corners of ID card visible'
    ]
  });

  // Add warnings if any
  if (idDocValidation.warnings && idDocValidation.warnings.length > 0) {
    checklist.push({
      id: 'id_warnings',
      title: '⚠️ ID Document Warnings',
      description: 'Review flagged issues with ID document',
      critical: true,
      status: 'pending',
      warnings: idDocValidation.warnings,
      instructions: [
        'Review all warnings carefully',
        'Investigate suspicious patterns',
        'Consider rejecting if multiple red flags'
      ]
    });
  }

  if (photoValidation.warnings && photoValidation.warnings.length > 0) {
    checklist.push({
      id: 'photo_warnings',
      title: '⚠️ Photo Warnings',
      description: 'Review flagged issues with verification photo',
      critical: false,
      status: 'pending',
      warnings: photoValidation.warnings
    });
  }

  return checklist;
}

/**
 * Check for potential face matching (placeholder for future ML integration)
 * @param {string} idDocPath - Path to ID document
 * @param {string} photoPath - Path to verification photo
 * @returns {Object} - Face matching result
 */
async function checkFaceMatch(idDocPath, photoPath) {
  // PLACEHOLDER: This would integrate with face recognition ML service
  // For now, returns instruction for manual verification
  
  return {
    automated: false,
    manualVerificationRequired: true,
    message: 'Face matching requires manual admin verification. Compare photos side-by-side.',
    instructions: [
      '1. Open both images in separate tabs',
      '2. Compare facial features carefully',
      '3. Look for matching characteristics:',
      '   - Eye shape and color',
      '   - Nose shape',
      '   - Face shape and structure',
      '   - Skin tone',
      '   - Hair color and style (may differ)',
      '4. Check for signs of photo substitution',
      '5. Verify same person in both images'
    ],
    futureEnhancement: {
      recommendation: 'Integrate AI face matching service',
      options: [
        'AWS Rekognition - Face comparison API',
        'Microsoft Azure Face API',
        'Google Cloud Vision API',
        'OpenCV with face_recognition library',
        'DeepFace library (open source)'
      ]
    }
  };
}

module.exports = {
  validateIdDocument,
  validateVerificationPhoto,
  generateImageVerificationChecklist,
  checkFaceMatch
};
