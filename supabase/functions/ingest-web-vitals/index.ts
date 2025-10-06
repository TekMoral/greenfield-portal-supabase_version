import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

// Minimal payload expected from the frontend reporter in src/main.jsx
interface WebVitalPayload {
  name: 'CLS' | 'INP' | 'LCP' | string
  value: number
  id: string
  delta?: number
  rating?: 'good' | 'needs-improvement' | 'poor' | string
  page?: string
  ts?: number // epoch ms
  ua?: string
}

function getClientIp(req: Request): string {
  const xf = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
  const ip = xf.split(',')[0].trim()
  return ip || 'unknown'
}

function isValidPayload(p: any): p is WebVitalPayload {
  if (!p || typeof p !== 'object') return false
  if (typeof p.name !== 'string') return false
  if (typeof p.value !== 'number' || Number.isNaN(p.value)) return false
  if (typeof p.id !== 'string') return false
  // Optional fields are lenient
  return true
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCors(req)
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return new Response(JSON.stringify({ error: 'Unsupported Media Type' }), {
        status: 415,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload = (await req.json().catch(() => null)) as unknown

    if (!isValidPayload(payload)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Prepare values
    const ip = getClientIp(req)
    const page = typeof payload.page === 'string' ? payload.page.slice(0, 512) : ''
    const identity = `${ip}|${page}` // simple identity; can be customized later

    // Supabase client (service role)
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Rate limit: default 60/min per identity; configurable via env
    const max = parseInt(Deno.env.get('WEB_VITALS_RL_MAX') ?? '60', 10)
    const windowMs = parseInt(Deno.env.get('WEB_VITALS_RL_WINDOW_MS') ?? '60000', 10)

    const { data: rl, error: rlError } = await supabase.rpc('rpc_rate_limit_check', {
      p_bucket: 'web_vitals',
      p_identity: identity,
      p_max: max,
      p_interval_ms: windowMs,
    })

    if (rlError) {
      // On rate-limit infra failure, do not take down ingestion; respond 202 Accepted
      return new Response(null, { status: 202, headers: corsHeaders })
    }

    if (rl && rl.allowed === false) {
      const headers: HeadersInit = { ...corsHeaders, 'Retry-After': String(Math.ceil((rl.reset_ms || 1000) / 1000)) }
      return new Response(null, { status: 429, headers })
    }

    // Insert row
    const createdAt = new Date().toISOString()
    const tsMs = typeof payload.ts === 'number' ? payload.ts : Date.now()
    const tsIso = new Date(tsMs).toISOString()

    const insertRow = {
      metric_name: String(payload.name).slice(0, 32),
      value: Number(payload.value),
      delta: typeof payload.delta === 'number' ? payload.delta : null,
      rating: payload.rating ? String(payload.rating).slice(0, 32) : null,
      path: page,
      metric_id: String(payload.id).slice(0, 64),
      ua: typeof payload.ua === 'string' ? payload.ua.slice(0, 1024) : null,
      ip: ip.slice(0, 64),
      ts: tsIso,
      created_at: createdAt,
      env: Deno.env.get('ENVIRONMENT') || 'development',
      raw: payload as Record<string, unknown>,
    }

    const { error: insertError } = await supabase.from('web_vitals').insert(insertRow)

    if (insertError) {
      // Avoid leaking details; accept but do not error to client
      return new Response(null, { status: 202, headers: corsHeaders })
    }

    // Successful ingest; keep response minimal
    return new Response(null, { status: 204, headers: corsHeaders })
  } catch (err) {
    // Defensive: never expose details; respond 202 to avoid retry storms by browsers
    console.error('ingest-web-vitals error:', err)
    return new Response(null, { status: 202, headers: corsHeaders })
  }
})
