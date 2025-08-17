import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createServiceClient, createUserClient, verifyUserRole } from '../_shared/auth.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

interface CreateTeacherRequest {
  name: string
  email: string
  password?: string
  phoneNumber?: string
  subject: string
  qualification: string
  dateHired?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return handleCors(req)
  }

  try {
    console.log('🔄 Starting teacher creation process...')
    
    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create user client to verify permissions
    const userClient = createUserClient(authHeader)
    await verifyUserRole(userClient, ['admin', 'super_admin'])

    // Parse request body
    const body: CreateTeacherRequest = await req.json()
    console.log('✅ Request body parsed and authorized')
    
    // Validate required fields
    if (!body.name || !body.email || !body.subject || !body.qualification) {
      throw new Error('Missing required fields: name, email, subject, qualification')
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      throw new Error('Invalid email format')
    }

    console.log('✅ Input validation passed')

    // Create service client for admin operations
    const serviceClient = createServiceClient()

    // Check for existing email using auth admin
    const { data: existingUsers, error: listError } = await serviceClient.auth.admin.listUsers()
    
    if (listError) {
      throw new Error(`Failed to check existing users: ${listError.message}`)
    }

    const existingUser = existingUsers.users?.find(user => user.email === body.email)
    if (existingUser) {
      throw new Error(`A user with email ${body.email} already exists`)
    }

    console.log('✅ Email is unique')

    // Generate employee ID
    const year = new Date().getFullYear()
    const randomNum = Math.floor(Math.random() * 9000) + 1000
    const employeeId = `TCH${year}${randomNum}`

    console.log('✅ Generated employee ID:', employeeId)

    // Create auth user using admin API (this works reliably)
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email: body.email,
      password: body.password || 'TempPassword123!',
      user_metadata: {
        full_name: body.name,
        role: 'teacher',
        employee_id: employeeId,
        subject: body.subject,
        qualification: body.qualification,
        phone_number: body.phoneNumber || null,
        hire_date: body.dateHired || new Date().toISOString().split('T')[0],
        // Store all data in metadata as backup
        profile_data: {
          specialization: body.subject,
          is_active: true,
          status: 'active',
          created_via: 'edge_function'
        }
      },
      email_confirm: true
    })

    if (authError || !authData.user) {
      throw new Error(`Failed to create auth user: ${authError?.message}`)
    }

    console.log('✅ Auth user created successfully:', authData.user.id)

    // Try to create user profile in database (but don't fail if it doesn't work)
    let profileCreated = false
    let profileError = null

    try {
      const profileData = {
        id: authData.user.id,
        email: body.email,
        full_name: body.name,
        role: 'teacher',
        phone_number: body.phoneNumber || null,
        employee_id: employeeId,
        qualification: body.qualification,
        specialization: body.subject,
        hire_date: body.dateHired || new Date().toISOString().split('T')[0],
        is_active: true,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data: profile, error: insertError } = await serviceClient
        .from('user_profiles')
        .insert(profileData)
        .select()
        .single()

      if (!insertError && profile) {
        profileCreated = true
        console.log('✅ User profile created in database')
      } else {
        profileError = insertError?.message
        console.log('⚠️ Profile creation failed, but user exists in auth:', profileError)
      }
    } catch (dbError) {
      profileError = dbError.message
      console.log('⚠️ Database operation failed, but user exists in auth:', profileError)
    }

    // Return success regardless of profile creation (data is in auth metadata)
    const teacherData = {
      id: authData.user.id,
      uid: authData.user.id,
      name: body.name,
      email: body.email,
      phoneNumber: body.phoneNumber || null,
      subject: body.subject,
      qualification: body.qualification,
      dateHired: body.dateHired || new Date().toISOString().split('T')[0],
      employeeId: employeeId,
      isActive: true,
      role: 'teacher',
      createdAt: new Date().toISOString(),
      profileInDatabase: profileCreated,
      note: profileCreated 
        ? 'Teacher created successfully with database profile'
        : 'Teacher created in auth system. Profile data stored in user metadata. Database profile creation can be completed later.'
    }

    console.log('✅ Teacher creation completed:', teacherData)

    return new Response(
      JSON.stringify({ success: true, data: teacherData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }
    )

  } catch (error) {
    console.error('❌ Error creating teacher:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred',
        details: 'Teacher creation failed. Check logs for details.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})