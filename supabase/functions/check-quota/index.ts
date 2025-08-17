import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createServiceClient, createUserClient, verifyUserRole } from '../_shared/auth.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return handleCors(req)
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create user client to verify permissions
    const userClient = createUserClient(authHeader)
    await verifyUserRole(userClient, ['admin', 'super_admin'])

    // Create service client for admin operations
    const serviceClient = createServiceClient()
    
    const results = {
      timestamp: new Date().toISOString(),
      quota: {}
    }

    // Count total users in auth
    try {
      const { data: authUsers, error: authError } = await serviceClient.auth.admin.listUsers()
      
      if (authError) {
        throw new Error(`Auth error: ${authError.message}`)
      }

      results.quota.authUserCount = authUsers.users?.length || 0
      results.quota.authUsersSuccess = true
    } catch (error) {
      results.quota.authUserCount = 0
      results.quota.authUsersSuccess = false
      results.quota.authError = error.message
    }

    // Count users in user_profiles table
    try {
      const { count: profileCount, error: profileError } = await serviceClient
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })

      if (profileError) {
        throw new Error(`Profile count error: ${profileError.message}`)
      }

      results.quota.profileCount = profileCount || 0
      results.quota.profileSuccess = true
    } catch (error) {
      results.quota.profileCount = 0
      results.quota.profileSuccess = false
      results.quota.profileError = error.message
    }

    // Count by role
    try {
      const { count: teacherCount, error: teacherError } = await serviceClient
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'teacher')

      const { count: studentCount, error: studentError } = await serviceClient
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')

      const { count: adminCount, error: adminError } = await serviceClient
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')

      results.quota.teacherCount = teacherCount || 0
      results.quota.studentCount = studentCount || 0
      results.quota.adminCount = adminCount || 0
      results.quota.roleCountsSuccess = !teacherError && !studentError && !adminError
    } catch (error) {
      results.quota.roleCountsSuccess = false
      results.quota.roleError = error.message
    }

    // Determine if quota is an issue
    results.quota.isNearLimit = results.quota.authUserCount >= 450 // Warning at 450
    results.quota.isAtLimit = results.quota.authUserCount >= 500 // Error at 500
    results.quota.freeLimit = 500

    return new Response(
      JSON.stringify(results, null, 2),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Quota check error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})