// supabase/functions/auth-logout/index.ts
// Clears the Secure, HttpOnly refresh cookie and attempts to revoke the refresh token.

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

function deleteCookie(name: string) {
  return `${name}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=None; Partitioned`;
}

Deno.serve(async (req: Request) => {
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
    const cookies = parseCookies(req)
    const refreshToken = cookies[REFRESH_COOKIE_NAME]

    // Attempt to revoke refresh token using service role if available
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    // Note: supabase-js does not expose a public API to revoke a specific refresh token.
    // We simply clear the cookie; server-side revocation (global sign-out) can be implemented separately if needed.

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Set-Cookie': deleteCookie(REFRESH_COOKIE_NAME),
        'Cache-Control': 'no-store',
      }
    })
  } catch (e) {
    console.error('auth-logout error', e)
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
