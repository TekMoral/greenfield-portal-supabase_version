// supabase/functions/auth-login/index.ts
// Logs a user in using email/password and sets a Secure, HttpOnly refresh-token cookie.
// Returns a short-lived access token in the JSON body for in-memory use by the SPA.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getResponseCorsHeaders, handleCors } from '../_shared/cors-hardened.ts';
import { rateLimitCheck } from '../_shared/rate-limit.ts';
const REFRESH_COOKIE_NAME = 'sp_rt';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days
;
function buildCookie(name, value, maxAgeSeconds = COOKIE_MAX_AGE_SECONDS) {
  const secure = true;
  const sameSite = 'None';
  const path = '/';
  return [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${maxAgeSeconds}`,
    `Path=${path}`,
    'HttpOnly',
    secure ? 'Secure' : '',
    `SameSite=${sameSite}`,
    'Priority=High',
    'Partitioned'
  ].filter(Boolean).join('; ');
}
function deleteCookie(name) {
  return `${name}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=None; Partitioned`;
}
Deno.serve(async (req)=>{
  // Handle CORS preflight
  const corsPreflight = handleCors(req);
  if (corsPreflight) return corsPreflight;
  const corsHeaders = getResponseCorsHeaders(req);
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  // Rate limit (dual): per-IP first with higher threshold
  const RL_MAX = Number(Deno.env.get('RL_LOGIN_MAX') ?? '5');
  const RL_WIN = Number(Deno.env.get('RL_LOGIN_WINDOW_MS') ?? '60000');
  const RL_IP_MAX = Number(Deno.env.get('RL_LOGIN_IP_MAX') ?? String(Math.max(RL_MAX * 2, RL_MAX + 4)));
  try {
    const { result: ipResult } = await rateLimitCheck(req, {
      bucket: 'auth-login:ip',
      max: RL_IP_MAX,
      intervalMs: RL_WIN,
      identityType: 'ip'
    });
    if (!ipResult.allowed) {
      const headers = {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'RateLimit-Limit': String(ipResult.limit),
        'RateLimit-Remaining': String(ipResult.remaining),
        'RateLimit-Reset': String(Math.ceil(ipResult.resetMs / 1000)),
        'Retry-After': String(Math.ceil(ipResult.resetMs / 1000))
      };
      return new Response(JSON.stringify({
        success: false,
        error: 'Too many requests',
        code: 'rate_limited'
      }), {
        status: 429,
        headers
      });
    }
  } catch (_) {}
  try {
    const { email, password } = await req.json().catch(()=>({
        email: null,
        password: null
      }));
    if (!email || !password) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email and password are required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Per-email rate limit (protect individual accounts on shared IPs)
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') || '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const normalizedEmail = String(email).trim().toLowerCase();
      const { data: rlEmail, error: rlEmailErr } = await supabaseAdmin
        .rpc('rpc_rate_limit_check', {
          p_bucket: 'auth-login:email',
          p_identity: normalizedEmail,
          p_max: RL_MAX,
          p_interval_ms: RL_WIN,
        })
        .single();
      if (!rlEmailErr) {
        const allowed = Boolean((rlEmail as any)?.allowed);
        if (!allowed) {
          const limit = Number((rlEmail as any)?.limit ?? RL_MAX);
          const remaining = Number((rlEmail as any)?.remaining ?? 0);
          const resetMs = Number((rlEmail as any)?.reset_ms ?? RL_WIN);
          const resetSec = Math.ceil(resetMs / 1000);
          return new Response(JSON.stringify({ success: false, error: 'Too many requests', code: 'rate_limited' }), {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'RateLimit-Limit': String(limit),
              'RateLimit-Remaining': String(remaining),
              'RateLimit-Reset': String(resetSec),
              'Retry-After': String(resetSec)
            }
          });
        }
      } else {
        // Fail-open on RPC error to avoid login lockouts; log for investigation
        console.error('Login email rate limit RPC error:', rlEmailErr);
      }
    } catch (e) {
      console.error('Login email rate limit error:', e);
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_ANON_KEY') || '', {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error || !data?.session) {
      return new Response(JSON.stringify({
        success: false,
        error: error?.message || 'Invalid credentials'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { session, user } = data;
    // Set HttpOnly refresh token cookie
    const setCookieHeader = buildCookie(REFRESH_COOKIE_NAME, session.refresh_token);
    const body = {
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      access_token: session.access_token,
      expires_in: session.expires_in,
      token_type: session.token_type
    };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Set-Cookie': setCookieHeader,
        // Extra hardening
        'Cache-Control': 'no-store'
      }
    });
  } catch (e) {
    console.error('auth-login error', e);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...getResponseCorsHeaders(req),
        'Content-Type': 'application/json'
      }
    });
  }
});
