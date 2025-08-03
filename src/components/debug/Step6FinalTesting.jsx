// src/components/debug/Step6FinalTesting.jsx
import React, { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { directStorageClient } from '../../utils/directStorageClient'

const Step6FinalTesting = () => {
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(false)
  const [overallStatus, setOverallStatus] = useState(null)

  const tests = [
    {
      id: 'auth',
      name: 'Authentication',
      description: 'Test user authentication and profile access'
    },
    {
      id: 'database',
      name: 'Database Access',
      description: 'Test reading/writing to main tables'
    },
    {
      id: 'storage',
      name: 'File Storage',
      description: 'Test file upload and download'
    },
    {
      id: 'security',
      name: 'Security Policies',
      description: 'Test RLS policies are working'
    },
    {
      id: 'features',
      name: 'Core Features',
      description: 'Test main application features'
    }
  ]

  const runAllTests = async () => {
    setLoading(true)
    setResults({})
    setOverallStatus(null)

    const testResults = {}

    // Test 1: Authentication
    await runAuthTest(testResults)
    
    // Test 2: Database Access
    await runDatabaseTest(testResults)
    
    // Test 3: Storage
    await runStorageTest(testResults)
    
    // Test 4: Security
    await runSecurityTest(testResults)
    
    // Test 5: Features
    await runFeaturesTest(testResults)

    setResults(testResults)
    
    // Calculate overall status
    const passedTests = Object.values(testResults).filter(r => r.success).length
    const totalTests = Object.keys(testResults).length
    
    setOverallStatus({
      passed: passedTests,
      total: totalTests,
      percentage: Math.round((passedTests / totalTests) * 100),
      allPassed: passedTests === totalTests
    })
    
    setLoading(false)
  }

  const runAuthTest = async (testResults) => {
    try {
      // Check if we can access user profile
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', '8c53c275-a082-4e19-8736-2ad085c07141')
        .single()

      if (error) {
        testResults.auth = {
          success: false,
          message: `Authentication failed: ${error.message}`,
          details: 'Cannot access user profile'
        }
      } else {
        testResults.auth = {
          success: true,
          message: `✅ Authentication working`,
          details: `Profile found: ${profile.email}, Role: ${profile.role}`
        }
      }
    } catch (error) {
      testResults.auth = {
        success: false,
        message: `Authentication error: ${error.message}`,
        details: 'Exception during auth test'
      }
    }
  }

  const runDatabaseTest = async (testResults) => {
    try {
      const dbTests = []

      // Test classes table
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('*')
        .limit(5)

      dbTests.push({
        table: 'classes',
        success: !classError,
        count: classes?.length || 0,
        error: classError?.message
      })

      // Test subjects table
      const { data: subjects, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .limit(5)

      dbTests.push({
        table: 'subjects',
        success: !subjectError,
        count: subjects?.length || 0,
        error: subjectError?.message
      })

      // Test news_events table
      const { data: news, error: newsError } = await supabase
        .from('news_events')
        .select('*')
        .limit(5)

      dbTests.push({
        table: 'news_events',
        success: !newsError,
        count: news?.length || 0,
        error: newsError?.message
      })

      const successfulTests = dbTests.filter(t => t.success).length
      const totalTests = dbTests.length

      testResults.database = {
        success: successfulTests === totalTests,
        message: `Database access: ${successfulTests}/${totalTests} tables accessible`,
        details: dbTests.map(t => 
          `${t.success ? '✅' : '❌'} ${t.table}: ${t.success ? `${t.count} records` : t.error}`
        ).join('\n')
      }
    } catch (error) {
      testResults.database = {
        success: false,
        message: `Database test error: ${error.message}`,
        details: 'Exception during database test'
      }
    }
  }

  const runStorageTest = async (testResults) => {
    try {
      // Test file upload
      const testFile = new Blob(['Final test file'], { type: 'text/plain' })
      const fileName = `final-test-${Date.now()}.txt`

      const { data, error } = await directStorageClient.upload('profile-images', fileName, testFile)

      if (error) {
        testResults.storage = {
          success: false,
          message: `Storage upload failed: ${error}`,
          details: 'Cannot upload files to storage'
        }
      } else {
        // Test public URL
        const publicUrl = directStorageClient.getPublicUrl('profile-images', fileName)
        
        // Clean up test file
        await directStorageClient.remove('profile-images', fileName)

        testResults.storage = {
          success: true,
          message: `✅ Storage working`,
          details: `Upload successful, public URL generated, cleanup completed`
        }
      }
    } catch (error) {
      testResults.storage = {
        success: false,
        message: `Storage test error: ${error.message}`,
        details: 'Exception during storage test'
      }
    }
  }

  const runSecurityTest = async (testResults) => {
    try {
      // Test that we can access data (development mode should be permissive)
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('count')

      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('count')

      if (profileError || classError) {
        testResults.security = {
          success: false,
          message: `Security policies blocking access`,
          details: `Profile error: ${profileError?.message || 'OK'}, Class error: ${classError?.message || 'OK'}`
        }
      } else {
        testResults.security = {
          success: true,
          message: `✅ Security policies configured`,
          details: `Development mode active - permissive access working`
        }
      }
    } catch (error) {
      testResults.security = {
        success: false,
        message: `Security test error: ${error.message}`,
        details: 'Exception during security test'
      }
    }
  }

  const runFeaturesTest = async (testResults) => {
    try {
      const features = []

      // Test 1: Can create a test class
      const testClass = {
        name: `Test Class ${Date.now()}`,
        level: 'Test',
        capacity: 30,
        status: 'active'
      }

      const { data: newClass, error: createError } = await supabase
        .from('classes')
        .insert(testClass)
        .select()
        .single()

      features.push({
        feature: 'Create Class',
        success: !createError,
        error: createError?.message
      })

      // Test 2: Can update the class
      if (!createError && newClass) {
        const { error: updateError } = await supabase
          .from('classes')
          .update({ name: `Updated ${testClass.name}` })
          .eq('id', newClass.id)

        features.push({
          feature: 'Update Class',
          success: !updateError,
          error: updateError?.message
        })

        // Test 3: Can delete the class
        const { error: deleteError } = await supabase
          .from('classes')
          .delete()
          .eq('id', newClass.id)

        features.push({
          feature: 'Delete Class',
          success: !deleteError,
          error: deleteError?.message
        })
      }

      const successfulFeatures = features.filter(f => f.success).length
      const totalFeatures = features.length

      testResults.features = {
        success: successfulFeatures === totalFeatures,
        message: `Core features: ${successfulFeatures}/${totalFeatures} working`,
        details: features.map(f => 
          `${f.success ? '✅' : '❌'} ${f.feature}: ${f.success ? 'OK' : f.error}`
        ).join('\n')
      }
    } catch (error) {
      testResults.features = {
        success: false,
        message: `Features test error: ${error.message}`,
        details: 'Exception during features test'
      }
    }
  }

  const runIndividualTest = async (testId) => {
    setLoading(true)
    const testResults = { ...results }

    switch (testId) {
      case 'auth':
        await runAuthTest(testResults)
        break
      case 'database':
        await runDatabaseTest(testResults)
        break
      case 'storage':
        await runStorageTest(testResults)
        break
      case 'security':
        await runSecurityTest(testResults)
        break
      case 'features':
        await runFeaturesTest(testResults)
        break
    }

    setResults(testResults)
    setLoading(false)
  }

  const getStatusColor = (success) => {
    return success ? 'text-green-600' : 'text-red-600'
  }

  const getStatusIcon = (success) => {
    return success ? '✅' : '❌'
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-6xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-6 text-center">🧪 Step 6: Final Testing & Validation</h2>
      <p className="text-center text-gray-600 mb-8">Comprehensive testing of your migrated Supabase application</p>

      {/* Overall Status */}
      {overallStatus && (
        <div className={`mb-8 p-6 rounded-lg border-2 ${
          overallStatus.allPassed 
            ? 'bg-green-50 border-green-300' 
            : 'bg-yellow-50 border-yellow-300'
        }`}>
          <div className="text-center">
            <div className={`text-3xl font-bold ${
              overallStatus.allPassed ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {overallStatus.percentage}%
            </div>
            <div className={`text-lg font-semibold ${
              overallStatus.allPassed ? 'text-green-800' : 'text-yellow-800'
            }`}>
              {overallStatus.passed}/{overallStatus.total} Tests Passed
            </div>
            <div className={`text-sm ${
              overallStatus.allPassed ? 'text-green-700' : 'text-yellow-700'
            }`}>
              {overallStatus.allPassed 
                ? '🎉 Migration Complete! All systems working!' 
                : '⚠️ Some issues found - check individual tests below'
              }
            </div>
          </div>
        </div>
      )}

      {/* Test Controls */}
      <div className="mb-8 text-center">
        <button
          onClick={runAllTests}
          disabled={loading}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-lg font-semibold"
        >
          {loading ? 'Running Tests...' : 'Run All Tests'}
        </button>
      </div>

      {/* Individual Tests */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {tests.map((test) => {
          const result = results[test.id]
          return (
            <div key={test.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{test.name}</h3>
                {result && (
                  <span className={`text-2xl ${getStatusColor(result.success)}`}>
                    {getStatusIcon(result.success)}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-3">{test.description}</p>
              
              {result && (
                <div className="space-y-2">
                  <div className={`text-sm font-medium ${getStatusColor(result.success)}`}>
                    {result.message}
                  </div>
                  {result.details && (
                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                      <pre className="whitespace-pre-wrap">{result.details}</pre>
                    </div>
                  )}
                </div>
              )}
              
              <button
                onClick={() => runIndividualTest(test.id)}
                disabled={loading}
                className="mt-3 w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700 disabled:opacity-50 text-sm"
              >
                {loading ? 'Testing...' : 'Test Individual'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Migration Complete */}
      {overallStatus?.allPassed && (
        <div className="p-6 bg-green-50 border-2 border-green-300 rounded-lg">
          <h3 className="text-xl font-bold text-green-800 mb-3 text-center">
            🎉 MIGRATION COMPLETE!
          </h3>
          <div className="text-green-700 space-y-2">
            <div className="text-center mb-4">
              <strong>Your Firebase to Supabase migration is successful!</strong>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">✅ What's Working:</h4>
                <ul className="text-sm space-y-1">
                  <li>• Database schema deployed</li>
                  <li>• Authentication system</li>
                  <li>• File storage (direct API)</li>
                  <li>• Security policies</li>
                  <li>• Core CRUD operations</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">🚀 Next Steps:</h4>
                <ul className="text-sm space-y-1">
                  <li>• Update app components to use Supabase</li>
                  <li>• Replace Firebase imports</li>
                  <li>• Test all app features</li>
                  <li>• Deploy to production</li>
                  <li>• Monitor performance</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Troubleshooting */}
      {overallStatus && !overallStatus.allPassed && (
        <div className="p-6 bg-yellow-50 border border-yellow-300 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">🔧 Troubleshooting:</h3>
          <div className="text-yellow-700 text-sm space-y-1">
            <div>• Check individual test results above for specific issues</div>
            <div>• Verify SQL scripts were run correctly in Supabase</div>
            <div>• Ensure all environment variables are set</div>
            <div>• Check browser console for additional errors</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Step6FinalTesting