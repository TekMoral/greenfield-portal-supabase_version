import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createServiceClient } from '../_shared/auth.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCors(req)

  try {
    const body = await req.json()
    const { email, password, user_metadata, email_confirm } = body

    if (!email || !password) {
      return new Response(JSON.stringify({ success: false, error: 'Missing email or password' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const serviceClient = createServiceClient()
    const { data, error } = await serviceClient.auth.admin.createUser({
      email,
      password,
      user_metadata,
      email_confirm: email_confirm === undefined ? true : email_confirm // default to true
    })

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    return new Response(JSON.stringify({ success: true, user: data.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
