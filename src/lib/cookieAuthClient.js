// src/lib/cookieAuthClient.js
// Client for cookie-based auth via Edge Functions. Holds only a short-lived access token in memory.

let accessToken = null
const tokenSubscribers = new Set()

function notifyTokenChange() {
  for (const cb of tokenSubscribers) {
    try { cb(accessToken) } catch (_) {}
  }
}

export function getAccessToken() {
  return accessToken
}

export function subscribeTokenChange(cb) {
  tokenSubscribers.add(cb)
  return () => tokenSubscribers.delete(cb)
}

export function setAccessToken(token) {
  accessToken = token || null
  notifyTokenChange()
}

function getFunctionsBaseUrl() {
  // 1) Explicit override (useful for local supabase serve)
  const explicit = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL
  if (explicit) return explicit.replace(/\/$/, '')

  // 2) Standard Vite env
  let supaUrl = import.meta.env.VITE_SUPABASE_URL || null

  // 3) Fallback to global (set by supabaseClient)
  if (!supaUrl && typeof window !== 'undefined' && window.supabaseUrl) {
    supaUrl = window.supabaseUrl
  }

  if (!supaUrl) {
    throw new Error('VITE_SUPABASE_URL not configured. Set VITE_SUPABASE_URL in .env or set VITE_SUPABASE_FUNCTIONS_URL to your functions endpoint (e.g., http://127.0.0.1:54321/functions/v1)')
  }

  const u = new URL(supaUrl)

  // 4) Cloud (supabase.co): map <project>.supabase.co -> <project>.functions.supabase.co
  if (u.hostname.endsWith('.supabase.co')) {
    const host = u.hostname.replace('.supabase.co', '.functions.supabase.co')
    return `${u.protocol}//${host}`
  }

  // 5) Local dev: default to Supabase CLI functions gateway
  //    If the URL points to localhost/127.0.0.1, assume CLI and use port 54321 + /functions/v1
  if (u.hostname === '127.0.0.1' || u.hostname === 'localhost') {
    const port = 54321
    const proto = u.protocol || 'http:'
    const host = `${u.hostname}:${port}`
    return `${proto}//${host}/functions/v1`
  }

  // 6) Fallback: use same origin + /functions/v1
  return `${u.protocol}//${u.host}/functions/v1`
}

async function call(fnName, { method = 'POST', body } = {}) {
  const base = getFunctionsBaseUrl()
  const url = `${base}/${fnName}`
  const headers = { 'Content-Type': 'application/json' }
  // Include Authorization for functions that optionally check it
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include', // to receive/send HttpOnly cookie
    mode: 'cors'
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.success === false) {
    const error = data?.error || `Request failed (${res.status})`
    return { success: false, error, status: res.status }
  }
  return { success: true, data }
}

export const cookieAuth = {
  async login(email, password) {
    const result = await call('auth-login', { method: 'POST', body: { email, password } })
    if (!result.success) return result
    const { access_token } = result.data
    setAccessToken(access_token)
    return { success: true, ...result.data }
  },
  async refresh() {
    const result = await call('auth-refresh', { method: 'POST' })
    if (!result.success) return result
    const { access_token } = result.data
    setAccessToken(access_token)
    return { success: true, ...result.data }
  },
  async logout() {
    const result = await call('auth-logout', { method: 'POST' })
    // Clear token regardless of server response to ensure local sign-out
    setAccessToken(null)
    if (!result.success) return result
    return { success: true }
  }
}
