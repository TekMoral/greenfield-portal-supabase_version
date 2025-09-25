// supabase/functions/self-update-password/index.ts
// Updates the calling user's password and clears the require_password_change flag.
// Requires Authorization: Bearer <access_token> (verify_jwt true by default)

import { getResponseCorsHeaders, handleCors } from '../_shared/cors-hardened.ts'
import { createServiceClient, createUserClient } from '../_shared/auth.ts'

interface Payload { new_password?: string }

Deno.serve(async (req: Request) => {
  // CORS preflight
  const pre = handleCors(req)
  if (pre) return pre

  const corsHeaders = getResponseCorsHeaders(req)

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse input
    let body: Payload = {}
    try {
      body = await req.json()
    } catch (_) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const newPassword = (body?.new_password || '').trim()
    if (!newPassword || newPassword.length < 6) {
      return new Response(JSON.stringify({ success: false, error: 'Password must be at least 6 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userClient = createUserClient(authHeader)
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const service = createServiceClient()

    // Update auth password via admin API
    const { error: pwErr } = await service.auth.admin.updateUserById(user.id, {
      password: newPassword
    })
    if (pwErr) {
      console.error('Password update failed:', pwErr)
      return new Response(JSON.stringify({ success: false, error: 'Failed to update password' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Clear the first-login flag on profile
    const { error: updErr } = await service
      .from('user_profiles')
      .update({ require_password_change: false, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (updErr) {
      console.warn('Failed to clear require_password_change flag:', updErr)
      // Continue; not fatal for password change
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    })
  } catch (e) {
    console.error('self-update-password error:', e)
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
