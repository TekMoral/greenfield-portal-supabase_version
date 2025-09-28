import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../hooks/useAuth";
import { getTeacherClassesAndSubjects, getStudentsByTeacherSubjectAndClasses } from "../../../services/supabase/teacherStudentService";
import { expandClassEntryToIds } from "../../../utils/teacherClassSubjectUtils";
import { getSubjectsByDepartment } from "../../../services/supabase/subjectService";
import { useTeacherClasses } from "../../../hooks/useTeacherClasses";
import ClassCard from "../../../components/teacher/ClassCard";
import SubjectFilter from "../../../components/teacher/SubjectFilter";
import StudentModal from "../../../components/teacher/StudentModal";

const MyClasses = () => {
  const { user } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedFilterSubject, setSelectedFilterSubject] = useState('');
  const [coreSubjectNames, setCoreSubjectNames] = useState([]);

  // Fetch teacher classes using React Query
  const { data: allClasses = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['teacher', 'classes', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user logged in');
      
      const res = await getTeacherClassesAndSubjects(user.id);
      const classes = res?.success ? (res.data || []) : (Array.isArray(res) ? res : []);
      
      // Load core subject names for grouping
      let coreNames = [];
      try {
        const coreRes = await getSubjectsByDepartment('core');
        coreNames = Array.isArray(coreRes) ? coreRes.map(s => s.name || s.subjectName || s) : [];
      } catch (_) {
        coreNames = [];
      }
      setCoreSubjectNames(coreNames);
      
      return classes;
    },
    enabled: !!user?.id,
  });

  // Use custom hook for class filtering and grouping
  const { classes, availableSubjects, totalClasses, totalStudents } = useTeacherClasses(
    allClasses, 
    selectedFilterSubject, 
    coreSubjectNames
  );

  // Fetch students for selected subject using React Query
  const { 
    data: subjectStudents = [], 
    isLoading: loadingStudents, 
    isError: studentsError,
    error: studentsErrorMessage 
  } = useQuery({
    queryKey: ['teacher', 'subject-students', user?.id, selectedSubject],
    queryFn: async () => {
      if (!user?.id || !selectedSubject) return [];
      
      // Get all class IDs that teach this subject
      const classIds = [];
      allClasses.forEach(cls => {
        const hasSubject = (cls.subjectsTaught || []).some((s) => s.subjectName === selectedSubject);
        if (hasSubject) {
          // Use utility to expand grouped classes to individual class IDs
          const ids = expandClassEntryToIds(cls);
          classIds.push(...ids);
        }
      });
      
      if (classIds.length === 0) return [];
      
      const res = await getStudentsByTeacherSubjectAndClasses(user.id, selectedSubject, classIds);
      return res?.success ? (res.data || []) : (Array.isArray(res) ? res : []);
    },
    enabled: !!user?.id && !!selectedSubject && allClasses.length > 0,
  });

  const handleViewSubjectStudents = (subjectName) => {
    setSelectedSubject(subjectName);
  };

  const closeStudentModal = () => {
    setSelectedSubject(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          <span className="text-slate-600 font-medium text-lg">Loading your classes...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6 text-center mx-2 sm:mx-0">
        <div className="text-red-600 text-3xl sm:text-4xl mb-3 sm:mb-4">⚠️</div>
        <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-2">Error Loading Classes</h2>
        <p className="text-sm sm:text-base text-slate-600 mb-3 sm:mb-4">{error?.message || 'Failed to load your classes. Please try again.'}</p>
        <button
          onClick={() => refetch()}
          className="bg-slate-800 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm sm:text-base"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-green-50 -mx-4 sm:mx-0">
      {isFetching && (
        <div className="pointer-events-none fixed top-3 right-3 z-50">
          <div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full"></div>
        </div>
      )}
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="px-2 sm:px-6 lg:px-8 py-3 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">My Classes</h1>
              <p className="mt-1 text-sm sm:text-base text-slate-600">Manage your teaching assignments and student interactions</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-3 sm:px-4 py-2 rounded-lg shadow-sm">
                <div className="text-xs sm:text-sm font-medium">Total Classes</div>
                <div className="text-xl sm:text-2xl font-bold">{totalClasses}</div>
              </div>
              <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-3 sm:px-4 py-2 rounded-lg shadow-sm">
                <div className="text-xs sm:text-sm font-medium">Total Students</div>
                <div className="text-xl sm:text-2xl font-bold">{totalStudents || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Filter Section */}
      <SubjectFilter
        availableSubjects={availableSubjects}
        selectedSubject={selectedFilterSubject}
        onSubjectChange={setSelectedFilterSubject}
        coreSubjectNames={coreSubjectNames}
      />

      {/* Main Content */}
      <div className="px-2 sm:px-6 lg:px-8 py-6 sm:py-8">
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
              <ClassCard
                key={classItem.id}
                classItem={classItem}
                onViewSubjectStudents={handleViewSubjectStudents}
              />
            ))}
          </div>
        )}
      </div>

      {/* Subject Students Modal */}
      <StudentModal
        isOpen={!!selectedSubject}
        selectedSubject={selectedSubject}
        students={subjectStudents}
        loading={loadingStudents}
        onClose={closeStudentModal}
      />
    </div>
  );
};

export default MyClasses;