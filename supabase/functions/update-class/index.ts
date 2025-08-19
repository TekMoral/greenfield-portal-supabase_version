import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createServiceClient, createUserClient, verifyUserRole } from '../_shared/auth.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

interface SubjectAssignment {
  subjectName: string
  teacherId: string
  teacherName?: string | null
}

interface UpdateClassRequest {
  id: string
  name?: string
  level?: 'Junior' | 'Senior'
  category?: 'Science' | 'Art' | 'Commercial' | null
  capacity?: number
  description?: string | null
  academic_year?: string | null
  class_teacher_id?: string | null
  status?: string
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

    // Parse JSON body
    let body: UpdateClassRequest
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

    // Fetch existing class for comparison and to infer rules
    const { data: existingClass, error: fetchErr } = await serviceClient
      .from('classes')
      .select('*')
      .eq('id', body.id)
      .single()

    if (fetchErr || !existingClass) {
      return new Response(JSON.stringify({ success: false, error: 'Class not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const cleanUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    // Validate and map fields if present
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return new Response(JSON.stringify({ success: false, error: 'name must be a non-empty string' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      cleanUpdates.name = body.name
    }

    // Handle level/category rules
    let newLevel: 'Junior' | 'Senior' | undefined = body.level
    let newCategory: UpdateClassRequest['category'] | undefined = body.category

    const effectiveLevel: 'Junior' | 'Senior' = newLevel ?? existingClass.level
    if (newLevel !== undefined) {
      if (newLevel !== 'Junior' && newLevel !== 'Senior') {
        return new Response(JSON.stringify({ success: false, error: "level must be 'Junior' or 'Senior'" }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      cleanUpdates.level = newLevel
    }

    if (effectiveLevel === 'Senior') {
      // category required and must be valid
      const cat = newCategory !== undefined ? newCategory : existingClass.category
      if (!cat || !SENIOR_CATEGORIES.has(String(cat))) {
        return new Response(JSON.stringify({ success: false, error: "category is required for Senior and must be one of: Science, Art, Commercial" }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      cleanUpdates.category = cat
    } else {
      // Junior -> category is null
      cleanUpdates.category = null
    }

    if (body.capacity !== undefined) {
      const n = Number(body.capacity)
      if (!Number.isFinite(n) || n < 0) {
        return new Response(JSON.stringify({ success: false, error: 'capacity must be a non-negative number' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      cleanUpdates.capacity = n
    }

    if (body.description !== undefined) {
      cleanUpdates.description = body.description
    }

    if (body.academic_year !== undefined) {
      cleanUpdates.academic_year = body.academic_year
    }

    if (body.class_teacher_id !== undefined) {
      let classTeacherId = body.class_teacher_id
      if (classTeacherId === '') classTeacherId = null
      if (classTeacherId != null) {
        if (!UUID_REGEX.test(String(classTeacherId))) {
          return new Response(JSON.stringify({ success: false, error: 'class_teacher_id must be a valid UUID or null' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }
      cleanUpdates.class_teacher_id = classTeacherId
    }

    if (body.status !== undefined) {
      cleanUpdates.status = body.status
    }

    
    // Perform update
    const { data: updated, error: updateErr } = await serviceClient
      .from('classes')
      .update(cleanUpdates)
      .eq('id', body.id)
      .select('*')
      .single()

    if (updateErr) {
      return new Response(JSON.stringify({ success: false, error: updateErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Audit log - compute changes
    try {
      const { data: { user: actingAuthUser } } = await userClient.auth.getUser()

      const candidateKeys = Object.keys(body).filter(k => k !== 'id')
      const normalize = (v: any) => (v === undefined ? null : v)
      const oldValues: Record<string, any> = {}
      const newValues: Record<string, any> = {}
      const changedFields: string[] = []
      for (const key of candidateKeys) {
        const before = normalize((existingClass as any)[key])
        const after = normalize((updated as any)[key])
        if (JSON.stringify(before) !== JSON.stringify(after)) {
          changedFields.push(key)
          oldValues[key] = before
          newValues[key] = after
        }
      }

      const xf = req.headers.get('x-forwarded-for') || ''
      const ipAddr = xf.split(',')[0]?.trim() || null
      const userAgent = req.headers.get('user-agent') || null

      await serviceClient.from('audit_logs').insert([
        {
          user_id: actingAuthUser?.id ?? user.id ?? null,
          action: 'update_class',
          resource_type: 'class',
          resource_id: body.id,
          details: {
            updated_by: actingAuthUser?.email ?? null,
            updated_fields: changedFields,
            name: updated.name,
            level: updated.level,
            category: updated.category,
            capacity: updated.capacity,
            academic_year: updated.academic_year,
            class_teacher_id: updated.class_teacher_id,
            },
          old_values: oldValues,
          new_values: newValues,
          ip_address: ipAddr,
          user_agent: userAgent,
          created_at: new Date().toISOString()
        }
      ])
    } catch (auditErr) {
      console.warn('Failed to log update_class:', auditErr)
    }

    return new Response(JSON.stringify({ success: true, data: updated }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error updating class:', error)
    return new Response(JSON.stringify({ success: false, error: (error as Error).message || 'An unexpected error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
