import React, { useState, useEffect } from 'react'
import { supabase, supabaseConfig, getUserProfile as getUserProfileHelper } from '../../lib/supabaseClient'
import { useAuth } from '../../hooks/useAuth'

// Safe base64url decoder
function b64urlDecode(str) {
  try {
    const pad = '='.repeat((4 - (str.length % 4)) % 4)
    const base64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(base64)
    try {
      return decodeURIComponent(
        decoded.split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      )
    } catch {
      return decoded
    }
  } catch (e) {
    return null
  }
}

function decodeJwt(token) {
  if (!token || typeof token !== 'string' || token.split('.').length !== 3) return null
  const [h, p] = token.split('.')
  try {
    const header = JSON.parse(b64urlDecode(h) || '{}')
    const payload = JSON.parse(b64urlDecode(p) || '{}')
    const expSec = payload?.exp
    const nowMs = Date.now()
    const expMs = typeof expSec === 'number' ? expSec * 1000 : null
    const skewMs = expMs ? expMs - nowMs : null
    return {
      header,
      payload,
      expMs,
      expISO: expMs ? new Date(expMs).toISOString() : null,
      nowISO: new Date(nowMs).toISOString(),
      skewMs,
      isExpired: typeof expMs === 'number' ? nowMs >= expMs : null,
    }
  } catch {
    return null
  }
}

const pretty = (obj) => JSON.stringify(obj, null, 2)

async function withTimeout(promise, ms, label) {
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms)
  })
  try {
    const result = await Promise.race([promise, timeout])
    return result
  } finally {
    clearTimeout(timeoutId)
  }
}

const AuthSessionDebug = () => {
  const [sessionData, setSessionData] = useState(null)
  const [userFromAuth, setUserFromAuth] = useState(null)
  const [directProfileTest, setDirectProfileTest] = useState(null)
  const [helperProfileTest, setHelperProfileTest] = useState(null)
  const [jwtInfo, setJwtInfo] = useState(null)
  const [storageInfo, setStorageInfo] = useState(null)
  const [rlsProbe, setRlsProbe] = useState(null)

  const [runLoading, setRunLoading] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [refreshLoading, setRefreshLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(false)
  const [step, setStep] = useState('idle')
  const [lastError, setLastError] = useState(null)

  const auth = useAuth()

  const readStorage = () => {
    const keys = []
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key) continue
        if (key.includes('supabase') || key.includes('sb') || key === 'sb-auth-token') {
          let value = null
          try { value = localStorage.getItem(key) } catch { /* ignore */ }
          keys.push({ key, sample: value ? value.slice(0, 120) + (value.length > 120 ? '…' : '') : null })
        }
      }
    } catch (e) {
      // ignore
    }

    let sbAuthToken = null
    try {
      const raw = localStorage.getItem('sb-auth-token')
      sbAuthToken = raw ? JSON.parse(raw) : null
    } catch {
      // ignore
    }

    setStorageInfo({ keys, sbAuthToken })
  }

  const runDiagnostics = async () => {
    setRunLoading(true)
    setLastError(null)
    try {
      // Session
      setStep('getSession')
      const sessRes = await withTimeout(supabase.auth.getSession(), 4000, 'getSession')
      const session = sessRes?.data?.session
      const sessionError = sessRes?.error
      setSessionData({ session, sessionError })

      // JWT decode
      const accessToken = session?.access_token
      setJwtInfo(decodeJwt(accessToken))

      // User
      setStep('getUser')
      const userRes = await withTimeout(supabase.auth.getUser(), 4000, 'getUser')
      const user = userRes?.data?.user
      const userError = userRes?.error
      setUserFromAuth({ user, userError })

      // Storage
      setStep('readStorage')
      readStorage()

      // Direct profile
      if (user) {
        setStep('directProfile')
        try {
          const d = await withTimeout(
            supabase
              .from('user_profiles')
              .select('id, email, role, status, is_active, full_name')
              .eq('id', user.id)
              .single(),
            4000,
            'directProfile'
          )
          const profile = d?.data
          const profileError = d?.error
          const computedActive = ((profile?.status ?? 'active') === 'active') && (profile?.is_active !== false)
          setDirectProfileTest({ profile, profileError, computedActive })
        } catch (err) {
          setDirectProfileTest({ profile: null, profileError: err?.message || String(err), computedActive: null })
        }

        // Helper profile
        setStep('helperProfile')
        try {
          const helperProfile = await withTimeout(getUserProfileHelper(user.id), 4000, 'helperProfile')
          const computedActive2 = ((helperProfile?.status ?? 'active') === 'active') && (helperProfile?.is_active !== false)
          setHelperProfileTest({ profile: helperProfile, computedActive: computedActive2 })
        } catch (err) {
          setHelperProfileTest({ profile: null, error: err?.message || String(err) })
        }

        // RLS probe
        setStep('rlsProbe')
        try {
          const p = await withTimeout(
            supabase
              .from('user_profiles')
              .select('id', { count: 'exact', head: true })
              .eq('id', user.id),
            4000,
            'rlsProbe'
          )
          setRlsProbe({ permitted: !p?.error, error: p?.error })
        } catch (err) {
          setRlsProbe({ permitted: false, error: err?.message || String(err) })
        }
      }

      setStep('done')
    } catch (error) {
      setLastError(error?.message || String(error))
      setStep('error')
      console.error('Diagnostics failed:', error)
    } finally {
      setRunLoading(false)
    }
  }

  const testLogin = async () => {
    setLoginLoading(true)
    setLastError(null)
    try {
      const email = prompt('Enter email for test login:', auth?.user?.email || '')
      const password = email ? prompt('Enter password for test login:') : null
      if (!email || !password) return

      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email: email.trim(), password }),
        8000,
        'signInWithPassword'
      )
      console.log('Login test result:', { data, error })
      setTimeout(runDiagnostics, 800)
    } catch (error) {
      setLastError(error?.message || String(error))
      console.error('Login test failed:', error)
    } finally {
      setLoginLoading(false)
    }
  }

  const forceRefreshSession = async () => {
    setRefreshLoading(true)
    setLastError(null)
    try {
      const { data, error } = await withTimeout(supabase.auth.refreshSession(), 6000, 'refreshSession')
      console.log('RefreshSession:', { data, error })
      setTimeout(runDiagnostics, 500)
    } catch (e) {
      setLastError(e?.message || String(e))
    } finally {
      setRefreshLoading(false)
    }
  }

  const forceContextFetchProfile = async () => {
    setFetchLoading(true)
    setLastError(null)
    try {
      if (auth?.user?.id && typeof auth.fetchUserProfile === 'function') {
        await withTimeout(auth.fetchUserProfile(auth.user.id), 6000, 'fetchUserProfile(Context)')
        setTimeout(runDiagnostics, 500)
      }
    } catch (e) {
      setLastError(e?.message || String(e))
      console.error('Context fetch failed:', e)
    } finally {
      setFetchLoading(false)
    }
  }

  const resetLoading = () => {
    setRunLoading(false)
    setLoginLoading(false)
    setRefreshLoading(false)
    setFetchLoading(false)
    setStep('idle')
  }

  useEffect(() => {
    runDiagnostics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔍 Authentication Session Debug</h1>

      <div className="flex flex-wrap gap-3 mb-2 items-center">
        <button onClick={runDiagnostics} disabled={runLoading} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{runLoading ? 'Running…' : 'Run Diagnostics'}</button>
        <button onClick={testLogin} disabled={loginLoading} className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-50">{loginLoading ? 'Logging in…' : 'Test Login'}</button>
        <button onClick={forceRefreshSession} disabled={refreshLoading} className="px-3 py-2 bg-amber-600 text-white rounded disabled:opacity-50">{refreshLoading ? 'Refreshing…' : 'Force Refresh Session'}</button>
        <button onClick={forceContextFetchProfile} disabled={fetchLoading || !auth?.user?.id} className="px-3 py-2 bg-purple-600 text-white rounded disabled:opacity-50">{fetchLoading ? 'Fetching��' : 'Fetch Profile (Context)'}</button>
        <button onClick={resetLoading} className="px-3 py-2 bg-gray-600 text-white rounded">Reset Loading</button>
      </div>

      <div className="text-sm text-gray-700 mb-4">Current step: <span className="font-mono">{step}</span>{lastError ? <span className="text-red-600 ml-2">Error: {lastError}</span> : null}</div>

      {/* Auth Context State */}
      <div className="bg-gray-100 p-4 rounded mb-6">
        <h2 className="text-lg font-semibold mb-2">🎯 Auth Context State</h2>
        <pre className="text-sm overflow-auto">{pretty({
          user: auth.user ? { id: auth.user.id, email: auth.user.email } : null,
          profile: auth.profile,
          role: auth.role,
          isActive: auth.isActive,
          loading: auth.loading,
          isAuthenticated: auth.isAuthenticated
        })}</pre>
      </div>

      {/* JWT Claims */}
      <div className="bg-indigo-50 p-4 rounded mb-6">
        <h2 className="text-lg font-semibold mb-2">🔑 JWT Claims & Expiry</h2>
        <pre className="text-sm overflow-auto">{pretty({
          expired: jwtInfo?.isExpired,
          skewMs: jwtInfo?.skewMs,
          expISO: jwtInfo?.expISO,
          nowISO: jwtInfo?.nowISO,
          header: jwtInfo?.header,
          payload: jwtInfo?.payload,
        })}</pre>
      </div>

      {/* Session Data */}
      <div className="bg-blue-50 p-4 rounded mb-6">
        <h2 className="text-lg font-semibold mb-2">📋 Session Data</h2>
        <pre className="text-sm overflow-auto">{pretty({
          hasSession: !!sessionData?.session,
          userId: sessionData?.session?.user?.id,
          email: sessionData?.session?.user?.email,
          error: sessionData?.sessionError?.message,
        })}</pre>
      </div>

      {/* User Data */}
      <div className="bg-green-50 p-4 rounded mb-6">
        <h2 className="text-lg font-semibold mb-2">👤 User Data</h2>
        <pre className="text-sm overflow-auto">{pretty({
          hasUser: !!userFromAuth?.user,
          userId: userFromAuth?.user?.id,
          email: userFromAuth?.user?.email,
          error: userFromAuth?.userError?.message,
        })}</pre>
      </div>

      {/* Direct Profile Test */}
      <div className="bg-yellow-50 p-4 rounded mb-6">
        <h2 className="text-lg font-semibold mb-2">🎯 Direct Profile Query Test</h2>
        <pre className="text-sm overflow-auto">{pretty({
          hasProfile: !!directProfileTest?.profile,
          profile: directProfileTest?.profile,
          error: directProfileTest?.profileError?.message || directProfileTest?.profileError,
          computedActive: directProfileTest?.computedActive,
        })}</pre>
      </div>

      {/* Helper Profile Test */}
      <div className="bg-yellow-100 p-4 rounded mb-6">
        <h2 className="text-lg font-semibold mb-2">🧩 Helper Profile (getUserProfile helper)</h2>
        <pre className="text-sm overflow-auto">{pretty({
          hasProfile: !!helperProfileTest?.profile,
          profile: helperProfileTest?.profile,
          error: helperProfileTest?.error,
          computedActive: helperProfileTest?.computedActive,
        })}</pre>
      </div>

      {/* RLS Probe */}
      <div className="bg-red-50 p-4 rounded mb-6">
        <h2 className="text-lg font-semibold mb-2">🛡️ RLS Probe (can SELECT own profile?)</h2>
        <pre className="text-sm overflow-auto">{pretty({
          permitted: rlsProbe?.permitted,
          error: rlsProbe?.error?.message || rlsProbe?.error,
        })}</pre>
      </div>

      {/* Storage */}
      <div className="bg-slate-50 p-4 rounded mb-6">
        <h2 className="text-lg font-semibold mb-2">💾 Storage (auth tokens)</h2>
        <pre className="text-sm overflow-auto">{pretty(storageInfo)}</pre>
      </div>

      {/* Supabase Client Config */}
      <div className="bg-zinc-50 p-4 rounded mb-6">
        <h2 className="text-lg font-semibold mb-2">⚙️ Supabase Client Config</h2>
        <pre className="text-sm overflow-auto">{pretty({
          url: supabaseConfig?.url,
          environment: supabaseConfig?.environment,
          hasAnonKey: supabaseConfig?.hasAnonKey,
          VITE_AUTH_DEBUG: import.meta?.env?.VITE_AUTH_DEBUG,
        })}</pre>
      </div>
    </div>
  )
}

export default AuthSessionDebug
