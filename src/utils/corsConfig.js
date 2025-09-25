/**
 * CORS Configuration Utility
 * Manages CORS settings for different environments
 */

// Environment detection
const getEnvironment = () => {
  // Check for explicit environment variable
  if (import.meta.env.VITE_ENVIRONMENT) {
    return import.meta.env.VITE_ENVIRONMENT.toLowerCase()
  }
  
  // Detect based on URL
  const hostname = window.location.hostname
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'development'
  }
  
  if (hostname.includes('staging') || hostname.includes('dev')) {
    return 'staging'
  }
  
  return 'production'
}

// CORS configuration for different environments
const CORS_CONFIG = {
  development: {
    allowCredentials: true,
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080',
    ],
    strictMode: false
  },
  
  staging: {
    allowCredentials: true,
    allowedOrigins: [
      'https://staging.your-domain.com',
      'https://your-app-staging.vercel.app',
      'https://your-app-staging.netlify.app',
    ],
    strictMode: true
  },
  
  production: {
    allowCredentials: true,
    allowedOrigins: [
      'https://your-domain.com',
      'https://www.your-domain.com',
      'https://admin.your-domain.com',
      'https://your-app.vercel.app',
      'https://your-app.netlify.app',
    ],
    strictMode: true
  }
}

// Get current CORS configuration
export const getCorsConfig = () => {
  const environment = getEnvironment()
  return CORS_CONFIG[environment] || CORS_CONFIG.development
}

// Check if current origin is allowed
export const isOriginAllowed = () => {
  const config = getCorsConfig()
  const currentOrigin = window.location.origin
  
  return config.allowedOrigins.includes(currentOrigin)
}

// Get headers for API requests
export const getApiHeaders = (additionalHeaders = {}) => {
  const config = getCorsConfig()
  
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...additionalHeaders
  }
  
  // Add origin header in strict mode
  if (config.strictMode) {
    headers['Origin'] = window.location.origin
  }
  
  return headers
}

// Validate CORS setup
export const validateCorsSetup = async () => {
  const config = getCorsConfig()
  const environment = getEnvironment()
  const currentOrigin = window.location.origin
  
  const validation = {
    environment,
    currentOrigin,
    isAllowed: config.allowedOrigins.includes(currentOrigin),
    strictMode: config.strictMode,
    issues: [],
    recommendations: []
  }
  
  // Check for common issues
  if (!validation.isAllowed) {
    validation.issues.push(`Current origin ${currentOrigin} is not in the allowed origins list`)
    validation.recommendations.push('Add your domain to the CORS configuration')
  }
  
  if (environment === 'production' && !config.strictMode) {
    validation.issues.push('Production environment should use strict CORS mode')
    validation.recommendations.push('Enable strict mode for production')
  }
  
  if (currentOrigin.startsWith('http:') && environment === 'production') {
    validation.issues.push('Production should use HTTPS')
    validation.recommendations.push('Configure HTTPS for production deployment')
  }
  
  return validation
}

// CORS debugging utility
export const debugCors = () => {
  const config = getCorsConfig()
  const environment = getEnvironment()
  const currentOrigin = window.location.origin
  const isDev = typeof import !== 'undefined' && import.meta && import.meta.env && import.meta.env.MODE === 'development'
  
  if (isDev) {
    console.group('🔒 CORS Configuration Debug')
    console.log('Environment:', environment)
    console.log('Current Origin:', currentOrigin)
    console.log('Allowed Origins:', config.allowedOrigins)
    console.log('Origin Allowed:', config.allowedOrigins.includes(currentOrigin))
    console.log('Strict Mode:', config.strictMode)
    console.log('Allow Credentials:', config.allowCredentials)
    
    if (!config.allowedOrigins.includes(currentOrigin)) {
      console.warn('⚠️ Current origin is not in the allowed list!')
      console.log('Add this origin to your CORS configuration:', currentOrigin)
    }
    
    console.groupEnd()
  }
  
  return {
    environment,
    currentOrigin,
    config,
    isAllowed: config.allowedOrigins.includes(currentOrigin)
  }
}

// Environment-specific recommendations
export const getCorsRecommendations = () => {
  const environment = getEnvironment()
  
  const recommendations = {
    development: [
      'CORS is permissive for development',
      'Add your local development ports to the configuration',
      'Test with different ports and protocols'
    ],
    
    staging: [
      'Use staging-specific domains',
      'Test CORS policies before production',
      'Verify all staging URLs are included'
    ],
    
    production: [
      'Use strict CORS policies',
      'Only include necessary domains',
      'Enable HTTPS for all origins',
      'Monitor CORS errors in production',
      'Consider using a CDN with proper CORS headers'
    ]
  }
  
  return recommendations[environment] || recommendations.development
}

// Export current environment for external use
export const currentEnvironment = getEnvironment()

// Export configuration for debugging
export const currentConfig = getCorsConfig()