// supabase/functions/auth-login/index.ts
// Logs a user in using email/password and sets a Secure, HttpOnly refresh-token cookie.
// Returns a short-lived access token in the JSON body for in-memory use by the SPA.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getResponseCorsHeaders, handleCors } from '../_shared/cors-hardened.ts'

const REFRESH_COOKIE_NAME = 'sp_rt'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

function buildCookie(name: string, value: string, maxAgeSeconds = COOKIE_MAX_AGE_SECONDS) {
  const secure = true
  const sameSite = 'None'
  const path = '/'

  return [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${maxAgeSeconds}`,
    `Path=${path}`,
    'HttpOnly',
    secure ? 'Secure' : '',
    `SameSite=${sameSite}`,
    'Priority=High',
    'Partitioned',
  ].filter(Boolean).join('; ')
}

function deleteCookie(name: string) {
  return `${name}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=None; Partitioned`;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const corsPreflight = handleCors(req)
  if (corsPreflight) return corsPreflight

  const corsHeaders = getResponseCorsHeaders(req)

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const { email, password } = await req.json().catch(() => ({ email: null, password: null }))
    if (!email || !password) {
      return new Response(JSON.stringify({ success: false, error: 'Email and password are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data?.session) {
      return new Response(JSON.stringify({ success: false, error: error?.message || 'Invalid credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { session, user } = data

    // Set HttpOnly refresh token cookie
    const setCookieHeader = buildCookie(REFRESH_COOKIE_NAME, session.refresh_token!)

    const body = {
      success: true,
      user: { id: user.id, email: user.email },
      access_token: session.access_token,
      expires_in: session.expires_in,
      token_type: session.token_type,
    }

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Set-Cookie': setCookieHeader,
        // Extra hardening
        'Cache-Control': 'no-store',
      }
    })
  } catch (e) {
    console.error('auth-login error', e)
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { ...getResponseCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  }
})
