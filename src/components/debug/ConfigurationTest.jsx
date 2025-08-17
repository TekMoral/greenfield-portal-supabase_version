import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import edgeFunctionsService from '../../services/supabase/edgeFunctions';
import { migrationControl } from '../../services/supabase/migrationWrapper';
import { validateCorsSetup, debugCors } from '../../utils/corsConfig';
import { supabase } from '../../lib/supabaseClient';

const ConfigurationTest = () => {
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { user, profile, role } = useAuth();

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

    try {
      // Test 1: Environment Variables
      console.log('🔄 Testing environment variables...');
      const envTest = {
        name: 'Environment Variables',
        status: 'pass',
        details: {
          VITE_SUPABASE_URL: !!import.meta.env.VITE_SUPABASE_URL,
          VITE_SUPABASE_ANON_KEY: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
          VITE_USE_EDGE_FUNCTIONS_FOR_TEACHERS: import.meta.env.VITE_USE_EDGE_FUNCTIONS_FOR_TEACHERS,
          VITE_USE_EDGE_FUNCTIONS_FOR_STUDENTS: import.meta.env.VITE_USE_EDGE_FUNCTIONS_FOR_STUDENTS,
          VITE_USE_EDGE_FUNCTIONS_FOR_ADMINS: import.meta.env.VITE_USE_EDGE_FUNCTIONS_FOR_ADMINS,
          MODE: import.meta.env.MODE
        }
      };

      const missingEnvVars = [];
      if (!import.meta.env.VITE_SUPABASE_URL) missingEnvVars.push('VITE_SUPABASE_URL');
      if (!import.meta.env.VITE_SUPABASE_ANON_KEY) missingEnvVars.push('VITE_SUPABASE_ANON_KEY');

      if (missingEnvVars.length > 0) {
        envTest.status = 'fail';
        envTest.message = `Missing environment variables: ${missingEnvVars.join(', ')}`;
      } else {
        envTest.message = 'All required environment variables present';
      }

      results.tests.push(envTest);

      // Test 2: Supabase Connection
      console.log('🔄 Testing Supabase connection...');
      try {
        const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
        results.tests.push({
          name: 'Supabase Connection',
          status: error ? 'fail' : 'pass',
          message: error ? `Connection failed: ${error.message}` : 'Supabase connection successful',
          details: { error: error?.message, hasData: !!data }
        });
      } catch (error) {
        results.tests.push({
          name: 'Supabase Connection',
          status: 'fail',
          message: `Connection error: ${error.message}`,
          details: { error: error.message }
        });
      }

      // Test 3: Authentication Status
      console.log('🔄 Testing authentication...');
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

      // Test 4: Migration Wrapper Status
      console.log('🔄 Testing migration wrapper...');
      try {
        const migrationStats = migrationControl.getMigrationStats();
        const featureFlags = migrationControl.getFeatureFlags();
        
        results.tests.push({
          name: 'Migration Wrapper',
          status: 'pass',
          message: `${migrationStats.enabled}/${migrationStats.total} features enabled (${migrationStats.percentage}%)`,
          details: {
            stats: migrationStats,
            flags: featureFlags
          }
        });
      } catch (error) {
        results.tests.push({
          name: 'Migration Wrapper',
          status: 'fail',
          message: `Migration wrapper error: ${error.message}`,
          details: { error: error.message }
        });
      }

      // Test 5: Edge Functions Connectivity
      console.log('🔄 Testing Edge Functions...');
      try {
        const healthCheck = await edgeFunctionsService.checkSystemHealth();
        results.tests.push({
          name: 'Edge Functions',
          status: healthCheck.status === 'healthy' ? 'pass' : healthCheck.status === 'degraded' ? 'warn' : 'fail',
          message: `System status: ${healthCheck.status}`,
          details: {
            status: healthCheck.status,
            summary: healthCheck.summary,
            uptime: healthCheck.uptime,
            version: healthCheck.version,
            debug: healthCheck.debug
          }
        });
      } catch (error) {
        console.error('Edge Functions test error:', error);
        
        // Try to extract more information from the error
        let errorDetails = { error: error.message };
        
        if (error.message.includes('non-2xx status code')) {
          errorDetails.suggestion = 'Check Edge Function logs for detailed error information';
          errorDetails.possibleCauses = [
            'Missing environment variables in Edge Function',
            'Database connection issues',
            'Authentication configuration problems',
            'Edge Function deployment issues'
          ];
        }
        
        results.tests.push({
          name: 'Edge Functions',
          status: 'fail',
          message: `Edge Functions error: ${error.message}`,
          details: errorDetails
        });
      }

      // Test 6: CORS Configuration
      console.log('🔄 Testing CORS configuration...');
      try {
        const corsValidation = validateCorsSetup();
        results.tests.push({
          name: 'CORS Configuration',
          status: corsValidation.isAllowed ? 'pass' : 'warn',
          message: corsValidation.isAllowed ? 'Origin is allowed' : 'Origin may not be in whitelist',
          details: corsValidation
        });
      } catch (error) {
        results.tests.push({
          name: 'CORS Configuration',
          status: 'fail',
          message: `CORS test error: ${error.message}`,
          details: { error: error.message }
        });
      }

      // Test 7: RLS Policies (if authenticated)
      if (user) {
        console.log('🔄 Testing RLS policies...');
        try {
          // Test user profile access
          const { data: ownProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('id, role, is_active')
            .eq('id', user.id)
            .single();

          // Test if we can see other profiles (should be limited by RLS)
          const { data: allProfiles, error: allProfilesError } = await supabase
            .from('user_profiles')
            .select('id, role')
            .limit(10);

          const rlsTest = {
            name: 'RLS Policies',
            details: {
              canAccessOwnProfile: !profileError && !!ownProfile,
              profilesVisible: allProfiles?.length || 0,
              ownProfileError: profileError?.message,
              allProfilesError: allProfilesError?.message
            }
          };

          if (profileError) {
            rlsTest.status = 'fail';
            rlsTest.message = `Cannot access own profile: ${profileError.message}`;
          } else if (allProfiles && allProfiles.length === 1 && allProfiles[0].id === user.id) {
            rlsTest.status = 'pass';
            rlsTest.message = 'RLS working correctly - can only see own profile';
          } else if (allProfiles && allProfiles.length > 1) {
            rlsTest.status = 'pass';
            rlsTest.message = `Can see ${allProfiles.length} profiles (admin/teacher access)`;
          } else {
            rlsTest.status = 'warn';
            rlsTest.message = 'RLS behavior unclear - needs investigation';
          }

          results.tests.push(rlsTest);
        } catch (error) {
          results.tests.push({
            name: 'RLS Policies',
            status: 'fail',
            message: `RLS test error: ${error.message}`,
            details: { error: error.message }
          });
        }
      } else {
        results.tests.push({
          name: 'RLS Policies',
          status: 'skip',
          message: 'Skipped - requires authentication',
          details: { reason: 'Not authenticated' }
        });
      }

      // Test 8: Service Exports
      console.log('🔄 Testing service exports...');
      try {
        // Test if key services are available
        const { getAllTeachers } = await import('../../services/supabase/migrationWrapper');
        const { getAllAdmins } = await import('../../services/supabase/adminService');
        const { getClasses } = await import('../../services/supabase/classService');

        const serviceTest = {
          name: 'Service Exports',
          status: 'pass',
          message: 'Key services are accessible',
          details: {
            migrationWrapper: !!getAllTeachers,
            adminService: !!getAllAdmins,
            classService: !!getClasses,
            edgeFunctionsService: !!edgeFunctionsService.checkSystemHealth
          }
        };

        results.tests.push(serviceTest);
      } catch (error) {
        results.tests.push({
          name: 'Service Exports',
          status: 'fail',
          message: `Service import error: ${error.message}`,
          details: { error: error.message }
        });
      }

      // Test 9: Feature Flag Consistency
      console.log('🔄 Testing feature flag consistency...');
      try {
        const envFlags = {
          teachers: import.meta.env.VITE_USE_EDGE_FUNCTIONS_FOR_TEACHERS === 'true',
          students: import.meta.env.VITE_USE_EDGE_FUNCTIONS_FOR_STUDENTS === 'true',
          admins: import.meta.env.VITE_USE_EDGE_FUNCTIONS_FOR_ADMINS === 'true'
        };

        const wrapperFlags = migrationControl.getFeatureFlags();

        const flagTest = {
          name: 'Feature Flag Consistency',
          details: {
            envFlags,
            wrapperFlags,
            consistent: JSON.stringify(envFlags) === JSON.stringify({
              teachers: wrapperFlags.USE_EDGE_FUNCTIONS_FOR_TEACHERS,
              students: wrapperFlags.USE_EDGE_FUNCTIONS_FOR_STUDENTS,
              admins: wrapperFlags.USE_EDGE_FUNCTIONS_FOR_ADMINS
            })
          }
        };

        if (flagTest.details.consistent) {
          flagTest.status = 'pass';
          flagTest.message = 'Feature flags are consistent';
        } else {
          flagTest.status = 'warn';
          flagTest.message = 'Feature flag mismatch detected';
        }

        results.tests.push(flagTest);
      } catch (error) {
        results.tests.push({
          name: 'Feature Flag Consistency',
          status: 'fail',
          message: `Flag test error: ${error.message}`,
          details: { error: error.message }
        });
      }

      // Calculate summary
      const summary = {
        total: results.tests.length,
        passed: results.tests.filter(t => t.status === 'pass').length,
        warnings: results.tests.filter(t => t.status === 'warn').length,
        failed: results.tests.filter(t => t.status === 'fail').length,
        skipped: results.tests.filter(t => t.status === 'skip').length
      };

      results.summary = summary;
      results.overallStatus = summary.failed > 0 ? 'fail' : summary.warnings > 0 ? 'warn' : 'pass';

      setTestResults(results);

    } catch (error) {
      console.error('Configuration test error:', error);
      setTestResults({
        error: error.message,
        timestamp: new Date().toISOString()
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
      case 'skip': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass': return '✅';
      case 'warn': return '⚠️';
      case 'fail': return '❌';
      case 'skip': return '⏭️';
      default: return '❓';
    }
  };

  const handleDebugCors = () => {
    debugCors();
    alert('CORS debug information logged to console. Check the browser console for details.');
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">🔧 Configuration Test Suite</h2>

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

        <button
          onClick={handleDebugCors}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          Debug CORS
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
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
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{testResults.summary.skipped}</div>
              <div className="text-sm text-gray-600">Skipped</div>
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
                  Overall Status: {testResults.overallStatus.toUpperCase()}
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
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">Configuration Test Guide</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Environment Variables:</strong> Checks required .env configuration</li>
          <li>• <strong>Supabase Connection:</strong> Tests database connectivity</li>
          <li>• <strong>Authentication:</strong> Verifies current user session</li>
          <li>• <strong>Migration Wrapper:</strong> Tests feature flag system</li>
          <li>• <strong>Edge Functions:</strong> Checks Edge Function health</li>
          <li>• <strong>CORS Configuration:</strong> Validates cross-origin settings</li>
          <li>• <strong>RLS Policies:</strong> Tests row-level security</li>
          <li>• <strong>Service Exports:</strong> Verifies service availability</li>
          <li>• <strong>Feature Flags:</strong> Checks flag consistency</li>
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

export default ConfigurationTest;