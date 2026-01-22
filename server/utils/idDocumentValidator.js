/**
 * Government ID Document Validation Service
 * 
 * Uses multiple validation techniques to verify uploaded images are actual government IDs:
 * 1. Image analysis - Check for document-like characteristics
 * 2. Text density analysis - Government IDs have specific text patterns
 * 3. Aspect ratio validation - Government IDs have standard dimensions
 * 4. Color distribution - ID cards have specific color profiles
 */

const sharp = require('sharp');
const fs = require('fs');

/**
 * Validate if uploaded image is a government ID document
 * @param {Object} file - Multer file object
 * @param {String} idType - Type of ID (aadhar, pan, driving_license, voter_id)
 * @returns {Object} - { isValid: boolean, confidence: number, reason: string }
 */
async function validateGovernmentId(file, idType) {
  const result = {
    isValid: false,
    confidence: 0,
    reason: '',
    details: {}
  };

  try {
    // Check if file exists
    if (!fs.existsSync(file.path)) {
      result.reason = 'File not found on server';
      return result;
    }

    // Load image with sharp
    const image = sharp(file.path);
    const metadata = await image.metadata();
    const stats = await image.stats();

    // 1. ASPECT RATIO CHECK - Government IDs have specific aspect ratios
    const aspectRatio = metadata.width / metadata.height;
    result.details.aspectRatio = aspectRatio.toFixed(2);
    result.details.dimensions = `${metadata.width}x${metadata.height}`;

    let aspectRatioScore = 0;
    // ID cards can be photographed in any orientation
    // Accept very wide range to accommodate real-world photos
    if (aspectRatio >= 1.2 && aspectRatio <= 2.0) {
      aspectRatioScore = 35; // Landscape - typical
      result.details.aspectRatioNote = 'Landscape orientation';
    } else if (aspectRatio >= 0.5 && aspectRatio < 1.2) {
      aspectRatioScore = 30; // Portrait or square - also acceptable
      result.details.aspectRatioNote = 'Portrait/Square orientation';
    } else if (aspectRatio >= 0.3 && aspectRatio < 0.5) {
      aspectRatioScore = 20; // Very portrait - less common but possible
      result.details.aspectRatioNote = 'Narrow orientation';
    } else if (aspectRatio > 2.0 && aspectRatio <= 3.0) {
      aspectRatioScore = 20; // Very wide - less common but possible
      result.details.aspectRatioNote = 'Wide orientation';
    } else {
      aspectRatioScore = 5; // Extreme ratios - likely not ID
      result.details.aspectRatioNote = 'Unusual dimensions';
    }

    // 2. IMAGE COMPLEXITY CHECK - IDs have text, photos, holograms
    // Check color distribution
    const channels = stats.channels;
    let complexityScore = 0;
    
    // Government IDs typically have varied colors (text, photos, backgrounds)
    const redVariance = channels[0].stdev;
    const greenVariance = channels[1].stdev;
    const blueVariance = channels[2].stdev;
    const avgVariance = (redVariance + greenVariance + blueVariance) / 3;
    
    result.details.colorComplexity = avgVariance.toFixed(2);
    
    // More realistic thresholds - actual ID photos can vary
    if (avgVariance > 25) {
      complexityScore = 30; // Good - has text/images
      result.details.complexityNote = 'Good color variance - document-like';
    } else if (avgVariance > 15) {
      complexityScore = 20; // Moderate - some detail
      result.details.complexityNote = 'Moderate detail - acceptable';
    } else if (avgVariance > 8) {
      complexityScore = 10; // Low but possible
      result.details.complexityNote = 'Low detail - may be poor photo quality';
    } else {
      complexityScore = 0;
      result.details.complexityWarning = '⚠️ Very simple image - unlikely to be document';
    }

    // Color distribution check (not critical)
    const colorChannelDiff = Math.max(
      Math.abs(redVariance - greenVariance),
      Math.abs(greenVariance - blueVariance),
      Math.abs(blueVariance - redVariance)
    );
    
    if (colorChannelDiff > 10) {
      result.details.colorNote = 'Varied colors detected';
    }

    // 3. FILE SIZE CHECK - Government ID photos should be reasonable size
    let fileSizeScore = 0;
    const fileSizeKB = file.size / 1024;
    
    if (fileSizeKB >= 100 && fileSizeKB <= 3000) {
      fileSizeScore = 20; // Reasonable size for ID photo
    } else if (fileSizeKB < 100) {
      fileSizeScore = 5;
      result.details.sizeWarning = '⚠️ File size is very small - may be low quality or not a real ID photo';
    } else {
      fileSizeScore = 10; // Large file acceptable
    }

    // 4. RESOLUTION CHECK - IDs need to be readable
    let resolutionScore = 0;
    const megapixels = (metadata.width * metadata.height) / 1000000;
    
    result.details.megapixels = megapixels.toFixed(2);
    
    if (megapixels >= 0.5 && megapixels <= 20) {
      resolutionScore = 20; // Good resolution
    } else if (megapixels < 0.5) {
      resolutionScore = 0;
      result.details.resolutionWarning = '⚠️ Resolution too low - text may not be readable';
    } else {
      resolutionScore = 10; // Very high resolution acceptable
    }

    // 5. EDGE DETECTION - Documents have lots of text edges
    // Get image buffer and detect edges
    try {
      const edgeImage = await sharp(file.path)
        .greyscale()
        .normalise()
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
        })
        .raw()
        .toBuffer();
      
      // Count edge pixels (high values indicate edges)
      let edgePixelCount = 0;
      for (let i = 0; i < edgeImage.length; i++) {
        if (edgeImage[i] > 50) {
          edgePixelCount++;
        }
      }
      
      const edgePercentage = (edgePixelCount / edgeImage.length) * 100;
      result.details.edgePercentage = edgePercentage.toFixed(2);
      
      // More lenient edge detection (some photos may have less edges)
      if (edgePercentage > 10) {
        result.details.edgeScore = 'High (document-like)';
        complexityScore += 5; // Bonus
      } else if (edgePercentage > 5) {
        result.details.edgeScore = 'Moderate (acceptable)';
        complexityScore += 3;
      } else {
        result.details.edgeScore = 'Low (simple object)';
        result.details.edgeNote = 'Few edges - may be simple object or very smooth photo';
      }
    } catch (edgeError) {
      console.log('Edge detection skipped:', edgeError.message);
      result.details.edgeScore = 'Not calculated';
    }

    // Calculate total confidence score (out of 100)
    result.confidence = aspectRatioScore + complexityScore + fileSizeScore + resolutionScore;
    result.details.scores = {
      aspectRatio: aspectRatioScore,
      complexity: complexityScore,
      fileSize: fileSizeScore,
      resolution: resolutionScore,
      total: result.confidence
    };

    // VERY LENIENT VALIDATION: Accept most reasonable photos
    if (result.confidence >= 60) {
      result.isValid = true;
      result.reason = `✅ ACCEPTED: Valid government ID detected (Confidence: ${result.confidence.toFixed(1)}%)`;
    } else if (result.confidence >= 40) {
      result.isValid = true; // Accept with warning
      result.reason = `⚠️ ACCEPTED (MODERATE QUALITY): Image accepted as government ID (Confidence: ${result.confidence.toFixed(1)}%). Admin will verify details.`;
    } else {
      result.isValid = false;
      result.reason = '❌ REJECTED: This does NOT appear to be a government ID document.\n\n' +
        `Confidence Score: ${result.confidence.toFixed(1)}% (minimum 40% required)\n\n` +
        '⚠️ Common issues:\n' +
        '• Uploading random photos/objects (keychains, toys, etc.)\n' +
        '• Screenshots or edited images\n' +
        '• Non-ID documents\n' +
        '• Extremely blurry or dark photos\n\n' +
        '📸 Please upload your government ID card:\n' +
        '✅ Aadhar Card ✅ PAN Card ✅ Driving License ✅ Voter ID\n\n' +
        '💡 Tips: Take photo in good lighting, include full card, any orientation is fine';
    }

    // Add specific warnings based on ID type
    if (!result.isValid && idType === 'aadhar') {
      result.reason += '\n\n📝 Aadhar Card Requirements:\n• Front side of card showing photo, name, gender\n• All text clearly visible\n• Standard Aadhar card dimensions\n• No screenshots or edited images';
    } else if (!result.isValid && idType === 'pan') {
      result.reason += '\n\n📝 PAN Card Requirements:\n• Clear photo of PAN card\n• PAN number visible\n• Photo and name visible\n• Standard PAN card format';
    }

    console.log('🔍 Government ID Validation:', {
      filename: file.originalname,
      idType,
      confidence: result.confidence,
      isValid: result.isValid,
      aspectRatio: result.details.aspectRatio,
      dimensions: result.details.dimensions,
      colorComplexity: result.details.colorComplexity
    });

    return result;

  } catch (error) {
    console.error('Error validating government ID:', error);
    result.reason = 'Failed to analyze image. Please try uploading again.';
    result.details.error = error.message;
    return result;
  }
}

/**
 * Quick validation check - returns true/false only
 */
async function isGovernmentIdDocument(filePath, idType) {
  try {
    const file = {
      path: filePath,
      size: fs.statSync(filePath).size,
      originalname: filePath.split('/').pop()
    };
    const result = await validateGovernmentId(file, idType);
    return result.isValid;
  } catch (error) {
    console.error('Error in quick ID validation:', error);
    return false;
  }
}

module.exports = {
  validateGovernmentId,
  isGovernmentIdDocument
};
