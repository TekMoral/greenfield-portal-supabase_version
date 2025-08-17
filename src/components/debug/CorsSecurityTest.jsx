import React, { useState, useEffect } from 'react';
import { 
  getCorsConfig, 
  isOriginAllowed, 
  validateCorsSetup, 
  debugCors, 
  getCorsRecommendations,
  currentEnvironment,
  currentConfig 
} from '../../utils/corsConfig';
import edgeFunctionsService from '../../services/supabase/edgeFunctions';

const CorsSecurityTest = () => {
  const [corsValidation, setCorsValidation] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Run initial CORS validation with error handling
    try {
      const validation = validateCorsSetup();
      setCorsValidation(validation);
    } catch (error) {
      console.error('CORS validation error:', error);
      setCorsValidation({
        isAllowed: false,
        issues: ['Failed to validate CORS setup'],
        recommendations: ['Check CORS configuration']
      });
    }
  }, []);

  const runCorsTests = async () => {
    setLoading(true);
    setTestResults(null);

    const results = {
      timestamp: new Date().toISOString(),
      environment: currentEnvironment,
      currentOrigin: window.location.origin,
      tests: []
    };

    try {
      // Test 1: Basic Edge Function connectivity
      try {
        const response = await edgeFunctionsService.callFunction('health-check');
        results.tests.push({
          name: 'Edge Function Connectivity',
          status: 'pass',
          message: 'Successfully connected to Edge Functions',
          details: { responseReceived: !!response }
        });
      } catch (error) {
        results.tests.push({
          name: 'Edge Function Connectivity',
          status: 'fail',
          message: `Edge Function connection failed: ${error.message}`,
          details: { error: error.message }
        });
      }

      // Test 2: CORS Headers Test
      try {
        const testResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-check`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Origin': window.location.origin
          },
          body: JSON.stringify({ test: true })
        });

        const corsHeaders = {
          'access-control-allow-origin': testResponse.headers.get('access-control-allow-origin'),
          'access-control-allow-credentials': testResponse.headers.get('access-control-allow-credentials'),
          'access-control-allow-methods': testResponse.headers.get('access-control-allow-methods'),
          'access-control-allow-headers': testResponse.headers.get('access-control-allow-headers'),
        };

        results.tests.push({
          name: 'CORS Headers Test',
          status: testResponse.ok ? 'pass' : 'warn',
          message: testResponse.ok ? 'CORS headers received successfully' : 'Response received but with warnings',
          details: { 
            statusCode: testResponse.status,
            corsHeaders: corsHeaders,
            hasOriginHeader: !!corsHeaders['access-control-allow-origin']
          }
        });
      } catch (error) {
        results.tests.push({
          name: 'CORS Headers Test',
          status: 'fail',
          message: `CORS test failed: ${error.message}`,
          details: { error: error.message }
        });
      }

      // Test 3: Preflight Request Test
      try {
        const preflightResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-check`, {
          method: 'OPTIONS',
          headers: {
            'Origin': window.location.origin,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'authorization, content-type'
          }
        });

        results.tests.push({
          name: 'CORS Preflight Test',
          status: preflightResponse.ok ? 'pass' : 'fail',
          message: preflightResponse.ok ? 'Preflight request successful' : 'Preflight request failed',
          details: { 
            statusCode: preflightResponse.status,
            preflightAllowed: preflightResponse.ok
          }
        });
      } catch (error) {
        results.tests.push({
          name: 'CORS Preflight Test',
          status: 'fail',
          message: `Preflight test failed: ${error.message}`,
          details: { error: error.message }
        });
      }

      // Test 4: Origin Validation
      try {
        const originAllowed = isOriginAllowed();
        results.tests.push({
          name: 'Origin Validation',
          status: originAllowed ? 'pass' : 'warn',
          message: originAllowed ? 'Current origin is in allowed list' : 'Current origin may not be in allowed list',
          details: { 
            currentOrigin: window.location.origin,
            isAllowed: originAllowed,
            allowedOrigins: currentConfig?.allowedOrigins || []
          }
        });
      } catch (error) {
        results.tests.push({
          name: 'Origin Validation',
          status: 'fail',
          message: `Origin validation failed: ${error.message}`,
          details: { error: error.message }
        });
      }

      // Test 5: Security Headers Test
      try {
        const securityResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-check`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ test: true })
        });

        const securityHeaders = {
          'x-content-type-options': securityResponse.headers.get('x-content-type-options'),
          'x-frame-options': securityResponse.headers.get('x-frame-options'),
          'x-xss-protection': securityResponse.headers.get('x-xss-protection'),
          'strict-transport-security': securityResponse.headers.get('strict-transport-security'),
          'referrer-policy': securityResponse.headers.get('referrer-policy'),
        };

        const hasSecurityHeaders = Object.values(securityHeaders).some(header => header !== null);

        results.tests.push({
          name: 'Security Headers Test',
          status: hasSecurityHeaders ? 'pass' : 'warn',
          message: hasSecurityHeaders ? 'Security headers present' : 'Some security headers missing',
          details: { securityHeaders }
        });
      } catch (error) {
        results.tests.push({
          name: 'Security Headers Test',
          status: 'fail',
          message: `Security headers test failed: ${error.message}`,
          details: { error: error.message }
        });
      }

      setTestResults(results);
    } catch (error) {
      console.error('CORS test error:', error);
      setTestResults({
        ...results,
        error: error.message
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
      case 'pass': return '���';
      case 'warn': return '⚠️';
      case 'fail': return '❌';
      default: return '❓';
    }
  };

  const handleDebugCors = () => {
    try {
      debugCors();
      alert('CORS debug information logged to console. Check the browser console for details.');
    } catch (error) {
      console.error('Debug CORS error:', error);
      alert('Error running CORS debug. Check console for details.');
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">🔒 CORS Security Test</h2>

      {/* Environment Info */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Current Environment</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
          <div>
            <strong>Environment:</strong> {currentEnvironment || 'Unknown'}
          </div>
          <div>
            <strong>Origin:</strong> {window.location.origin}
          </div>
          <div>
            <strong>Strict Mode:</strong> {currentConfig?.strictMode ? 'Enabled' : 'Disabled'}
          </div>
        </div>
      </div>

      {/* CORS Validation */}
      {corsValidation && (
        <div className={`mb-6 p-4 border rounded-lg ${corsValidation.isAllowed ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <h3 className="font-semibold mb-2">CORS Configuration Status</h3>
          <div className="text-sm space-y-1">
            <div>
              <strong>Origin Allowed:</strong> {corsValidation.isAllowed ? '✅ Yes' : '⚠️ No'}
            </div>
            {corsValidation.issues && corsValidation.issues.length > 0 && (
              <div>
                <strong>Issues:</strong>
                <ul className="list-disc list-inside ml-4">
                  {corsValidation.issues.map((issue, index) => (
                    <li key={index} className="text-red-600">{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            {corsValidation.recommendations && corsValidation.recommendations.length > 0 && (
              <div>
                <strong>Recommendations:</strong>
                <ul className="list-disc list-inside ml-4">
                  {corsValidation.recommendations.map((rec, index) => (
                    <li key={index} className="text-blue-600">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={runCorsTests}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Running Tests...' : 'Run CORS Tests'}
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

      {/* Test Results */}
      {testResults && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Test Results</h3>
          
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {testResults.tests?.filter(t => t.status === 'pass').length || 0}
              </div>
              <div className="text-sm text-green-600">Passed</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {testResults.tests?.filter(t => t.status === 'warn').length || 0}
              </div>
              <div className="text-sm text-yellow-600">Warnings</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {testResults.tests?.filter(t => t.status === 'fail').length || 0}
              </div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
          </div>

          {/* Individual Test Results */}
          {testResults.tests && (
            <div className="space-y-3">
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
        </div>
      )}

      {/* Recommendations */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-semibold text-gray-800 mb-2">Environment-Specific Recommendations</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          {getCorsRecommendations().map((rec, index) => (
            <li key={index}>• {rec}</li>
          ))}
        </ul>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">How to Use This Tool</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Run CORS Tests:</strong> Comprehensive test of CORS configuration</li>
          <li>• <strong>Debug CORS:</strong> Logs detailed CORS information to browser console</li>
          <li>• <strong>Show Details:</strong> Reveals technical details for each test</li>
          <li>• <strong>Environment Detection:</strong> Automatically detects current environment</li>
        </ul>
      </div>
    </div>
  );
};

export default CorsSecurityTest;