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

    // Test 3: Try to insert a test record (then delete it)
    try {
      // Create a temporary auth user to satisfy FK (user_profiles.id references auth.users.id)
      const tempEmail = `dbtest_${Date.now()}_${Math.floor(Math.random() * 1000)}@example.com`
      const { data: created, error: createUserError } = await serviceClient.auth.admin.createUser({
        email: tempEmail,
        password: 'TempPassword123!',
        email_confirm: true,
        user_metadata: { test: 'db-permission-insert' }
      })

      if (createUserError || !created?.user) {
        throw new Error(`Failed to create temp auth user: ${createUserError?.message}`)
      }

      const tempUserId = created.user.id

      const testData = {
        id: tempUserId,
        email: tempEmail,
        full_name: 'Test User',
        role: 'teacher',
        employee_id: 'TEST001',
        is_active: true,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      let insertError = null

      // Try insert
      const { data: insertData, error: _insertError } = await serviceClient
        .from('user_profiles')
        .insert(testData)
        .select()
        .single()

      insertError = _insertError

      // Clean up
      try { await serviceClient.from('user_profiles').delete().eq('id', tempUserId) } catch (_) {}
      try { await serviceClient.auth.admin.deleteUser(tempUserId) } catch (_) {}

      tests.results.insertTest = {
        success: !insertError,
        error: insertError?.message,
        data: !insertError ? 'Test record created and deleted' : null
      }
    } catch (error) {
      tests.results.insertTest = {
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