import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createServiceClient, createUserClient, verifyUserRole } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SuspendUserRequest {
  userId: string
  userType: 'student' | 'teacher' | 'admin'
  reason?: string
  suspendedBy?: string
  suspendedUntil?: string | null
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize clients using shared auth utilities (service and user clients will be created after auth header)

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create clients and verify role using shared utilities
    const userClient = createUserClient(authHeader)
    let user, profile
    try {
      const result = await verifyUserRole(userClient, ['admin', 'super_admin'])
      user = result.user
      profile = result.profile
    } catch (e) {
      return new Response(
        JSON.stringify({ error: String(e?.message || 'Unauthorized') }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Service client for privileged database operations
    const serviceClient = createServiceClient()

    // Parse request body
    const { userId, userType, reason, suspendedBy, suspendedUntil }: SuspendUserRequest = await req.json()

    if (!userId || !userType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId and userType' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate userType
    if (!['student', 'teacher', 'admin'].includes(userType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid userType. Must be student, teacher, or admin' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if the user to be suspended exists
    const { data: targetUser, error: targetUserError } = await serviceClient
      .from('user_profiles')
      .select('id, full_name, email, role, status')
      .eq('id', userId)
      .single()

    if (targetUserError || !targetUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prevent users from suspending themselves
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: 'You cannot suspend yourself' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prevent non-super admins from suspending other admins
    if (targetUser.role === 'admin' && profile.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Only super admins can suspend other admins' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user is already suspended
    if (targetUser.status === 'suspended') {
      return new Response(
        JSON.stringify({ error: 'User is already suspended' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare suspension data (use only existing columns)
    const suspensionData = {
      is_active: false,
      status: 'suspended',
      updated_by: user.id,
      updated_at: new Date().toISOString()
    }

    // Update user status to suspended
    const { data: updatedUser, error: updateError } = await serviceClient
      .from('user_profiles')
      .update(suspensionData)
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user status:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to suspend user', details: updateError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log the suspension action in audit log (aligned with other operations)
    try {
      const xf = req.headers.get('x-forwarded-for') || ''
      const ipAddr = xf.split(',')[0]?.trim() || null // inet must be valid or null
      const userAgent = req.headers.get('user-agent') || null

      await serviceClient
        .from('audit_logs')
        .insert([
          {
            user_id: user.id, // acting admin/super admin
            action: `suspend_${userType}`,
            resource_type: userType,
            resource_id: userId,
            details: {
              reason: reason || null,
              suspended_until: suspendedUntil || null,
              suspended_by: user.email || null,
              target_user_name: targetUser.full_name,
              target_user_email: targetUser.email
            },
            ip_address: ipAddr,
            user_agent: userAgent,
            created_at: new Date().toISOString()
          }
        ])
    } catch (auditError) {
      console.error('Error logging suspension action:', auditError)
      // Don't fail the request if audit logging fails
    }

    // Optionally, revoke all active sessions for the suspended user
    try {
      // This would require additional logic to invalidate JWT tokens
      // For now, we'll just update the status and let the client handle session management
    } catch (sessionError) {
      console.error('Error revoking user sessions:', sessionError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `User ${targetUser.full_name} has been suspended successfully`,
        data: {
          userId: updatedUser.id,
          status: updatedUser.status,
          isActive: updatedUser.is_active,
          suspensionReason: reason || null,
          suspendedUntil: suspendedUntil || null
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error in suspend-user function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})