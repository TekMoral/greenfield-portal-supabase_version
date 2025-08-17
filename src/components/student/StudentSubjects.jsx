import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getStudentById } from '../../services/supabase/studentService';
import { getClassById } from '../../services/supabase/classService';
import { getSubjectsByDepartment, getSubjects } from '../../services/supabase/subjectService';

export default function StudentSubjects() {
  const { user, profile } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [classInfo, setClassInfo] = useState(null);

  const fetchStudentSubjects = useCallback(async () => {
    if (!user?.id) {
      setError('No user logged in');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Step 1: Get student profile (if not already available from auth context)
      let studentData = profile;
      if (!studentData || !studentData.class_id) {
        console.log('🔄 Fetching student profile...');
        const studentResult = await getStudentById(user.id);
        if (!studentResult.success) {
          throw new Error(studentResult.error || 'Failed to fetch student profile');
        }
        studentData = studentResult.data;
      }

      if (!studentData) {
        throw new Error('Student profile not found');
      }

      setStudentInfo(studentData);

      // Step 2: Get class information to determine department
      if (!studentData.class_id) {
        // If no class assigned, show core subjects only
        console.log('📚 No class assigned, fetching core subjects...');
        const coreSubjects = await getSubjectsByDepartment('core');
        setSubjects(coreSubjects || []);
        setLoading(false);
        return;
      }

      console.log('🔄 Fetching class information for class ID:', studentData.class_id);
      const classData = await getClassById(studentData.class_id);
      
      if (!classData) {
        throw new Error('Class information not found');
      }

      setClassInfo(classData);

      // Step 3: Determine department from class category
      let department = classData.category?.toLowerCase();
      
      // Handle different class levels and categories
      if (classData.level === 'Junior' || !department) {
        department = 'junior';
      }

      console.log('📚 Fetching subjects for department:', department);

      // Step 4: Fetch subjects for the department
      let departmentSubjects = [];
      let coreSubjects = [];

      // Get department-specific subjects
      if (department && department !== 'core') {
        departmentSubjects = await getSubjectsByDepartment(department);
      }

      // Always get core subjects for all students
      coreSubjects = await getSubjectsByDepartment('core');

      // Combine core and department subjects, removing duplicates
      const allSubjects = [...coreSubjects];
      
      // Add department subjects that aren't already in core
      departmentSubjects.forEach(subject => {
        const isDuplicate = allSubjects.some(coreSubject => 
          coreSubject.id === subject.id || coreSubject.name === subject.name
        );
        if (!isDuplicate) {
          allSubjects.push(subject);
        }
      });

      // Sort subjects by name
      allSubjects.sort((a, b) => a.name.localeCompare(b.name));

      setSubjects(allSubjects);
      console.log('✅ Successfully loaded', allSubjects.length, 'subjects for student');

    } catch (err) {
      console.error('❌ Error fetching student subjects:', err);
      setError(err.message || 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile]);

  useEffect(() => {
    fetchStudentSubjects();
  }, [fetchStudentSubjects]);

  const getDepartmentName = (dept) => {
    const names = {
      core: 'Core Subjects',
      junior: 'Junior Secondary',
      science: 'Science Department',
      art: 'Arts Department', 
      commercial: 'Commercial Department'
    };
    return names[dept] || dept?.toUpperCase() || 'General';
  };

  const getDepartmentColor = (dept) => {
    const colors = {
      core: 'from-slate-500 to-slate-600',
      junior: 'from-blue-500 to-blue-600',
      science: 'from-emerald-500 to-emerald-600',
      art: 'from-purple-500 to-purple-600',
      commercial: 'from-amber-500 to-amber-600'
    };
    return colors[dept] || 'from-gray-500 to-gray-600';
  };

  const getSubjectTypeColor = (isCore) => {
    return isCore 
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : 'bg-green-100 text-green-800 border-green-200';
  };

  const getSubjectTypeLabel = (isCore) => {
    return isCore ? 'Core Subject' : 'Elective';
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-l-blue-400 rounded-full animate-spin animation-delay-150"></div>
                </div>
                <span className="text-gray-600 font-medium text-lg">Loading your subjects...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-8">
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-6 text-red-300">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Unable to Load Subjects</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={fetchStudentSubjects}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-300 font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const department = classInfo?.category?.toLowerCase() || (classInfo?.level === 'Junior' ? 'junior' : 'general');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header Section */}
        <div className={`bg-gradient-to-r ${getDepartmentColor(department)} text-white`}>
          <div className="px-8 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1">My Subjects</h1>
                  <p className="text-white text-opacity-90 text-sm font-medium">
                    {classInfo ? `${classInfo.name} - ${getDepartmentName(department)}` : 'Your Academic Subjects'}
                  </p>
                </div>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur-sm px-6 py-3 rounded-xl border border-white border-opacity-30">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-white font-semibold text-lg">
                    {subjects.length}
                  </span>
                  <span className="text-white text-opacity-90 text-sm">
                    subject{subjects.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8">
          {/* Student Info Card */}
          {studentInfo && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 mb-8 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Student Name:</span>
                  <p className="text-gray-800 font-semibold">{studentInfo.full_name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Admission Number:</span>
                  <p className="text-gray-800 font-semibold">{studentInfo.admission_number}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Class:</span>
                  <p className="text-gray-800 font-semibold">
                    {classInfo ? `${classInfo.name} (${classInfo.level})` : 'Not Assigned'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Subjects List */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Your Subjects</h2>
            </div>

            {subjects.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-6 text-gray-300">
                  <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Subjects Available</h3>
                <p className="text-gray-500">
                  {classInfo 
                    ? 'No subjects have been assigned to your class yet. Please contact your administrator.'
                    : 'You have not been assigned to a class yet. Please contact your administrator.'
                  }
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {subjects.map((subject, index) => (
                  <div key={subject.id || index} className="bg-white p-6 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-lg"></div>
                            <h3 className="text-lg font-semibold text-gray-800">{subject.name}</h3>
                          </div>
                          {subject.code && (
                            <div className="bg-gray-100 px-3 py-1 rounded-full">
                              <span className="text-sm font-medium text-gray-600">{subject.code}</span>
                            </div>
                          )}
                          {subject.is_core !== undefined && (
                            <div className={`px-3 py-1 rounded-full border ${getSubjectTypeColor(subject.is_core)}`}>
                              <span className="text-xs font-medium">{getSubjectTypeLabel(subject.is_core)}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Department:</span>
                            <p className="text-gray-800">{getDepartmentName(subject.department)}</p>
                          </div>
                          <div>
                            <span className="font-medium">Credit Hours:</span>
                            <p className="text-gray-800">{subject.credit_hours || 1}</p>
                          </div>
                          <div>
                            <span className="font-medium">Type:</span>
                            <p className="text-gray-800">{subject.is_core ? 'Core Subject' : 'Elective'}</p>
                          </div>
                        </div>
                        
                        {subject.description && (
                          <div className="mt-3">
                            <span className="text-sm font-medium text-gray-600">Description:</span>
                            <p className="text-sm text-gray-700 mt-1">{subject.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}