// supabase/functions/auth-refresh/index.ts
// Reads the Secure HttpOnly refresh cookie and returns a fresh access token.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getResponseCorsHeaders, handleCors } from '../_shared/cors-hardened.ts'

const REFRESH_COOKIE_NAME = 'sp_rt'

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.get('cookie') || ''
  const pairs = header.split(';').map(p => p.trim()).filter(Boolean)
  const out: Record<string, string> = {}
  for (const p of pairs) {
    const idx = p.indexOf('=')
    if (idx > -1) {
      const k = p.substring(0, idx)
      const v = decodeURIComponent(p.substring(idx + 1))
      out[k] = v
    }
  }
  return out
}

Deno.serve(async (req: Request) => {
  const pre = handleCors(req)
  if (pre) return pre

  const corsHeaders = getResponseCorsHeaders(req)

  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const cookies = parseCookies(req)
    const refreshToken = cookies[REFRESH_COOKIE_NAME]
    if (!refreshToken) {
      return new Response(JSON.stringify({ success: false, error: 'No refresh token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })
    if (error || !data?.session) {
      return new Response(JSON.stringify({ success: false, error: error?.message || 'Invalid refresh token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Optionally rotate refresh token and set new cookie when provided by Supabase
    const setCookieHeaders: string[] = []
    if (data.session.refresh_token) {
      setCookieHeaders.push(`sp_rt=${encodeURIComponent(data.session.refresh_token)}; Max-Age=${60 * 60 * 24 * 30}; Path=/; HttpOnly; Secure; SameSite=None; Priority=High; Partitioned`)
    }

    const { session, user } = data
    return new Response(JSON.stringify({
      success: true,
      user: { id: user?.id, email: user?.email },
      access_token: session.access_token,
      expires_in: session.expires_in,
      token_type: session.token_type,
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        ...(setCookieHeaders.length ? { 'Set-Cookie': setCookieHeaders.join(', ') } : {}),
        'Cache-Control': 'no-store',
      }
    })
  } catch (e) {
    console.error('auth-refresh error', e)
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
