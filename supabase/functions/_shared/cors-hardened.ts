// Hardened CORS configuration for production security
// This provides more restrictive CORS policies for enhanced security

interface CorsConfig {
  allowedOrigins: string[]
  allowedMethods: string[]
  allowedHeaders: string[]
  maxAge: number
  credentials: boolean
}

// Production CORS configuration
const PRODUCTION_CORS: CorsConfig = {
  allowedOrigins: [
    // Add your production domains here
    'https://your-domain.com',
    'https://www.your-domain.com',
    'https://admin.your-domain.com',
    // Add your Vercel/Netlify deployment URLs
    'https://your-app.vercel.app',
    'https://your-app.netlify.app',
  ],
  allowedMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: [
    'authorization',
    'x-client-info', 
    'apikey',
    'content-type',
    'x-requested-with',
    'accept',
    'origin',
    'user-agent'
  ],
  maxAge: 86400, // 24 hours
  credentials: true
}

// Development CORS configuration (more permissive for local development)
const DEVELOPMENT_CORS: CorsConfig = {
  allowedOrigins: [
    'http://localhost:3000',
    'http://localhost:5173', // Vite default
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
    // Add any other local development ports you use
  ],
  allowedMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: [
    'authorization',
    'x-client-info',
    'apikey', 
    'content-type',
    'x-requested-with',
    'accept',
    'origin',
    'user-agent'
  ],
  maxAge: 3600, // 1 hour
  credentials: true
}

// Get environment-specific CORS configuration
function getCorsConfig(): CorsConfig {
  const environment = Deno.env.get('ENVIRONMENT') || 'development'
  
  switch (environment.toLowerCase()) {
    case 'production':
    case 'prod':
      return PRODUCTION_CORS
    case 'staging':
    case 'stage':
      // Use production config but with staging domains
      return {
        ...PRODUCTION_CORS,
        allowedOrigins: [
          'https://staging.your-domain.com',
          'https://your-app-staging.vercel.app',
          // Add staging-specific domains
        ]
      }
    case 'development':
    case 'dev':
    default:
      return DEVELOPMENT_CORS
  }
}

// Check if origin is allowed
function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false
  
  // Exact match
  if (allowedOrigins.includes(origin)) return true
  
  // Pattern matching for dynamic subdomains (if needed)
  for (const allowedOrigin of allowedOrigins) {
    if (allowedOrigin.includes('*')) {
      const pattern = allowedOrigin.replace(/\*/g, '.*')
      const regex = new RegExp(`^${pattern}$`)
      if (regex.test(origin)) return true
    }
  }
  
  return false
}

// Generate CORS headers based on request and configuration
export function getHardenedCorsHeaders(req: Request): Record<string, string> {
  const config = getCorsConfig()
  const origin = req.headers.get('origin')
  
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': config.allowedMethods.join(', '),
    'Access-Control-Allow-Headers': config.allowedHeaders.join(', '),
    'Access-Control-Max-Age': config.maxAge.toString(),
  }
  
  // Set credentials if enabled
  if (config.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true'
  }
  
  // Handle origin
  if (isOriginAllowed(origin, config.allowedOrigins)) {
    headers['Access-Control-Allow-Origin'] = origin!
  } else {
    // Log unauthorized origin attempts in production
    const environment = Deno.env.get('ENVIRONMENT') || 'development'
    if (environment === 'production') {
      console.warn(`🚫 Unauthorized CORS origin attempted: ${origin}`)
    }
    
    // In development, be more permissive but log the attempt
    if (environment === 'development' && origin) {
      console.warn(`⚠️ Development: Allowing origin ${origin} (not in whitelist)`)
      headers['Access-Control-Allow-Origin'] = origin
    }
  }
  
  return headers
}

// Handle CORS preflight requests with hardened security
export function handleHardenedCors(req: Request): Response {
  if (req.method === 'OPTIONS') {
    const headers = getHardenedCorsHeaders(req)
    
    // Add security headers for preflight
    headers['X-Content-Type-Options'] = 'nosniff'
    headers['X-Frame-Options'] = 'DENY'
    headers['X-XSS-Protection'] = '1; mode=block'
    headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    return new Response('ok', { 
      headers,
      status: 204 // No Content for preflight
    })
  }
  
  // This shouldn't be called for non-OPTIONS requests
  throw new Error('handleHardenedCors should only be called for OPTIONS requests')
}

// Get CORS headers for regular responses
export function getResponseCorsHeaders(req: Request): Record<string, string> {
  const corsHeaders = getHardenedCorsHeaders(req)
  
  // Add additional security headers for all responses
  return {
    ...corsHeaders,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY', 
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  }
}

// Validate request origin and method
export function validateRequest(req: Request): { valid: boolean; reason?: string } {
  const config = getCorsConfig()
  const origin = req.headers.get('origin')
  const method = req.method
  
  // Check method
  if (!config.allowedMethods.includes(method)) {
    return { valid: false, reason: `Method ${method} not allowed` }
  }
  
  // Check origin for non-GET requests
  if (method !== 'GET' && method !== 'OPTIONS') {
    if (!origin) {
      return { valid: false, reason: 'Origin header required for non-GET requests' }
    }
    
    if (!isOriginAllowed(origin, config.allowedOrigins)) {
      return { valid: false, reason: `Origin ${origin} not allowed` }
    }
  }
  
  return { valid: true }
}

// Legacy CORS headers for backward compatibility (development only)
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// Legacy CORS handler for backward compatibility (development only)
export function handleCors(req: Request) {
  const environment = Deno.env.get('ENVIRONMENT') || 'development'
  
  if (environment === 'development') {
    // Use legacy permissive CORS in development
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }
  } else {
    // Use hardened CORS in production
    return handleHardenedCors(req)
  }
}