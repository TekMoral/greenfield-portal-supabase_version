import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Create Supabase client with service role key for admin operations
export function createServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        }
      }
    }
  )
}

// Create client for user operations (with user's JWT)
export function createUserClient(authHeader: string) {
  const jwt = (authHeader || '').replace('Bearer ', '').trim()

  const client = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Bind the JWT to the auth client so auth.getUser() works without passing a token param
  try {
    if (jwt) {
      // @ts-ignore - setAuth is available in supabase-js v2
      client.auth.setAuth(jwt)
    }
  } catch (_) { /* ignore */ }

  return client
}

// Verify user has required role
export async function verifyUserRole(supabase: any, requiredRoles: string[]) {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('Unauthorized: Invalid token')
  }

  // Get user profile to check role
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role, is_super_admin')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('Unauthorized: User profile not found')
  }

  const userRole = profile.role
  const isSuperAdmin = profile.is_super_admin

  // Super admin can access everything
  if (isSuperAdmin) {
    return { user, profile }
  }

  // Check if user has required role
  if (!requiredRoles.includes(userRole)) {
    throw new Error(`Unauthorized: Required role(s): ${requiredRoles.join(', ')}`)
  }

  return { user, profile }
}