// src/components/debug/AuthMigrationFixer.jsx
import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/SupabaseAuthContext'
import authMigrationFix from '../../utils/authMigrationFix'

const AuthMigrationFixer = () => {
  const { user, profile, role, loading, fetchUserProfile } = useAuth()
  const [diagnosis, setDiagnosis] = useState(null)
  const [fixing, setFixing] = useState(false)
  const [fixResult, setFixResult] = useState(null)
  const [diagnosing, setDiagnosing] = useState(false)

  useEffect(() => {
    if (!loading) {
      runDiagnosis()
    }
  }, [loading, user, profile])

  const runDiagnosis = async () => {
    setDiagnosing(true)
    try {
      const result = await authMigrationFix.diagnoseAuthIssues()
      setDiagnosis(result)
      console.log('🔍 Diagnosis result:', result)
    } catch (error) {
      console.error('Diagnosis error:', error)
      setDiagnosis({
        issues: [`Diagnosis failed: ${error.message}`],
        fixes: ['Check console for detailed error information'],
        canProceed: false
      })
    } finally {
      setDiagnosing(false)
    }
  }

  const fixAuthIssues = async () => {
    setFixing(true)
    setFixResult(null)
    
    try {
      console.log('🔧 Starting authentication fix...')
      
      // Fix current user profile
      const result = await authMigrationFix.fixCurrentUserProfile('student')
      
      if (result.success) {
        console.log('✅ Fix successful:', result)
        setFixResult({
          success: true,
          message: result.message,
          profile: result.profile
        })
        
        // Refresh the auth context
        if (user) {
          await fetchUserProfile(user.id)
        }
        
        // Re-run diagnosis
        setTimeout(() => {
          runDiagnosis()
        }, 1000)
      } else {
        console.error('❌ Fix failed:', result.error)
        setFixResult({
          success: false,
          message: result.error
        })
      }
    } catch (error) {
      console.error('Fix exception:', error)
      setFixResult({
        success: false,
        message: error.message
      })
    } finally {
      setFixing(false)
    }
  }

  const createAdminUser = async () => {
    setFixing(true)
    try {
      if (!user) {
        setFixResult({
          success: false,
          message: 'No user logged in. Please sign in first.'
        })
        return
      }

      const result = await authMigrationFix.updateUserRole(user.id, 'admin')
      
      if (result.success) {
        setFixResult({
          success: true,
          message: 'User promoted to admin successfully!'
        })
        
        // Refresh the auth context
        await fetchUserProfile(user.id)
        setTimeout(() => runDiagnosis(), 1000)
      } else {
        setFixResult({
          success: false,
          message: result.error
        })
      }
    } catch (error) {
      setFixResult({
        success: false,
        message: error.message
      })
    } finally {
      setFixing(false)
    }
  }

  if (loading || diagnosing) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto mt-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">
            {loading ? 'Loading authentication...' : 'Diagnosing issues...'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto mt-8">
      <h2 className="text-xl font-bold mb-6">Authentication Migration Fixer</h2>
      
      {/* Current Status */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Current Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg ${user ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center">
              <span className="text-2xl mr-2">{user ? '✅' : '❌'}</span>
              <div>
                <div className="font-semibold">Authentication</div>
                <div className="text-sm">{user ? 'Signed In' : 'Not Signed In'}</div>
              </div>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${profile ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center">
              <span className="text-2xl mr-2">{profile ? '✅' : '❌'}</span>
              <div>
                <div className="font-semibold">Profile</div>
                <div className="text-sm">{profile ? 'Exists' : 'Missing'}</div>
              </div>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${role ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center">
              <span className="text-2xl mr-2">{role ? '✅' : '❌'}</span>
              <div>
                <div className="font-semibold">Role</div>
                <div className="text-sm">{role || 'Not Assigned'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnosis Results */}
      {diagnosis && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Diagnosis Results</h3>
          
          {diagnosis.issues.length > 0 ? (
            <div className="mb-4">
              <h4 className="font-semibold text-red-800 mb-2">Issues Found:</h4>
              <ul className="list-disc list-inside space-y-1 text-red-700 text-sm">
                {diagnosis.issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
              <div className="flex items-center">
                <span className="text-2xl mr-2">✅</span>
                <span className="font-semibold text-green-800">No issues found!</span>
              </div>
            </div>
          )}

          {diagnosis.fixes.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-blue-800 mb-2">Recommended Fixes:</h4>
              <ul className="list-disc list-inside space-y-1 text-blue-700 text-sm">
                {diagnosis.fixes.map((fix, index) => (
                  <li key={index}>{fix}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Fix Result */}
      {fixResult && (
        <div className="mb-6">
          <div className={`p-4 rounded-lg ${fixResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center">
              <span className="text-2xl mr-2">{fixResult.success ? '✅' : '❌'}</span>
              <div>
                <div className={`font-semibold ${fixResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {fixResult.success ? 'Fix Applied Successfully!' : 'Fix Failed'}
                </div>
                <div className={`text-sm ${fixResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {fixResult.message}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <button
            onClick={runDiagnosis}
            disabled={diagnosing}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {diagnosing ? 'Diagnosing...' : 'Re-run Diagnosis'}
          </button>
          
          {diagnosis && diagnosis.issues.length > 0 && (
            <button
              onClick={fixAuthIssues}
              disabled={fixing}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {fixing ? 'Fixing...' : 'Fix Authentication Issues'}
            </button>
          )}
          
          {user && profile && (
            <button
              onClick={createAdminUser}
              disabled={fixing}
              className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {fixing ? 'Updating...' : 'Promote to Admin'}
            </button>
          )}
        </div>

        {/* Manual Instructions */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-semibold text-yellow-800 mb-2">Manual Fix Instructions:</h4>
          <div className="text-yellow-700 text-sm space-y-2">
            <p>If automatic fixes don't work, you can manually fix the issue:</p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Go to your Supabase dashboard</li>
              <li>Navigate to Table Editor → user_profiles</li>
              <li>Find your user record (email: {user?.email})</li>
              <li>Set the 'role' field to 'student', 'teacher', or 'admin'</li>
              <li>Set 'is_active' to true</li>
              <li>Save the changes and refresh this page</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Debug Information */}
      {diagnosis && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-2">Debug Information:</h4>
          <pre className="text-xs text-gray-600 overflow-auto">
            {JSON.stringify({
              user: user ? { id: user.id, email: user.email } : null,
              profile: profile,
              diagnosis: diagnosis
            }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export default AuthMigrationFixer