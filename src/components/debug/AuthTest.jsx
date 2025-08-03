// src/components/debug/AuthTest.jsx
import React from 'react'
import { useAuth } from '../../contexts/SupabaseAuthContext'

const AuthTest = () => {
  const { 
    user, 
    profile, 
    role, 
    loading, 
    isActive,
    isAuthenticated,
    isStudent,
    isTeacher,
    isAdminUser,
    isSuperAdminUser,
    hasRole,
    signOut
  } = useAuth()

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto mt-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading auth state...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto mt-8">
      <h2 className="text-xl font-bold mb-6">Authentication State Test</h2>
      
      {/* Auth Status */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Authentication Status</h3>
        <div className={`p-4 rounded-lg ${isAuthenticated ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-2">{isAuthenticated ? '✅' : '❌'}</span>
            <span className={`font-semibold ${isAuthenticated ? 'text-green-800' : 'text-red-800'}`}>
              {isAuthenticated ? 'User is authenticated' : 'User is not authenticated'}
            </span>
          </div>
          <div className="text-sm space-y-1">
            <div>Has User: {user ? '✅' : '❌'}</div>
            <div>Has Profile: {profile ? '✅' : '❌'}</div>
            <div>Is Active: {isActive ? '✅' : '❌'}</div>
          </div>
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">User Information</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="space-y-2 text-sm">
              <div><strong>Email:</strong> {user.email}</div>
              <div><strong>ID:</strong> {user.id}</div>
              <div><strong>Created:</strong> {new Date(user.created_at).toLocaleDateString()}</div>
              <div><strong>Last Sign In:</strong> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Info */}
      {profile && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Profile Information</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="space-y-2 text-sm">
              <div><strong>Full Name:</strong> {profile.full_name || 'Not set'}</div>
              <div><strong>Role:</strong> {profile.role}</div>
              <div><strong>Is Active:</strong> {profile.is_active ? 'Yes' : 'No'}</div>
              <div><strong>Class ID:</strong> {profile.class_id || 'Not assigned'}</div>
              <div><strong>Phone:</strong> {profile.phone_number || 'Not set'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Role Checks */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Role Checks</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-3 rounded ${isStudent ? 'bg-blue-50 text-blue-800' : 'bg-gray-50 text-gray-600'}`}>
            <div className="flex items-center">
              <span className="mr-2">{isStudent ? '✅' : '❌'}</span>
              <span>Is Student</span>
            </div>
          </div>
          <div className={`p-3 rounded ${isTeacher ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-600'}`}>
            <div className="flex items-center">
              <span className="mr-2">{isTeacher ? '✅' : '❌'}</span>
              <span>Is Teacher</span>
            </div>
          </div>
          <div className={`p-3 rounded ${isAdminUser ? 'bg-purple-50 text-purple-800' : 'bg-gray-50 text-gray-600'}`}>
            <div className="flex items-center">
              <span className="mr-2">{isAdminUser ? '✅' : '❌'}</span>
              <span>Is Admin</span>
            </div>
          </div>
          <div className={`p-3 rounded ${isSuperAdminUser ? 'bg-red-50 text-red-800' : 'bg-gray-50 text-gray-600'}`}>
            <div className="flex items-center">
              <span className="mr-2">{isSuperAdminUser ? '✅' : '❌'}</span>
              <span>Is Super Admin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Role Function Tests */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Role Function Tests</h3>
        <div className="space-y-2 text-sm">
          <div>hasRole('student'): {hasRole('student') ? '✅' : '❌'}</div>
          <div>hasRole('teacher'): {hasRole('teacher') ? '✅' : '❌'}</div>
          <div>hasRole('admin'): {hasRole('admin') ? '✅' : '❌'}</div>
          <div>hasRole('super_admin'): {hasRole('super_admin') ? '✅' : '❌'}</div>
          <div>hasRole(['admin', 'super_admin']): {hasRole(['admin', 'super_admin']) ? '✅' : '❌'}</div>
        </div>
      </div>

      {/* Current State Summary */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
        <h3 className="font-semibold text-blue-800 mb-2">Current State Summary:</h3>
        <div className="text-blue-700 text-sm space-y-1">
          <div>✅ Authentication: {isAuthenticated ? 'Working' : 'Not working'}</div>
          <div>✅ Role Detection: {role ? `Working (${role})` : 'Not working'}</div>
          <div>✅ Profile Loading: {profile ? 'Working' : 'Not working'}</div>
          <div>✅ Helper Functions: Working</div>
        </div>
      </div>

      {/* Actions */}
      {isAuthenticated && (
        <div className="text-center">
          <button
            onClick={async () => {
              try {
                const result = await signOut()
                if (result.success) {
                  alert("Logged out successfully!")
                } else {
                  alert(`Logout failed: ${result.error}`)
                }
              } catch (error) {
                alert(`Logout error: ${error.message}`)
              }
            }}
            className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
          >
            Test Logout
          </button>
        </div>
      )}
    </div>
  )
}

export default AuthTest