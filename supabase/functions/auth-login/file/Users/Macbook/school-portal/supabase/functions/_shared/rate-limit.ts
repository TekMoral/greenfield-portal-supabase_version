// supabase/functions/_shared/rate-limit.ts
// Shared rate limiting utilities for Supabase Edge Functions (Deno runtime)
// - Supports Upstash Redis REST API when configured via env
// - Falls back to an in-memory limiter (per instance, best-effort) if Redis is not configured
// - Exposes: getIdentity, rateLimitCheck, withRateLimit
// Types
// Env
const UPSTASH_URL = Deno.env.get('UPSTASH_REDIS_REST_URL') || '';
const UPSTASH_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || '';
const DEBUG_RL = (()=>{
  const v = (Deno.env.get('DEBUG_RATE_LIMIT') || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
})();
const FAIL_CLOSED = (()=>{
  const v = (Deno.env.get('RL_FAIL_CLOSED') || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
})();
const BACKEND = UPSTASH_URL && UPSTASH_TOKEN ? 'upstash' : 'memory';
// Base64Url decode (for JWT payload parsing only; no signature verification here)
function base64UrlDecode(input) {
  const pad = 4 - input.length % 4;
  const normalized = (input + (pad < 4 ? '='.repeat(pad) : '')).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized);
  try {
    // handle UTF-8
    const bytes = Uint8Array.from(binary, (c)=>c.charCodeAt(0));
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
  } catch  {
    return binary;
  }
}
function extractUserIdFromAuthHeader(authHeader) {
  if (!authHeader) return undefined;
  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return undefined;
  const token = parts[1];
  const segs = token.split('.');
  if (segs.length < 2) return undefined;
  try {
    const payload = JSON.parse(base64UrlDecode(segs[1]));
    const sub = payload?.sub || payload?.user_id || payload?.uid;
    if (typeof sub === 'string' && sub.length > 0) return sub;
  } catch (_) {
  // ignore decoding errors
  }
  return undefined;
}
// Identity helper
export function getIdentity(req) {
  const auth = req.headers.get('authorization');
  const userId = extractUserIdFromAuthHeader(auth);
  // Try common proxy headers for IP in order of reliability
  let ip;
  // Forwarded: for=ip; proto=https; host=...
  const forwarded = req.headers.get('forwarded') || '';
  const m = forwarded.match(/for=\"?([^;,"]+)/i);
  if (m && m[1]) {
    ip = m[1].replace(/^\[|\]$/g, ''); // strip brackets for IPv6
  }
  // Cloudflare / proxies
  if (!ip) ip = req.headers.get('cf-connecting-ip') || undefined;
  if (!ip) ip = req.headers.get('x-real-ip') || undefined;
  // X-Forwarded-For may contain comma-separated list; use the first
  if (!ip) {
    const xff = req.headers.get('x-forwarded-for') || '';
    const first = (xff.split(',')[0] || '').trim();
    if (first) ip = first;
  }
  // Some providers set x-client-ip
  if (!ip) ip = req.headers.get('x-client-ip') || undefined;
  const key = userId ? `user:${userId}` : ip ? `ip:${ip}` : 'ip:unknown';
  return {
    userId,
    ip,
    key
  };
}
// Upstash Redis backend via REST API using pipeline(INCR, EXPIRE NX, PTTL)
class UpstashBackend {
  url;
  token;
  constructor(url, token){
    this.url = url.replace(/\/$/, '');
    this.token = token;
  }
  async check(key, max, intervalMs) {
    const windowSeconds = Math.ceil(intervalMs / 1000);
    const pipelineBody = {
      commands: [
        [
          "INCR",
          key
        ],
        [
          "EXPIRE",
          key,
          windowSeconds,
          "NX"
        ],
        [
          "PTTL",
          key
        ]
      ]
    };
    let res;
    try {
      res = await fetch(`${this.url}/pipeline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pipelineBody)
      });
    } catch (e) {
      try {
        if (DEBUG_RL) console.error('[rate-limit] Upstash fetch error:', e?.message || e);
      } catch (_) {}
      const allowed = !FAIL_CLOSED;
      return {
        allowed,
        remaining: allowed ? Math.max(0, max - 1) : 0,
        limit: max,
        resetMs: intervalMs
      };
    }
    if (!res.ok) {
      let body = '';
      try {
        body = await res.text();
      } catch (_) {}
      try {
        if (DEBUG_RL) console.error(`[rate-limit] Upstash non-OK ${res.status} ${res.statusText} body=${String(body).slice(0, 200)}`);
      } catch (_) {}
      const allowed = !FAIL_CLOSED;
      return {
        allowed,
        remaining: allowed ? Math.max(0, max - 1) : 0,
        limit: max,
        resetMs: intervalMs
      };
    }
    let data;
    try {
      data = await res.json();
    } catch (e) {
      try {
        if (DEBUG_RL) console.error('[rate-limit] Upstash JSON parse error:', e?.message || e);
      } catch (_) {}
      const allowed = !FAIL_CLOSED;
      return {
        allowed,
        remaining: allowed ? Math.max(0, max - 1) : 0,
        limit: max,
        resetMs: intervalMs
      };
    }
    // data is array of results: [[1, value], [1, success], [1, pttl]] form depending on Upstash
    // Upstash returns array of { result, error } or raw JSON array depending on plan; handle both.
    let current = 0;
    let pttl = intervalMs;
    const resultArray = Array.isArray(data) ? data : data?.results || [];
    if (Array.isArray(resultArray)) {
      // First command (INCR)
      const incrRes = resultArray[0];
      const incrVal = Array.isArray(incrRes) ? incrRes[1] : incrRes?.result ?? incrRes;
      current = Number(incrVal) || 0;
      // Third command (PTTL)
      const pttlRes = resultArray[2];
      const pttlVal = Array.isArray(pttlRes) ? pttlRes[1] : pttlRes?.result ?? pttlRes;
      const v = Number(pttlVal);
      pttl = Number.isFinite(v) && v >= 0 ? v : intervalMs; // ms remaining
    }
    const allowed = current <= max;
    const remaining = Math.max(0, max - current);
    const resetMs = pttl;
    return {
      allowed,
      remaining,
      limit: max,
      resetMs
    };
  }
}
// In-memory fallback backend (per instance)
class MemoryBackend {
  store;
  constructor(){
    this.store = new Map();
  }
  async check(key, max, intervalMs) {
    const now = Date.now();
    const rec = this.store.get(key);
    if (!rec || now >= rec.resetAt) {
      const resetAt = now + intervalMs;
      this.store.set(key, {
        count: 1,
        resetAt
      });
      return {
        allowed: true,
        remaining: Math.max(0, max - 1),
        limit: max,
        resetMs: intervalMs
      };
    }
    rec.count += 1;
    const allowed = rec.count <= max;
    const remaining = Math.max(0, max - rec.count);
    const resetMs = Math.max(0, rec.resetAt - now);
    return {
      allowed,
      remaining,
      limit: max,
      resetMs
    };
  }
}
function getBackend() {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      if (DEBUG_RL) {
        let origin = '';
        try {
          origin = new URL(UPSTASH_URL).origin;
        } catch  {
          origin = (UPSTASH_URL || '').replace(/(?<=.{12}).+/, '…');
        }
        // eslint-disable-next-line no-console
        console.log(`[rate-limit] Using Upstash backend (${origin})`);
      }
    } catch (_) {}
    return new UpstashBackend(UPSTASH_URL, UPSTASH_TOKEN);
  }
  // eslint-disable-next-line no-console
  console.warn('[rate-limit] Using in-memory limiter (no Upstash env configured).');
  return new MemoryBackend();
}
const backend = getBackend();
// Core check function
export async function rateLimitCheck(req, opts) {
  const identity = getIdentity(req);
  const which = opts.identityType || 'auto';
  const idKey = which === 'user' ? identity.userId : which === 'ip' ? identity.ip : identity.userId || identity.ip;
  const identityKey = idKey ? String(idKey) : 'unknown';
  const storageKey = `rl:${opts.bucket}:${identityKey}`;
  const result = await backend.check(storageKey, opts.max, opts.intervalMs);
  try {
    if (DEBUG_RL) {
      // eslint-disable-next-line no-console
      console.log(`[rate-limit] bucket=${opts.bucket} key=${identity.key} idType=${opts.identityType || 'auto'} max=${opts.max} winMs=${opts.intervalMs} -> allowed=${result.allowed} remaining=${result.remaining} resetMs=${result.resetMs}`);
    }
  } catch (_) {}
  return {
    result,
    identity
  };
}
// Header helpers
function applyRateLimitHeaders(h, r) {
  const resetSeconds = Math.ceil(r.resetMs / 1000);
  h.set('RateLimit-Limit', String(r.limit));
  h.set('RateLimit-Remaining', String(r.remaining));
  h.set('RateLimit-Reset', String(resetSeconds));
  h.set('X-RateLimit-Backend', BACKEND);
  if (!r.allowed) {
    h.set('Retry-After', String(resetSeconds));
  }
}
// Wrapper for functions
export function withRateLimit(opts, handler) {
  return async (req, ctx)=>{
    const { result, identity } = await rateLimitCheck(req, opts);
    if (!result.allowed) {
      try {
        if (DEBUG_RL) {
          // eslint-disable-next-line no-console
          console.warn(`[rate-limit] BLOCKED bucket=${opts.bucket} key=${identity.key} remaining=${result.remaining} reset=${Math.ceil(result.resetMs / 1000)}s`);
        }
      } catch (_) {}
      const headers = new Headers({
        'Content-Type': 'application/json'
      });
      applyRateLimitHeaders(headers, result);
      const body = JSON.stringify({
        success: false,
        error: 'Too many requests',
        code: 'rate_limited',
        limit: result.limit,
        remaining: result.remaining,
        reset: Math.ceil(result.resetMs / 1000)
      });
      return new Response(body, {
        status: 429,
        headers
      });
    }
    const res = await handler(req, ctx);
    try {
      // Clone headers and set rate limit headers on success path as hints
      const headers = new Headers(res.headers);
      applyRateLimitHeaders(headers, result);
      try {
        if (DEBUG_RL) {
          // eslint-disable-next-line no-console
          console.log(`[rate-limit] ALLOWED bucket=${opts.bucket} key=${identity.key} remaining=${result.remaining} reset=${Math.ceil(result.resetMs / 1000)}s`);
        }
      } catch (_) {}
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers
      });
    } catch (_) {
      return res;
    }
  };
}
