// supabase/functions/_shared/rate-limit.ts
// Shared rate limiting utilities for Supabase Edge Functions (Deno runtime)
// - Primary backend: Postgres RPC (distributed, consistent)
// - Fallback: in-memory limiter (per instance, best-effort)
// - Exposes: getIdentity, rateLimitCheck, withRateLimit

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Types
export type RateLimitResult = {
  allowed: boolean
  remaining: number
  limit: number
  resetMs: number // milliseconds until window reset
}

export type RateLimitOptions = {
  bucket: string // logical bucket e.g., 'auth-login', 'reset-password'
  max: number // max requests per window
  intervalMs: number // window length in ms
  identityType?: 'auto' | 'user' | 'ip' // default 'auto' => use user id if present else IP
}

export type Identity = {
  userId?: string
  ip?: string
  key: string // derived identity key used in storage/logs
}

// Env
const DEBUG_RL = (() => {
  const v = (Deno.env.get('DEBUG_RATE_LIMIT') || '').toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
})()
const FAIL_CLOSED = (() => {
  const v = (Deno.env.get('RL_FAIL_CLOSED') || '').toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
})()
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const HAS_PG = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
const BACKEND = HAS_PG ? ('postgres' as const) : ('memory' as const)

// Base64Url decode (for JWT payload parsing only; no signature verification here)
function base64UrlDecode(input: string): string {
  const pad = 4 - (input.length % 4)
  const normalized = (input + (pad < 4 ? '='.repeat(pad) : '')).replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(normalized)
  try {
    // handle UTF-8
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    const decoder = new TextDecoder('utf-8')
    return decoder.decode(bytes)
  } catch {
    return binary
  }
}

function extractUserIdFromAuthHeader(authHeader?: string | null): string | undefined {
  if (!authHeader) return undefined
  const parts = authHeader.trim().split(/\s+/)
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return undefined
  const token = parts[1]
  const segs = token.split('.')
  if (segs.length < 2) return undefined
  try {
    const payload = JSON.parse(base64UrlDecode(segs[1]))
    const sub = (payload as any)?.sub || (payload as any)?.user_id || (payload as any)?.uid
    if (typeof sub === 'string' && sub.length > 0) return sub
  } catch (_) {
    // ignore decoding errors
  }
  return undefined
}

// Identity helper
export function getIdentity(req: Request): Identity {
  const auth = req.headers.get('authorization')
  const userId = extractUserIdFromAuthHeader(auth)

  // Try common proxy headers for IP in order of reliability
  let ip: string | undefined

  // Forwarded: for=ip; proto=https; host=...
  const forwarded = req.headers.get('forwarded') || ''
  const m = forwarded.match(/for=\"?([^;,\"]+)/i)
  if (m && m[1]) {
    ip = m[1].replace(/^\[|\]$/g, '') // strip brackets for IPv6
  }

  // Cloudflare / proxies
  if (!ip) ip = req.headers.get('cf-connecting-ip') || undefined
  if (!ip) ip = req.headers.get('x-real-ip') || undefined
  // Supabase (Fly.io) client IP header
  if (!ip) ip = req.headers.get('fly-client-ip') || undefined

  // X-Forwarded-For may contain comma-separated list; use the first
  if (!ip) {
    const xff = req.headers.get('x-forwarded-for') || ''
    const first = (xff.split(',')[0] || '').trim()
    if (first) ip = first
  }

  // Some providers set x-client-ip
  if (!ip) ip = req.headers.get('x-client-ip') || undefined

  const key = userId ? `user:${userId}` : ip ? `ip:${ip}` : 'ip:unknown'
  return { userId, ip, key }
}

// Storage adapters
interface LimiterBackend {
  check(bucket: string, identityKey: string, max: number, intervalMs: number): Promise<RateLimitResult>
}

// Postgres-backed backend via RPC
class PostgresBackend implements LimiterBackend {
  private supabase
  constructor(url: string, serviceRoleKey: string) {
    this.supabase = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  async check(bucket: string, identityKey: string, max: number, intervalMs: number): Promise<RateLimitResult> {
    try {
      const { data, error } = await this.supabase
        .rpc('rpc_rate_limit_check', {
          p_bucket: bucket,
          p_identity: identityKey || 'unknown',
          p_max: max,
          p_interval_ms: intervalMs,
        })
        .single()
      if (error) throw error
      const allowed = Boolean((data as any)?.allowed)
      const remaining = Number((data as any)?.remaining ?? 0)
      const limit = Number((data as any)?.limit ?? max)
      const resetMs = Number((data as any)?.reset_ms ?? intervalMs)
      return { allowed, remaining, limit, resetMs }
    } catch (e) {
      try {
        if (DEBUG_RL) console.error('[rate-limit] Postgres RPC error:', (e as any)?.message || e)
      } catch (_) {}
      const allowed = !FAIL_CLOSED
      return { allowed, remaining: allowed ? Math.max(0, max - 1) : 0, limit: max, resetMs: intervalMs }
    }
  }
}

// In-memory fallback backend (per instance)
class MemoryBackend implements LimiterBackend {
  private store: Map<string, { count: number; resetAt: number }>
  constructor() {
    this.store = new Map()
  }
  async check(bucket: string, identityKey: string, max: number, intervalMs: number): Promise<RateLimitResult> {
    const now = Date.now()
    const key = `${bucket}:${identityKey || 'unknown'}`
    const rec = this.store.get(key)
    if (!rec || now >= rec.resetAt) {
      const resetAt = now + intervalMs
      this.store.set(key, { count: 1, resetAt })
      return { allowed: true, remaining: Math.max(0, max - 1), limit: max, resetMs: intervalMs }
    }
    rec.count += 1
    const allowed = rec.count <= max
    const remaining = Math.max(0, max - rec.count)
    const resetMs = Math.max(0, rec.resetAt - now)
    return { allowed, remaining, limit: max, resetMs }
  }
}

function getBackend(): LimiterBackend {
  if (HAS_PG) {
    try {
      if (DEBUG_RL) console.log('[rate-limit] Using Postgres backend (RPC)')
    } catch (_) {}
    return new PostgresBackend(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  }
  try {
    console.warn('[rate-limit] Using in-memory limiter (no Postgres service role configured).')
  } catch (_) {}
  return new MemoryBackend()
}

const backend = getBackend()

// Core check function
export async function rateLimitCheck(
  req: Request,
  opts: RateLimitOptions,
): Promise<{ result: RateLimitResult; identity: Identity }> {
  const identity = getIdentity(req)
  const which = opts.identityType || 'auto'
  const idKey = which === 'user' ? identity.userId : which === 'ip' ? identity.ip : identity.userId || identity.ip
  const identityKey = idKey ? String(idKey) : 'unknown'
  const result = await backend.check(opts.bucket, identityKey, opts.max, opts.intervalMs)
  try {
    if (DEBUG_RL) {
      // eslint-disable-next-line no-console
      console.log(
        `[rate-limit] bucket=${opts.bucket} key=${identity.key} idType=${opts.identityType || 'auto'} max=${opts.max} winMs=${opts.intervalMs} -> allowed=${result.allowed} remaining=${result.remaining} resetMs=${result.resetMs}`,
      )
    }
  } catch (_) {}
  return { result, identity }
}

// Header helpers
function applyRateLimitHeaders(h: Headers, r: RateLimitResult) {
  const resetSeconds = Math.ceil(r.resetMs / 1000)
  h.set('RateLimit-Limit', String(r.limit))
  h.set('RateLimit-Remaining', String(r.remaining))
  h.set('RateLimit-Reset', String(resetSeconds))
  h.set('X-RateLimit-Backend', BACKEND)
  if (!r.allowed) {
    h.set('Retry-After', String(resetSeconds))
  }
}

// Wrapper for functions
export function withRateLimit(
  opts: RateLimitOptions,
  handler: (req: Request, ctx: unknown) => Promise<Response> | Response,
) {
  return async (req: Request, ctx: unknown) => {
    const { result, identity } = await rateLimitCheck(req, opts)
    if (!result.allowed) {
      try {
        if (DEBUG_RL) {
          // eslint-disable-next-line no-console
          console.warn(
            `[rate-limit] BLOCKED bucket=${opts.bucket} key=${identity.key} remaining=${result.remaining} reset=${Math.ceil(result.resetMs / 1000)}s`,
          )
        }
      } catch (_) {}
      const headers = new Headers({ 'Content-Type': 'application/json' })
      applyRateLimitHeaders(headers, result)
      const body = JSON.stringify({
        success: false,
        error: 'Too many requests',
        code: 'rate_limited',
        limit: result.limit,
        remaining: result.remaining,
        reset: Math.ceil(result.resetMs / 1000),
      })
      return new Response(body, { status: 429, headers })
    }

    const res = await handler(req, ctx)
    try {
      // Clone headers and set rate limit headers on success path as hints
      const headers = new Headers(res.headers)
      applyRateLimitHeaders(headers, result)
      try {
        if (DEBUG_RL) {
          // eslint-disable-next-line no-console
          console.log(
            `[rate-limit] ALLOWED bucket=${opts.bucket} key=${identity.key} remaining=${result.remaining} reset=${Math.ceil(result.resetMs / 1000)}s`,
          )
        }
      } catch (_) {}
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
    } catch (_) {
      return res
    }
  }
}
