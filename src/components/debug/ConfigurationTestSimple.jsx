import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import edgeFunctionsService from '../../services/supabase/edgeFunctions';
import { migrationControl } from '../../services/supabase/migrationWrapper';
import { supabase } from '../../lib/supabaseClient';

const ConfigurationTestSimple = () => {
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { user, profile, role } = useAuth();

  // Helper function to run a test with timeout
  const runTestWithTimeout = async (testName, testFunction, timeoutMs = 5000) => {
    return new Promise(async (resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          name: testName,
          status: 'fail',
          message: `Test timed out after ${timeoutMs}ms`,
          details: { error: 'Timeout' }
        });
      }, timeoutMs);

      try {
        const result = await testFunction();
        clearTimeout(timeout);
        resolve({
          name: testName,
          status: 'pass',
          message: result.message || 'Test passed',
          details: result.details || {}
        });
      } catch (error) {
        clearTimeout(timeout);
        resolve({
          name: testName,
          status: 'fail',
          message: error.message || 'Test failed',
          details: { error: error.message }
        });
      }
    });
  };

  const runConfigurationTests = async () => {
    setLoading(true);
    setTestResults(null);

    const results = {
      timestamp: new Date().toISOString(),
      environment: import.meta.env.MODE || 'development',
      user: {
        authenticated: !!user,
        role: role,
        profile: !!profile
      },
      tests: []
    };

    console.log('🔄 Starting configuration tests...');

    try {
      // Test 1: Environment Variables
      const envTest = await runTestWithTimeout('Environment Variables', async () => {
        const hasUrl = !!import.meta.env.VITE_SUPABASE_URL;
        const hasKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!hasUrl || !hasKey) {
          throw new Error('Missing required environment variables');
        }
        
        return {
          message: 'All required environment variables present',
          details: {
            VITE_SUPABASE_URL: hasUrl,
            VITE_SUPABASE_ANON_KEY: hasKey,
            MODE: import.meta.env.MODE
          }
        };
      });
      results.tests.push(envTest);

      // Test 2: Supabase Connection
      const dbTest = await runTestWithTimeout('Supabase Connection', async () => {
        const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
        
        if (error) {
          throw new Error(`Connection failed: ${error.message}`);
        }
        
        return {
          message: 'Supabase connection successful',
          details: { hasData: !!data }
        };
      });
      results.tests.push(dbTest);

      // Test 3: Authentication Status
      const authTest = {
        name: 'Authentication Status',
        status: user ? 'pass' : 'warn',
        message: user ? `Authenticated as ${role}` : 'Not authenticated',
        details: {
          hasUser: !!user,
          hasProfile: !!profile,
          userRole: role,
          userId: user?.id
        }
      };
      results.tests.push(authTest);

      // Test 4: Migration Wrapper
      const migrationTest = await runTestWithTimeout('Migration Wrapper', async () => {
        const migrationStats = migrationControl.getMigrationStats();
        const featureFlags = migrationControl.getFeatureFlags();
        
        return {
          message: `${migrationStats.enabled}/${migrationStats.total} features enabled (${migrationStats.percentage}%)`,
          details: { stats: migrationStats, flags: featureFlags }
        };
      });
      results.tests.push(migrationTest);

      // Test 5: Edge Functions (with shorter timeout)
      const edgeTest = await runTestWithTimeout('Edge Functions', async () => {
        const healthCheck = await edgeFunctionsService.checkSystemHealth();
        
        return {
          message: `System status: ${healthCheck.status}`,
          details: {
            status: healthCheck.status,
            summary: healthCheck.summary,
            version: healthCheck.version
          }
        };
      }, 10000); // 10 second timeout for Edge Functions
      results.tests.push(edgeTest);

      // Test 6: Feature Flag Consistency
      const flagTest = await runTestWithTimeout('Feature Flag Consistency', async () => {
        const envFlags = {
          teachers: import.meta.env.VITE_USE_EDGE_FUNCTIONS_FOR_TEACHERS === 'true',
          students: import.meta.env.VITE_USE_EDGE_FUNCTIONS_FOR_STUDENTS === 'true',
          admins: import.meta.env.VITE_USE_EDGE_FUNCTIONS_FOR_ADMINS === 'true'
        };

        const wrapperFlags = migrationControl.getFeatureFlags();
        const consistent = JSON.stringify(envFlags) === JSON.stringify({
          teachers: wrapperFlags.USE_EDGE_FUNCTIONS_FOR_TEACHERS,
          students: wrapperFlags.USE_EDGE_FUNCTIONS_FOR_STUDENTS,
          admins: wrapperFlags.USE_EDGE_FUNCTIONS_FOR_ADMINS
        });

        return {
          message: consistent ? 'Feature flags are consistent' : 'Feature flag mismatch detected',
          details: { envFlags, wrapperFlags, consistent }
        };
      });
      
      if (flagTest.details.consistent) {
        flagTest.status = 'pass';
      } else {
        flagTest.status = 'warn';
      }
      results.tests.push(flagTest);

      // Calculate summary
      const summary = {
        total: results.tests.length,
        passed: results.tests.filter(t => t.status === 'pass').length,
        warnings: results.tests.filter(t => t.status === 'warn').length,
        failed: results.tests.filter(t => t.status === 'fail').length,
        skipped: 0
      };

      results.summary = summary;
      results.overallStatus = summary.failed > 0 ? 'fail' : summary.warnings > 0 ? 'warn' : 'pass';

      console.log('✅ Configuration tests completed:', results);
      setTestResults(results);

    } catch (error) {
      console.error('❌ Configuration test error:', error);
      setTestResults({
        ...results,
        error: error.message,
        timestamp: new Date().toISOString(),
        summary: { total: 0, passed: 0, failed: 1, warnings: 0, skipped: 0 },
        overallStatus: 'fail'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pass': return 'text-green-600 bg-green-50 border-green-200';
      case 'warn': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'fail': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass': return '✅';
      case 'warn': return '⚠️';
      case 'fail': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">🔧 Configuration Test Suite (Simple)</h2>

      {/* Current User Info */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Current Session</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-blue-700">
          <div>
            <strong>Environment:</strong> {import.meta.env.MODE || 'development'}
          </div>
          <div>
            <strong>Authenticated:</strong> {user ? '✅ Yes' : '❌ No'}
          </div>
          <div>
            <strong>Role:</strong> {role || 'None'}
          </div>
          <div>
            <strong>Profile:</strong> {profile ? '✅ Loaded' : '❌ Missing'}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={runConfigurationTests}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Running Tests...' : 'Run Configuration Tests'}
        </button>

        {testResults && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        )}
      </div>

      {/* Test Results Summary */}
      {testResults && testResults.summary && (
        <div className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{testResults.summary.passed}</div>
              <div className="text-sm text-green-600">Passed</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{testResults.summary.warnings}</div>
              <div className="text-sm text-yellow-600">Warnings</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{testResults.summary.failed}</div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{testResults.summary.total}</div>
              <div className="text-sm text-blue-600">Total</div>
            </div>
          </div>

          {/* Overall Status */}
          <div className={`p-4 border rounded-lg ${getStatusColor(testResults.overallStatus)}`}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getStatusIcon(testResults.overallStatus)}</span>
              <div>
                <h3 className="text-lg font-semibold">
                  Overall Status: {testResults.overallStatus?.toUpperCase()}
                </h3>
                <p className="text-sm">
                  {testResults.summary.passed}/{testResults.summary.total} tests passed
                  {testResults.summary.warnings > 0 && `, ${testResults.summary.warnings} warnings`}
                  {testResults.summary.failed > 0 && `, ${testResults.summary.failed} failed`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Test Results */}
      {testResults && testResults.tests && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Test Results</h3>
          
          {testResults.tests.map((test, index) => (
            <div key={index} className={`p-4 border rounded-lg ${getStatusColor(test.status)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{getStatusIcon(test.status)}</span>
                    <span className="font-medium">{test.name}</span>
                  </div>
                  <p className="text-sm mb-2">{test.message}</p>
                  
                  {showDetails && test.details && (
                    <details className="text-xs">
                      <summary className="cursor-pointer font-medium">Technical Details</summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Display */}
      {testResults && testResults.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-semibold text-red-800 mb-2">Configuration Test Error</h4>
          <p className="text-red-700 text-sm">{testResults.error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Running configuration tests...</p>
          <p className="text-xs text-gray-500 mt-2">Tests will timeout after 30 seconds if they don't complete</p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">Simple Configuration Test</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Simplified tests:</strong> Focuses on core functionality only</li>
          <li>• <strong>Timeout protection:</strong> Tests will not run infinitely</li>
          <li>• <strong>Essential checks:</strong> Environment, Database, Auth, Migration, Edge Functions</li>
          <li>• <strong>Quick results:</strong> Completes in under 30 seconds</li>
        </ul>
      </div>

      {/* Timestamp */}
      {testResults && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          Last tested: {new Date(testResults.timestamp).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default ConfigurationTestSimple;