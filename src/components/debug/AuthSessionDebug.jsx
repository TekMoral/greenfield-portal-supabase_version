import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/SupabaseAuthContext'

const AuthSessionDebug = () => {
  const [sessionData, setSessionData] = useState(null)
  const [userFromAuth, setUserFromAuth] = useState(null)
  const [directProfileTest, setDirectProfileTest] = useState(null)
  const [loading, setLoading] = useState(false)
  
  const auth = useAuth()

  const runDiagnostics = async () => {
    setLoading(true)
    console.log('🔍 Starting comprehensive auth diagnostics...')

    try {
      // Test 1: Check session
      console.log('📋 Test 1: Checking session...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('Session result:', { session, sessionError })
      setSessionData({ session, sessionError })

      // Test 2: Check user
      console.log('📋 Test 2: Checking user...')
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('User result:', { user, userError })
      setUserFromAuth({ user, userError })

      // Test 3: Direct profile query (if we have a user)
      if (user) {
        console.log('📋 Test 3: Testing direct profile query...')
        try {
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          
          console.log('Direct profile result:', { profile, profileError })
          setDirectProfileTest({ profile, profileError })
        } catch (err) {
          console.log('Direct profile error:', err)
          setDirectProfileTest({ profile: null, profileError: err.message })
        }
      }

      // Test 4: Check browser storage
      console.log('📋 Test 4: Checking browser storage...')
      const localStorageKeys = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.includes('supabase')) {
          localStorageKeys.push({
            key,
            value: localStorage.getItem(key)?.substring(0, 100) + '...'
          })
        }
      }
      console.log('Supabase localStorage keys:', localStorageKeys)

    } catch (error) {
      console.error('Diagnostics failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const testLogin = async () => {
    setLoading(true)
    try {
      console.log('🔐 Testing login...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'folashade@greenfield.edu.ng',
        password: 'your-password-here' // Replace with actual password
      })
      
      console.log('Login test result:', { data, error })
      
      if (data.user) {
        console.log('✅ Login successful! Running diagnostics again...')
        setTimeout(runDiagnostics, 1000) // Wait a bit for state to update
      }
    } catch (error) {
      console.error('Login test failed:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔍 Authentication Session Debug</h1>
      
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex gap-4">
          <button 
            onClick={runDiagnostics}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Run Diagnostics'}
          </button>
          <button 
            onClick={testLogin}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Test Login
          </button>
        </div>

        {/* Auth Context State */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">🎯 Auth Context State</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify({
              user: auth.user ? { id: auth.user.id, email: auth.user.email } : null,
              profile: auth.profile,
              role: auth.role,
              isActive: auth.isActive,
              loading: auth.loading,
              isAuthenticated: auth.isAuthenticated
            }, null, 2)}
          </pre>
        </div>

        {/* Session Data */}
        <div className="bg-blue-50 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">📋 Session Data</h2>
          {sessionData ? (
            <pre className="text-sm overflow-auto">
              {JSON.stringify({
                hasSession: !!sessionData.session,
                userId: sessionData.session?.user?.id,
                email: sessionData.session?.user?.email,
                error: sessionData.sessionError?.message
              }, null, 2)}
            </pre>
          ) : (
            <p>No session data yet...</p>
          )}
        </div>

        {/* User Data */}
        <div className="bg-green-50 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">👤 User Data</h2>
          {userFromAuth ? (
            <pre className="text-sm overflow-auto">
              {JSON.stringify({
                hasUser: !!userFromAuth.user,
                userId: userFromAuth.user?.id,
                email: userFromAuth.user?.email,
                error: userFromAuth.userError?.message
              }, null, 2)}
            </pre>
          ) : (
            <p>No user data yet...</p>
          )}
        </div>

        {/* Direct Profile Test */}
        <div className="bg-yellow-50 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">🎯 Direct Profile Query Test</h2>
          {directProfileTest ? (
            <pre className="text-sm overflow-auto">
              {JSON.stringify({
                hasProfile: !!directProfileTest.profile,
                profileData: directProfileTest.profile,
                error: directProfileTest.profileError?.message || directProfileTest.profileError
              }, null, 2)}
            </pre>
          ) : (
            <p>No profile test yet...</p>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-red-50 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">📝 What to Look For</h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>Session Data:</strong> Should show hasSession: true if logged in</li>
            <li><strong>User Data:</strong> Should show hasUser: true if authenticated</li>
            <li><strong>Profile Test:</strong> Should show hasProfile: true if RLS allows access</li>
            <li><strong>Auth Context:</strong> Should show user and profile data if everything works</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default AuthSessionDebug