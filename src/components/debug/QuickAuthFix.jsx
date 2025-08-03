// src/components/debug/QuickAuthFix.jsx
import React, { useState } from 'react'
import { useAuth } from '../../contexts/SupabaseAuthContext'
import { supabase } from '../../lib/supabaseClient'

const QuickAuthFix = () => {
  const { user, profile, role, loading, fetchUserProfile } = useAuth()
  const [fixing, setFixing] = useState(false)
  const [result, setResult] = useState(null)

  const quickFix = async () => {
    if (!user) {
      setResult({ success: false, message: 'No user logged in' })
      return
    }

    setFixing(true)
    setResult(null)

    try {
      console.log('🔧 Starting quick fix for user:', user.email)

      // First, check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Error checking profile: ${checkError.message}`)
      }

      if (existingProfile) {
        console.log('📋 Profile exists:', existingProfile)
        
        if (!existingProfile.role || !existingProfile.is_active) {
          // Update existing profile
          const { data: updatedProfile, error: updateError } = await supabase
            .from('user_profiles')
            .update({
              role: existingProfile.role || 'student',
              is_active: true,
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
            .select()
            .single()

          if (updateError) {
            throw new Error(`Error updating profile: ${updateError.message}`)
          }

          console.log('✅ Profile updated:', updatedProfile)
          setResult({ success: true, message: 'Profile updated successfully!', profile: updatedProfile })
        } else {
          setResult({ success: true, message: 'Profile already exists and is active!', profile: existingProfile })
        }
      } else {
        // Create new profile
        console.log('🆕 Creating new profile...')
        
        const newProfile = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email.split('@')[0],
          role: user.email === 'folashade@greenfield.edu.ng' ? 'super_admin' : 'student',
          is_active: true,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data: createdProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert(newProfile)
          .select()
          .single()

        if (createError) {
          throw new Error(`Error creating profile: ${createError.message}`)
        }

        console.log('✅ Profile created:', createdProfile)
        setResult({ success: true, message: 'Profile created successfully!', profile: createdProfile })
      }

      // Refresh the auth context
      await fetchUserProfile(user.id)

    } catch (error) {
      console.error('❌ Quick fix failed:', error)
      setResult({ success: false, message: error.message })
    } finally {
      setFixing(false)
    }
  }

  const testDirectQuery = async () => {
    if (!user) return

    try {
      console.log('🔍 Testing direct query...')
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)

      console.log('Query result:', { data, error })
      
      if (error) {
        setResult({ success: false, message: `Query error: ${error.message}` })
      } else {
        setResult({ 
          success: true, 
          message: `Query successful. Found ${data.length} profiles.`,
          profile: data[0] || null
        })
      }
    } catch (error) {
      console.error('Query failed:', error)
      setResult({ success: false, message: error.message })
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto mt-8">
      <h2 className="text-xl font-bold mb-6">Quick Authentication Fix</h2>
      
      {/* Current Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Current Status:</h3>
        <div className="space-y-1 text-sm">
          <div>User: {user ? `✅ ${user.email}` : '❌ Not logged in'}</div>
          <div>Profile: {profile ? `✅ Exists` : '❌ Missing'}</div>
          <div>Role: {role ? `✅ ${role}` : '❌ Not set'}</div>
          <div>Loading: {loading ? '🔄 Yes' : '✅ No'}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={quickFix}
          disabled={fixing || !user}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {fixing ? 'Fixing...' : 'Quick Fix Profile'}
        </button>
        
        <button
          onClick={testDirectQuery}
          disabled={!user}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          Test Direct Query
        </button>
        
        <button
          onClick={() => window.location.reload()}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Refresh Page
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-2">{result.success ? '✅' : '❌'}</span>
            <span className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
              {result.success ? 'Success!' : 'Error'}
            </span>
          </div>
          <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
            {result.message}
          </p>
          {result.profile && (
            <div className="mt-3 p-3 bg-white rounded border">
              <h4 className="font-semibold mb-2">Profile Data:</h4>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(result.profile, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Debug Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold mb-2">Debug Info:</h4>
        <pre className="text-xs overflow-auto">
          {JSON.stringify({
            user: user ? { id: user.id, email: user.email } : null,
            profile: profile,
            role: role,
            loading: loading
          }, null, 2)}
        </pre>
      </div>
    </div>
  )
}

export default QuickAuthFix