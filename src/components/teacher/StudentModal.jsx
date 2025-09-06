import React from 'react';
import { getFullName, getInitials } from '../../utils/nameUtils';

const StudentModal = ({ 
  isOpen, 
  selectedSubject, 
  students = [], 
  loading = false, 
  onClose 
}) => {
  if (!isOpen || !selectedSubject) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="bg-green-600 text-white p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-2xl font-bold truncate">
                {selectedSubject} Students
              </h2>
              <p className="text-green-100 text-sm sm:text-base">
                Students taking {selectedSubject} in your classes
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-green-200 transition-colors ml-4 flex-shrink-0"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-400 mb-4">
                <svg className="w-12 sm:w-16 h-12 sm:h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-2">
                No Students Found
              </h3>
              <p className="text-sm sm:text-base text-slate-500">
                No students are currently taking {selectedSubject}.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-slate-800">
                  {students.length} Student{students.length !== 1 ? 's' : ''} Found
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {students.map((student) => (
                  <div 
                    key={student.id} 
                    className="bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-200 hover:shadow-md transition-shadow"
                  >
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
              onClick={onClose}
              className="bg-slate-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm sm:text-base"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentModal;