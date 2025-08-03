// src/components/debug/SimpleAuthTest.jsx
import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

const SimpleAuthTest = () => {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    checkCurrentAuth()
  }, [])

  const checkCurrentAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      if (user) {
        setResult(`✅ Currently logged in as: ${user.email}`)
      } else {
        setResult('❌ Not logged in')
      }
    } catch (error) {
      setResult(`❌ Error checking auth: ${error.message}`)
    }
  }

  const testConnection = async () => {
    setLoading(true)
    setResult('Testing Supabase connection...')
    
    try {
      // Test basic connection with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
      )
      
      const connectionPromise = supabase
        .from('user_profiles')
        .select('count')
        .limit(1)
      
      const { data, error } = await Promise.race([connectionPromise, timeoutPromise])
      
      if (error) {
        setResult(`❌ Connection test failed: ${error.message}`)
      } else {
        setResult(`✅ Supabase connection successful!
        
Database is accessible. You can proceed with authentication.`)
      }
    } catch (error) {
      setResult(`❌ Connection test error: ${error.message}`)
    }
    
    setLoading(false)
  }

  const testAuth = async () => {
    setLoading(true)
    setResult('Testing authentication...')
    
    try {
      // Test 1: Get session with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth check timeout after 10 seconds')), 10000)
      )
      
      const sessionPromise = supabase.auth.getSession()
      const { data: { session }, error: sessionError } = await Promise.race([sessionPromise, timeoutPromise])
      
      if (sessionError) {
        setResult(`❌ Session Error: ${sessionError.message}`)
        setLoading(false)
        return
      }

      if (!session) {
        setResult('❌ No active session. Please sign in first using the form below.')
        setLoading(false)
        return
      }

      // Test 2: Get user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        setResult(`❌ User Error: ${userError.message}`)
        setLoading(false)
        return
      }

      if (!user) {
        setResult('❌ No user found despite having session.')
        setLoading(false)
        return
      }

      setCurrentUser(user)

      // Test 3: Check profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      let profileStatus = ''
      if (profileError) {
        if (profileError.code === 'PGRST116') {
          profileStatus = '❌ No profile found in database - CLICK "Create Profile" to fix this!'
        } else {
          profileStatus = `❌ Profile error: ${profileError.message}`
        }
      } else {
        profileStatus = `✅ Profile found: ${profile.email}, role: ${profile.role || 'NULL'}, active: ${profile.is_active}`
      }

      setResult(`
✅ Session: Active
✅ User: ${user.email}
✅ User ID: ${user.id}
${profileStatus}

${!profile || !profile.role ? '🔧 NEXT STEP: Click "Create Profile" to fix the missing role!' : '🎉 Everything looks good!'}
      `)
    } catch (error) {
      setResult(`❌ Exception: ${error.message}`)
    }
    
    setLoading(false)
  }

  const createProfile = async () => {
    if (!currentUser) {
      setResult('❌ Cannot create profile: No user logged in. Please sign in first.')
      return
    }

    setLoading(true)
    setResult('Creating profile...')
    
    try {
      const profileData = {
        id: currentUser.id,
        email: currentUser.email,
        full_name: currentUser.user_metadata?.full_name || currentUser.email.split('@')[0],
        role: currentUser.email === 'folashade@greenfield.edu.ng' ? 'super_admin' : 'student',
        is_active: true,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('Creating profile with data:', profileData)

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile creation timeout after 15 seconds')), 15000)
      )
      
      const createPromise = supabase
        .from('user_profiles')
        .insert(profileData)
        .select()

      const { data, error } = await Promise.race([createPromise, timeoutPromise])

      if (error) {
        setResult(`❌ Profile creation failed: ${error.message}\n\nError details: ${JSON.stringify(error, null, 2)}`)
      } else {
        setResult(`✅ Profile created successfully!
        
Profile details:
${JSON.stringify(data[0], null, 2)}

🎉 Now refresh the page and try logging in again!`)
      }
    } catch (error) {
      setResult(`❌ Exception during profile creation: ${error.message}`)
    }
    
    setLoading(false)
  }

  const signIn = async (e) => {
    e.preventDefault()
    
    if (!email || !password) {
      setResult('❌ Please enter both email and password')
      return
    }

    setLoading(true)
    setResult('Signing in...')
    
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign in timeout after 15 seconds')), 15000)
      )
      
      const signInPromise = supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })

      const { data, error } = await Promise.race([signInPromise, timeoutPromise])

      if (error) {
        setResult(`❌ Sign in failed: ${error.message}
        
Common issues:
- Invalid email or password
- User not registered in Supabase
- Network connectivity issues
- Supabase configuration problems

Error details: ${JSON.stringify(error, null, 2)}`)
      } else {
        setCurrentUser(data.user)
        setResult(`✅ Sign in successful!
        
User: ${data.user.email}
User ID: ${data.user.id}

🔧 Now click "Test Authentication" to check if you have a profile!`)
        setPassword('') // Clear password for security
      }
    } catch (error) {
      setResult(`❌ Sign in exception: ${error.message}
      
This could be due to:
- Network timeout
- Supabase service unavailable
- Configuration issues`)
    }
    
    setLoading(false)
  }

  const signOut = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      setCurrentUser(null)
      setResult('✅ Signed out successfully')
      setEmail('')
      setPassword('')
    } catch (error) {
      setResult(`❌ Sign out error: ${error.message}`)
    }
    setLoading(false)
  }

  const cancelOperation = () => {
    setLoading(false)
    setResult('❌ Operation cancelled by user')
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto mt-8">
      <h2 className="text-xl font-bold mb-6 text-center">🔧 Authentication Test & Fix</h2>
      
      {/* Current Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Current Status:</h3>
        <p className="text-sm">
          {currentUser ? `✅ Logged in as: ${currentUser.email}` : '❌ Not logged in'}
        </p>
      </div>

      {/* Sign In Form */}
      {!currentUser && (
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="font-semibold mb-4">Sign In:</h3>
          <form onSubmit={signIn} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              {loading && (
                <button
                  type="button"
                  onClick={cancelOperation}
                  className="px-4 bg-red-600 text-white py-2 rounded hover:bg-red-700"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-6 justify-center">
        <button
          onClick={testConnection}
          disabled={loading}
          className="bg-orange-600 text-white px-6 py-2 rounded hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Connection'}
        </button>
        
        <button
          onClick={testAuth}
          disabled={loading}
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Authentication'}
        </button>
        
        {currentUser && (
          <button
            onClick={createProfile}
            disabled={loading}
            className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Profile'}
          </button>
        )}
        
        {currentUser && (
          <button
            onClick={signOut}
            disabled={loading}
            className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Signing out...' : 'Sign Out'}
          </button>
        )}
        
        <button
          onClick={() => window.location.reload()}
          className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
        >
          Refresh Page
        </button>
      </div>

      {/* Result Display */}
      {result && (
        <div className="p-4 bg-gray-50 rounded-lg border">
          <h3 className="font-semibold mb-2">Result:</h3>
          <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-96">
            {result}
          </pre>
        </div>
      )}
    </div>
  )
}

export default SimpleAuthTest