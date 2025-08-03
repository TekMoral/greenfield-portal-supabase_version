import React from 'react';
import { getFullName } from '../../utils/nameUtils';
import ProfileImage from '../common/ProfileImage';

const StudentSelection = ({
  selectedClass,
  selectedSubject,
  students,
  loadingStudents,
  onStudentSelect
}) => {
  if (!selectedClass || !selectedSubject) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-slate-200">
      <div className="bg-slate-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
        <h3 className="text-base sm:text-lg font-semibold text-slate-800">Select Student</h3>
        <p className="text-sm text-slate-600 mt-1">Click on a student to view their progress report</p>
      </div>
      <div className="p-4 sm:p-6">
        {loadingStudents ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-slate-400 text-4xl mb-3">👥</div>
            <p className="text-slate-500">No students found for this class and subject.</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block sm:hidden space-y-3">
              {students.map((student) => (
                <button
                  key={student.id}
                  onClick={() => onStudentSelect(student)}
                  className="w-full p-3 rounded-lg border-2 border-slate-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200 text-left"
                >
                  <div className="flex items-center space-x-3">
                    <ProfileImage
                      src={student.profileImageUrl}
                      alt={getFullName(student)}
                      size="sm"
                      fallbackName={getFullName(student)}
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{getFullName(student)}</div>
                      <div className="text-sm text-slate-600">{student.admissionNumber}</div>
                    </div>
                    <div className="text-green-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Desktop Grid View */}
            <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {students.map((student) => (
                <button
                  key={student.id}
                  onClick={() => onStudentSelect(student)}
                  className="p-4 rounded-lg border-2 border-slate-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200 text-left"
                >
                  <div className="flex flex-col items-center space-y-3">
                    <ProfileImage
                      src={student.profileImageUrl}
                      alt={getFullName(student)}
                      size="md"
                      fallbackName={getFullName(student)}
                    />
                    <div className="text-center">
                      <div className="font-semibold text-slate-800 text-sm">{getFullName(student)}</div>
                      <div className="text-xs text-slate-600">{student.admissionNumber}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentSelection;