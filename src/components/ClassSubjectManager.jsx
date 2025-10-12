import React, { useState, useEffect } from 'react';
import { getAllTeachers } from '../services/supabase/migrationWrapper';
import { getSubjects } from '../services/supabase/subjectService';
import { supabase } from '../lib/supabaseClient';
import useToast from '../hooks/useToast';

const ClassSubjectManager = ({ classData, onSubjectsUpdate, onClose }) => {
  const [teachers, setTeachers] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  
  // New subject form state
  const [newSubject, setNewSubject] = useState({
    subjectName: '',
    teacherId: '',
    teacherName: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get all teachers (handle migration wrapper response)
        const teachersResult = await getAllTeachers();
        console.log('🔍 Teachers fetch result:', teachersResult);
        
        if (teachersResult?.success) {
          const teacherData = teachersResult.data || [];
          console.log('👥 Teachers data:', teacherData);
          setTeachers(teacherData);
        } else {
          console.error('Failed to fetch teachers:', teachersResult?.error);
          setTeachers([]);
        }
        
        // Get all active subjects to ensure full list is available regardless of class level/category
        const subjects = await getSubjects();
        console.log('📚 Subjects data:', subjects);
        setAvailableSubjects(subjects || []);
        
        // Fetch existing teacher assignments for this class
        console.log('🔍 Fetching existing assignments for class:', classData.id);
        const { data: existingAssignments, error: assignmentsError } = await supabase
          .from('teacher_assignments')
          .select(`
            id,
            teacher_id,
            subject_id,
            is_active,
            subjects!inner (id, name, department),
            user_profiles!inner (id, full_name)
          `)
          .eq('class_id', classData.id)
          .eq('is_active', true);

        if (assignmentsError) {
          console.error('❌ Error fetching assignments:', assignmentsError);
        } else {
          console.log('📋 Existing assignments:', existingAssignments);
          
          // Transform assignments to match the expected format
          const transformedAssignments = (existingAssignments || []).map(assignment => ({
            subjectName: assignment.subjects?.name || 'Unknown Subject',
            teacherId: assignment.teacher_id,
            teacherName: assignment.user_profiles?.full_name || 'Unknown Teacher',
            assignmentId: assignment.id // Keep track of the assignment ID
          }));
          
          console.log('🔄 Transformed assignments:', transformedAssignments);
          setClassSubjects(transformedAssignments);
        }
        
        // Also initialize with legacy data if no assignments found
        if (!existingAssignments || existingAssignments.length === 0) {
          console.log('📝 No database assignments found, using legacy class subjects');
          setClassSubjects(classData.subjects || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [classData]);

  const addSubject = async () => {
    if (!newSubject.subjectName || !newSubject.teacherId) {
      showToast('Please select both subject and teacher', 'error');
      return;
    }

    try {
      // Find the subject ID from the subject name
      const selectedSubject = availableSubjects.find(s => s.name === newSubject.subjectName);
      if (!selectedSubject) {
        showToast('Selected subject not found', 'error');
        return;
      }

      // Check global limit: max 3 unique teachers per subject across all classes
      console.log(`🔍 Checking global limit for subject: ${selectedSubject.name} (ID: ${selectedSubject.id})`);
      
      const { data: existingAssignments, error } = await supabase
        .from('teacher_assignments')
        .select('teacher_id, class_id')
        .eq('subject_id', selectedSubject.id)
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error checking existing assignments:', error);
        showToast('Error checking existing assignments. Please try again.', 'error');
        return;
      }

      console.log(`📊 Existing assignments for ${selectedSubject.name}:`, existingAssignments);

      // Count unique teachers for this subject
      const uniqueTeachers = new Set(existingAssignments?.map(a => a.teacher_id) || []);
      console.log(`👥 Unique teachers already assigned to ${selectedSubject.name}:`, Array.from(uniqueTeachers));
      console.log(`📈 Current teacher count: ${uniqueTeachers.size}/3`);
      
      // Check if this teacher is already assigned to this subject
      const teacherAlreadyAssigned = uniqueTeachers.has(newSubject.teacherId);
      console.log(`🔍 Is teacher ${newSubject.teacherName} already assigned? ${teacherAlreadyAssigned}`);
      
      // If teacher not already assigned and we're at the limit, reject
      if (!teacherAlreadyAssigned && uniqueTeachers.size >= 3) {
        const currentTeachers = Array.from(uniqueTeachers);
        console.log(`❌ LIMIT REACHED: Subject "${newSubject.subjectName}" already has 3 teachers:`, currentTeachers);
        showToast(`Subject "${newSubject.subjectName}" already has the maximum number of teachers (3) assigned across all classes.`, 'error');
        return;
      }
      
      console.log(`✅ Global limit check passed. Proceeding with assignment...`);

      // Prevent duplicate assignment of the same teacher to the same subject in this class
      const duplicatePair = classSubjects.some(
        subject => subject.subjectName === newSubject.subjectName && subject.teacherId === newSubject.teacherId
      );
      if (duplicatePair) {
        showToast('This teacher is already assigned to this subject in this class.', 'error');
        return;
      }

      setClassSubjects(prevSubjects => [...prevSubjects, { ...newSubject }]);
      
      // Reset form
      setNewSubject({
        subjectName: '',
        teacherId: '',
        teacherName: ''
      });
    } catch (error) {
      console.error('Error adding subject:', error);
      showToast('Error adding subject. Please try again.', 'error');
    }
  };

  const removeSubject = (index) => {
    const newSubjects = classSubjects.filter((_, i) => i !== index);
    setClassSubjects(newSubjects);
  };

  const updateNewSubject = (field, value) => {
    setNewSubject(prev => {
      const updated = { ...prev, [field]: value };
      
      // If teacher is selected, update teacher name
      if (field === 'teacherId') {
        // Try both uid and id fields to handle different data structures
        const teacher = teachers.find(t => t.uid === value || t.id === value);
        updated.teacherName = teacher ? teacher.name : '';
        console.log('🔍 Selected teacher:', teacher);
      }
      
      return updated;
    });
  };

  const getUnassignedSubjects = () => {
    // Show all subjects - the global check will happen when adding
    return availableSubjects;
  };

  const handleSave = async () => {
    // Filter out incomplete entries
    const validSubjects = classSubjects.filter(
      subject => subject.subjectName && subject.teacherId
    );

    setSaving(true);
    try {
      await onSubjectsUpdate(validSubjects);
    } catch (e) {
      // Errors should be handled by onSubjectsUpdate (toasts), but ensure UI unlocks
      console.error('Save assignments failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const getTeachersBySubject = (subjectName) => {
    console.log('🔍 Getting teachers for subject:', subjectName);
    console.log('🔍 Available teachers:', teachers.length);
    
    // Show ALL active teachers - a teacher can teach multiple subjects
    // We only need to filter out inactive teachers
    const availableTeachers = teachers.filter(teacher => {
      // Only filter out inactive teachers, not by subject specialization
      const isActive = teacher.isActive !== false; // Default to true if not specified
      
      console.log(`🔍 Teacher ${teacher.name}: isActive=${isActive}`);
      return isActive;
    });
    
    console.log('✅ Available teachers for assignment:', availableTeachers.length);
    return availableTeachers;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="bg-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Manage Class Subjects</h2>
              <p className="text-blue-100">
                {classData.name} - {classData.level}
                {classData.category && ` (${classData.category})`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Current Assignments Table */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Current Subject Assignments</h3>
            
            {classSubjects.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Subjects Assigned</h3>
                <p className="text-gray-500">Use the form below to assign teachers to subjects</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Teacher
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {classSubjects.map((subject, index) => {
                      // Find the subject object to get its department
                      const subjectObj = availableSubjects.find(s => s.name === subject.subjectName);
                      const subjectCategory = subjectObj 
                        ? (subjectObj.department === 'core' ? 'Core' : 
                           subjectObj.department === 'junior' ? 'Junior' : 
                           subjectObj.department.charAt(0).toUpperCase() + subjectObj.department.slice(1))
                        : 'Unknown';
                      
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                              </div>
                              <div className="text-sm font-medium text-gray-900">
                                {subject.subjectName}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-green-600 font-semibold text-xs">
                                  {subject.teacherName?.charAt(0) || 'T'}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {subject.teacherName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Teacher
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              subjectCategory === 'Core' ? 'bg-purple-100 text-purple-800' :
                              subjectCategory === 'Junior' ? 'bg-blue-100 text-blue-800' :
                              subjectCategory === 'Science' ? 'bg-green-100 text-green-800' :
                              subjectCategory === 'Art' ? 'bg-pink-100 text-pink-800' :
                              subjectCategory === 'Commercial' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {subjectCategory}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => removeSubject(index)}
                              className="text-red-600 hover:text-red-900 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors"
                              title="Remove Assignment"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add New Subject Form */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Subject Assignment
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <select
                  value={newSubject.subjectName}
                  onChange={(e) => updateNewSubject('subjectName', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Subject</option>
                  {getUnassignedSubjects().map((subject) => (
                    <option key={subject.id || subject.name} value={subject.name}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teacher
                </label>
                <select
                  value={newSubject.teacherId}
                  onChange={(e) => updateNewSubject('teacherId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!newSubject.subjectName}
                >
                  <option value="">Select Teacher</option>
                  {newSubject.subjectName && getTeachersBySubject(newSubject.subjectName).map((teacher) => {
                    const teacherId = teacher.uid || teacher.id;
                    const teacherKey = teacher.uid || teacher.id || teacher.name;
                    return (
                      <option key={teacherKey} value={teacherId}>
                        {teacher.name} {teacher.subject && `(${teacher.subject})`}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={addSubject}
                disabled={!newSubject.subjectName || !newSubject.teacherId}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Assignment
              </button>
            </div>

            {getUnassignedSubjects().length === 0 && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center text-green-800">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-medium">
                    All subjects have been assigned to teachers!
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {saving ? 'Saving...' : 'Save Assignments'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassSubjectManager;