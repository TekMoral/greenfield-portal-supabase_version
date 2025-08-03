import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { getTeacherClassesAndSubjects, getStudentsByTeacherSubject } from "../../../services/teacherStudentService";
import { getFullName, getInitials } from "../../../utils/nameUtils";

const MyClasses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectStudents, setSubjectStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const result = await getTeacherClassesAndSubjects(user.uid);
        setClasses(result);
      } catch (error) {
        console.error('Error fetching classes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [user?.uid]);

  const handleViewSubjectStudents = async (subjectName) => {
    setLoadingStudents(true);
    setSelectedSubject(subjectName);
    
    try {
      const students = await getStudentsByTeacherSubject(user.uid, subjectName);
      setSubjectStudents(students);
    } catch (error) {
      console.error('Error fetching subject students:', error);
      setSubjectStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const closeStudentModal = () => {
    setSelectedSubject(null);
    setSubjectStudents([]);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow h-48"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-green-50">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">My Classes</h1>
              <p className="mt-1 text-sm sm:text-base text-slate-600">Manage your teaching assignments and student interactions</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-3 sm:px-4 py-2 rounded-lg shadow-sm">
                <div className="text-xs sm:text-sm font-medium">Total Classes</div>
                <div className="text-xl sm:text-2xl font-bold">{classes.length}</div>
              </div>
              <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-3 sm:px-4 py-2 rounded-lg shadow-sm">
                <div className="text-xs sm:text-sm font-medium">Total Students</div>
                <div className="text-xl sm:text-2xl font-bold">
                  {classes.reduce((total, cls) => total + (cls.studentCount || 0), 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {classes.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 sm:p-12 max-w-md mx-auto">
              <div className="w-16 sm:w-20 h-16 sm:h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <svg className="w-8 sm:w-10 h-8 sm:h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0v-4a2 2 0 012-2h4m0 0V9a2 2 0 012-2h2a2 2 0 012 2v2M7 7h.01M7 3h.01" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-3">No Classes Assigned</h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                You haven't been assigned to any classes yet. Contact your administrator to get started with your teaching assignments.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {classes.map((classItem) => (
              <div
                key={classItem.id}
                className="group bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 hover:border-slate-300 overflow-hidden"
              >
                {/* Card Header */}
                <div className={`h-1.5 sm:h-2 ${classItem.isGrouped 
                  ? 'bg-gradient-to-r from-slate-600 to-slate-700' 
                  : classItem.category === 'Science' 
                    ? 'bg-gradient-to-r from-green-600 to-green-700'
                    : classItem.category === 'Art'
                      ? 'bg-gradient-to-r from-green-500 to-green-600'
                      : classItem.category === 'Commercial'
                        ? 'bg-gradient-to-r from-slate-500 to-slate-600'
                        : 'bg-gradient-to-r from-green-600 to-green-700'
                }`} />
                
                <div className="p-4 sm:p-6">
                  {/* Class Title and Badge */}
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-slate-700 transition-colors truncate">
                          {classItem.name}
                        </h3>
                        {classItem.isGrouped && (
                          <div className="flex items-center flex-shrink-0">
                            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="text-sm font-medium text-slate-600">{classItem.level}</span>
                        <span className="hidden sm:block text-slate-400">•</span>
                        <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${
                          classItem.isGrouped 
                            ? 'bg-slate-100 text-slate-800 border border-slate-200'
                            : classItem.category === 'Science'
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : classItem.category === 'Art'
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : classItem.category === 'Commercial'
                                  ? 'bg-slate-100 text-slate-800 border border-slate-200'
                                  : 'bg-green-100 text-green-800 border border-green-200'
                        }`}>
                          {classItem.isGrouped ? 'Grouped Classes' : (classItem.category || 'General')}
                        </span>
                      </div>
                      {classItem.isGrouped && (
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                          <span className="font-medium">Includes:</span> {classItem.individualClasses?.map(c => c.name).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Statistics Grid */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="bg-slate-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-slate-100">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 sm:w-8 h-6 sm:h-8 bg-green-100 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 sm:w-4 h-3 sm:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="text-base sm:text-lg font-bold text-slate-900">{classItem.studentCount || 0}</div>
                          <div className="text-xs text-slate-600 truncate">
                            Students{classItem.isGrouped && ` (${classItem.individualClasses?.length || 0} classes)`}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-slate-100">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 sm:w-8 h-6 sm:h-8 bg-slate-100 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 sm:w-4 h-3 sm:h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="text-base sm:text-lg font-bold text-slate-900">{classItem.subjectsTaught?.length || 0}</div>
                          <div className="text-xs text-slate-600">Subjects</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subjects Section */}
                  {classItem.subjectsTaught && classItem.subjectsTaught.length > 0 && (
                    <div className="mb-4 sm:mb-6">
                      <h4 className="text-sm font-semibold text-slate-700 mb-2 sm:mb-3 flex items-center">
                        <svg className="w-3 sm:w-4 h-3 sm:h-4 mr-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Your Subjects
                      </h4>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {classItem.subjectsTaught.map((subject, index) => (
                          <button
                            key={index}
                            onClick={() => handleViewSubjectStudents(subject.subjectName)}
                            className="group/subject bg-gradient-to-r from-slate-100 to-slate-50 hover:from-green-50 hover:to-green-50 text-slate-700 hover:text-green-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-xs font-medium transition-all duration-200 border border-slate-200 hover:border-green-200 hover:shadow-sm"
                          >
                            <span className="flex items-center space-x-1">
                              <span className="truncate">{subject.subjectName}</span>
                              <svg className="w-2.5 sm:w-3 h-2.5 sm:h-3 opacity-0 group-hover/subject:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button 
                      onClick={() => {
                        if (classItem.isGrouped) {
                          const classIds = classItem.individualClasses?.map(c => c.id).join(',') || '';
                          navigate(`/teacher/students?classIds=${classIds}&className=${encodeURIComponent(classItem.name)}`);
                        } else {
                          navigate(`/teacher/students?classIds=${classItem.id}&className=${encodeURIComponent(classItem.name)}`);
                        }
                      }}
                      className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg sm:rounded-xl font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
                    >
                      <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      <span>View Students</span>
                    </button>
                    <button 
                      onClick={() => navigate('/teacher/assignments')}
                      className="flex-1 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg sm:rounded-xl font-medium text-sm transition-all duration-200 border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
                    >
                      <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      <span>Assignments</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subject Students Modal */}
      {selectedSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="bg-green-600 text-white p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-2xl font-bold truncate">{selectedSubject} Students</h2>
                  <p className="text-green-100 text-sm sm:text-base">Students taking {selectedSubject} in your classes</p>
                </div>
                <button
                  onClick={closeStudentModal}
                  className="text-white hover:text-green-200 transition-colors ml-4 flex-shrink-0"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingStudents ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                </div>
              ) : subjectStudents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-slate-400 mb-4">
                    <svg className="w-12 sm:w-16 h-12 sm:h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-2">No Students Found</h3>
                  <p className="text-sm sm:text-base text-slate-500">No students are currently taking {selectedSubject}.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-800">
                      {subjectStudents.length} Student{subjectStudents.length !== 1 ? 's' : ''} Found
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {subjectStudents.map((student) => (
                      <div key={student.id} className="bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-200 hover:shadow-md transition-shadow">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 sm:w-12 h-10 sm:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            {student.profileImageUrl ? (
                              <img 
                                src={student.profileImageUrl} 
                                alt={getFullName(student)}
                                className="w-10 sm:w-12 h-10 sm:h-12 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-green-600 font-semibold text-sm sm:text-lg">
                                {getInitials(student)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-slate-900 truncate">
                              {getFullName(student)}
                            </h4>
                            <p className="text-xs text-slate-600">
                              {student.admissionNumber}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {student.className} - {student.classLevel}
                              {student.classCategory && ` (${student.classCategory})`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200">
              <div className="flex justify-end">
                <button
                  onClick={closeStudentModal}
                  className="bg-slate-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm sm:text-base"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyClasses;