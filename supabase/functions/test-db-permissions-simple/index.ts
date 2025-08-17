import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createServiceClient } from '../_shared/auth.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return handleCors(req)
  }

  try {
    const serviceClient = createServiceClient()
    
    const tests = {
      timestamp: new Date().toISOString(),
      results: {}
    }

    // Test 1: Basic connection
    try {
      const { data, error } = await serviceClient
        .from('user_profiles')
        .select('count')
        .limit(1)
      
      tests.results.basicConnection = {
        success: !error,
        error: error?.message,
        hasData: !!data
      }
    } catch (error) {
      tests.results.basicConnection = {
        success: false,
        error: error.message
      }
    }

    // Test 2: Count existing teachers
    try {
      const { count, error } = await serviceClient
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'teacher')
      
      tests.results.teacherCount = {
        success: !error,
        count: count,
        error: error?.message
      }
    } catch (error) {
      tests.results.teacherCount = {
        success: false,
        error: error.message
      }
    }

    // Test 3: Simple write test (update existing record)
    try {
      // Get one existing user profile
      const { data: existingProfile, error: fetchError } = await serviceClient
        .from('user_profiles')
        .select('id, updated_at')
        .limit(1)
        .single()

      if (fetchError || !existingProfile) {
        throw new Error('No existing profiles to test with')
      }

      const originalUpdatedAt = existingProfile.updated_at
      const newUpdatedAt = new Date().toISOString()

      // Update the updated_at field
      const { error: updateError } = await serviceClient
        .from('user_profiles')
        .update({ updated_at: newUpdatedAt })
        .eq('id', existingProfile.id)

      if (updateError) {
        throw new Error(`Update failed: ${updateError.message}`)
      }

      // Revert it back
      const { error: revertError } = await serviceClient
        .from('user_profiles')
        .update({ updated_at: originalUpdatedAt })
        .eq('id', existingProfile.id)

      tests.results.writeTest = {
        success: !revertError,
        error: revertError?.message,
        data: 'Successfully updated and reverted a record'
      }
    } catch (error) {
      tests.results.writeTest = {
        success: false,
        error: error.message
      }
    }

    // Test 4: Auth admin functions
    try {
      const { data: users, error: authError } = await serviceClient.auth.admin.listUsers({
        page: 1,
        perPage: 1
      })

      tests.results.authAdmin = {
        success: !authError,
        error: authError?.message,
        userCount: users?.users?.length || 0
      }
    } catch (error) {
      tests.results.authAdmin = {
        success: false,
        error: error.message
      }
    }

    // Test 5: Environment variables
    tests.results.environment = {
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      hasAnonKey: !!Deno.env.get('SUPABASE_ANON_KEY'),
      supabaseUrlLength: Deno.env.get('SUPABASE_URL')?.length || 0,
      serviceKeyLength: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.length || 0
    }

    return new Response(
      JSON.stringify(tests, null, 2),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Database permission test error:', error)
    
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