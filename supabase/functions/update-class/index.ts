import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}


serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    let body
    try {
      body = await req.json()
    } catch (_) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { id, ...updates } = body
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get authenticated user
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user session' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if user is super_admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Only super_admin can update classes' }), { 
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate input
    if (!id) {
      return new Response(JSON.stringify({ error: 'Class ID is required' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Sanitize and validate updates
    const allowedKeys = ['name','level','category','capacity','description','academic_year','class_teacher_id','status']
    const cleanUpdates: Record<string, unknown> = Object.fromEntries(
      Object.entries(updates).filter(([k, v]) => allowedKeys.includes(k) && v !== undefined)
    )

    // Normalize empty class_teacher_id to null and validate UUID if provided
    if ('class_teacher_id' in cleanUpdates) {
      if (cleanUpdates.class_teacher_id === '' || cleanUpdates.class_teacher_id === undefined) {
        // @ts-ignore
        cleanUpdates.class_teacher_id = null
      } else if (cleanUpdates.class_teacher_id !== null) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(String(cleanUpdates.class_teacher_id))) {
          return new Response(JSON.stringify({ error: 'class_teacher_id must be a valid UUID or empty' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }
    }

    // Validate capacity if provided
    if ('capacity' in cleanUpdates) {
      const n = Number((cleanUpdates as any).capacity)
      if (!Number.isFinite(n) || n < 0) {
        return new Response(JSON.stringify({ error: 'capacity must be a non-negative number' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      ;(cleanUpdates as any).capacity = n
    }

    // Ensure class exists before update
    const { data: existingClass, error: existErr } = await supabase
      .from('classes')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (existErr) {
      return new Response(JSON.stringify({ error: existErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (!existingClass) {
      return new Response(JSON.stringify({ error: 'Class not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Update class
    const { data, error } = await supabase
      .from('classes')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (!data) {
      return new Response(JSON.stringify({ error: 'Class not found' }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ data }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
