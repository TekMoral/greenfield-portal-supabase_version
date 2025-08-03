// src/components/debug/SchemaValidator.jsx
import React, { useState, useEffect } from 'react'
import { validateSchema, checkRLSStatus, testBasicOperations } from '../../utils/schemaValidator'

const SchemaValidator = () => {
  const [schemaStatus, setSchemaStatus] = useState('loading')
  const [schemaResults, setSchemaResults] = useState(null)
  const [rlsResults, setRlsResults] = useState(null)
  const [operationResults, setOperationResults] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const runValidation = async () => {
      try {
        setLoading(true)
        
        // Validate schema
        const schemaResult = await validateSchema()
        setSchemaResults(schemaResult)
        
        if (schemaResult.success) {
          setSchemaStatus('success')
          
          // Test RLS
          const rlsResult = await checkRLSStatus()
          setRlsResults(rlsResult)
          
          // Test basic operations
          const opResult = await testBasicOperations()
          setOperationResults(opResult)
        } else {
          setSchemaStatus('error')
        }
      } catch (error) {
        setSchemaStatus('error')
        console.error('Schema validation error:', error)
      } finally {
        setLoading(false)
      }
    }

    runValidation()
  }, [])

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto mt-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Validating database schema...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto mt-8">
      <h2 className="text-xl font-bold mb-6">Database Schema Validation</h2>
      
      {/* Schema Status */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Schema Status</h3>
        {schemaResults && (
          <div className={`p-4 rounded-lg ${schemaResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-2">{schemaResults.success ? '✅' : '❌'}</span>
              <span className={`font-semibold ${schemaResults.success ? 'text-green-800' : 'text-red-800'}`}>
                {schemaResults.success ? 'Schema is complete!' : 'Schema has missing tables'}
              </span>
            </div>
            <div className="text-sm space-y-1">
              <div>Total Tables: {schemaResults.totalTables}</div>
              <div>Existing: {schemaResults.existingTables}</div>
              <div>Missing: {schemaResults.missingTables}</div>
            </div>
            
            {schemaResults.missingTables > 0 && (
              <div className="mt-3">
                <h4 className="font-semibold text-red-800 mb-1">Missing Tables:</h4>
                <div className="text-red-700 text-sm">
                  {schemaResults.missingTableNames.join(', ')}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RLS Status */}
      {rlsResults && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Row Level Security (RLS) Status</h3>
          <div className="space-y-2">
            {rlsResults.results.map((result, index) => (
              <div key={index} className={`p-3 rounded ${result.accessible ? 'bg-green-50' : 'bg-yellow-50'}`}>
                <div className="flex items-center">
                  <span className="mr-2">{result.accessible ? '✅' : '⚠️'}</span>
                  <span className="font-medium">{result.table}</span>
                  <span className="ml-2 text-sm text-gray-600">
                    {result.accessible ? 'Accessible' : 'Protected by RLS'}
                  </span>
                </div>
                {result.error && (
                  <div className="text-sm text-gray-600 mt-1">
                    Error: {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Basic Operations Test */}
      {operationResults && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Basic Operations Test</h3>
          <div className="space-y-2">
            {Object.entries(operationResults.tests).map(([testName, result]) => (
              <div key={testName} className={`p-3 rounded ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center">
                  <span className="mr-2">{result.success ? '✅' : '❌'}</span>
                  <span className="font-medium">{testName}</span>
                  {result.success && (
                    <span className="ml-2 text-sm text-gray-600">
                      ({result.dataCount} records)
                    </span>
                  )}
                </div>
                {result.error && (
                  <div className="text-sm text-red-600 mt-1">
                    Error: {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Steps */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Next Steps:</h3>
        <div className="text-blue-700 text-sm space-y-1">
          {schemaResults?.success ? (
            <>
              <div>✅ Schema is ready for migration</div>
              <div>✅ Proceed to Step 2: Authentication Migration</div>
            </>
          ) : (
            <>
              <div>❌ Deploy the database schema first</div>
              <div>📝 Run the SQL files in your Supabase dashboard</div>
              <div>🔄 Refresh this page after deployment</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SchemaValidator