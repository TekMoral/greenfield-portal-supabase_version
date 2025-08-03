import React, { useState } from 'react';

const ExamResultEntryForm = ({ student, subject, onSubmit, onClose, submitting }) => {
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
    examScore: '',
    testScore: '',
    examType: 'midterm',
    session: new Date().getFullYear().toString(),
    term: 'First Term'
  });
  const [errors, setErrors] = useState({});

  const examTypes = [
    { value: 'midterm', label: 'Mid-term Exam' },
    { value: 'final', label: 'Final Exam' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'test', label: 'Class Test' },
    { value: 'monthly', label: 'Monthly Test' }
  ];

  const terms = ['First Term', 'Second Term', 'Third Term'];

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

    if (!formData.examScore) {
      newErrors.examScore = 'Exam score is required';
    } else {
      const score = parseFloat(formData.examScore);
      if (isNaN(score) || score < 0 || score > 50) {
        newErrors.examScore = 'Exam score must be between 0 and 50';
      }
    }

    if (!formData.testScore) {
      newErrors.testScore = 'Test score is required';
    } else {
      const score = parseFloat(formData.testScore);
      if (isNaN(score) || score < 0 || score > 30) {
        newErrors.testScore = 'Test score must be between 0 and 30';
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
      examScore: parseFloat(formData.examScore),
      testScore: parseFloat(formData.testScore),
      totalTeacherScore: parseFloat(formData.examScore) + parseFloat(formData.testScore),
      maxExamScore: 50,
      maxTestScore: 30,
      maxTeacherScore: 80
    };

    await onSubmit(resultData);
  };

  const getTotalScore = () => {
    const examScore = parseFloat(formData.examScore) || 0;
    const testScore = parseFloat(formData.testScore) || 0;
    return examScore + testScore;
  };

  const getPercentage = () => {
    const total = getTotalScore();
    return Math.round((total / 80) * 100);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Submit Exam Result</h2>
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

          {/* Scoring System Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">Scoring Breakdown</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• Exam Score: 0-50 marks (50%)</p>
              <p>• Test Score: 0-30 marks (30%)</p>
              <p>• <strong>Your Total: 80 marks (80%)</strong></p>
              <p className="text-blue-600 mt-2">Admin will add Assignment (15%) + Attendance (5%) = 20%</p>
            </div>
          </div>

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
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.session ? 'border-red-500' : 'border-gray-300'
                  }`}
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
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.term ? 'border-red-500' : 'border-gray-300'
                  }`}
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
              <select
                name="examType"
                value={formData.examType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {examTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exam Score * (0-50)
                </label>
                <input
                  type="number"
                  name="examScore"
                  value={formData.examScore}
                  onChange={handleChange}
                  min="0"
                  max="50"
                  step="0.5"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.examScore ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0-50"
                />
                {errors.examScore && <p className="text-red-500 text-sm mt-1">{errors.examScore}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Score * (0-30)
                </label>
                <input
                  type="number"
                  name="testScore"
                  value={formData.testScore}
                  onChange={handleChange}
                  min="0"
                  max="30"
                  step="0.5"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.testScore ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0-30"
                />
                {errors.testScore && <p className="text-red-500 text-sm mt-1">{errors.testScore}</p>}
              </div>
            </div>

            {/* Score Summary */}
            {(formData.examScore || formData.testScore) && (
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Score Summary (Teacher's 80%)</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-700">Exam Score:</span>
                    <span className="font-medium ml-2">{formData.examScore || 0}/50</span>
                  </div>
                  <div>
                    <span className="text-green-700">Test Score:</span>
                    <span className="font-medium ml-2">{formData.testScore || 0}/30</span>
                  </div>
                  <div>
                    <span className="text-green-700">Total Score:</span>
                    <span className="font-medium ml-2">{getTotalScore()}/80</span>
                  </div>
                  <div>
                    <span className="text-green-700">Percentage:</span>
                    <span className="font-medium ml-2">{getPercentage()}%</span>
                  </div>
                </div>
                <div className="mt-3 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
                  <strong>Note:</strong> Admin will add Assignment (15 marks) + Attendance (5 marks) to complete the 100% grading.
                </div>
              </div>
            )}

            {/* Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-yellow-700">
                  This result will be submitted to admin for final grading and approval before students can see it.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit for Review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExamResultEntryForm;
