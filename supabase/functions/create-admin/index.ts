import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createServiceClient, createUserClient, verifyUserRole } from '../_shared/auth.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

interface CreateAdminRequest {
  name: string
  email: string
  password?: string
  phoneNumber?: string
  role?: 'admin' | 'super_admin'
  department?: string
  position?: string
  permissions?: string[]
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return handleCors(req)
  }

  try {
    // Verify authorization - only super_admin can create admins
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create user client to verify permissions
    const userClient = createUserClient(authHeader)
    const { user, profile } = await verifyUserRole(userClient, ['super_admin'])

    // Additional check: only super_admin can create admins
    if (!profile.is_super_admin) {
      throw new Error('Unauthorized: Only super administrators can create admin users')
    }

    // Parse request body
    const body: CreateAdminRequest = await req.json()
    
    // Validate required fields
    if (!body.name || !body.email) {
      throw new Error('Missing required fields: name, email')
    }

    // Validate role
    const adminRole = body.role || 'admin'
    if (!['admin', 'super_admin'].includes(adminRole)) {
      throw new Error('Invalid role. Must be either "admin" or "super_admin"')
    }

    // Only super_admin can create other super_admins
    if (adminRole === 'super_admin' && !profile.is_super_admin) {
      throw new Error('Unauthorized: Only super administrators can create other super administrators')
    }

    // Create service client for admin operations
    const serviceClient = createServiceClient()

    // Check for existing email in Auth (authoritative)
    const { data: usersList, error: listErr } = await serviceClient.auth.admin.listUsers()
    if (listErr) {
      throw new Error(`Failed to check existing users: ${listErr.message}`)
    }
    const existingAuthUser = usersList.users?.find(u => u.email === body.email)
    if (existingAuthUser) {
      throw new Error(`A user with email ${body.email} already exists`)
    }

    // Check also in user_profiles for safety
    const { data: existingUser, error: existingError } = await serviceClient
      .from('user_profiles')
      .select('email')
      .eq('email', body.email)
      .single()

    if (existingUser) {
      throw new Error(`A user with email ${body.email} already exists`)
    }

    // Generate admin ID
    const year = new Date().getFullYear()
    const { count } = await serviceClient
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .in('role', ['admin', 'super_admin'])

    const adminId = `ADM${year}${String((count || 0) + 1).padStart(4, '0')}`

    // Create auth user using admin API
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email: body.email,
      password: body.password || 'defaultPassword123',
      user_metadata: {
        full_name: body.name,
        role: adminRole,
        phone_number: body.phoneNumber || null,
        department: body.department || null,
        position: body.position || null,
        profile_data: {
          is_active: true,
          status: 'active',
          created_via: 'edge_function'
        }
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
      full_name: body.name,
      role: adminRole,
      phone_number: body.phoneNumber || null,
      employee_id: adminId,
      department: body.department || null,
      qualification: body.position || null, // Using qualification field for position
      is_super_admin: adminRole === 'super_admin',
      is_active: true,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: profile, error: profileError } = await serviceClient
      .from('user_profiles')
      .insert(profileData)
      .select()
      .single()

    if (profileError) {
      // Clean up auth user if profile creation fails
      await serviceClient.auth.admin.deleteUser(authData.user.id)
      throw new Error(`Failed to create profile: ${profileError.message}`)
    }

    // Create admin permissions if provided
    if (body.permissions && body.permissions.length > 0) {
      const permissionInserts = body.permissions.map(permission => ({
        user_id: authData.user.id,
        permission: permission,
        granted_by: user.id,
        granted_at: new Date().toISOString(),
      }))

      const { error: permissionsError } = await serviceClient
        .from('admin_permissions')
        .insert(permissionInserts)

      if (permissionsError) {
        console.warn('Failed to create admin permissions:', permissionsError)
        // Don't fail the entire operation for permissions
      }
    }

    // Log admin creation activity (align with create_teacher style)
    try {
      const xf = req.headers.get('x-forwarded-for') || ''
      const ipAddr = xf.split(',')[0]?.trim() || null
      const userAgent = req.headers.get('user-agent') || null

      await serviceClient
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'create_admin',
          resource_type: 'admin',
          resource_id: authData.user.id,
          details: {
            name: body.name,
            email: body.email,
            role: adminRole,
            department: body.department || null,
            position: body.position || null,
            created_by: user.email || null
          },
          description: `Created new ${adminRole}: ${body.name} (${body.email})`,
          ip_address: ipAddr,
          user_agent: userAgent,
          created_at: new Date().toISOString()
        })
    } catch (auditError) {
      console.warn('Failed to log admin creation:', auditError)
      // Don't fail the operation for audit logging
    }

    // Transform data for response
    const adminData = {
      id: profile.id,
      uid: profile.id,
      name: profile.full_name,
      email: profile.email,
      phoneNumber: profile.phone_number,
      role: profile.role,
      department: profile.department,
      position: profile.qualification,
      employeeId: profile.employee_id,
      isSuperAdmin: profile.is_super_admin,
      isActive: profile.is_active,
      createdAt: profile.created_at,
    }

    return new Response(
      JSON.stringify({ success: true, data: adminData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }
    )

  } catch (error) {
    console.error('Error creating admin:', error)
    
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