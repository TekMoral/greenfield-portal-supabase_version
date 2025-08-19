import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createServiceClient, createUserClient, verifyUserRole } from '../_shared/auth.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

interface CreateClassRequest {
  name: string
  level: 'Junior' | 'Senior'
  category?: 'Science' | 'Art' | 'Commercial' | null
  capacity?: number
  description?: string | null
  academic_year?: string | null
  class_teacher_id?: string | null
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SENIOR_CATEGORIES = new Set(['Science', 'Art', 'Commercial'])

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return handleCors(req)
  }

  try {
    // Authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userClient = createUserClient(authHeader)
    const { user } = await verifyUserRole(userClient, ['super_admin'])

    // Parse body
    let body: CreateClassRequest | any
    try {
      body = await req.json()
    } catch (_) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Accept camelCase fallback from clients (classTeacherId -> class_teacher_id)
    if (body.classTeacherId !== undefined && body.class_teacher_id === undefined) {
      body.class_teacher_id = body.classTeacherId
    }

    // Basic validation
    if (!body?.name || !body?.level) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields: name, level' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (body.level !== 'Junior' && body.level !== 'Senior') {
      return new Response(JSON.stringify({ success: false, error: "level must be 'Junior' or 'Senior'" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Category rules: optional for Junior, required + validated for Senior
    let category: CreateClassRequest['category'] = body.category ?? null
    if (body.level === 'Senior') {
      if (!category || !SENIOR_CATEGORIES.has(String(category))) {
        return new Response(JSON.stringify({ success: false, error: "category is required for Senior and must be one of: Science, Art, Commercial" }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    } else {
      // Junior -> ignore category
      category = null
    }

    // Normalize and validate class_teacher_id
    let classTeacherId: string | null | undefined = body.class_teacher_id
    if (classTeacherId === '') classTeacherId = null
    if (classTeacherId != null) {
      if (!UUID_REGEX.test(String(classTeacherId))) {
        return new Response(JSON.stringify({ success: false, error: 'class_teacher_id must be a valid UUID or null' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Validate capacity
    let capacity: number | undefined = undefined
    if (body.capacity !== undefined) {
      const n = Number(body.capacity)
      if (!Number.isFinite(n) || n < 0) {
        return new Response(JSON.stringify({ success: false, error: 'capacity must be a non-negative number' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      capacity = n
    }

    const serviceClient = createServiceClient()

    // Pre-check duplicate by (name, level, category) to provide friendly error (DB constraint may still be name-only)
    try {
      let query = serviceClient
        .from('classes')
        .select('id', { count: 'exact', head: true })
        .eq('name', body.name)
        .eq('level', body.level)
      if (category === null) {
        // Junior classes: category is null
        // @ts-ignore
        query = query.is('category', null)
      } else {
        query = query.eq('category', category as string)
      }
      const { count: dupCount } = await query
      if ((dupCount || 0) > 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'A class with the same name, level, and category already exists' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (_) { /* ignore pre-check failures and rely on DB */ }

    // Insert class
    const insertPayload: Record<string, unknown> = {
      name: body.name,
      level: body.level,
      category: category,
      capacity: capacity,
      description: body.description ?? null,
      academic_year: body.academic_year ?? null,
      class_teacher_id: classTeacherId ?? null,
      status: 'active'
    }

    const { data: cls, error: insertErr } = await serviceClient
      .from('classes')
      .insert(insertPayload)
      .select('*')
      .single()

    if (insertErr) {
      const msg = insertErr.message || ''
      const isUniqueName = msg.includes('duplicate key value') && msg.includes('classes_name_key')
      return new Response(
        JSON.stringify({ success: false, error: isUniqueName ? 'Class name already exists' : msg || 'Failed to create class' }),
        {
          status: isUniqueName ? 409 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
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
          action: 'create_class',
          resource_type: 'class',
          resource_id: cls.id,
          details: {
            name: cls.name,
            level: cls.level,
            category: cls.category,
            capacity: cls.capacity,
            academic_year: cls.academic_year,
            class_teacher_id: cls.class_teacher_id
          },
          ip_address: ipAddr,
          user_agent: userAgent,
          created_at: new Date().toISOString()
        }
      ])
    } catch (auditErr) {
      console.warn('Failed to insert audit log for class creation:', auditErr)
    }

    return new Response(JSON.stringify({ success: true, data: cls }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error creating class:', error)
    return new Response(JSON.stringify({ success: false, error: (error as Error).message || 'An unexpected error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
