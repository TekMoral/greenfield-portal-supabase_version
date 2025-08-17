import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createServiceClient, createUserClient, verifyUserRole } from '../_shared/auth.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

interface UpdateAdminStatusRequest {
  adminId: string
  isActive: boolean
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return handleCors(req)
  }

  try {
    // Verify authorization - only super_admin can update admin status
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create user client to verify permissions
    const userClient = createUserClient(authHeader)
    const { user, profile } = await verifyUserRole(userClient, ['super_admin'])

    // Additional check: only super_admin can update admin status
    if (!profile.is_super_admin) {
      throw new Error('Unauthorized: Only super administrators can update admin status')
    }

    // Parse request body
    const body: UpdateAdminStatusRequest = await req.json()
    
    // Validate required fields
    if (!body.adminId || typeof body.isActive !== 'boolean') {
      throw new Error('Missing required fields: adminId, isActive')
    }

    // Create service client for admin operations
    const serviceClient = createServiceClient()

    // Get the admin to be updated
    const { data: adminToUpdate, error: adminError } = await serviceClient
      .from('user_profiles')
      .select('id, email, full_name, role, is_super_admin, is_active')
      .eq('id', body.adminId)
      .single()

    if (adminError || !adminToUpdate) {
      throw new Error('Admin not found')
    }

    // Prevent super admins from deactivating themselves
    if (adminToUpdate.id === user.id && !body.isActive) {
      throw new Error('Super administrators cannot deactivate themselves')
    }

    // Prevent deactivating other super admins (only they can deactivate themselves)
    if (adminToUpdate.is_super_admin && adminToUpdate.id !== user.id && !body.isActive) {
      throw new Error('Cannot deactivate other super administrators')
    }

    // Update the admin status in user_profiles
    const { data: updatedProfile, error: updateError } = await serviceClient
      .from('user_profiles')
      .update({
        is_active: body.isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.adminId)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to update admin status: ${updateError.message}`)
    }

    // Update auth user status if deactivating
    if (!body.isActive) {
      try {
        // Disable the auth user by updating user metadata
        const { error: authError } = await serviceClient.auth.admin.updateUserById(body.adminId, {
          user_metadata: { 
            ...adminToUpdate.user_metadata,
            is_active: false,
            disabled_at: new Date().toISOString(),
            disabled_by: user.id
          }
        })

        if (authError) {
          console.warn('Failed to update auth user status:', authError)
          // Don't fail the entire operation for auth update issues
        }
      } catch (authError) {
        console.warn('Auth update error:', authError)
      }
    } else {
      // Re-enable the auth user
      try {
        const { error: authError } = await serviceClient.auth.admin.updateUserById(body.adminId, {
          user_metadata: { 
            ...adminToUpdate.user_metadata,
            is_active: true,
            enabled_at: new Date().toISOString(),
            enabled_by: user.id
          }
        })

        if (authError) {
          console.warn('Failed to update auth user status:', authError)
        }
      } catch (authError) {
        console.warn('Auth update error:', authError)
      }
    }

    // Log the admin status change
    try {
      await serviceClient
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: body.isActive ? 'ADMIN_ACTIVATE' : 'ADMIN_DEACTIVATE',
          target_id: body.adminId,
          target_type: 'user',
          details: {
            adminName: adminToUpdate.full_name,
            adminEmail: adminToUpdate.email,
            adminRole: adminToUpdate.role,
            previousStatus: adminToUpdate.is_active,
            newStatus: body.isActive,
            updatedBy: profile.full_name,
          },
          description: `${body.isActive ? 'Activated' : 'Deactivated'} admin: ${adminToUpdate.full_name} (${adminToUpdate.email})`,
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown',
        })
    } catch (auditError) {
      console.warn('Failed to log admin status change:', auditError)
      // Don't fail the operation for audit logging
    }

    // Transform data for response
    const responseData = {
      id: updatedProfile.id,
      email: updatedProfile.email,
      name: updatedProfile.full_name,
      role: updatedProfile.role,
      isActive: updatedProfile.is_active,
      isSuperAdmin: updatedProfile.is_super_admin,
      updatedAt: updatedProfile.updated_at,
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error updating admin status:', error)
    
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