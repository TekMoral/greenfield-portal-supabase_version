import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createServiceClient, createUserClient, verifyUserRole } from '../_shared/auth.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

interface DeleteClassRequest {
  id: string
  method?: 'soft'
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCors(req)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userClient = createUserClient(authHeader)
    const { user } = await verifyUserRole(userClient, ['super_admin'])

    let body: DeleteClassRequest
    try {
      body = await req.json()
    } catch (_) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!body.id) {
      return new Response(JSON.stringify({ success: false, error: 'Class ID (id) is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const serviceClient = createServiceClient()

    // Fetch existing class for logging context
    const { data: existing, error: fetchErr } = await serviceClient
      .from('classes')
      .select('*')
      .eq('id', body.id)
      .single()

    if (fetchErr || !existing) {
      return new Response(JSON.stringify({ success: false, error: 'Class not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Perform soft delete
    const { data: updated, error: softErr } = await serviceClient
      .from('classes')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('id', body.id)
      .select('*')
      .single()

    if (softErr) {
      return new Response(JSON.stringify({ success: false, error: softErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Audit log
    try {
      const { data: { user: actingAuthUser } } = await userClient.auth.getUser()
      const xf = req.headers.get('x-forwarded-for') || ''
      const ipAddr = xf.split(',')[0]?.trim() || null
      const userAgent = req.headers.get('user-agent') || null

      await serviceClient.from('audit_logs').insert([
        {
          user_id: actingAuthUser?.id ?? user.id ?? null,
          action: 'delete_class',
          resource_type: 'class',
          resource_id: body.id,
          details: {
            name: existing.name,
            level: existing.level,
            category: existing.category,
            capacity: existing.capacity,
            academic_year: existing.academic_year,
            class_teacher_id: existing.class_teacher_id,
            status_before: existing.status,
            status_after: updated.status
          },
          ip_address: ipAddr,
          user_agent: userAgent,
          created_at: new Date().toISOString()
        }
      ])
    } catch (auditErr) {
      console.warn('Failed to log delete_class:', auditErr)
    }

    return new Response(JSON.stringify({ success: true, data: { id: body.id, status: updated.status } }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error deleting class:', error)
    return new Response(JSON.stringify({ success: false, error: (error as Error).message || 'An unexpected error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
