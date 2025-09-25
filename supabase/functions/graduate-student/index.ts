import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createServiceClient, createUserClient, verifyUserRole } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GraduateStudentRequest {
  studentId: string
    graduationDate?: string | null
  graduationReason?: string | null
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify requesting user's role (admin or super_admin)
    const userClient = createUserClient(authHeader)
    let user, profile
    try {
      const result = await verifyUserRole(userClient, ['admin', 'super_admin'])
      user = result.user
      profile = result.profile
    } catch (e) {
      return new Response(
        JSON.stringify({ error: String(e?.message || 'Unauthorized') }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const serviceClient = createServiceClient()

    // Parse request body
    const { studentId, graduationDate, graduationReason }: GraduateStudentRequest = await req.json()

    if (!studentId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: studentId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch target user
    const { data: targetUser, error: targetUserError } = await serviceClient
      .from('user_profiles')
      .select('id, full_name, email, role, status, class_id')
      .eq('id', studentId)
      .single()

    if (targetUserError || !targetUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate role and status
    if (targetUser.role !== 'student') {
      return new Response(
        JSON.stringify({ error: 'Only student users can be graduated' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (targetUser.status === 'graduated') {
      return new Response(
        JSON.stringify({ error: 'Student is already graduated' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (targetUser.status !== 'active') {
      return new Response(
        JSON.stringify({ error: `Cannot graduate student with status: ${targetUser.status}. Only active students can be graduated.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare update payloads
    const nowISO = new Date().toISOString()
    const gradAtISO = graduationDate ? new Date(graduationDate).toISOString() : nowISO

    const baseUpdate: Record<string, any> = {
      is_active: false,
      status: 'graduated',
      updated_by: user.id,
      updated_at: nowISO,
      class_id: null // Remove from current class rosters
    }

    const extendedFields: Record<string, any> = {
      graduated_at: gradAtISO,
      graduated_by: user.id,
      graduation_reason: graduationReason || null
    }

    // Try extended update first; if schema columns are missing, fallback to base update
    let updatedUser: any = null
    let updateError: any = null

    {
      const { data, error } = await serviceClient
        .from('user_profiles')
        .update({ ...baseUpdate, ...extendedFields })
        .eq('id', studentId)
        .select()
        .single()

      updatedUser = data
      updateError = error
    }

    if (updateError) {
      console.warn('Graduate extended update failed, falling back to baseUpdate only:', updateError?.message || updateError)
      const { data, error } = await serviceClient
        .from('user_profiles')
        .update(baseUpdate)
        .eq('id', studentId)
        .select()
        .single()

      if (error) {
        console.error('Graduate base update failed:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to graduate student', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      updatedUser = data
    }

    // Audit log
    try {
      const xf = req.headers.get('x-forwarded-for') || ''
      const ipAddr = xf.split(',')[0]?.trim() || null
      const userAgent = req.headers.get('user-agent') || null

      await serviceClient
        .from('audit_logs')
        .insert([
          {
            user_id: user.id,
            action: 'graduate_student',
            resource_type: 'student',
            resource_id: studentId,
            details: {
              graduation_reason: graduationReason || null,
              graduation_date: gradAtISO,
              graduated_by: user.email || null,
              previous_status: targetUser.status,
              previous_class_id: targetUser.class_id,
              target_user_name: targetUser.full_name,
              target_user_email: targetUser.email
            },
            ip_address: ipAddr,
            user_agent: userAgent,
            created_at: nowISO
          }
        ])
    } catch (auditError) {
      console.error('Error logging graduation action:', auditError)
      // Do not fail the main operation on audit log failure
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Student ${targetUser.full_name} has been graduated successfully`,
        data: {
          userId: updatedUser.id,
          status: updatedUser.status,
          isActive: updatedUser.is_active,
          graduatedAt: updatedUser.graduated_at || gradAtISO,
          graduatedBy: updatedUser.graduated_by || user.id
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error in graduate-student function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: (error as any)?.message || String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
