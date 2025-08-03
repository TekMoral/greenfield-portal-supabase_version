import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

const DebugTest = () => {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    setLoading(true);
    const testResults = {};
    const testErrors = {};

    // Test 1: Basic Supabase connection
    try {
      console.log('🔍 Testing Supabase connection...');
      const { data, error } = await supabase.from('user_profiles').select('count', { count: 'exact', head: true });
      if (error) throw error;
      testResults.supabaseConnection = `✅ Connected - ${data || 0} profiles found`;
    } catch (error) {
      testErrors.supabaseConnection = `❌ Connection failed: ${error.message}`;
    }

    // Test 2: Check if students exist in user_profiles
    try {
      console.log('🔍 Testing students in user_profiles...');
      const { data, error } = await supabase
        .from('user_profiles')
        .select('count', { count: 'exact', head: true })
        .eq('role', 'student');
      if (error) throw error;
      testResults.studentsTable = `✅ Students found in user_profiles - ${data || 0} records`;
    } catch (error) {
      testErrors.studentsTable = `❌ Students query error: ${error.message}`;
    }

    // Test 3: Check if classes table exists
    try {
      console.log('🔍 Testing classes table...');
      const { data, error } = await supabase.from('classes').select('count', { count: 'exact', head: true });
      if (error) throw error;
      testResults.classesTable = `✅ Classes table exists - ${data || 0} records`;
    } catch (error) {
      testErrors.classesTable = `❌ Classes table error: ${error.message}`;
    }

    // Test 4: Check if teachers exist in user_profiles
    try {
      console.log('🔍 Testing teachers in user_profiles...');
      const { data, error } = await supabase
        .from('user_profiles')
        .select('count', { count: 'exact', head: true })
        .eq('role', 'teacher');
      if (error) throw error;
      testResults.teachersTable = `✅ Teachers found in user_profiles - ${data || 0} records`;
    } catch (error) {
      testErrors.teachersTable = `❌ Teachers query error: ${error.message}`;
    }

    // Test 5: Check if subjects table exists
    try {
      console.log('🔍 Testing subjects table...');
      const { data, error } = await supabase.from('subjects').select('count', { count: 'exact', head: true });
      if (error) throw error;
      testResults.subjectsTable = `✅ Subjects table exists - ${data || 0} records`;
    } catch (error) {
      testErrors.subjectsTable = `❌ Subjects table error: ${error.message}`;
    }

    // Test 6: List all available tables
    try {
      console.log('🔍 Listing all tables...');
      const { data, error } = await supabase.rpc('get_schema_tables');
      if (error) {
        // Fallback: try to get table info from information_schema
        const { data: schemaData, error: schemaError } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public');
        
        if (schemaError) throw schemaError;
        testResults.availableTables = `✅ Available tables: ${schemaData?.map(t => t.table_name).join(', ') || 'None found'}`;
      } else {
        testResults.availableTables = `✅ Available tables: ${data?.join(', ') || 'None found'}`;
      }
    } catch (error) {
      testErrors.availableTables = `❌ Could not list tables: ${error.message}`;
    }

    // Test 7: Test simple data fetch
    try {
      console.log('🔍 Testing simple data fetch...');
      const { data, error } = await supabase.from('user_profiles').select('*').limit(5);
      if (error) throw error;
      testResults.dataFetch = `✅ Data fetch successful - ${data?.length || 0} records retrieved`;
    } catch (error) {
      testErrors.dataFetch = `❌ Data fetch failed: ${error.message}`;
    }

    setResults(testResults);
    setErrors(testErrors);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Running database tests...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">🔧 Database Debug Test</h1>
        
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-green-600">✅ Successful Tests</h2>
          {Object.entries(results).map(([test, result]) => (
            <div key={test} className="bg-green-50 border border-green-200 rounded p-3">
              <strong>{test}:</strong> {result}
            </div>
          ))}
          
          {Object.keys(errors).length > 0 && (
            <>
              <h2 className="text-lg font-semibold text-red-600 mt-6">❌ Failed Tests</h2>
              {Object.entries(errors).map(([test, error]) => (
                <div key={test} className="bg-red-50 border border-red-200 rounded p-3">
                  <strong>{test}:</strong> {error}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-semibold text-blue-800">Next Steps:</h3>
          <ul className="list-disc list-inside text-blue-700 mt-2 space-y-1">
            <li>If tables don't exist, you need to create them in Supabase</li>
            <li>If connection fails, check your Supabase credentials</li>
            <li>If data fetch fails, check your RLS policies</li>
            <li>Empty tables are normal for a new setup</li>
          </ul>
        </div>

        <button
          onClick={runTests}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Run Tests Again
        </button>
      </div>
    </div>
  );
};

export default DebugTest;