import React, { useState } from 'react';
import edgeFunctionsService from '../../services/supabase/edgeFunctions';

const SimpleTeacherTest = () => {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testSimpleTeacherCreation = async () => {
    setLoading(true);
    setTestResult(null);

    const testData = {
      name: 'Simple Test Teacher',
      email: `simple.test.${Date.now()}@example.com`,
      password: 'TestPassword123!',
      phoneNumber: '1234567890',
      subject: 'Mathematics',
      qualification: 'BSc Mathematics',
      dateHired: '2024-01-01'
    };

    try {
      console.log('🔄 Testing simple teacher creation...');
      
      // Call the simple function directly
      const result = await edgeFunctionsService.callFunction('create-teacher-simple', testData);
      
      console.log('✅ Simple teacher creation result:', result);
      setTestResult({
        success: true,
        data: result,
        testData: testData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Simple teacher creation failed:', error);
      setTestResult({
        success: false,
        error: error.message,
        errorDetails: error,
        testData: testData,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">🧪 Simple Teacher Creation Test</h2>

      <div className="mb-6 text-center">
        <button
          onClick={testSimpleTeacherCreation}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Testing Simple Creation...' : 'Test Simple Teacher Creation'}
        </button>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Testing simple teacher creation (auth only)...</p>
        </div>
      )}

      {testResult && !loading && (
        <div className="space-y-6">
          {/* Result Status */}
          <div className={`p-4 border rounded-lg ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{testResult.success ? '✅' : '❌'}</span>
              <h3 className="text-lg font-semibold">
                {testResult.success ? 'Simple Teacher Creation Successful!' : 'Simple Teacher Creation Failed'}
              </h3>
            </div>
            
            {testResult.success ? (
              <div className="text-green-700">
                <p className="mb-2">The simple Edge Function successfully created a teacher in the auth system!</p>
                <div className="text-sm">
                  <strong>Teacher ID:</strong> {testResult.data?.data?.id || 'N/A'}
                  <br />
                  <strong>Email:</strong> {testResult.data?.data?.email || testResult.testData.email}
                  <br />
                  <strong>Employee ID:</strong> {testResult.data?.data?.employeeId || 'N/A'}
                  <br />
                  <strong>Note:</strong> {testResult.data?.data?.note || 'N/A'}
                </div>
              </div>
            ) : (
              <div className="text-red-700">
                <p className="mb-2">The simple teacher creation failed:</p>
                <div className="bg-red-100 p-3 rounded text-sm font-mono">
                  {testResult.error}
                </div>
                {testResult.errorDetails && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">Show Error Details</summary>
                    <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
                      {JSON.stringify(testResult.errorDetails, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>

          {/* Test Data Used */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">Test Data Used</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>Name:</strong> {testResult.testData.name}</div>
              <div><strong>Email:</strong> {testResult.testData.email}</div>
              <div><strong>Subject:</strong> {testResult.testData.subject}</div>
              <div><strong>Qualification:</strong> {testResult.testData.qualification}</div>
              <div><strong>Phone:</strong> {testResult.testData.phoneNumber}</div>
              <div><strong>Date Hired:</strong> {testResult.testData.dateHired}</div>
            </div>
          </div>

          {/* Full Response (if successful) */}
          {testResult.success && testResult.data && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Full Response Data</h4>
              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-blue-700">Show Response Details</summary>
                <pre className="mt-2 p-3 bg-white border rounded overflow-auto text-xs">
                  {JSON.stringify(testResult.data, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {/* Timestamp */}
          <div className="text-xs text-gray-500 text-center">
            Test completed: {new Date(testResult.timestamp).toLocaleString()}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">Simple Teacher Creation Test</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Purpose:</strong> Tests basic teacher creation in auth system only</li>
          <li>• <strong>Approach:</strong> Skips database profile creation to isolate the issue</li>
          <li>• <strong>Success:</strong> If this works, the issue is with database permissions</li>
          <li>• <strong>Failure:</strong> If this fails, the issue is with the Edge Function setup</li>
          <li>• <strong>Logging:</strong> Detailed console logging for debugging</li>
        </ul>
      </div>
    </div>
  );
};

export default SimpleTeacherTest;