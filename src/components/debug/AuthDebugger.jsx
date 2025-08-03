// src/components/debug/AuthDebugger.jsx
import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

const AuthDebugger = () => {
  const [authState, setAuthState] = useState({
    session: null,
    user: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          setAuthState(prev => ({ ...prev, error: sessionError.message, loading: false }))
          return
        }

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          setAuthState(prev => ({ ...prev, error: userError.message, loading: false }))
          return
        }

        setAuthState({
          session,
          user,
          loading: false,
          error: null
        })

        console.log('Auth Debug:', { session, user })
      } catch (error) {
        setAuthState(prev => ({ ...prev, error: error.message, loading: false }))
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session)
      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user || null,
        loading: false
      }))
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInTest = async () => {
    try {
      const email = prompt('Enter your email:')
      const password = prompt('Enter your password:')
      
      if (!email || !password) return

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })

      if (error) {
        alert(`Sign in error: ${error.message}`)
      } else {
        alert('Sign in successful!')
        console.log('Sign in result:', data)
      }
    } catch (error) {
      alert(`Sign in exception: ${error.message}`)
    }
  }

  const signOutTest = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        alert(`Sign out error: ${error.message}`)
      } else {
        alert('Signed out successfully!')
      }
    } catch (error) {
      alert(`Sign out exception: ${error.message}`)
    }
  }

  const createProfile = async () => {
    if (!authState.user) {
      alert('No user logged in')
      return
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          id: authState.user.id,
          email: authState.user.email,
          full_name: authState.user.user_metadata?.full_name || authState.user.email.split('@')[0],
          role: authState.user.email === 'folashade@greenfield.edu.ng' ? 'super_admin' : 'student',
          is_active: true,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()

      if (error) {
        alert(`Profile creation error: ${error.message}`)
      } else {
        alert('Profile created successfully!')
        console.log('Created profile:', data)
      }
    } catch (error) {
      alert(`Profile creation exception: ${error.message}`)
    }
  }

  if (authState.loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto mt-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Checking authentication...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto mt-8">
      <h2 className="text-xl font-bold mb-6">Authentication Debugger</h2>
      
      {/* Auth Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Authentication Status:</h3>
        <div className="space-y-2 text-sm">
          <div>Session: {authState.session ? '✅ Active' : '❌ None'}</div>
          <div>User: {authState.user ? `✅ ${authState.user.email}` : '❌ None'}</div>
          <div>User ID: {authState.user?.id || 'None'}</div>
          <div>Last Sign In: {authState.user?.last_sign_in_at ? new Date(authState.user.last_sign_in_at).toLocaleString() : 'Never'}</div>
        </div>
      </div>

      {/* Error Display */}
      {authState.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-semibold text-red-800 mb-2">Error:</h3>
          <p className="text-red-700 text-sm">{authState.error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-6">
        {!authState.user ? (
          <button
            onClick={signInTest}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Test Sign In
          </button>
        ) : (
          <>
            <button
              onClick={createProfile}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Create Profile
            </button>
            <button
              onClick={signOutTest}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Sign Out
            </button>
          </>
        )}
        
        <button
          onClick={() => window.location.reload()}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Refresh Page
        </button>
      </div>

      {/* Raw Data */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold mb-2">Raw Auth Data:</h4>
        <pre className="text-xs overflow-auto max-h-64">
          {JSON.stringify({
            session: authState.session,
            user: authState.user,
            error: authState.error
          }, null, 2)}
        </pre>
      </div>
    </div>
  )
}

export default AuthDebugger