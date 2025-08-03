import React, { useState } from 'react';
import { createStudent } from '../../services/supabase/studentService';

const StudentCreationTest = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState(null);

  const testStudentCreation = async () => {
    setIsCreating(true);
    setResult(null);

    const testData = {
      firstName: "Test",
      surname: "Student",
      admissionNumber: "T00124",
      email: "tstudent124@greenfield.edu.ng",
      gender: "Male",
      dateOfBirth: "2010-01-01",
      classId: "some-class-id", // You'll need to replace with a real class ID
      contact: "08012345678",
      guardianName: "Test Guardian"
    };

    try {
      console.log('🔄 Testing student creation with data:', testData);
      const result = await createStudent(testData);
      console.log('📊 Student creation result:', result);
      setResult(result);
    } catch (error) {
      console.error('❌ Student creation error:', error);
      setResult({ success: false, error: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4">Student Creation Test</h3>
      
      <button
        onClick={testStudentCreation}
        disabled={isCreating}
        className={`w-full py-2 px-4 rounded-lg font-medium ${
          isCreating 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isCreating ? 'Creating...' : 'Test Student Creation'}
      </button>

      {result && (
        <div className={`mt-4 p-4 rounded-lg ${
          result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <h4 className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
            {result.success ? '✅ Success' : '❌ Error'}
          </h4>
          <pre className={`mt-2 text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Note:</strong> Check the browser console for detailed logs.</p>
        <p>Make sure you have a valid class ID in the test data.</p>
      </div>
    </div>
  );
};

export default StudentCreationTest;