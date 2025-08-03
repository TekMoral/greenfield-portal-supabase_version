// src/components/debug/SupabaseConnectionTest.jsx
import React, { useState, useEffect } from 'react'
import { testConnection, supabaseConfig } from '../../lib/supabaseClient'

const SupabaseConnectionTest = () => {
  const [connectionStatus, setConnectionStatus] = useState('testing')
  const [error, setError] = useState(null)
  const [config, setConfig] = useState(null)

  useEffect(() => {
    const runTest = async () => {
      try {
        setConnectionStatus('testing')
        setConfig(supabaseConfig)
        
        const result = await testConnection()
        
        if (result.success) {
          setConnectionStatus('success')
          setError(null)
        } else {
          setConnectionStatus('error')
          setError(result.error)
        }
      } catch (err) {
        setConnectionStatus('error')
        setError(err.message)
      }
    }

    runTest()
  }, [])

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'testing': return 'text-yellow-600'
      case 'success': return 'text-green-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'testing': return '🔄'
      case 'success': return '✅'
      case 'error': return '❌'
      default: return '❓'
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto mt-8">
      <h2 className="text-xl font-bold mb-4">Supabase Connection Test</h2>
      
      <div className={`flex items-center mb-4 ${getStatusColor()}`}>
        <span className="text-2xl mr-2">{getStatusIcon()}</span>
        <span className="font-semibold">
          {connectionStatus === 'testing' && 'Testing connection...'}
          {connectionStatus === 'success' && 'Connection successful!'}
          {connectionStatus === 'error' && 'Connection failed'}
        </span>
      </div>

      {config && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">Configuration:</h3>
          <div className="text-sm space-y-1">
            <div>URL: {config.url}</div>
            <div>Has Anon Key: {config.hasAnonKey ? '✅' : '❌'}</div>
            <div>Environment: {config.environment}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded">
          <h3 className="font-semibold text-red-800 mb-1">Error:</h3>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {connectionStatus === 'success' && (
        <div className="p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800 text-sm">
            ✅ Supabase is properly configured and accessible!
          </p>
        </div>
      )}
    </div>
  )
}

export default SupabaseConnectionTest