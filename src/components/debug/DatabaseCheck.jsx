// src/components/debug/DatabaseCheck.jsx
import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

const DatabaseCheck = () => {
  const [userProfiles, setUserProfiles] = useState([])
  const [authUsers, setAuthUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const checkDatabase = async () => {
      try {
        setLoading(true)
        
        // Get current auth user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) {
          setError(`Auth error: ${authError.message}`)
          return
        }
        
        setAuthUsers(user ? [user] : [])
        
        // Try to get user profiles (this might fail due to RLS)
        const { data: profiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .limit(10)
        
        if (profileError) {
          setError(`Profile error: ${profileError.message}`)
          // Try to get just count
          const { count, error: countError } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
          
          if (!countError) {
            setUserProfiles([{ message: `Found ${count} profiles but cannot read due to RLS` }])
          }
        } else {
          setUserProfiles(profiles || [])
        }
        
      } catch (err) {
        setError(`Unexpected error: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    checkDatabase()
  }, [])

  const createUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('No authenticated user found')
        return
      }

      // Try to create a user profile
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email.split('@')[0],
          role: user.email === 'folashade@greenfield.edu.ng' ? 'super_admin' : 'student',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()

      if (error) {
        alert(`Error creating profile: ${error.message}`)
      } else {
        alert('Profile created successfully!')
        window.location.reload()
      }
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto mt-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Checking database...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto mt-8">
      <h2 className="text-xl font-bold mb-6">Database Check</h2>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-semibold text-red-800 mb-2">Error:</h3>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Auth Users */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Current Auth User</h3>
        {authUsers.length > 0 ? (
          <div className="bg-green-50 p-4 rounded-lg">
            {authUsers.map(user => (
              <div key={user.id} className="space-y-2 text-sm">
                <div><strong>Email:</strong> {user.email}</div>
                <div><strong>ID:</strong> {user.id}</div>
                <div><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</div>
                <div><strong>Last Sign In:</strong> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-yellow-800">No authenticated user found</p>
          </div>
        )}
      </div>

      {/* User Profiles */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">User Profiles Table</h3>
        {userProfiles.length > 0 ? (
          <div className="bg-green-50 p-4 rounded-lg">
            {userProfiles.map((profile, index) => (
              <div key={index} className="mb-4 p-3 bg-white rounded border">
                {profile.message ? (
                  <p className="text-orange-600">{profile.message}</p>
                ) : (
                  <div className="space-y-1 text-sm">
                    <div><strong>Email:</strong> {profile.email}</div>
                    <div><strong>Role:</strong> {profile.role}</div>
                    <div><strong>Active:</strong> {profile.is_active ? 'Yes' : 'No'}</div>
                    <div><strong>Full Name:</strong> {profile.full_name || 'Not set'}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-red-800 mb-3">No user profiles found in database!</p>
            <p className="text-red-600 text-sm mb-4">
              This is why authentication is stuck loading. The user exists in Supabase Auth 
              but has no corresponding profile in the user_profiles table.
            </p>
            <button
              onClick={createUserProfile}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Create Profile for Current User
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Quick Actions:</h3>
        <div className="space-y-2">
          <button
            onClick={() => window.location.reload()}
            className="block w-full text-left text-blue-700 hover:text-blue-900 text-sm"
          >
            🔄 Refresh Check
          </button>
          <button
            onClick={createUserProfile}
            className="block w-full text-left text-blue-700 hover:text-blue-900 text-sm"
          >
            👤 Create User Profile
          </button>
        </div>
      </div>
    </div>
  )
}

export default DatabaseCheck