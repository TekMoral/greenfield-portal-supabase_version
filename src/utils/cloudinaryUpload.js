/**
 * Cloudinary Removed
 * This module has been deprecated and Cloudinary is no longer used in this app.
 * All upload and media handling should use Supabase Storage and related services.
 */

/**
 * Placeholder that throws to indicate Cloudinary is removed.
 */
export const uploadToCloudinary = async () => {
  throw new Error('Cloudinary has been removed from this app. Use Supabase Storage services instead.');
};

/**
 * Placeholder that throws to indicate Cloudinary is removed.
 */
export const uploadMultipleToCloudinary = async () => {
  throw new Error('Cloudinary has been removed from this app. Use Supabase Storage services instead.');
};

/**
 * Returns an empty string. Cloudinary transformations are no longer supported.
 */
export const getTransformedUrl = () => '';

/**
 * Generic file validation (kept for convenience). This function does not depend on Cloudinary.
 * @param {File} file
 * @param {Object} constraints
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export const validateFile = (file, constraints = {}) => {
  if (!file) return { isValid: false, errors: ['No file provided'] };

  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain'
    ]
  } = constraints;

  const errors = [];

  if (file.size > maxSize) {
    errors.push(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxSize / 1024 / 1024).toFixed(2)}MB)`);
  }

  if (allowedTypes.length && !allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
