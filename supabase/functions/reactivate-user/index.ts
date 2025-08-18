import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createServiceClient, createUserClient, verifyUserRole } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReactivateUserRequest {
  userId: string
  userType: 'student' | 'teacher' | 'admin'
  reactivatedBy?: string
  reactivationReason?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Clients are created via shared auth utilities after we read the auth header

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

    // Create user client and verify role using shared utilities
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

    // Service client for DB operations
    const serviceClient = createServiceClient()

    // Parse request body
    const { userId, userType, reactivatedBy, reactivationReason }: ReactivateUserRequest = await req.json()

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

    // Check if the user to be reactivated exists
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

    // Check if user is suspended (can only reactivate suspended users)
    if (targetUser.status !== 'suspended') {
      return new Response(
        JSON.stringify({ error: 'User is not suspended and cannot be reactivated' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prevent non-super admins from reactivating other admins
    if (targetUser.role === 'admin' && profile.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Only super admins can reactivate other admins' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare reactivation data (only existing columns)
    const reactivationData = {
      is_active: true,
      status: 'active',
      updated_by: user.id,
      updated_at: new Date().toISOString()
    }

    // Update user status to active
    const { data: updatedUser, error: updateError } = await serviceClient
      .from('user_profiles')
      .update(reactivationData)
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user status:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to reactivate user' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log the reactivation action in audit log
    try {
      const xf = req.headers.get('x-forwarded-for') || ''
      const ipAddr = xf.split(',')[0]?.trim() || null
      const userAgent = req.headers.get('user-agent') || null

      await serviceClient
        .from('audit_logs')
        .insert([
          {
            user_id: user.id,
            action: `reactivate_${userType}`,
            resource_type: userType,
            resource_id: userId,
            details: {
              reactivation_reason: reactivationReason || null,
              reactivated_by: user.email || null,
              target_user_name: targetUser.full_name,
              target_user_email: targetUser.email
            },
            ip_address: ipAddr,
            user_agent: userAgent,
            created_at: new Date().toISOString()
          }
        ])
    } catch (auditError) {
      console.error('Error logging reactivation action:', auditError)
      // Don't fail the request if audit logging fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `User ${targetUser.full_name} has been reactivated successfully`,
        data: {
          userId: updatedUser.id,
          status: updatedUser.status,
          isActive: updatedUser.is_active,
          reactivationReason: reactivationReason || null
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error in reactivate-user function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})