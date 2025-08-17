import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const DatabasePermissionsTest = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const testPermissions = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log('🔍 Testing database permissions...');

      // Test 1: Check if we can read from user_profiles
      console.log('📖 Testing read permissions...');
      const { data: readData, error: readError } = await supabase
        .from('user_profiles')
        .select('id, email, role')
        .limit(1);

      // Test 2: Check if we can insert into user_profiles (this will likely fail)
      console.log('✏️ Testing write permissions...');
      const testProfile = {
        id: crypto.randomUUID(),
        email: `test-${Date.now()}@example.com`,
        full_name: 'Test User',
        role: 'teacher',  // Use valid role
        is_active: true,
        status: 'active'
      };

      const { data: writeData, error: writeError } = await supabase
        .from('user_profiles')
        .insert(testProfile)
        .select()
        .single();

      // If insert succeeded, clean it up
      if (writeData && !writeError) {
        await supabase
          .from('user_profiles')
          .delete()
          .eq('id', testProfile.id);
      }

      // Test 3: Check RLS policies
      console.log('🔒 Checking RLS policies...');
      let policies = null;
      let policiesError = null;
      
      try {
        const result = await supabase.rpc('get_table_policies', { table_name: 'user_profiles' });
        policies = result.data;
        policiesError = result.error;
      } catch (error) {
        policiesError = { message: 'RPC function not available' };
      }

      setResult({
        read: {
          success: !readError,
          error: readError?.message,
          data: readData?.length || 0
        },
        write: {
          success: !writeError,
          error: writeError?.message,
          attempted: testProfile.email
        },
        policies: {
          success: !policiesError,
          error: policiesError?.message,
          data: policies
        },
        currentUser: {
          id: (await supabase.auth.getUser()).data.user?.id,
          role: (await supabase.auth.getUser()).data.user?.user_metadata?.role
        }
      });

    } catch (error) {
      console.error('💥 Permission test error:', error);
      setResult({
        error: error.message,
        type: 'test_error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-orange-50 border border-orange-200 rounded">
      <h3 className="text-lg font-bold mb-3">🔒 Database Permissions Test</h3>
      
      <button
        onClick={testPermissions}
        disabled={loading}
        className={`px-4 py-2 rounded text-white font-medium ${
          loading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-orange-600 hover:bg-orange-700'
        }`}
      >
        {loading ? 'Testing...' : 'Test Database Permissions'}
      </button>

      {result && (
        <div className="mt-4 p-4 bg-white border border-gray-200 rounded">
          <h4 className="font-semibold mb-2">🔍 Permission Test Results:</h4>
          
          {result.error ? (
            <div className="p-2 bg-red-50 border border-red-200 rounded">
              <strong>Test Error:</strong> {result.error}
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {/* Read Test */}
              <div className="p-2 border rounded">
                <div className="flex items-center justify-between">
                  <strong>📖 Read Permission:</strong>
                  <span className={result.read.success ? 'text-green-600' : 'text-red-600'}>
                    {result.read.success ? '✅ Success' : '❌ Failed'}
                  </span>
                </div>
                {result.read.error && (
                  <div className="text-red-600 text-xs mt-1">{result.read.error}</div>
                )}
                {result.read.success && (
                  <div className="text-gray-600 text-xs mt-1">Found {result.read.data} records</div>
                )}
              </div>

              {/* Write Test */}
              <div className="p-2 border rounded">
                <div className="flex items-center justify-between">
                  <strong>✏️ Write Permission:</strong>
                  <span className={result.write.success ? 'text-green-600' : 'text-red-600'}>
                    {result.write.success ? '✅ Success' : '❌ Failed'}
                  </span>
                </div>
                {result.write.error && (
                  <div className="text-red-600 text-xs mt-1">{result.write.error}</div>
                )}
                <div className="text-gray-600 text-xs mt-1">Attempted: {result.write.attempted}</div>
              </div>

              {/* Current User */}
              <div className="p-2 border rounded">
                <strong>👤 Current User:</strong>
                <div className="text-xs mt-1">
                  <div>ID: {result.currentUser.id}</div>
                  <div>Role: {result.currentUser.role || 'Not set'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
        <h4 className="font-semibold text-gray-800 mb-2">🎯 What this test does:</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Tests if your user can read from user_profiles table</li>
          <li>• Tests if your user can write to user_profiles table</li>
          <li>• Shows your current user ID and role</li>
          <li>• Helps identify RLS policy issues</li>
        </ul>
      </div>
    </div>
  );
};

export default DatabasePermissionsTest;