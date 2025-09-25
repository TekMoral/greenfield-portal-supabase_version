// src/components/notifications/EmailNotificationModal.jsx
import React, { useState, useEffect } from 'react';
import emailService from '../../services/emailService';
import toast from 'react-hot-toast';

const EmailNotificationModal = ({ 
  isOpen, 
  onClose, 
  type, // 'exam_result' or 'report_card'
  students = [],
  examData = null,
  reportData = null
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [emailResults, setEmailResults] = useState(null);
  const [step, setStep] = useState('select'); // 'select', 'sending', 'results'

  useEffect(() => {
    if (isOpen) {
      setSelectedStudents(students.map(s => s.id));
      setEmailResults(null);
      setStep('select');
    }
  }, [isOpen, students]);

  const handleStudentToggle = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    setSelectedStudents(students.map(s => s.id));
  };

  const handleDeselectAll = () => {
    setSelectedStudents([]);
  };

  const handleSendEmails = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    setIsLoading(true);
    setStep('sending');

    try {
      const selectedStudentData = students.filter(s => selectedStudents.includes(s.id));
      let results;

      if (type === 'exam_result') {
        results = await emailService.notifyExamResults({
          students: selectedStudentData,
          examTitle: examData.title,
          term: examData.term,
          academicYear: examData.academicYear
        });
      } else if (type === 'report_card') {
        results = await emailService.notifyReportCards({
          students: selectedStudentData,
          term: reportData.term,
          academicYear: reportData.academicYear,
          reportType: reportData.type || 'Term Report'
        });
      }

      setEmailResults(results);
      setStep('results');

      if (results.summary.sent > 0) {
        toast.success(`Successfully sent ${results.summary.sent} email(s)`);
      }
      if (results.summary.failed > 0) {
        toast.error(`Failed to send ${results.summary.failed} email(s)`);
      }

    } catch (error) {
      console.error('Email sending error:', error);
      toast.error('Failed to send emails. Please try again.');
      setStep('select');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedStudents([]);
    setEmailResults(null);
    setStep('select');
    onClose();
  };

  if (!isOpen) return null;

  const getTitle = () => {
    if (type === 'exam_result') return 'Send Exam Result Notifications';
    if (type === 'report_card') return 'Send Report Card Notifications';
    return 'Send Email Notifications';
  };

  const getDescription = () => {
    if (type === 'exam_result') {
      return `Send exam result notifications for "${examData?.title}" to parents/guardians`;
    }
    if (type === 'report_card') {
      return `Send report card notifications for ${reportData?.term} ${reportData?.academicYear} to parents/guardians`;
    }
    return 'Send email notifications to selected recipients';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">{getTitle()}</h2>
                <p className="text-purple-100 text-sm">{getDescription()}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'select' && (
            <div className="space-y-6">
              {/* Selection Controls */}
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedStudents.length} of {students.length} students selected
                  </p>
                  <p className="text-sm text-gray-600">
                    Emails will be sent to parents/guardians where available
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleSelectAll}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Student List */}
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                <div className="divide-y divide-gray-200">
                  {students.map((student) => {
                    const isSelected = selectedStudents.includes(student.id);
                    const hasEmail = student.guardian_email || student.email;
                    
                    return (
                      <div
                        key={student.id}
                        className={`p-4 flex items-center space-x-3 hover:bg-gray-50 ${
                          !hasEmail ? 'opacity-50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleStudentToggle(student.id)}
                          disabled={!hasEmail}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">
                                  {student.full_name?.charAt(0) || student.first_name?.charAt(0) || '?'}
                                </span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {student.full_name || `${student.first_name} ${student.surname}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {student.admission_number} • {student.classes?.name || 'No Class'}
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              {hasEmail ? (
                                <div className="text-xs text-gray-600">
                                  <p>📧 {student.guardian_email || student.email}</p>
                                  {student.guardian_name && (
                                    <p className="text-gray-500">{student.guardian_name}</p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-red-500">No email available</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmails}
                  disabled={selectedStudents.length === 0}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send {selectedStudents.length} Email{selectedStudents.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}

          {step === 'sending' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="animate-spin w-8 h-8 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Sending Emails...
              </h3>
              <p className="text-gray-600">
                Please wait while we send notifications to {selectedStudents.length} recipient{selectedStudents.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {step === 'results' && emailResults && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Email Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{emailResults.summary.total}</div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{emailResults.summary.sent}</div>
                    <div className="text-sm text-gray-600">Sent</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{emailResults.summary.failed}</div>
                    <div className="text-sm text-gray-600">Failed</div>
                  </div>
                </div>
              </div>

              {/* Detailed Results */}
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                <div className="divide-y divide-gray-200">
                  {emailResults.results.map((result, index) => (
                    <div key={index} className="p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${result.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{result.studentName}</p>
                          {result.email && (
                            <p className="text-xs text-gray-500">{result.email}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {result.success ? (
                          <span className="text-xs text-green-600 font-medium">✓ Sent</span>
                        ) : (
                          <span className="text-xs text-red-600 font-medium">✗ Failed</span>
                        )}
                        {result.error && (
                          <p className="text-xs text-red-500 mt-1">{result.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailNotificationModal;