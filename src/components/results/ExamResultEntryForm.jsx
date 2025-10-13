import React, { useEffect, useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';

const ExamResultEntryForm = ({ student, subject, onSubmit, onClose, submitting, existingResult }) => {
  // Helper function to get student full name (consistent with Assignment component)
  const getStudentName = (student) => {
    if (!student) return 'Unknown Student';

    // Try firstName + lastName first (most common)
    if (student.firstName && student.lastName) {
      return `${student.firstName} ${student.lastName}`;
    }

    // Try firstName + surname
    if (student.firstName && student.surname) {
      return `${student.firstName} ${student.surname}`;
    }

    // Try name field
    if (student.name) {
      return student.name;
    }

    // Try just firstName
    if (student.firstName) {
      return student.firstName;
    }

    return 'Unknown Student';
  };

  const [formData, setFormData] = useState({
    studentId: student?.id || '',
    studentName: getStudentName(student),
    admissionNumber: student?.admissionNumber || '',
    exam_score: '',
    test_score: '',
        examType: 'final',
    session: new Date().getFullYear().toString(),
    term: '1st Term'
  });
  const [errors, setErrors] = useState({});

  
  const terms = ['1st Term', '2nd Term', '3rd Term'];

  const normalizeTermLabel = (t) => {
    if (t === 1 || t === '1' || String(t).includes('1')) return '1st Term';
    if (t === 2 || t === '2' || String(t).includes('2')) return '2nd Term';
    if (t === 3 || t === '3' || String(t).includes('3')) return '3rd Term';
    return '1st Term';
  };

  const { academicYear, currentTerm } = useSettings();

  // Keep form in sync with system settings unless viewing an existing result
  useEffect(() => {
    if (existingResult) return;
    setFormData((prev) => ({
      ...prev,
      session: String(academicYear || prev.session),
      term: normalizeTermLabel(currentTerm || prev.term)
    }));
  }, [academicYear, currentTerm]);

  // Prefill when existingResult is provided
  useEffect(() => {
    if (!existingResult) return;
    
    console.log('🔄 Prefilling form with existing result:', existingResult);
    
    const toTermString = (t) => {
      const n = parseInt(String(t), 10);
      if (n === 1) return '1st Term';
      if (n === 2) return '2nd Term';
      if (n === 3) return '3rd Term';
      // Try to normalize common strings to the option labels
      const s = String(t).toLowerCase();
      if (s.includes('1')) return '1st Term';
      if (s.includes('2')) return '2nd Term';
      if (s.includes('3')) return '3rd Term';
      return '1st Term';
    };

    setFormData(prev => ({
      ...prev,
      exam_score: existingResult.examScore ?? existingResult.exam_score ?? '',
      test_score: existingResult.testScore ?? existingResult.test_score ?? '',
            session: String(existingResult.year ?? existingResult.session ?? prev.session),
      term: toTermString(existingResult.term ?? prev.term)
    }));
  }, [existingResult]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (formData.exam_score === '' || formData.exam_score === null || formData.exam_score === undefined) {
      newErrors.exam_score = 'Exam score is required';
    } else {
      const score = Number(formData.exam_score);
      if (!Number.isInteger(score) || score < 0 || score > 70) {
        newErrors.exam_score = 'Exam score must be a whole number between 0 and 70';
      }
    }

    if (formData.test_score === '' || formData.test_score === null || formData.test_score === undefined) {
      newErrors.test_score = 'CA score is required';
    } else {
      const score = Number(formData.test_score);
      if (!Number.isInteger(score) || score < 0 || score > 30) {
        newErrors.test_score = 'CA score must be a whole number between 0 and 30';
      }
    }

    if (!formData.session.trim()) {
      newErrors.session = 'Session is required';
    }

    if (!formData.term.trim()) {
      newErrors.term = 'Term is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const resultData = {
      ...formData,
      exam_score: parseInt(formData.exam_score, 10),
      test_score: parseInt(formData.test_score, 10),
      totalTeacherScore: parseInt(formData.exam_score, 10) + parseInt(formData.test_score, 10),
      maxExamScore: 70,
      maxTestScore: 30,
      maxTeacherScore: 100
    };

    await onSubmit(resultData);
  };

  const getTotalScore = () => {
    const examScore = parseInt(formData.exam_score, 10) || 0;
    const testScore = parseInt(formData.test_score, 10) || 0;
    return examScore + testScore;
  };

  const getPercentage = () => {
    const total = getTotalScore();
    return Math.round((total / 100) * 100);
  };

  // Allow editing if result is rejected, otherwise read-only if exists
  const isRejected = existingResult && String(existingResult.status || '').toLowerCase() === 'rejected';
  const isReadOnly = !!existingResult && !isRejected;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {isRejected ? 'Correct & Resubmit Result' : isReadOnly ? 'View Submitted Result' : 'Submit Exam Result'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Student Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Student Information</h3>
            <p className="text-sm text-gray-600">Name: {getStudentName(student)}</p>
            <p className="text-sm text-gray-600">Admission No: {student?.admissionNumber}</p>
            <p className="text-sm text-gray-600">Subject: {subject}</p>
          </div>

          {/* Already Submitted Notice or Scoring System Info */}
          {isRejected ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h3 className="font-medium text-red-900 mb-1">Result Rejected by Admin</h3>
                  <p className="text-sm text-red-800 mb-2">
                    {existingResult?.admin_comments || existingResult?.adminComments || 'This result was rejected and needs correction.'}
                  </p>
                  <p className="text-sm text-red-700 font-medium">
                    Please correct the scores and resubmit for review.
                  </p>
                </div>
              </div>
            </div>
          ) : isReadOnly ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-medium text-green-900 mb-1">Result Already Submitted</h3>
                  <p className="text-sm text-green-800">
                    This result has been submitted to admin for review. You cannot modify it.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-900 mb-2">Scoring Breakdown</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Exam Score: 0-70 marks (70%)</p>
                <p>• CA Score: 0-30 marks (30%)</p>
                <p>• <strong>Your Total: 100 marks (100%)</strong></p>
                <p className="text-blue-600 mt-2">Submit to admin for approval. Final score = Exam 70% + CA 30%.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Session and Term */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session *
                </label>
                <input
                  type="text"
                  name="session"
                  value={formData.session}
                  onChange={handleChange}
                  disabled
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.session ? 'border-red-500' : 'border-gray-300'
                  } ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="e.g., 2023/2024"
                />
                {errors.session && <p className="text-red-500 text-sm mt-1">{errors.session}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Term *
                </label>
                <select
                  name="term"
                  value={formData.term}
                  onChange={handleChange}
                  disabled
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.term ? 'border-red-500' : 'border-gray-300'
                  } ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                  {terms.map(term => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </select>
                {errors.term && <p className="text-red-500 text-sm mt-1">{errors.term}</p>}
              </div>
            </div>

            {/* Exam Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exam Type
              </label>
              <div className={`w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-700 ${isReadOnly ? '' : ''}`}>
                Final Exam
              </div>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exam Score * (0-70)
                </label>
                <input
                  type="number"
                  name="exam_score"
                  value={formData.exam_score}
                  onChange={handleChange}
                  min="0"
                  max="70"
                  step="0.5"
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.exam_score ? 'border-red-500' : 'border-gray-300'
                  } ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="0-70"
                />
                {errors.exam_score && <p className="text-red-500 text-sm mt-1">{errors.exam_score}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CA Score * (0-30)
                </label>
                <input
                  type="number"
                  name="test_score"
                  value={formData.test_score}
                  onChange={handleChange}
                  min="0"
                  max="30"
                  step="0.5"
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.test_score ? 'border-red-500' : 'border-gray-300'
                  } ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="0-30"
                />
                {errors.test_score && <p className="text-red-500 text-sm mt-1">{errors.test_score}</p>}
              </div>
            </div>

            
            {/* Score Summary */}
            {(formData.exam_score || formData.test_score) && (
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Score Summary (Teacher Total 100%)</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-700">Exam Score:</span>
                    <span className="font-medium ml-2">{formData.exam_score || 0}/70</span>
                  </div>
                  <div>
                    <span className="text-green-700">CA Score:</span>
                    <span className="font-medium ml-2">{formData.test_score || 0}/30</span>
                  </div>
                  <div>
                    <span className="text-green-700">Total Score:</span>
                    <span className="font-medium ml-2">{getTotalScore()}/100</span>
                  </div>
                  <div>
                    <span className="text-green-700">Percentage:</span>
                    <span className="font-medium ml-2">{getPercentage()}%</span>
                  </div>
                </div>
                <div className="mt-3 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
                  <strong>Note:</strong> Final score is Exam 70% + CA 30%. Admin approval is required before publishing.
                </div>
              </div>
            )}

            {/* Notice */}
            {!isReadOnly && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-yellow-700">
                    This result will be submitted to admin for approval before students can see it.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {isReadOnly ? 'Close' : 'Cancel'}
              </button>
              {!isReadOnly && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? (isRejected ? 'Resubmitting...' : 'Submitting...') : (isRejected ? 'Resubmit for Review' : 'Submit for Review')}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExamResultEntryForm;