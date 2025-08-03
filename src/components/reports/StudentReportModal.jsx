import React from 'react';
import { getFullName } from '../../utils/nameUtils';
import { getGradeColor, getTermName, exportReport } from '../../utils/reportUtils';
import AttendanceSection from './AttendanceSection';
import AssignmentSection from './AssignmentSection';
import RemarksSection from './RemarksSection';

const StudentReportModal = ({
  showReportModal,
  selectedStudent,
  selectedSubject,
  selectedClass,
  selectedTerm,
  selectedAcademicYear,
  classes,
  loadingReport,
  attendanceData,
  assignmentSubmissions,
  remarks,
  editingRemarks,
  savingRemarks,
  onClose,
  onRemarksChange,
  onEditingRemarksChange,
  onSaveRemarks,
  onSubmitReport,
  submittingReport
}) => {
  if (!showReportModal || !selectedStudent) {
    return null;
  }

  return (
    <div className="fixed pt-16 inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[95vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-800 text-white p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg sm:text-xl font-bold truncate">
                Progress Report - {getFullName(selectedStudent)}
              </h3>
              <p className="text-green-100 text-sm sm:text-base">
                {selectedSubject} | {classes.find(c => c.id === selectedClass)?.name}
              </p>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              {selectedStudent && (
                <button
                  onClick={exportReport}
                  className="bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                >
                  Export
                </button>
              )}
              <button
                onClick={onClose}
                className="text-white hover:text-green-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div id="report-content" className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
          {loadingReport ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Student Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h4 className="text-base sm:text-lg font-semibold text-slate-800 mb-3">Student Information</h4>
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-slate-600 text-sm">Name:</span>
                      <span className="font-medium text-sm">{getFullName(selectedStudent)}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-slate-600 text-sm">Admission Number:</span>
                      <span className="font-medium text-sm">{selectedStudent.admissionNumber}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-slate-600 text-sm">Class:</span>
                      <span className="font-medium text-sm">{selectedStudent.className}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-slate-600 text-sm">Subject:</span>
                      <span className="font-medium text-sm">{selectedSubject}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-base sm:text-lg font-semibold text-slate-800 mb-3">Quick Summary</h4>
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-slate-600 text-sm">Total Assignments:</span>
                      <span className="font-medium text-sm">{assignmentSubmissions.length}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-slate-600 text-sm">Submitted:</span>
                      <span className="font-medium text-sm">{assignmentSubmissions.filter(sub => sub.submitted).length}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-slate-600 text-sm">Attendance Records:</span>
                      <span className="font-medium text-sm">{attendanceData.length}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-slate-600 text-sm">Present Days:</span>
                      <span className="font-medium text-sm">
                        {attendanceData.filter(record => record.status === 'present' || record.status === 'late').length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance Data */}
              <AttendanceSection attendanceData={attendanceData} />

              {/* Assignment Submissions with Scores */}
              <AssignmentSection
                assignmentSubmissions={assignmentSubmissions}
                getGradeColor={getGradeColor}
              />

              {/* Remarks Section */}
              <RemarksSection
                remarks={remarks}
                editingRemarks={editingRemarks}
                savingRemarks={savingRemarks}
                onRemarksChange={onRemarksChange}
                onEditingRemarksChange={onEditingRemarksChange}
                onSaveRemarks={onSaveRemarks}
              />

              {/* Submit Report Section */}
              <div className="border-t border-slate-200 pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h4 className="text-base sm:text-lg font-semibold text-slate-800">Submit Report to Admin</h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Submit this report for {getTermName(selectedTerm)} {selectedAcademicYear} to the admin for review
                    </p>
                  </div>
                  <button
                    onClick={onSubmitReport}
                    disabled={submittingReport}
                    className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingReport ? 'Submitting...' : 'Submit to Admin'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentReportModal;
