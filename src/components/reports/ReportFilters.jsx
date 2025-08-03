import React from 'react';
import { exportReport } from '../../utils/reportUtils';

const ReportFilters = ({
  classes,
  selectedClass,
  selectedSubject,
  selectedAcademicYear,
  selectedTerm,
  selectedStudent,
  students,
  getAvailableSubjects,
  onClassChange,
  onSubjectChange,
  onAcademicYearChange,
  onTermChange,
  onBulkSubmitClick
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-slate-200">
      <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-4">Report Configuration</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => onClassChange(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Choose a class...</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name} ({classItem.studentCount || 0} students)
              </option>
            ))}
          </select>
        </div>

        {selectedClass && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => onSubjectChange(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Choose a subject...</option>
              {getAvailableSubjects().map((subject) => (
                <option key={subject.subjectName} value={subject.subjectName}>
                  {subject.subjectName}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedClass && selectedSubject && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Academic Year</label>
              <select
                value={selectedAcademicYear}
                onChange={(e) => onAcademicYearChange(parseInt(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
                <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => onTermChange(parseInt(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value={1}>1st Term</option>
                <option value={2}>2nd Term</option>
                <option value={3}>3rd Term</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              {selectedStudent && (
                <button
                  onClick={exportReport}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  Export Report
                </button>
              )}
              {students.length > 0 && (
                <button
                  onClick={onBulkSubmitClick}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
                >
                  Bulk Submit
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportFilters;