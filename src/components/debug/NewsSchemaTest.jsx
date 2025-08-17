import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const NewsSchemaTest = () => {
  const [schemaInfo, setSchemaInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const checkSchema = async () => {
    setLoading(true);
    try {
      // Try to get table schema information
      const { data, error } = await supabase
        .from('news_events')
        .select('*')
        .limit(1);

      if (error) {
        setSchemaInfo({ error: error.message });
      } else {
        setSchemaInfo({ 
          success: true, 
          sampleData: data[0] || null,
          columns: data[0] ? Object.keys(data[0]) : []
        });
      }
    } catch (error) {
      setSchemaInfo({ error: error.message });
    }
    setLoading(false);
  };

  const testInsert = async () => {
    setLoading(true);
    try {
      const testData = {
        title: 'Test News Article',
        content: 'This is a test news article content.',
        type: 'news',
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('news_events')
        .insert(testData)
        .select()
        .single();

      if (error) {
        setTestResult({ error: error.message });
      } else {
        setTestResult({ success: true, data });
        
        // Clean up - delete the test record
        await supabase
          .from('news_events')
          .delete()
          .eq('id', data.id);
      }
    } catch (error) {
      setTestResult({ error: error.message });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">News Schema Test</h2>
      
      <div className="space-y-4">
        <button
          onClick={checkSchema}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Check Schema
        </button>
        
        <button
          onClick={testInsert}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          Test Insert
        </button>
      </div>

      {loading && (
        <div className="mt-4 text-blue-600">Loading...</div>
      )}

      {schemaInfo && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Schema Information</h3>
          {schemaInfo.error ? (
            <div className="text-red-600">Error: {schemaInfo.error}</div>
          ) : (
            <div>
              <div className="mb-4">
                <strong>Available Columns:</strong>
                <ul className="list-disc list-inside mt-2">
                  {schemaInfo.columns.map(col => (
                    <li key={col} className="text-sm">{col}</li>
                  ))}
                </ul>
              </div>
              
              {schemaInfo.sampleData && (
                <div>
                  <strong>Sample Data:</strong>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                    {JSON.stringify(schemaInfo.sampleData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {testResult && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Insert Test Result</h3>
          {testResult.error ? (
            <div className="text-red-600">Error: {testResult.error}</div>
          ) : (
            <div className="text-green-600">
              <div>✅ Insert successful!</div>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NewsSchemaTest;