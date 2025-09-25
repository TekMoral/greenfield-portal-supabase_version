import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'
import edgeFunctionsService from '../services/supabase/edgeFunctions'
import { cookieAuth } from '../lib/cookieAuthClient'
import PasswordInput from '../components/ui/PasswordInput'
import toast from 'react-hot-toast'

const ForcePasswordChange = () => {
  const navigate = useNavigate()
  const { user, role, profile, fetchUserProfile } = useAuth()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const targetPath = useMemo(() => {
    switch (role) {
      case 'admin':
      case 'super_admin':
        return '/dashboard'
      case 'teacher':
        return '/teacher'
      case 'student':
      default:
        return '/student'
    }
  }, [role])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!password || !confirm) {
      setError('Please fill in all fields')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      // 1) Update password via secured Edge Function to avoid client session issues
      const res = await edgeFunctionsService.callFunction('self-update-password', { new_password: password })
      if (!res?.success) {
        throw new Error(res?.error || 'Failed to update password')
      }

      // 2) Best-effort: ensure flag cleared (in case function fails to update profile)
      try { await supabase.rpc('rpc_clear_require_password_change') } catch (_) {}

      // 3) Re-authenticate with the new password to establish a fresh session
      try {
        const loginRes = await cookieAuth.login(user?.email, password)
        if (loginRes?.success && loginRes?.access_token) {
          try { await supabase.auth.setAuth(loginRes.access_token) } catch (_) {}
          
          // Quick session confirmation (max 3 retries, 100ms each)
          for (let i = 0; i < 3; i++) {
            const { data: { user: freshUser } } = await supabase.auth.getUser()
            if (freshUser) break
            if (i < 2) await new Promise(r => setTimeout(r, 100))
          }
        } else {
          // Fallback refresh
          const rr = await cookieAuth.refresh()
          if (rr?.success && rr?.access_token) {
            try { await supabase.auth.setAuth(rr.access_token) } catch (_) {}
          }
        }
      } catch (err) {
        console.error('❌ Re-authentication failed:', err)
      }

      // 4) Quick profile flag check (max 3 retries, 100ms each)
      for (let i = 0; i < 3; i++) {
        try {
          const { data } = await supabase.rpc('rpc_get_current_profile')
          if (data && !data.require_password_change) break
        } catch (_) {}
        if (i < 2) await new Promise(r => setTimeout(r, 100))
      }

      // 5) Refresh the auth context profile (async, don't wait)
      if (user?.id) {
        fetchUserProfile(user.id).catch(() => {}) // Fire and forget
      }

      toast.success('Password updated successfully! You are now logged in.')
      
      // Set bypass flag and navigate immediately
      try { sessionStorage.setItem('pwChangeJustCompleted', '1') } catch (_) {}
      navigate(targetPath)
    } catch (err) {
      console.error('Force password change error:', err)
      setError(err?.message || 'Failed to update password')
      toast.error(err?.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const canProceed = !!user && !!profile

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Update Your Password</h1>
          <p className="text-gray-600">
            {profile?.role === 'student'
              ? 'Your initial password is your admission number. Please create a new secure password to continue.'
              : 'Please set a new secure password to continue.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {!canProceed ? (
            <div className="text-center text-gray-600">Loading account details...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <PasswordInput
                  id="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 outline-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <PasswordInput
                  id="confirm"
                  placeholder="Re-enter new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 outline-none"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default ForcePasswordChange
