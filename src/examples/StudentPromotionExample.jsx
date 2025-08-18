import React, { useState, useEffect } from 'react';
import edgeFunctionsService from '../services/supabase/edgeFunctions';
import toast from 'react-hot-toast';

/**
 * Example component showing how to use the student promotion functionality
 */
const StudentPromotionExample = () => {
  const [loading, setLoading] = useState({
    promote: false,
    bulkPromote: false,
    demote: false,
    history: false,
    eligibility: false
  });

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [promotionData, setPromotionData] = useState({
    fromClassId: '',
    toClassId: '',
    academicYear: '2024-2025',
    reason: '',
    grades: {},
    performance: '',
    attendance: 100
  });

  // Mock data - replace with actual data fetching
  useEffect(() => {
    // Fetch classes and students from your API
    setClasses([
      { id: 'class-1', name: 'Grade 1A', level: 'Primary', category: 'Regular' },
      { id: 'class-2', name: 'Grade 2A', level: 'Primary', category: 'Regular' },
      { id: 'class-3', name: 'Grade 3A', level: 'Primary', category: 'Regular' },
    ]);

    setStudents([
      { id: 'student-1', full_name: 'John Doe', class_id: 'class-1', status: 'active' },
      { id: 'student-2', full_name: 'Jane Smith', class_id: 'class-1', status: 'active' },
      { id: 'student-3', full_name: 'Bob Johnson', class_id: 'class-2', status: 'active' },
    ]);
  }, []);

  // Example: Promote a single student
  const handlePromoteStudent = async (studentId) => {
    if (!promotionData.fromClassId || !promotionData.toClassId) {
      toast.error('Please select both from and to classes');
      return;
    }

    setLoading(prev => ({ ...prev, promote: true }));
    
    try {
      const result = await edgeFunctionsService.promoteStudent(
        studentId,
        promotionData.fromClassId,
        promotionData.toClassId,
        promotionData.academicYear,
        null, // promotedBy (will use current user)
        promotionData.reason,
        {
          grades: promotionData.grades,
          performance: promotionData.performance,
          attendance: promotionData.attendance,
          teacherRecommendation: 'Excellent student, ready for promotion'
        }
      );

      if (result.success) {
        toast.success(result.message);
        console.log('Promotion result:', result.data);
        
        // Update local state
        setStudents(prev => 
          prev.map(student => 
            student.id === studentId 
              ? { ...student, class_id: promotionData.toClassId }
              : student
          )
        );
      } else {
        toast.error(result.error || 'Failed to promote student');
      }
    } catch (error) {
      console.error('Promote student error:', error);
      toast.error('Failed to promote student');
    } finally {
      setLoading(prev => ({ ...prev, promote: false }));
    }
  };

  // Example: Bulk promote students
  const handleBulkPromoteStudents = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select students to promote');
      return;
    }

    if (!promotionData.fromClassId || !promotionData.toClassId) {
      toast.error('Please select both from and to classes');
      return;
    }

    setLoading(prev => ({ ...prev, bulkPromote: true }));
    
    try {
      const promotions = selectedStudents.map(studentId => ({
        studentId,
        fromClassId: promotionData.fromClassId,
        toClassId: promotionData.toClassId,
        promotionData: {
          grades: promotionData.grades,
          performance: promotionData.performance,
          attendance: promotionData.attendance
        }
      }));

      const result = await edgeFunctionsService.bulkPromoteStudents(
        promotions,
        promotionData.academicYear,
        null, // promotedBy (will use current user)
        promotionData.reason || 'End of academic year promotion'
      );

      if (result.success) {
        toast.success(result.message);
        console.log('Bulk promotion result:', result.data);
        
        // Update local state for successful promotions
        if (result.data.successful) {
          setStudents(prev => 
            prev.map(student => 
              result.data.successful.some(s => s.studentId === student.id)
                ? { ...student, class_id: promotionData.toClassId }
                : student
            )
          );
        }
        
        // Show details of failed promotions
        if (result.data.failed && result.data.failed.length > 0) {
          result.data.failed.forEach(failure => {
            toast.error(`${failure.studentName}: ${failure.error}`);
          });
        }
      } else {
        toast.error(result.error || 'Failed to promote students');
      }
    } catch (error) {
      console.error('Bulk promote error:', error);
      toast.error('Failed to bulk promote students');
    } finally {
      setLoading(prev => ({ ...prev, bulkPromote: false }));
      setSelectedStudents([]);
    }
  };

  // Example: Demote a student
  const handleDemoteStudent = async (studentId) => {
    if (!promotionData.fromClassId || !promotionData.toClassId) {
      toast.error('Please select both from and to classes');
      return;
    }

    setLoading(prev => ({ ...prev, demote: true }));
    
    try {
      const result = await edgeFunctionsService.demoteStudent(
        studentId,
        promotionData.fromClassId,
        promotionData.toClassId,
        promotionData.academicYear,
        null, // demotedBy (will use current user)
        promotionData.reason || 'Academic performance concerns',
        {
          performance: promotionData.performance,
          attendance: promotionData.attendance,
          teacherRecommendation: 'Needs additional support'
        }
      );

      if (result.success) {
        toast.success(result.message);
        console.log('Demotion result:', result.data);
        
        // Update local state
        setStudents(prev => 
          prev.map(student => 
            student.id === studentId 
              ? { ...student, class_id: promotionData.toClassId }
              : student
          )
        );
      } else {
        toast.error(result.error || 'Failed to demote student');
      }
    } catch (error) {
      console.error('Demote student error:', error);
      toast.error('Failed to demote student');
    } finally {
      setLoading(prev => ({ ...prev, demote: false }));
    }
  };

  // Example: Get student promotion history
  const handleGetPromotionHistory = async (studentId) => {
    setLoading(prev => ({ ...prev, history: true }));
    
    try {
      const result = await edgeFunctionsService.getStudentPromotionHistory(studentId);

      if (result.success) {
        console.log('Promotion history:', result.data);
        // Display history in UI - you could show this in a modal or table
        const student = students.find(s => s.id === studentId);
        toast.success(`Retrieved promotion history for ${student?.full_name}`);
      } else {
        toast.error(result.error || 'Failed to get promotion history');
      }
    } catch (error) {
      console.error('Get promotion history error:', error);
      toast.error('Failed to get promotion history');
    } finally {
      setLoading(prev => ({ ...prev, history: false }));
    }
  };

  // Example: Get promotion eligibility
  const handleGetPromotionEligibility = async (classId) => {
    setLoading(prev => ({ ...prev, eligibility: true }));
    
    try {
      const result = await edgeFunctionsService.getPromotionEligibility(
        classId,
        promotionData.academicYear
      );

      if (result.success) {
        console.log('Promotion eligibility:', result.data);
        toast.success('Retrieved promotion eligibility data');
      } else {
        toast.error(result.error || 'Failed to get promotion eligibility');
      }
    } catch (error) {
      console.error('Get promotion eligibility error:', error);
      toast.error('Failed to get promotion eligibility');
    } finally {
      setLoading(prev => ({ ...prev, eligibility: false }));
    }
  };

  const handleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Student Promotion Management</h1>
      
      {/* Promotion Configuration */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Promotion Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Class</label>
            <select
              value={promotionData.fromClassId}
              onChange={(e) => setPromotionData(prev => ({ ...prev, fromClassId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Select from class</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Class</label>
            <select
              value={promotionData.toClassId}
              onChange={(e) => setPromotionData(prev => ({ ...prev, toClassId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Select to class</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
            <input
              type="text"
              value={promotionData.academicYear}
              onChange={(e) => setPromotionData(prev => ({ ...prev, academicYear: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="2024-2025"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
            <input
              type="text"
              value={promotionData.reason}
              onChange={(e) => setPromotionData(prev => ({ ...prev, reason: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="End of academic year promotion"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Performance</label>
            <select
              value={promotionData.performance}
              onChange={(e) => setPromotionData(prev => ({ ...prev, performance: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Select performance</option>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="satisfactory">Satisfactory</option>
              <option value="needs_improvement">Needs Improvement</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Students</h3>
          <button
            onClick={handleBulkPromoteStudents}
            disabled={loading.bulkPromote || selectedStudents.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading.bulkPromote ? 'Promoting...' : `Promote Selected (${selectedStudents.length})`}
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStudents(students.map(s => s.id));
                      } else {
                        setSelectedStudents([]);
                      }
                    }}
                    checked={selectedStudents.length === students.length && students.length > 0}
                  />
                </th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Current Class</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => {
                const currentClass = classes.find(c => c.id === student.class_id);
                return (
                  <tr key={student.id} className="border-t">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => handleStudentSelection(student.id)}
                      />
                    </td>
                    <td className="px-4 py-2 font-medium">{student.full_name}</td>
                    <td className="px-4 py-2">{currentClass?.name || 'Unknown'}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePromoteStudent(student.id)}
                          disabled={loading.promote}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                        >
                          {loading.promote ? 'Promoting...' : 'Promote'}
                        </button>
                        <button
                          onClick={() => handleDemoteStudent(student.id)}
                          disabled={loading.demote}
                          className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700 disabled:opacity-50"
                        >
                          {loading.demote ? 'Demoting...' : 'Demote'}
                        </button>
                        <button
                          onClick={() => handleGetPromotionHistory(student.id)}
                          disabled={loading.history}
                          className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 disabled:opacity-50"
                        >
                          {loading.history ? 'Loading...' : 'History'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Class Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Class Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {classes.map(cls => (
            <div key={cls.id} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium mb-2">{cls.name}</h4>
              <p className="text-sm text-gray-600 mb-3">{cls.level} - {cls.category}</p>
              <button
                onClick={() => handleGetPromotionEligibility(cls.id)}
                disabled={loading.eligibility}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading.eligibility ? 'Loading...' : 'Check Eligibility'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Examples */}
      <div className="mt-8 bg-gray-100 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Usage Examples</h3>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium">Single Student Promotion:</h4>
            <code className="block bg-white p-2 rounded mt-1">
              {`await edgeFunctionsService.promoteStudent(
  studentId, 
  fromClassId, 
  toClassId, 
  '2024-2025',
  null,
  'End of year promotion',
  { grades: { math: 'A', english: 'B' }, performance: 'excellent' }
)`}
            </code>
          </div>
          
          <div>
            <h4 className="font-medium">Bulk Promotion:</h4>
            <code className="block bg-white p-2 rounded mt-1">
              {`await edgeFunctionsService.bulkPromoteStudents(
  [{ studentId: 'id1', fromClassId: 'class1', toClassId: 'class2' }],
  '2024-2025',
  null,
  'End of academic year'
)`}
            </code>
          </div>
          
          <div>
            <h4 className="font-medium">Get Promotion History:</h4>
            <code className="block bg-white p-2 rounded mt-1">
              {`await edgeFunctionsService.getStudentPromotionHistory(studentId)`}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentPromotionExample;