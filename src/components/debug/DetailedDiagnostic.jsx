// src/components/debug/DetailedDiagnostic.jsx
import React, { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const DetailedDiagnostic = () => {
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(false)

  const runDiagnostic = async () => {
    setLoading(true)
    const testResults = {}

    // Test 1: Basic Configuration
    try {
      testResults.config = {
        status: 'success',
        url: import.meta.env.VITE_SUPABASE_URL,
        hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
        anonKeyLength: import.meta.env.VITE_SUPABASE_ANON_KEY?.length || 0
      }
    } catch (error) {
      testResults.config = { status: 'error', error: error.message }
    }

    // Test 2: Network Connectivity
    try {
      const response = await fetch(import.meta.env.VITE_SUPABASE_URL + '/rest/v1/', {
        method: 'HEAD',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        }
      })
      testResults.network = {
        status: response.ok ? 'success' : 'error',
        statusCode: response.status,
        statusText: response.statusText
      }
    } catch (error) {
      testResults.network = { status: 'error', error: error.message }
    }

    // Test 3: Supabase Client Initialization
    try {
      const client = supabase
      testResults.client = {
        status: 'success',
        hasAuth: !!client.auth,
        hasFrom: !!client.from,
        supabaseUrl: client.supabaseUrl,
        supabaseKey: client.supabaseKey?.substring(0, 20) + '...'
      }
    } catch (error) {
      testResults.client = { status: 'error', error: error.message }
    }

    // Test 4: Database Connection
    try {
      const { data, error } = await Promise.race([
        supabase.from('user_profiles').select('count').limit(1),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 5000))
      ])
      
      if (error) {
        testResults.database = { status: 'error', error: error.message }
      } else {
        testResults.database = { status: 'success', message: 'Database accessible' }
      }
    } catch (error) {
      testResults.database = { status: 'error', error: error.message }
    }

    // Test 5: Auth Service
    try {
      const { data, error } = await Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Auth service timeout')), 5000))
      ])
      
      if (error) {
        testResults.auth = { status: 'error', error: error.message }
      } else {
        testResults.auth = { 
          status: 'success', 
          hasSession: !!data.session,
          sessionUser: data.session?.user?.email || 'none'
        }
      }
    } catch (error) {
      testResults.auth = { status: 'error', error: error.message }
    }

    // Test 6: Manual Auth Test
    try {
      const testEmail = 'folashade@greenfield.edu.ng'
      const testPassword = 'test123' // This will fail but we want to see the error type
      
      const { data, error } = await Promise.race([
        supabase.auth.signInWithPassword({ email: testEmail, password: testPassword }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Sign in timeout')), 8000))
      ])
      
      if (error) {
        testResults.signInTest = { 
          status: 'expected_error', 
          error: error.message,
          errorCode: error.status || 'unknown'
        }
      } else {
        testResults.signInTest = { status: 'unexpected_success', message: 'Sign in worked with test password' }
      }
    } catch (error) {
      testResults.signInTest = { status: 'timeout_or_error', error: error.message }
    }

    setResults(testResults)
    setLoading(false)
  }

  const testDirectSignIn = async () => {
    const email = prompt('Enter your email:')
    const password = prompt('Enter your password:')
    
    if (!email || !password) return

    setLoading(true)
    
    try {
      console.log('Attempting sign in with:', email)
      
      const startTime = Date.now()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })
      const endTime = Date.now()
      
      const result = {
        duration: endTime - startTime,
        success: !error,
        error: error?.message,
        user: data?.user?.email,
        session: !!data?.session
      }
      
      setResults(prev => ({ ...prev, directSignIn: result }))
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        directSignIn: { 
          success: false, 
          error: error.message,
          type: 'exception'
        }
      }))
    }
    
    setLoading(false)
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'expected_error': return '⚠️'
      case 'timeout_or_error': return '🔴'
      default: return '❓'
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto mt-8">
      <h2 className="text-xl font-bold mb-6 text-center">🔍 Detailed Supabase Diagnostic</h2>
      
      <div className="flex gap-4 mb-6 justify-center">
        <button
          onClick={runDiagnostic}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Running Diagnostic...' : 'Run Full Diagnostic'}
        </button>
        
        <button
          onClick={testDirectSignIn}
          disabled={loading}
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Direct Sign In'}
        </button>
      </div>

      {Object.keys(results).length > 0 && (
        <div className="space-y-4">
          {Object.entries(results).map(([testName, result]) => (
            <div key={testName} className="p-4 border rounded-lg">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">{getStatusIcon(result.status)}</span>
                <h3 className="font-semibold capitalize">{testName.replace(/([A-Z])/g, ' $1')}</h3>
              </div>
              <pre className="text-sm bg-gray-50 p-2 rounded overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">Quick Fixes to Try:</h3>
        <ul className="text-yellow-700 text-sm space-y-1">
          <li>1. Check if your internet connection is stable</li>
          <li>2. Try refreshing the page completely (Ctrl+F5)</li>
          <li>3. Check browser console for any errors (F12)</li>
          <li>4. Try signing in from Supabase dashboard directly</li>
          <li>5. Verify your Supabase project is not paused/suspended</li>
        </ul>
      </div>
    </div>
  )
}

export default DetailedDiagnostic