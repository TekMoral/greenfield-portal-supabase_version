// src/components/debug/ManualAuthTest.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const ManualAuthTest = () => {
  const [result, setResult] = useState('')
  const navigate = useNavigate()

  const simulateAuth = () => {
    // Simulate successful authentication by setting localStorage
    const mockUser = {
      id: '8c53c275-a082-4e19-8736-2ad085c07141',
      email: 'folashade@greenfield.edu.ng',
      role: 'super_admin',
      is_active: true
    }

    // Store in localStorage (temporary solution)
    localStorage.setItem('supabase.auth.token', JSON.stringify({
      user: mockUser,
      session: { user: mockUser }
    }))

    setResult('✅ Mock authentication set. Try navigating to /dashboard')
  }

  const clearAuth = () => {
    localStorage.removeItem('supabase.auth.token')
    setResult('❌ Mock authentication cleared')
  }

  const testNavigation = () => {
    navigate('/dashboard')
  }

  const testDirectAccess = async () => {
    try {
      // Test direct fetch to Supabase
      const response = await fetch('https://ryiqdiqcmvwdotnrosac.supabase.co/rest/v1/user_profiles?select=*', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5aXFkaXFjbXZ3ZG90bnJvc2FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTM2MzAsImV4cCI6MjA2OTAyOTYzMH0.xPxrEU24W2zRftlL2X3VbT_yfMLt-8eq56QfhM3JzFg',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5aXFkaXFjbXZ3ZG90bnJvc2FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTM2MzAsImV4cCI6MjA2OTAyOTYzMH0.xPxrEU24W2zRftlL2X3VbT_yfMLt-8eq56QfhM3JzFg'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setResult(`✅ Direct database access successful!\nFound ${data.length} profiles:\n${JSON.stringify(data, null, 2)}`)
      } else {
        setResult(`❌ Direct access failed: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      setResult(`❌ Direct access error: ${error.message}`)
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto mt-8">
      <h2 className="text-xl font-bold mb-6 text-center">🔧 Manual Auth Test</h2>
      
      <div className="flex flex-wrap gap-4 mb-6 justify-center">
        <button
          onClick={simulateAuth}
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
        >
          Simulate Authentication
        </button>
        
        <button
          onClick={testDirectAccess}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Test Direct Database Access
        </button>
        
        <button
          onClick={testNavigation}
          className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700"
        >
          Go to Dashboard
        </button>
        
        <button
          onClick={clearAuth}
          className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
        >
          Clear Mock Auth
        </button>
      </div>

      {result && (
        <div className="p-4 bg-gray-50 rounded-lg border">
          <h3 className="font-semibold mb-2">Result:</h3>
          <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-96">
            {result}
          </pre>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">Instructions:</h3>
        <ol className="text-yellow-700 text-sm space-y-1">
          <li>1. First click "Test Direct Database Access" to see if we can reach the database</li>
          <li>2. If that works, click "Simulate Authentication" to bypass the auth timeout</li>
          <li>3. Then click "Go to Dashboard" to test if the app works with mock auth</li>
          <li>4. If everything works, we know the issue is just with the auth service timeout</li>
        </ol>
      </div>
    </div>
  )
}

export default ManualAuthTest