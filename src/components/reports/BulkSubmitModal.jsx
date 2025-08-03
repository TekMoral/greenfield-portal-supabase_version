import React from 'react';
import { getTermName } from '../../utils/reportUtils';

const BulkSubmitModal = ({
  showBulkSubmitModal,
  students,
  selectedSubject,
  selectedTerm,
  selectedAcademicYear,
  classes,
  selectedClass,
  submittingBulkReports,
  onClose,
  onSubmitBulkReports
}) => {
  if (!showBulkSubmitModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl">
        <div className="bg-purple-600 text-white p-4 sm:p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-bold">Bulk Submit Reports</h3>
            <button
              onClick={onClose}
              className="text-white hover:text-purple-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-4 sm:p-6">
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Bulk Report Submission
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      This will submit reports for all {students.length} students in this class for {selectedSubject} 
                      ({getTermName(selectedTerm)} {selectedAcademicYear}). Reports that already exist will be skipped.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-medium text-slate-800 mb-2">Report Details:</h4>
              <div className="space-y-1 text-sm text-slate-600">
                <div><strong>Class:</strong> {classes.find(c => c.id === selectedClass)?.name}</div>
                <div><strong>Subject:</strong> {selectedSubject}</div>
                <div><strong>Academic Year:</strong> {selectedAcademicYear}</div>
                <div><strong>Term:</strong> {getTermName(selectedTerm)}</div>
                <div><strong>Students:</strong> {students.length}</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 bg-slate-500 text-white px-4 py-2 rounded-lg hover:bg-slate-600 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={onSubmitBulkReports}
                disabled={submittingBulkReports}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingBulkReports ? 'Submitting...' : 'Submit All Reports'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkSubmitModal;