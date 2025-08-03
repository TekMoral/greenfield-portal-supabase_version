import React, { useState, useEffect } from 'react';
import { getAllTeachers, createTeacher } from '../../services/supabase/teacherService';

const TeacherTestComponent = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchTeachers = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('🔄 Fetching teachers...');
      const result = await getAllTeachers();
      console.log('📊 Teachers result:', result);
      
      if (result.success) {
        setTeachers(result.data);
        setSuccess(`✅ Successfully fetched ${result.data.length} teachers`);
      } else {
        setError(`❌ Error: ${result.error}`);
      }
    } catch (err) {
      console.error('❌ Exception:', err);
      setError(`❌ Exception: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createTestTeacher = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    const testTeacher = {
      name: 'Test Teacher',
      email: `test.teacher.${Date.now()}@school.com`,
      password: 'password123',
      phoneNumber: '+1234567890',
      subject: 'Mathematics',
      qualification: 'BSc Mathematics',
      dateHired: '2024-01-15'
    };

    try {
      console.log('🔄 Creating test teacher:', testTeacher);
      const result = await createTeacher(testTeacher);
      console.log('📊 Create result:', result);
      
      if (result.success) {
        setSuccess(`✅ Successfully created teacher: ${result.data.name}`);
        fetchTeachers(); // Refresh the list
      } else {
        setError(`❌ Error creating teacher: ${result.error}`);
      }
    } catch (err) {
      console.error('❌ Exception:', err);
      setError(`❌ Exception: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">🧪 Teacher Service Test</h1>
        
        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={fetchTeachers}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Fetch Teachers'}
          </button>
          
          <button
            onClick={createTestTeacher}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Test Teacher'}
          </button>
        </div>

        {/* Teachers List */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Teachers ({teachers.length})</h2>
          
          {teachers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No teachers found. Try creating a test teacher.
            </div>
          ) : (
            <div className="space-y-4">
              {teachers.map((teacher, index) => (
                <div key={teacher.id || index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-lg">{teacher.name}</h3>
                      <p className="text-gray-600">{teacher.email}</p>
                      <p className="text-gray-600">Phone: {teacher.phoneNumber || 'Not provided'}</p>
                    </div>
                    <div>
                      <p><strong>Subject:</strong> {teacher.subject || 'Not specified'}</p>
                      <p><strong>Qualification:</strong> {teacher.qualification || 'Not specified'}</p>
                      <p><strong>Employee ID:</strong> {teacher.employeeId || 'Not assigned'}</p>
                      <p><strong>Date Hired:</strong> {teacher.dateHired ? new Date(teacher.dateHired).toLocaleDateString() : 'Not specified'}</p>
                      <p><strong>Status:</strong> 
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${teacher.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {teacher.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Debug Info */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Debug Information</h3>
          <p className="text-sm text-gray-600">
            This component tests the teacher service functions to ensure they work correctly with the database schema.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Teachers are stored in the <code>user_profiles</code> table with <code>role = 'teacher'</code>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TeacherTestComponent;