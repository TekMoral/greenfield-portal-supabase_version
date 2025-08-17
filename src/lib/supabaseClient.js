// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// Custom localStorage wrapper with error handling (silent mode)
const customStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key)
    } catch (error) {
      console.error('❌ Storage GET error:', error)
      return null
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      console.error('❌ Storage SET error:', error)
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('❌ Storage REMOVE error:', error)
    }
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.')
}

// Validate URL format
try {
  new URL(supabaseUrl)
} catch (error) {
  throw new Error('Invalid VITE_SUPABASE_URL format. Please ensure it is a valid URL.')
}

// Basic validation for anon key format (should be a JWT)
if (!supabaseAnonKey.startsWith('eyJ')) {
  console.warn('VITE_SUPABASE_ANON_KEY does not appear to be a valid JWT token.')
}

// Create Supabase client with configuration optimized for Edge Functions
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true, // Enable auto-refresh for Edge Function calls
    persistSession: true,
    detectSessionInUrl: false, // Disable URL detection
    flowType: 'pkce',
    storage: customStorage,
    storageKey: 'sb-auth-token',
    debug: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'school-portal@1.0.0'
    }
  }
})

// Remove the global auth state listener to prevent conflicts with AuthContext
// The AuthContext will handle all auth state changes

// Helper function to get current user
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.error('Error getting current user:', error)
      return null
    }
    return user
  } catch (error) {
    console.error('Error in getCurrentUser:', error)
    return null
  }
}

// Helper function to get user profile with role
export const getUserProfile = async (userId, signal) => {
  try {
    if (!userId) {
      return null
    }

    // Create AbortController if not provided
    const abortController = signal ? null : new AbortController()
    const abortSignal = signal || abortController?.signal

    const timeoutId = setTimeout(() => {
      if (abortController) {
        abortController.abort()
      }
    }, 5000) // Reduced timeout to 5 seconds

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .abortSignal(abortSignal)

      clearTimeout(timeoutId)

      if (error) {
        if (error.code === 'PGRST116') {
          // Don't log this as it's expected when no profile exists
          return null
        } else if (error.name !== 'AbortError' && error.message !== 'signal is aborted without reason' && !error.message?.includes('aborted')) {
          console.error('❌ getUserProfile error:', error.message)
        }
        return null
      }

      return data
    } catch (error) {
      clearTimeout(timeoutId)
      
      // Don't log timeout errors after abort
      if (error.name === 'AbortError' || abortSignal?.aborted) {
        return null
      }
      
      throw error
    }
  } catch (error) {
    // Only log if it's not an abort error
    if (error.name !== 'AbortError' && error.message !== 'signal is aborted without reason' && !error.message?.includes('aborted')) {
      console.error('💥 getUserProfile exception:', error.message)
    }
    return null
  }
}

// Helper function to check if user has specific role
export const checkUserRole = async (userId, requiredRole) => {
  try {
    const profile = await getUserProfile(userId)
    return profile?.role === requiredRole && profile?.is_active === true
  } catch (error) {
    console.error('Error checking user role:', error)
    return false
  }
}

// Helper function to get current session
export const getCurrentSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Error getting session:', error)
      return null
    }
    return session
  } catch (error) {
    console.error('Error in getCurrentSession:', error)
    return null
  }
}

// Helper function to test database connection
export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1)

    if (error) {
      console.error('Database connection test failed:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Supabase connection successful')
    return { success: true, data }
  } catch (error) {
    console.error('Database connection test error:', error)
    return { success: false, error: error.message }
  }
}

// Export configuration for debugging
export const supabaseConfig = {
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  environment: import.meta.env.MODE || 'development'
}

// Expose Supabase client globally in the browser for debugging/tests
// This lets you use `window.supabase` in the devtools console
if (typeof window !== 'undefined') {
  try {
    if (!window.supabase) {
      window.supabase = supabase;
    }
    // Useful non-sensitive config for console usage
    if (!window.supabaseConfig) {
      window.supabaseConfig = { url: supabaseUrl, environment: import.meta.env.MODE || 'development' };
    }
    if (!window.supabaseUrl) {
      window.supabaseUrl = supabaseUrl;
    }
  } catch (_) {
    // Ignore if window is not writable
  }
}