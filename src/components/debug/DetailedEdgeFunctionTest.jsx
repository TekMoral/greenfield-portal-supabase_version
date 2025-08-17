import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const DetailedEdgeFunctionTest = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const testWithDetails = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log('🧪 Testing Edge Function with detailed error handling...');
      
      // Get the current user's session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setResult({
          error: 'No active user session. Please log in first.',
          type: 'auth_error'
        });
        return;
      }

      console.log('🔑 Using user JWT token for authentication');
      
      // Make the function call with user's JWT token
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-teacher`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Teacher',
          email: `test-teacher-${Date.now()}@example.com`,
          subject: 'Mathematics',
          qualification: 'B.Sc Mathematics',
          phoneNumber: '1234567890',
          dateHired: new Date().toISOString().split('T')[0]
        })
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('📡 Raw response:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        responseData = { rawResponse: responseText };
      }

      setResult({
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        rawResponse: responseText
      });

    } catch (error) {
      console.error('💥 Fetch error:', error);
      setResult({
        error: error.message,
        type: 'fetch_error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-purple-50 border border-purple-200 rounded">
      <h3 className="text-lg font-bold mb-3">🔍 Detailed Edge Function Test</h3>
      
      <button
        onClick={testWithDetails}
        disabled={loading}
        className={`px-4 py-2 rounded text-white font-medium ${
          loading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-purple-600 hover:bg-purple-700'
        }`}
      >
        {loading ? 'Testing...' : 'Test with Full Details'}
      </button>

      {result && (
        <div className="mt-4 p-4 bg-white border border-gray-200 rounded">
          <h4 className="font-semibold mb-2">📊 Response Details:</h4>
          <div className="space-y-2 text-sm">
            <div><strong>Status:</strong> {result.status} {result.statusText}</div>
            <div><strong>OK:</strong> {result.ok ? '✅ Yes' : '❌ No'}</div>
            
            {result.error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded">
                <strong>Error:</strong> {result.error}
              </div>
            )}
            
            {result.data && (
              <div>
                <strong>Response Data:</strong>
                <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}
            
            {result.rawResponse && (
              <div>
                <strong>Raw Response:</strong>
                <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                  {result.rawResponse}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
        <h4 className="font-semibold text-gray-800 mb-2">🎯 What this test does:</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Makes a direct HTTP request to the Edge Function</li>
          <li>• Shows the exact HTTP status code and error message</li>
          <li>• Displays the raw response from the server</li>
          <li>• Helps identify authentication, permission, or code errors</li>
        </ul>
      </div>
    </div>
  );
};

export default DetailedEdgeFunctionTest;