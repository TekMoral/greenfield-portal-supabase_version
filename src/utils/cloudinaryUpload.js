/**
 * Cloudinary Upload Utility
 * Handles direct unsigned uploads to Cloudinary
 */

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Upload a file directly to Cloudinary
 * @param {File} file - The file to upload
 * @param {Object} options - Upload options
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<Object>} Upload result with URL and other metadata
 */
export const uploadToCloudinary = async (file, options = {}, onProgress = null) => {
  if (!CLOUDINARY_CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary configuration missing. Please check your environment variables.');
  }

  if (!file) {
    throw new Error('No file provided for upload');
  }

  // Create FormData for the upload
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  
  // Add optional parameters
  if (options.folder) {
    formData.append('folder', options.folder);
  }
  
  if (options.publicId) {
    formData.append('public_id', options.publicId);
  }

  if (options.tags && Array.isArray(options.tags)) {
    formData.append('tags', options.tags.join(','));
  }

  try {
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    
    // Create XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            onProgress(Math.round(percentComplete));
          }
        });
      }
      
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height,
              format: result.format,
              bytes: result.bytes,
              createdAt: result.created_at,
              resourceType: result.resource_type,
              originalFilename: result.original_filename
            });
          } catch (parseError) {
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed due to network error'));
      });
      
      xhr.open('POST', uploadUrl);
      xhr.send(formData);
    });
    
  } catch (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
};

/**
 * Upload multiple files to Cloudinary
 * @param {FileList|Array} files - Files to upload
 * @param {Object} options - Upload options
 * @param {Function} onProgress - Progress callback for each file
 * @returns {Promise<Array>} Array of upload results
 */
export const uploadMultipleToCloudinary = async (files, options = {}, onProgress = null) => {
  const fileArray = Array.from(files);
  const uploadPromises = fileArray.map((file, index) => {
    const progressCallback = onProgress 
      ? (progress) => onProgress(index, progress, file.name)
      : null;
    
    return uploadToCloudinary(file, options, progressCallback);
  });
  
  try {
    return await Promise.all(uploadPromises);
  } catch (error) {
    throw new Error(`Multiple upload failed: ${error.message}`);
  }
};

/**
 * Validate file before upload
 * @param {File} file - File to validate
 * @param {Object} constraints - Validation constraints
 * @returns {Object} Validation result
 */
export const validateFile = (file, constraints = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxWidth = null,
    maxHeight = null
  } = constraints;

  const errors = [];

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxSize / 1024 / 1024).toFixed(2)}MB)`);
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Generate Cloudinary transformation URL
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} transformations - Transformation options
 * @returns {string} Transformed image URL
 */
export const getTransformedUrl = (publicId, transformations = {}) => {
  if (!CLOUDINARY_CLOUD_NAME || !publicId) {
    return '';
  }

  const baseUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  
  // Build transformation string
  const transformParts = [];
  
  if (transformations.width) transformParts.push(`w_${transformations.width}`);
  if (transformations.height) transformParts.push(`h_${transformations.height}`);
  if (transformations.crop) transformParts.push(`c_${transformations.crop}`);
  if (transformations.quality) transformParts.push(`q_${transformations.quality}`);
  if (transformations.format) transformParts.push(`f_${transformations.format}`);
  
  const transformString = transformParts.length > 0 ? `${transformParts.join(',')}/` : '';
  
  return `${baseUrl}/${transformString}${publicId}`;
};