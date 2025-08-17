import React, { useState } from 'react';
import edgeFunctionsService from '../../services/supabase/edgeFunctions';

const DatabasePermissionTest = () => {
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const runDatabaseTest = async () => {
    setLoading(true);
    try {
      console.log('🔄 Testing database permissions...');
      const results = await edgeFunctionsService.callFunction('test-db-permissions', {});
      console.log('✅ Database permission test results:', results);
      setTestResults(results);
    } catch (error) {
      console.error('❌ Database permission test failed:', error);
      setTestResults({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const getTestStatus = (test) => {
    if (!test) return 'unknown';
    return test.success ? 'pass' : 'fail';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pass': return 'text-green-600 bg-green-50 border-green-200';
      case 'fail': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">🗄️ Database Permission Test</h2>

      <div className="mb-6 text-center">
        <button
          onClick={runDatabaseTest}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Testing Database Permissions...' : 'Run Database Permission Test'}
        </button>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Testing database permissions and connectivity...</p>
        </div>
      )}

      {testResults && !loading && (
        <div className="space-y-6">
          {testResults.error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-semibold text-red-800 mb-2">Test Failed</h4>
              <p className="text-red-700 text-sm">{testResults.error}</p>
            </div>
          ) : (
            <>
              {/* Environment Check */}
              {testResults.results?.environment && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-3">Environment Variables</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Supabase URL:</strong> {testResults.results.environment.hasSupabaseUrl ? '✅ Present' : '❌ Missing'}
                      {testResults.results.environment.supabaseUrlLength > 0 && (
                        <span className="text-gray-600"> ({testResults.results.environment.supabaseUrlLength} chars)</span>
                      )}
                    </div>
                    <div>
                      <strong>Service Key:</strong> {testResults.results.environment.hasServiceKey ? '✅ Present' : '❌ Missing'}
                      {testResults.results.environment.serviceKeyLength > 0 && (
                        <span className="text-gray-600"> ({testResults.results.environment.serviceKeyLength} chars)</span>
                      )}
                    </div>
                    <div>
                      <strong>Anon Key:</strong> {testResults.results.environment.hasAnonKey ? '✅ Present' : '❌ Missing'}
                    </div>
                  </div>
                </div>
              )}

              {/* Test Results */}
              {testResults.results && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Database Permission Tests</h3>
                  
                  {/* Basic Connection */}
                  {testResults.results.basicConnection && (
                    <div className={`p-4 border rounded-lg ${getStatusColor(getTestStatus(testResults.results.basicConnection))}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span>{getStatusIcon(getTestStatus(testResults.results.basicConnection))}</span>
                        <span className="font-medium">Basic Database Connection</span>
                      </div>
                      <p className="text-sm">
                        {testResults.results.basicConnection.success 
                          ? 'Successfully connected to database' 
                          : `Connection failed: ${testResults.results.basicConnection.error}`
                        }
                      </p>
                    </div>
                  )}

                  {/* Teacher Count */}
                  {testResults.results.teacherCount && (
                    <div className={`p-4 border rounded-lg ${getStatusColor(getTestStatus(testResults.results.teacherCount))}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span>{getStatusIcon(getTestStatus(testResults.results.teacherCount))}</span>
                        <span className="font-medium">Teacher Count Query</span>
                      </div>
                      <p className="text-sm">
                        {testResults.results.teacherCount.success 
                          ? `Found ${testResults.results.teacherCount.count} teachers in database`
                          : `Query failed: ${testResults.results.teacherCount.error}`
                        }
                      </p>
                    </div>
                  )}

                  {/* Insert Test */}
                  {testResults.results.insertTest && (
                    <div className={`p-4 border rounded-lg ${getStatusColor(getTestStatus(testResults.results.insertTest))}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span>{getStatusIcon(getTestStatus(testResults.results.insertTest))}</span>
                        <span className="font-medium">Database Insert Test</span>
                      </div>
                      <p className="text-sm">
                        {testResults.results.insertTest.success 
                          ? 'Successfully inserted and deleted test record'
                          : `Insert failed: ${testResults.results.insertTest.error}`
                        }
                      </p>
                    </div>
                  )}

                  {/* Auth Admin */}
                  {testResults.results.authAdmin && (
                    <div className={`p-4 border rounded-lg ${getStatusColor(getTestStatus(testResults.results.authAdmin))}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span>{getStatusIcon(getTestStatus(testResults.results.authAdmin))}</span>
                        <span className="font-medium">Auth Admin Functions</span>
                      </div>
                      <p className="text-sm">
                        {testResults.results.authAdmin.success 
                          ? `Auth admin working - ${testResults.results.authAdmin.userCount} users found`
                          : `Auth admin failed: ${testResults.results.authAdmin.error}`
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Test Summary</h4>
                <div className="text-sm text-gray-600">
                  <div>Timestamp: {testResults.timestamp}</div>
                  {testResults.results && (
                    <div className="mt-2">
                      Tests Run: {Object.keys(testResults.results).length}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">Database Permission Test</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Basic Connection:</strong> Tests if Edge Function can connect to database</li>
          <li>• <strong>Teacher Count:</strong> Tests if it can query existing data</li>
          <li>• <strong>Insert Test:</strong> Tests if it can create and delete records</li>
          <li>• <strong>Auth Admin:</strong> Tests if service role can manage users</li>
          <li>• <strong>Environment:</strong> Verifies all required keys are present</li>
        </ul>
      </div>
    </div>
  );
};

export default DatabasePermissionTest;