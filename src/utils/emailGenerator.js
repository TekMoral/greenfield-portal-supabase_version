// src/utils/emailGenerator.js

/**
 * Email Generation Utility for School Portal
 * 
 * Generates systematic email addresses for students using the format:
 * firstlettersurnamefirstnamelastThreeNumberOfAdmissionNumber.schoolname@gmail.com
 * 
 * This ensures:
 * 1. Valid Gmail domain for Supabase compatibility
 * 2. Systematic and predictable email generation
 * 3. Uniqueness through admission number integration
 * 4. Easy identification of students through email structure
 */

// School configuration - can be moved to environment variables if needed
const SCHOOL_CONFIG = {
  name: 'greenfield', // School name for email prefix
  domain: 'gmail.com'  // Using Gmail for Supabase compatibility
};

/**
 * Sanitizes a name by removing special characters, accents, and spaces
 * @param {string} name - The name to sanitize
 * @returns {string} - Sanitized name with only lowercase letters
 */
const sanitizeName = (name) => {
  if (!name) return "";
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters (é -> e + ´)
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .replace(/[^a-z]/g, '') // Keep only lowercase letters
    .replace(/\s+/g, ''); // Remove any remaining spaces
};

/**
 * Extracts the last three digits from an admission number
 * @param {string} admissionNumber - The admission number (e.g., "A00124", "B12325")
 * @returns {string} - Last three digits (e.g., "124", "325")
 */
const extractLastThreeDigits = (admissionNumber) => {
  if (!admissionNumber) return "";
  
  // Extract all digits from admission number
  const digits = admissionNumber.replace(/\D/g, '');
  
  // Return last 3 digits, pad with zeros if less than 3 digits
  if (digits.length >= 3) {
    return digits.slice(-3);
  } else {
    return digits.padStart(3, '0');
  }
};

/**
 * Generates a systematic email address for a student
 * Format: firstlettersurnamefirstnamelastThreeNumberOfAdmissionNumber.schoolname@gmail.com
 * 
 * @param {Object} studentData - Student information
 * @param {string} studentData.firstName - Student's first name
 * @param {string} studentData.surname - Student's surname
 * @param {string} studentData.admissionNumber - Student's admission number
 * @param {string} [schoolName] - Optional school name override
 * @returns {Object} - Result object with success status and email or error
 */
export const generateStudentEmail = (studentData, schoolName = null) => {
  try {
    const { firstName, surname, admissionNumber } = studentData;

    // Validate required fields
    if (!firstName || !surname || !admissionNumber) {
      return {
        success: false,
        error: 'Missing required fields: firstName, surname, or admissionNumber',
        data: null
      };
    }

    // Sanitize inputs
    const cleanFirstName = sanitizeName(firstName);
    const cleanSurname = sanitizeName(surname);
    const schoolPrefix = sanitizeName(schoolName || SCHOOL_CONFIG.name);

    // Validate sanitized inputs
    if (!cleanFirstName || !cleanSurname || !schoolPrefix) {
      return {
        success: false,
        error: 'Invalid characters in name fields after sanitization',
        data: null
      };
    }

    // Get first letter of surname
    const surnameInitial = cleanSurname.charAt(0);

    // Extract last three digits from admission number
    const lastThreeDigits = extractLastThreeDigits(admissionNumber);

    if (!lastThreeDigits) {
      return {
        success: false,
        error: 'Could not extract digits from admission number',
        data: null
      };
    }

    // Construct email with new format: initialfirstnamedigits.schoolname
    const studentPart = `${surnameInitial}${cleanFirstName}${lastThreeDigits}`;
    const emailAddress = `${studentPart}.${schoolPrefix}@${SCHOOL_CONFIG.domain}`;

    // Validate email length (Gmail has a 64 character limit for local part)
    const localPart = `${studentPart}.${schoolPrefix}`;
    if (localPart.length > 64) {
      return {
        success: false,
        error: 'Generated email local part exceeds 64 character limit',
        data: null
      };
    }

    const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'development'
    if (isDev) {
      const mask = (s) => (typeof s === 'string' ? (s.length <= 2 ? s[0] + '*' : s[0] + '***') : s)
      const maskedAdmission = String(admissionNumber || '').replace(/.(?=.{2}$)/g, '*')
      console.log('✅ Email generated successfully:', {
        input: { firstName: mask(firstName), surname: mask(surname), admissionNumber: maskedAdmission },
        sanitized: { cleanFirstName, cleanSurname: cleanSurname ? cleanSurname[0] + '***' : '', surnameInitial, lastThreeDigits },
        result: emailAddress
      })
    }

    return {
      success: true,
      data: emailAddress,
      error: null,
      components: {
        schoolName: schoolPrefix,
        surnameInitial,
        firstName: cleanFirstName,
        admissionDigits: lastThreeDigits,
        localPart,
        domain: SCHOOL_CONFIG.domain
      }
    };

  } catch (error) {
    console.error('❌ Error generating student email:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred during email generation',
      data: null
    };
  }
};

/**
 * Validates if an email follows the expected student email format
 * @param {string} email - Email to validate
 * @returns {Object} - Validation result with parsed components if valid
 */
export const validateStudentEmailFormat = (email) => {
  try {
    if (!email || typeof email !== 'string') {
      return { isValid: false, error: 'Email is required and must be a string' };
    }

    // Check if it's a Gmail address
    if (!email.endsWith('@gmail.com')) {
      return { isValid: false, error: 'Email must be a Gmail address' };
    }

    // Extract local part
    const localPart = email.split('@')[0];
    const parts = localPart.split('.');

    // Should have exactly 2 parts: studentpart.schoolname
    if (parts.length !== 2) {
      return { 
        isValid: false, 
        error: 'Email format should be: initialfirstnamedigits.schoolname@gmail.com' 
      };
    }

    const [studentPart, schoolName] = parts;

    // Validate school name part
    if (!schoolName || schoolName.length === 0) {
      return { isValid: false, error: 'School name part is missing' };
    }

    // Validate student part - should end with 3 digits
    if (!studentPart || studentPart.length < 4) {
      return { isValid: false, error: 'Student part too short (minimum: 1 letter + name + 3 digits)' };
    }

    // Extract last 3 characters as digits
    const lastThreeChars = studentPart.slice(-3);
    if (!/^\d{3}$/.test(lastThreeChars)) {
      return { isValid: false, error: 'Student part must end with exactly 3 digits' };
    }

    // Extract first character as surname initial
    const surnameInitial = studentPart.charAt(0);
    if (!/^[a-z]$/.test(surnameInitial)) {
      return { isValid: false, error: 'Student part must start with a lowercase letter' };
    }

    // Extract middle part as first name
    const firstName = studentPart.slice(1, -3);
    if (!firstName || firstName.length === 0) {
      return { isValid: false, error: 'First name part is missing' };
    }

    if (!/^[a-z]+$/.test(firstName)) {
      return { isValid: false, error: 'First name part must contain only lowercase letters' };
    }

    return {
      isValid: true,
      components: {
        surnameInitial,
        firstName,
        admissionDigits: lastThreeChars,
        schoolName,
        localPart,
        domain: 'gmail.com'
      }
    };

  } catch (error) {
    return { 
      isValid: false, 
      error: `Validation error: ${error.message}` 
    };
  }
};

/**
 * Generates multiple email suggestions if the primary one might conflict
 * @param {Object} studentData - Student information
 * @param {number} [count=3] - Number of alternative emails to generate
 * @returns {Array} - Array of email suggestions
 */
export const generateEmailAlternatives = (studentData, count = 3) => {
  const alternatives = [];
  
  // Primary email
  const primary = generateStudentEmail(studentData);
  if (primary.success) {
    alternatives.push(primary.data);
  }

  // Generate alternatives by modifying the digits part
  for (let i = 1; i <= count && alternatives.length < count + 1; i++) {
    const modifiedData = {
      ...studentData,
      admissionNumber: studentData.admissionNumber + i.toString().padStart(2, '0')
    };
    
    const alternative = generateStudentEmail(modifiedData);
    if (alternative.success && !alternatives.includes(alternative.data)) {
      alternatives.push(alternative.data);
    }
  }

  return alternatives;
};

/**
 * Utility function to get school configuration
 * @returns {Object} - Current school configuration
 */
export const getSchoolConfig = () => {
  return { ...SCHOOL_CONFIG };
};

/**
 * Updates school configuration (useful for multi-tenant scenarios)
 * @param {Object} newConfig - New configuration
 * @param {string} [newConfig.name] - New school name
 * @param {string} [newConfig.domain] - New domain (should remain gmail.com for Supabase)
 */
export const updateSchoolConfig = (newConfig) => {
  if (newConfig.name) {
    SCHOOL_CONFIG.name = sanitizeName(newConfig.name);
  }
  if (newConfig.domain) {
    console.warn('⚠️ Changing domain from gmail.com may cause Supabase authentication issues');
    SCHOOL_CONFIG.domain = newConfig.domain;
  }
};

// Export individual functions for convenience
export {
  sanitizeName,
  extractLastThreeDigits
};

// Default export
export default {
  generateStudentEmail,
  validateStudentEmailFormat,
  generateEmailAlternatives,
  getSchoolConfig,
  updateSchoolConfig,
  sanitizeName,
  extractLastThreeDigits
};