// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'
import { cookieAuth, getAccessToken, subscribeTokenChange } from './cookieAuthClient'

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

// Custom fetch that ensures Authorization header is present for PostgREST/RPC calls
// and performs a one-time refresh/retry on 401 responses.
const baseFetch = typeof fetch === 'function' ? fetch.bind(globalThis) : null
async function authFetch(input, init) {
  const req = input instanceof Request ? input : new Request(input, init)
  const url = req.url || (typeof input === 'string' ? input : '')
  // Only guard database endpoints; do not interfere with Edge Functions here
  const isPostgrest = url.includes('/rest/v1') || url.includes('/rpc/')

  let headers = new Headers(req.headers)
  let token = getAccessToken && getAccessToken()

  // Always prefer the current user access token for PostgREST requests.
  // supabase-js may set Authorization with the anon key; override with user token if available.
  if (isPostgrest && token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const makeRequest = (hdrs) => {
    const newReq = new Request(req, { headers: hdrs })
    return baseFetch ? baseFetch(newReq) : fetch(newReq)
  }

  let response = await makeRequest(headers)

  // If unauthorized, try a one-time cookie-based refresh and retry
  if (isPostgrest && response.status === 401) {
    try {
      const refreshed = await cookieAuth.refresh()
      if (refreshed?.success) {
        token = getAccessToken && getAccessToken()
        const retryHeaders = new Headers(req.headers)
        if (token) retryHeaders.set('Authorization', `Bearer ${token}`)
        response = await makeRequest(retryHeaders)
      }
    } catch (_) {
      // ignore refresh errors
    }
  }

  return response
}

// Create Supabase client WITHOUT persisting session to storage. We rely on cookie-based refresh + in-memory access token.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false, // we will refresh explicitly via Edge Function
    persistSession: false,   // do not touch localStorage/sessionStorage
    detectSessionInUrl: false,
    flowType: 'pkce',
    debug: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'school-portal@1.0.0'
    },
    fetch: authFetch
  }
})

// Bind current in-memory access token to Supabase client so queries include Authorization
const initialToken = getAccessToken && getAccessToken()
if (initialToken) {
  try { supabase.auth.setAuth(initialToken) } catch (_) {}
}
// Keep binding updated when token changes
try {
  subscribeTokenChange((token) => {
    try { supabase.auth.setAuth(token || '') } catch (_) {}
  })
} catch (_) { /* ignore subscribe errors */ }

// Helper function to get current user (based on the in-memory token)
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
      // Prefer SECURITY DEFINER RPC to bypass RLS safely
      try {
        const { data: rpcData, error: rpcErr } = await supabase
          .rpc('rpc_get_current_profile')
          .abortSignal(abortSignal)

        if (!rpcErr && rpcData) {
          clearTimeout(timeoutId)
          return rpcData
        }
      } catch (_) { /* ignore and fallback */ }

      // Fallback to direct select if RPC unavailable
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .abortSignal(abortSignal)

      clearTimeout(timeoutId)

      if (error) {
        if (error.code === 'PGRST116') {
          // No row is expected when no profile exists
          return null
        } else if (error.name !== 'AbortError' && error.message !== 'signal is aborted without reason' && !error.message?.includes('aborted')) {
          console.warn('getUserProfile fallback error:', error.message)
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

// Helper function to get current session (will generally be null due to no persistence)
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

// Expose Supabase client globally only in development/debug
const DEBUG_ENABLED = (import.meta?.env?.VITE_ENABLE_DEBUG === 'true') || (import.meta?.env?.DEV === true) || ((import.meta?.env?.MODE || '') === 'development')
if (DEBUG_ENABLED && typeof window !== 'undefined') {
  try {
    if (!window.supabase) {
      window.supabase = supabase;
    }
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
