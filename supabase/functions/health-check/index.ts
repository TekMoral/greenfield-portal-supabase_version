import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  checks: {
    environment: HealthCheck
    basic: HealthCheck
    database?: HealthCheck
    auth?: HealthCheck
  }
  summary: {
    total: number
    passed: number
    failed: number
    warnings: number
  }
  uptime?: number
  environment: string
  debug?: any
}

interface HealthCheck {
  status: 'pass' | 'fail' | 'warn'
  message: string
  duration?: number
  details?: any
}

const startTime = Date.now()

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return handleCors(req)
  }

  const healthCheck: HealthCheckResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.1',
    checks: {
      environment: { status: 'fail', message: 'Not tested' },
      basic: { status: 'fail', message: 'Not tested' }
    },
    summary: { total: 0, passed: 0, failed: 0, warnings: 0 },
    uptime: Math.floor((Date.now() - startTime) / 1000),
    environment: Deno.env.get('ENVIRONMENT') || 'development',
    debug: {}
  }

  try {
    // Test 1: Environment Check
    const envStart = Date.now()
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

      healthCheck.debug.environment = {
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        hasAnonKey: !!supabaseAnonKey,
        supabaseUrlLength: supabaseUrl?.length || 0,
        serviceKeyLength: supabaseServiceKey?.length || 0,
        anonKeyLength: supabaseAnonKey?.length || 0
      }

      if (!supabaseUrl || !supabaseServiceKey) {
        healthCheck.checks.environment = {
          status: 'fail',
          message: 'Missing required environment variables',
          duration: Date.now() - envStart,
          details: {
            missingVars: [
              !supabaseUrl && 'SUPABASE_URL',
              !supabaseServiceKey && 'SUPABASE_SERVICE_ROLE_KEY'
            ].filter(Boolean)
          }
        }
      } else {
        healthCheck.checks.environment = {
          status: 'pass',
          message: 'Environment variables present',
          duration: Date.now() - envStart,
          details: {
            supabaseUrlPresent: !!supabaseUrl,
            serviceKeyPresent: !!supabaseServiceKey,
            anonKeyPresent: !!supabaseAnonKey
          }
        }
      }
    } catch (error) {
      healthCheck.checks.environment = {
        status: 'fail',
        message: `Environment check failed: ${error.message}`,
        duration: Date.now() - envStart,
        details: { error: error.message }
      }
    }

    // Test 2: Basic Function Test
    const basicStart = Date.now()
    try {
      // Test basic functionality
      const testData = {
        timestamp: new Date().toISOString(),
        randomNumber: Math.random(),
        environment: Deno.env.get('ENVIRONMENT') || 'development'
      }

      healthCheck.checks.basic = {
        status: 'pass',
        message: 'Basic function operations working',
        duration: Date.now() - basicStart,
        details: testData
      }
    } catch (error) {
      healthCheck.checks.basic = {
        status: 'fail',
        message: `Basic test failed: ${error.message}`,
        duration: Date.now() - basicStart,
        details: { error: error.message }
      }
    }

    // Test 3: Database Connection (only if environment variables are present)
    if (healthCheck.checks.environment.status === 'pass') {
      const dbStart = Date.now()
      try {
        // Import Supabase client
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
        
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        })

        // Simple database test
        const { data, error } = await supabase
          .from('user_profiles')
          .select('count')
          .limit(1)

        if (error) {
          healthCheck.checks.database = {
            status: 'warn',
            message: `Database warning: ${error.message}`,
            duration: Date.now() - dbStart,
            details: { error: error.message }
          }
        } else {
          healthCheck.checks.database = {
            status: 'pass',
            message: 'Database connection successful',
            duration: Date.now() - dbStart,
            details: { hasData: !!data }
          }
        }
      } catch (error) {
        healthCheck.checks.database = {
          status: 'fail',
          message: `Database test failed: ${error.message}`,
          duration: Date.now() - dbStart,
          details: { error: error.message }
        }
      }
    }

    // Test 4: Auth System (only if environment variables are present)
    if (healthCheck.checks.environment.status === 'pass') {
      const authStart = Date.now()
      try {
        // Import Supabase client
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
        
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        })

        // Test auth admin functions
        const { data: users, error: authError } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1
        })

        if (authError) {
          healthCheck.checks.auth = {
            status: 'warn',
            message: `Auth warning: ${authError.message}`,
            duration: Date.now() - authStart,
            details: { error: authError.message }
          }
        } else {
          healthCheck.checks.auth = {
            status: 'pass',
            message: 'Auth system operational',
            duration: Date.now() - authStart,
            details: { userCount: users?.users?.length || 0 }
          }
        }
      } catch (error) {
        healthCheck.checks.auth = {
          status: 'fail',
          message: `Auth test failed: ${error.message}`,
          duration: Date.now() - authStart,
          details: { error: error.message }
        }
      }
    }

    // Calculate summary
    const checks = Object.values(healthCheck.checks)
    healthCheck.summary.total = checks.length
    healthCheck.summary.passed = checks.filter(c => c.status === 'pass').length
    healthCheck.summary.failed = checks.filter(c => c.status === 'fail').length
    healthCheck.summary.warnings = checks.filter(c => c.status === 'warn').length

    // Determine overall status
    if (healthCheck.summary.failed > 0) {
      healthCheck.status = 'unhealthy'
    } else if (healthCheck.summary.warnings > 0) {
      healthCheck.status = 'degraded'
    } else {
      healthCheck.status = 'healthy'
    }

    // Return appropriate HTTP status
    let httpStatus = 200
    if (healthCheck.status === 'unhealthy') {
      httpStatus = 503 // Service Unavailable
    } else if (healthCheck.status === 'degraded') {
      httpStatus = 200 // OK but with warnings
    }

    return new Response(
      JSON.stringify(healthCheck, null, 2),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: httpStatus,
      }
    )

  } catch (error) {
    console.error('Health check error:', error)
    
    // Return error response with debug information
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message || 'Health check failed',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      debug: {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        environment: Deno.env.get('ENVIRONMENT') || 'development',
        hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
        hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      }
    }
    
    return new Response(
      JSON.stringify(errorResponse, null, 2),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500, // Internal Server Error
      }
    )
  }
})