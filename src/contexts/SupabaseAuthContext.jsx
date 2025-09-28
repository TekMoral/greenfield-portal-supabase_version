// src/contexts/SupabaseAuthContext.jsx
import React, { useEffect, useState } from 'react'
import { supabase, getUserProfile } from '../lib/supabaseClient'
import { debugUserProfile, checkAndFixUserProfile } from '../utils/authDebug'
import { AuthContext } from '../hooks/useAuth'
import { toast } from 'react-hot-toast'
import { cookieAuth, getAccessToken } from '../lib/cookieAuthClient'

// Debug flag to control verbose auth logging
const AUTH_DEBUG = (typeof window !== 'undefined' && window.AUTH_DEBUG === true) || (import.meta?.env?.VITE_AUTH_DEBUG === 'true')

// Inactivity-based session expiry (default: 48 hours). Override via VITE_AUTH_MAX_IDLE_MS
const LAST_ACTIVE_KEY = 'auth:lastActiveAt'
const MAX_IDLE_MS = Number(import.meta.env.VITE_AUTH_MAX_IDLE_MS || 1000 * 60 * 60 * 48)
const nowMs = () => Date.now()
const getLastActiveAt = () => {
  try { const v = Number(localStorage.getItem(LAST_ACTIVE_KEY) || '0'); return Number.isFinite(v) ? v : 0 } catch { return 0 }
}
const setLastActiveNow = () => { try { localStorage.setItem(LAST_ACTIVE_KEY, String(nowMs())) } catch (_) {} }
const clearLastActive = () => { try { localStorage.removeItem(LAST_ACTIVE_KEY) } catch (_) {} }
const isIdleExpired = () => (nowMs() - getLastActiveAt()) > MAX_IDLE_MS

// Add uid alias to Supabase user object to support legacy code paths that reference user.uid
const withUid = (u) => (u ? { ...u, uid: u.id } : u)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null)
  const [isActive, setIsActive] = useState(false)
  const [initialSessionLoaded, setInitialSessionLoaded] = useState(false)

  const profileAbortControllerRef = React.useRef(null)
  const realtimeChannelRef = React.useRef(null)
  const accountStateHandledRef = React.useRef(false)
  const refreshTimerRef = React.useRef(null)
  
  useEffect(() => {
  let isMounted = true
  
  const cancelProfileFetch = () => {
      if (profileAbortControllerRef.current) {
        profileAbortControllerRef.current.abort()
        profileAbortControllerRef.current = null
      }
    }

    const clearRefreshTimer = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
    }

    const scheduleRefresh = (expiresInSeconds) => {
      clearRefreshTimer()
      const jitter = Math.floor(Math.random() * 5000)
      const ms = Math.max(10000, (expiresInSeconds - 30) * 1000 - jitter)
      refreshTimerRef.current = setTimeout(async () => {
        try {
          const res = await cookieAuth.refresh()
          if (res?.success && isMounted) {
            try { if (res?.access_token) { supabase.auth.setAuth(res.access_token) } } catch (_) {}
            await applySession()
            // res contains expires_in
            scheduleRefresh(res.expires_in || 3600)
          } else {
            // If refresh fails, treat as signed out
            await handleLocalSignOut()
          }
        } catch (_) {
          await handleLocalSignOut()
        }
      }, ms)
    }

    const subscribeToProfileChanges = (userId) => {
      if (!userId) return
      unsubscribeProfileChanges()

      const channel = supabase
        .channel(`user_profile_status_${userId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `id=eq.${userId}` }, (payload) => {
          const newRow = payload?.new || {}
          const computedActive = ((newRow?.status ?? 'active') === 'active') && (newRow?.is_active !== false)
          if (!computedActive) {
            notifyAndSignOut(newRow?.status, newRow?.is_active)
          }
        })
        .subscribe()

      realtimeChannelRef.current = channel
    }

    const unsubscribeProfileChanges = () => {
      try {
        if (realtimeChannelRef.current) {
          realtimeChannelRef.current.unsubscribe()
        }
      } catch (_) { /* ignore */ }
      realtimeChannelRef.current = null
    }

    const notifyAndSignOut = (status, is_active) => {
      const isDeleted = status === 'deleted'
      const isSuspended = status === 'suspended'
      const message = isDeleted
        ? 'Your account has been deleted. Please contact the administrator.'
        : (isSuspended
          ? 'Your account has been suspended. Please contact the administrator.'
          : 'Your account is inactive. Please contact the administrator.')

      if (!accountStateHandledRef.current) {
        try { toast.error(message) } catch (_) { /* ignore */ }
        accountStateHandledRef.current = true
      }
      cookieAuth.logout().catch(() => {})
      supabase.auth.signOut().catch(() => {})
    }

    const fetchUserProfile = async (userId) => {
      if (!userId) {
        setProfile(null)
        setRole(null)
        setIsActive(false)
        return
      }

      if (profileAbortControllerRef.current) {
        profileAbortControllerRef.current.abort()
      }

      profileAbortControllerRef.current = new AbortController()
      const signal = profileAbortControllerRef.current.signal

      try {
        if (signal.aborted) return

        let profileData = await getUserProfile(userId, signal)
        if (signal.aborted) return

        if (!profileData) {
          try {
            const { data, error } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', userId)
              .single()
              .abortSignal(signal)

            if (!error && data) {
              profileData = data
            }
          } catch (directError) {
            if (directError.name !== 'AbortError' && !signal.aborted) {
              console.error('Direct fetch error:', directError)
            }
          }
        }

        if (signal.aborted) return

        if (!profileData && AUTH_DEBUG) {
          await debugUserProfile(userId)

          const { data: { user: currentUser } } = await supabase.auth.getUser(getAccessToken && getAccessToken())
          if (currentUser && currentUser.id === userId && !signal.aborted) {
            const result = await checkAndFixUserProfile(currentUser)
            if (result.success) {
              profileData = result.data
            } else {
              console.error('❌ Failed to create profile:', result.error)
            }
          }
        }

        if (!signal.aborted) {
          if (profileData) {
            setProfile(profileData)
            setRole(profileData.role)
            const computedActive = ((profileData?.status ?? 'active') === 'active') && (profileData?.is_active !== false)
            if (!computedActive) {
              if (AUTH_DEBUG) console.warn('Auth:Signing out inactive profile', { status: profileData?.status, is_active: profileData?.is_active })
              notifyAndSignOut(profileData?.status, profileData?.is_active)
            }
            setIsActive(computedActive)
          } else {
            console.error('❌ No profile found for user, treating as deleted:', userId)
            notifyAndSignOut('deleted', false)
            setProfile(null)
            setRole(null)
            setIsActive(false)
          }
        }
      } catch (error) {
        if (!signal.aborted && error.name !== 'AbortError') {
          console.error('💥 Exception in fetchUserProfile:', error)
          setProfile(null)
          setRole(null)
          setIsActive(false)
        }
      }
    }

    const applySession = async () => {
      // After cookieAuth.login/refresh sets the in-memory token, ask Supabase for the user
      const { data: { user: authUser }, error } = await supabase.auth.getUser(getAccessToken && getAccessToken())
      if (error || !authUser) {
        // No valid token -> clear state
        await handleLocalSignOut()
        return null
      }
      setLastActiveNow()
      setUser(withUid(authUser))
      accountStateHandledRef.current = false
      try { subscribeToProfileChanges(authUser.id) } catch (_) { /* ignore */ }
      await fetchUserProfile(authUser.id)
      return authUser
    }

    const handleLocalSignOut = async () => {
      cancelProfileFetch()
      clearRefreshTimer()
      setUser(null)
      setProfile(null)
      setRole(null)
      setIsActive(false)
      accountStateHandledRef.current = false
      clearLastActive()
      try { unsubscribeProfileChanges() } catch (_) { /* ignore */ }
    }

    const getInitialSession = async () => {
      try {
        // Attempt to exchange HttpOnly cookie for an access token
        const res = await cookieAuth.refresh()
        if (res?.success) {
          try { if (res?.access_token) { supabase.auth.setAuth(res.access_token) } } catch (_) {}
          const u = await applySession()
          if (u) {
            scheduleRefresh(res.expires_in || 3600)
          }
        } else {
          await handleLocalSignOut()
        }
      } catch (error) {
        console.error('💥 Exception getting initial session:', error)
        await handleLocalSignOut()
      } finally {
        if (isMounted) {
          setLoading(false)
          setInitialSessionLoaded(true)
        }
      }
    }

    // Start the initial session check
    getInitialSession()

    return () => {
      isMounted = false
      cancelProfileFetch()
      clearRefreshTimer()
      try { unsubscribeProfileChanges() } catch (_) { /* ignore */ }
    }
  }, [])

  const unsubscribeProfileChanges = () => {
    try {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.unsubscribe()
      }
    } catch (_) { /* ignore */ }
    realtimeChannelRef.current = null
  }

  const notifyAndSignOut = (status, is_active) => {
    const isDeleted = status === 'deleted'
    const isSuspended = status === 'suspended'
    const message = isDeleted
      ? 'Your account has been deleted. Please contact the administrator.'
      : (isSuspended
        ? 'Your account has been suspended. Please contact the administrator.'
        : 'Your account is inactive. Please contact the administrator.')

    if (!accountStateHandledRef.current) {
      try { toast.error(message) } catch (_) { /* ignore */ }
      accountStateHandledRef.current = true
    }
    cookieAuth.logout().catch(() => {})
    supabase.auth.signOut().catch(() => {})
  }

  const fetchUserProfile = async (userId) => {
    if (!userId) {
      setProfile(null)
      setRole(null)
      setIsActive(false)
      return
    }

    if (profileAbortControllerRef.current) {
      profileAbortControllerRef.current.abort()
    }

    profileAbortControllerRef.current = new AbortController()
    const signal = profileAbortControllerRef.current.signal

    try {
      if (signal.aborted) return

      let profileData = await getUserProfile(userId, signal)
      if (signal.aborted) return

      if (!profileData) {
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single()
            .abortSignal(signal)

          if (!error && data) {
            profileData = data
          }
        } catch (directError) {
          if (directError.name !== 'AbortError' && !signal.aborted) {
            console.error('Direct fetch error:', directError)
          }
        }
      }

      if (signal.aborted) return

      if (!profileData && AUTH_DEBUG) {
        await debugUserProfile(userId)

        const { data: { user: currentUser } } = await supabase.auth.getUser(getAccessToken && getAccessToken())
        if (currentUser && currentUser.id === userId && !signal.aborted) {
          const result = await checkAndFixUserProfile(currentUser)
          if (result.success) {
            profileData = result.data
          } else {
            console.error('❌ Failed to create profile:', result.error)
          }
        }
      }

      if (!signal.aborted) {
        if (profileData) {
          setProfile(profileData)
          setRole(profileData.role)
          const computedActive = ((profileData?.status ?? 'active') === 'active') && (profileData?.is_active !== false)
          if (!computedActive) {
            if (AUTH_DEBUG) console.warn('Auth:Signing out inactive profile', { status: profileData?.status, is_active: profileData?.is_active })
            notifyAndSignOut(profileData?.status, profileData?.is_active)
          }
          setIsActive(computedActive)
        } else {
          console.error('❌ No profile found for user, treating as deleted:', userId)
          notifyAndSignOut('deleted', false)
          setProfile(null)
          setRole(null)
          setIsActive(false)
        }
      }
    } catch (error) {
      if (!signal.aborted && error.name !== 'AbortError') {
        console.error('💥 Exception in fetchUserProfile:', error)
        setProfile(null)
        setRole(null)
        setIsActive(false)
      }
    }
  }

  const signIn = async (email, password) => {
    try {
      setLoading(true)

      const result = await cookieAuth.login(email.trim(), password)
      if (!result?.success) {
        return { success: false, error: result?.error || 'Failed to sign in' }
      }

      // Ensure Supabase client uses the fresh access token immediately
      try { if (result?.access_token) { supabase.auth.setAuth(result.access_token) } } catch (_) {}

      // Try to obtain the user with optimized retry (faster for better UX)
      let authUser = null
      for (let i = 0; i < 4; i++) {
        const { data: { user: u } } = await supabase.auth.getUser(result?.access_token || (getAccessToken && getAccessToken()))
        if (u) { authUser = u; break }
        if (i < 3) await new Promise(r => setTimeout(r, 100))
      }

      // Fallback: if the function returned user info, construct a minimal user
      if (!authUser && result?.user?.id) {
        authUser = { id: result.user.id, email: result.user.email }
      }

      if (!authUser) {
        return { success: false, error: 'Failed to obtain user after login' }
      }

      // Proactively check profile status to block suspended/inactive logins
      try {
        // Prefer SECURITY DEFINER RPC to bypass RLS safely
        let prof = null
        let profErr = null
        try {
          const { data, error } = await supabase.rpc('rpc_get_current_profile')
          prof = data || null
          profErr = error || null
        } catch (e) {
          profErr = e
        }

        // Fallback to direct select if RPC is unavailable
        if (!prof && profErr) {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('status, is_active')
            .eq('id', authUser.id)
            .single()
          prof = data || null
          profErr = error || null
        }

        if (!profErr && prof) {
          const active = ((prof?.status ?? 'active') === 'active') && (prof?.is_active !== false)
          if (!active) {
            await cookieAuth.logout().catch(() => {})
            await supabase.auth.signOut().catch(() => {})
            const isDeleted = prof?.status === 'deleted'
            const isSuspended = prof?.status === 'suspended'
            const msg = isDeleted
              ? 'Your account has been deleted. Please contact the administrator.'
              : (isSuspended
                ? 'Your account has been suspended. Please contact the administrator.'
                : 'Your account is inactive. Please contact the administrator.')
            return { success: false, error: msg }
          }
        } else {
          console.warn('Auth pre-check: profile missing/unavailable, allowing login and deferring to post-login fetch', profErr)
          // Do not block login here; post-login fetchUserProfile will enforce status and sign out if needed
        }
      } catch (_) { /* ignore profile pre-check errors */ }

      setLastActiveNow()
      setUser(withUid(authUser))
      await fetchUserProfile(authUser.id)
      try { subscribeToProfileChanges(authUser.id) } catch (_) { /* ignore */ }

      // Schedule token refresh using returned expires_in
      const expiresIn = result?.expires_in || 3600
      // start background refresh timer
      // handled by initial effect on next mount, but here we schedule once
      // We don't have access to schedule function here; rely on periodic activity/refresh in the effect on reload

      return { success: true, user: authUser }
    } catch (error) {
      console.error('Sign in exception:', error)
      return { success: false, error: error.message || 'An unexpected error occurred' }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email, password, userData = {}) => {
    try {
      setLoading(true)

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: userData.fullName || '',
            ...userData
          }
        }
      })

      if (error) {
        console.error('Sign up error:', error)
        return {
          success: false,
          error: error.message || 'Failed to create account'
        }
      }

      return {
        success: true,
        user: data.user,
        needsConfirmation: !data.session
      }
    } catch (error) {
      console.error('Sign up exception:', error)
      return {
        success: false,
        error: error.message || 'An unexpected error occurred'
      }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)

      // Clear state first to prevent UI issues
      setUser(null)
      setProfile(null)
      setRole(null)
      setIsActive(false)

      await cookieAuth.logout().catch(() => {})
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Sign out exception:', error)
      return { success: false, error: error.message || 'Failed to sign out' }
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates) => {
    try {
      if (!user) {
        return { success: false, error: 'No user logged in' }
      }

      if (updates.email && updates.email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: updates.email
        })

        if (authError) {
          return { success: false, error: authError.message }
        }
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Profile update error:', error)
        return { success: false, error: error.message }
      }

      setProfile(data)
      if (data.role) setRole(data.role)
      const computedActive = ((data?.status ?? 'active') === 'active') && (data?.is_active !== false)
      if (!computedActive) {
        if (AUTH_DEBUG) console.warn('Auth:Signing out inactive profile after update', { status: data?.status, is_active: data?.is_active })
        notifyAndSignOut(data?.status, data?.is_active)
      }
      setIsActive(computedActive)

      return { success: true, data }
    } catch (error) {
      console.error('Update profile exception:', error)
      return { success: false, error: error.message || 'Failed to update profile' }
    }
  }

  const resetPassword = async (email) => {
    try {
      if (!email) return { success: false, error: 'Email is required' }

      const { data: result, error } = await supabase.functions.invoke('reset-password', {
        body: {
          email: email.trim(),
          redirectTo: `${window.location.origin}/reset-password`
        }
      })

      if (error) {
        console.error('Reset password function error:', error)
        return { success: false, error: error.message || 'Failed to send reset email' }
      }

      if (!result?.success) {
        return { success: false, error: result?.error || 'Failed to send reset email' }
      }

      return { success: true }
    } catch (error) {
      console.error('Reset password exception:', error)
      return { success: false, error: error.message || 'Failed to send reset email' }
    }
  }

  const refreshSession = async () => {
    try {
      const res = await cookieAuth.refresh()
      if (!res?.success) {
        return { success: false, error: res?.error || 'Failed to refresh session' }
      }
      try { if (res?.access_token) { supabase.auth.setAuth(res.access_token) } } catch (_) {}
      const { data: { user: authUser } } = await supabase.auth.getUser(res?.access_token || (getAccessToken && getAccessToken()))
      if (authUser) {
        await fetchUserProfile(authUser.id)
      }
      return { success: true, session: { access_token: res.access_token, expires_in: res.expires_in } }
    } catch (error) {
      console.error('Refresh session exception:', error)
      return { success: false, error: error.message || 'Failed to refresh session' }
    }
  }

  const hasRole = (requiredRole) => {
    if (!role) return false
    if (isActive === false) return false
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(role)
    }
    return role === requiredRole
  }

  const isAdmin = () => hasRole(['admin', 'super_admin'])
  const isSuperAdmin = () => hasRole('super_admin')

  React.useEffect(() => {
    let lastWrite = 0
    const writeIfNeeded = () => {
      const t = nowMs()
      if (t - lastWrite > 60000) {
        setLastActiveNow()
        lastWrite = t
      }
    }

    // Only enforce idle timeout after initial session check and when a user exists
    const shouldEnforceIdle = () => initialSessionLoaded && !!user

    const handleExpiry = () => {
      if (!shouldEnforceIdle()) return
      const last = getLastActiveAt()
      if (!last || last <= 0) {
        // Initialize marker on first activity to avoid false expiry on fresh loads
        setLastActiveNow()
        return
      }
      if (isIdleExpired()) {
        cookieAuth.logout().finally(() => { clearLastActive(); supabase.auth.signOut().catch(() => {}) })
        return
      }
    }

    const activityHandler = () => {
      handleExpiry()
      writeIfNeeded()
    }

    const focusHandler = () => {
      handleExpiry()
      writeIfNeeded()
    }

    const events = ['click', 'keydown', 'mousemove']
    events.forEach(ev => window.addEventListener(ev, activityHandler))
    window.addEventListener('focus', focusHandler)
    document.addEventListener('visibilitychange', focusHandler)

    const interval = setInterval(() => {
      handleExpiry()
    }, 60000)

    return () => {
      events.forEach(ev => window.removeEventListener(ev, activityHandler))
      window.removeEventListener('focus', focusHandler)
      document.removeEventListener('visibilitychange', focusHandler)
      clearInterval(interval)
    }
  }, [initialSessionLoaded, user])

  const value = {
    user,
    profile,
    role,
    loading,
    isActive,

    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword,
    refreshSession,

    hasRole,
    isAdmin,
    isSuperAdmin,
    fetchUserProfile,

    isAuthenticated: !!user && !!profile,
    isStudent: hasRole('student'),
    isTeacher: hasRole('teacher'),
    isAdminUser: isAdmin(),
    isSuperAdminUser: isSuperAdmin()
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
