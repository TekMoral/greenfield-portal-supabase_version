import React, { useState, useEffect } from 'react';

const TeacherResultEntryForm = ({ student, exam, onSubmit, onClose, submitting }) => {
  const [formData, setFormData] = useState({
    studentId: student?.id || '',
    studentName: student?.name || '',
    admissionNumber: student?.admissionNumber || '',
    totalScore: '',
    grade: '',
    remarks: '',
    session: new Date().getFullYear().toString(),
    term: 'First Term'
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (exam) {
      setFormData(prev => ({
        ...prev,
        session: exam.session || prev.session,
        term: exam.term || prev.term
      }));
    }
  }, [exam]);

  const calculateGrade = (score, totalMarks) => {
    const percentage = (score / totalMarks) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto-calculate grade when score changes
      if (name === 'totalScore' && value && exam?.totalMarks) {
        const score = parseFloat(value);
        if (!isNaN(score)) {
          updated.grade = calculateGrade(score, exam.totalMarks);
        }
      }
      
      return updated;
    });

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.totalScore) {
      newErrors.totalScore = 'Total score is required';
    } else {
      const score = parseFloat(formData.totalScore);
      if (isNaN(score) || score < 0 || score > exam.totalMarks) {
        newErrors.totalScore = `Score must be between 0 and ${exam.totalMarks}`;
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
      totalScore: parseFloat(formData.totalScore),
      percentage: Math.round((parseFloat(formData.totalScore) / exam.totalMarks) * 100),
      status: parseFloat(formData.totalScore) >= exam.passingMarks ? 'passed' : 'failed'
    };

    await onSubmit(resultData);
  };

  const terms = ['First Term', 'Second Term', 'Third Term'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Submit Result</h2>
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
            <p className="text-sm text-gray-600">Name: {student?.name}</p>
            <p className="text-sm text-gray-600">Admission No: {student?.admissionNumber}</p>
            <p className="text-sm text-gray-600">Exam: {exam?.title}</p>
            <p className="text-sm text-gray-600">Subject: {exam?.subject}</p>
            <p className="text-sm text-gray-600">Total Marks: {exam?.totalMarks}</p>
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

            {/* Score */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Score * (out of {exam?.totalMarks})
              </label>
              <input
                type="number"
                name="totalScore"
                value={formData.totalScore}
                onChange={handleChange}
                min="0"
                max={exam?.totalMarks}
                step="0.5"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.totalScore ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter score"
              />
              {errors.totalScore && <p className="text-red-500 text-sm mt-1">{errors.totalScore}</p>}
            </div>

            {/* Grade (Auto-calculated) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grade
              </label>
              <input
                type="text"
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                placeholder="Auto-calculated"
                readOnly
              />
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional remarks about student performance..."
              />
            </div>

            {/* Score Summary */}
            {formData.totalScore && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Score Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Score:</span>
                    <span className="font-medium ml-2">{formData.totalScore}/{exam?.totalMarks}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Percentage:</span>
                    <span className="font-medium ml-2">
                      {Math.round((parseFloat(formData.totalScore) / exam?.totalMarks) * 100)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">Grade:</span>
                    <span className="font-medium ml-2">{formData.grade}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Status:</span>
                    <span className={`font-medium ml-2 ${
                      parseFloat(formData.totalScore) >= exam?.passingMarks ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {parseFloat(formData.totalScore) >= exam?.passingMarks ? 'Passed' : 'Failed'}
                    </span>
                  </div>
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
                  This result will be submitted to admin for approval before students can see it.
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
                {submitting ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TeacherResultEntryForm;