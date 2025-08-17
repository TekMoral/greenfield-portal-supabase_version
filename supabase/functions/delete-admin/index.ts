import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createServiceClient, createUserClient, verifyUserRole } from '../_shared/auth.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

interface DeleteAdminRequest {
  adminId: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return handleCors(req)
  }

  try {
    // Verify authorization - only super_admin can delete admins
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create user client to verify permissions
    const userClient = createUserClient(authHeader)
    const { user, profile } = await verifyUserRole(userClient, ['super_admin'])

    // Additional check: only super_admin can delete admins
    if (!profile.is_super_admin) {
      throw new Error('Unauthorized: Only super administrators can delete admin users')
    }

    // Parse request body
    const body: DeleteAdminRequest = await req.json()
    
    // Validate required fields
    if (!body.adminId) {
      throw new Error('Missing required field: adminId')
    }

    // Prevent super admins from deleting themselves
    if (body.adminId === user.id) {
      throw new Error('Super administrators cannot delete themselves')
    }

    // Create service client for admin operations
    const serviceClient = createServiceClient()

    // Get the admin to be deleted (for logging and validation)
    const { data: adminToDelete, error: adminError } = await serviceClient
      .from('user_profiles')
      .select('id, email, full_name, role, is_super_admin, is_active')
      .eq('id', body.adminId)
      .single()

    if (adminError || !adminToDelete) {
      throw new Error('Admin not found')
    }

    // Prevent deleting other super admins
    if (adminToDelete.is_super_admin) {
      throw new Error('Cannot delete other super administrators')
    }

    // Only allow deleting regular admins, not super admins
    if (adminToDelete.role !== 'admin') {
      throw new Error('Can only delete regular admin users')
    }

    // First, soft delete by deactivating (safer approach)
    const { error: deactivateError } = await serviceClient
      .from('user_profiles')
      .update({
        is_active: false,
        status: 'deleted',
        updated_at: new Date().toISOString(),
        deleted_at: new Date().toISOString(),
        deleted_by: user.id
      })
      .eq('id', body.adminId)

    if (deactivateError) {
      throw new Error(`Failed to deactivate admin: ${deactivateError.message}`)
    }

    // Delete the auth user
    try {
      const { error: authError } = await serviceClient.auth.admin.deleteUser(body.adminId)
      
      if (authError) {
        console.warn('Failed to delete auth user:', authError)
        // Don't fail the entire operation if auth deletion fails
        // The profile is already marked as deleted
      }
    } catch (authError) {
      console.warn('Auth deletion error:', authError)
    }

    // Log the admin deletion
    try {
      await serviceClient
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'ADMIN_DELETE',
          target_id: body.adminId,
          target_type: 'user',
          details: {
            adminName: adminToDelete.full_name,
            adminEmail: adminToDelete.email,
            adminRole: adminToDelete.role,
            wasActive: adminToDelete.is_active,
            deletedBy: profile.full_name,
            deletionMethod: 'soft_delete_with_auth_removal'
          },
          description: `Deleted admin: ${adminToDelete.full_name} (${adminToDelete.email})`,
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown',
        })
    } catch (auditError) {
      console.warn('Failed to log admin deletion:', auditError)
      // Don't fail the operation for audit logging
    }

    // Optional: Clean up related data (assignments, etc.)
    try {
      // Remove any teacher assignments if the admin was also a teacher
      await serviceClient
        .from('teacher_assignments')
        .update({ is_active: false })
        .eq('teacher_id', body.adminId)

      // Mark any notifications sent by this admin
      await serviceClient
        .from('notifications')
        .update({ 
          sender_id: null,
          sender_note: `Originally sent by deleted admin: ${adminToDelete.full_name}`
        })
        .eq('sender_id', body.adminId)

    } catch (cleanupError) {
      console.warn('Failed to clean up related data:', cleanupError)
      // Don't fail the operation for cleanup issues
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Admin ${adminToDelete.full_name} has been successfully deleted`,
        data: {
          deletedAdminId: body.adminId,
          deletedAdminName: adminToDelete.full_name,
          deletedAdminEmail: adminToDelete.email,
          deletedAt: new Date().toISOString(),
          deletedBy: profile.full_name
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error deleting admin:', error)
    
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