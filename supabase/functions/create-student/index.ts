import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createServiceClient, createUserClient, verifyUserRole } from '../_shared/auth.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

interface CreateStudentRequest {
  first_name: string
  surname: string
  email: string
  password?: string
  admission_number: string
  class_id: string
  date_of_birth?: string
  gender?: string
  contact?: string
  guardian_name?: string
  guardian_email?: string
  address?: string
  admission_date?: string
}

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

    // Parse request body
    let body: CreateStudentRequest
    try {
      body = await req.json()
    } catch (_) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    // Validate required fields
    if (!body.first_name || !body.surname || !body.email || !body.admission_number || !body.class_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields: first_name, surname, email, admission_number, class_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create service client for admin operations
    const serviceClient = createServiceClient()

    // Check for existing email
    const { data: existingEmail } = await serviceClient
      .from('user_profiles')
      .select('email')
      .eq('email', body.email)
      .single()

    if (existingEmail) {
      throw new Error(`A user with email ${body.email} already exists`)
    }

    // Check for existing admission number
    const { data: existingAdmission } = await serviceClient
      .from('user_profiles')
      .select('admission_number')
      .eq('admission_number', body.admission_number)
      .eq('role', 'student')
      .single()

    if (existingAdmission) {
      throw new Error(`A student with admission number ${body.admission_number} already exists`)
    }

    // Verify class exists
    const { data: classData, error: classError } = await serviceClient
      .from('classes')
      .select('id, name')
      .eq('id', body.class_id)
      .single()

    if (classError || !classData) {
      throw new Error('Invalid class selected')
    }

    // Create auth user using admin API
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email: body.email,
      password: body.password || body.admission_number || 'defaultPassword123',
      user_metadata: {
        full_name: `${body.first_name} ${body.surname}`,
        role: 'student',
      },
      email_confirm: true, // Auto-confirm email
    })

    if (authError || !authData.user) {
      throw new Error(`Failed to create auth user: ${authError?.message}`)
    }

    // Create user profile
    const profileData = {
      id: authData.user.id,
      email: body.email,
      full_name: `${body.first_name} ${body.surname}`,
      role: 'student',
      admission_number: body.admission_number,
      class_id: body.class_id,
      date_of_birth: body.date_of_birth || null,
      gender: body.gender || null,
      phone_number: body.contact || null,
      guardian_name: body.guardian_name || null,
      guardian_phone: body.contact || null,
      guardian_email: body.guardian_email || null,
      address: body.address || null,
      admission_date: body.admission_date || new Date().toISOString().split('T')[0],
      is_active: true,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Upsert to make operation idempotent and avoid duplicate key issues on retries
    const { data: profile, error: profileError } = await serviceClient
      .from('user_profiles')
      .upsert(profileData, { onConflict: 'id' })
      .select()
      .single()

    if (profileError) {
      // If upsert failed due to a race, try to return the existing profile
      const { data: existingProfile } = await serviceClient
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (existingProfile) {
        const studentData = { ...existingProfile, classes: classData }
        return new Response(
          JSON.stringify({ success: true, data: studentData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      // Clean up auth user if profile creation fails and no existing profile
      await serviceClient.auth.admin.deleteUser(authData.user.id)
      throw new Error(`Failed to create profile: ${profileError.message}`)
    }

    // Add class info to response
    const studentData = {
      ...profile,
      classes: classData,
    }

    // Insert audit log entry for student creation
    try {
      // Identify the authenticated admin/super-admin performing this action
      const { data: { user: actingAuthUser } } = await userClient.auth.getUser();

      await serviceClient.from("audit_logs").insert([
        {
          user_id: actingAuthUser?.id ?? null, // ID of admin/superadmin performing the creation
          action: "create_student",
          resource_type: "student",
          resource_id: profile.id,
          details: {
            email: body.email,
            admission_number: body.admission_number,
            class: { id: classData.id, name: classData.name },
            created_by: actingAuthUser?.email ?? null
          },
          created_at: new Date().toISOString(),
        }
      ])
    } catch (e) {
      // For now just log the error, do not fail the flow
      console.error('Failed to insert audit log for student creation:', e)
    }

    return new Response(
      JSON.stringify({ success: true, data: studentData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error creating student:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})