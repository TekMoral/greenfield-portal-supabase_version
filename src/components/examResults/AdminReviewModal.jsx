import React, { useState, useEffect } from 'react';
import { calculateGrade } from '../../services/supabase/studentResultService';

const AdminReviewModal = ({
  isOpen,
  onClose,
  result,
  onSubmit,
  exams,
  classes,
  subjects,
  students,
  isReadOnly = false
}) => {
  const [formData, setFormData] = useState({
    adminScore: '',
    adminMaxScore: 20, // Default 20% admin assessment
    adminComments: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (result) {
      setFormData({
        adminScore: result.adminScore || '',
        adminMaxScore: result.adminMaxScore || 20,
        adminComments: result.adminComments || ''
      });
    }
  }, [result]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const adminScoreVal = formData.adminScore;

    if (adminScoreVal === '' || adminScoreVal === null || adminScoreVal === undefined) {
      newErrors.adminScore = 'Admin score is required';
    } else {
      const score = parseFloat(adminScoreVal);
      const maxScore = parseFloat(formData.adminMaxScore);

      if (isNaN(score) || score < 0) {
        newErrors.adminScore = 'Score must be a valid number';
      }
      if (score > maxScore) {
        newErrors.adminScore = `Score cannot exceed ${maxScore}`;
      }
    }

    if (!formData.adminMaxScore) {
      newErrors.adminMaxScore = 'Max score is required';
    } else {
      const maxScore = parseFloat(formData.adminMaxScore);
      if (isNaN(maxScore) || maxScore <= 0) {
        newErrors.adminMaxScore = 'Max score must be a positive number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!validateForm()) return;
    try {
      if (onSubmit) {
        await onSubmit({
          adminScore: parseFloat(formData.adminScore),
          adminMaxScore: parseFloat(formData.adminMaxScore),
          adminComments: formData.adminComments,
          teacherScore: originalScore
        });
      }
    } catch (error) {
      setErrors({ adminScore: error.message });
    }
  };

  const resetForm = () => {
    setFormData({
      adminScore: '',
      adminMaxScore: 20,
      adminComments: ''
    });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen || !result) return null;

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId || s.uid === studentId);
    if (!student) return 'Unknown Student';
    if (student.full_name) return student.full_name;
    if (student.firstName && student.surname) return `${student.firstName} ${student.surname}`;
    if (student.name) return student.name;
    return 'Unknown Student';
  };

  const getExamName = (examId) => {
    const exam = exams.find(e => e.id === examId);
    return exam ? exam.examName : 'Unknown Exam';
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : 'Unknown Subject';
  };

  const getTermName = (t) => {
    if (t === 1 || t === '1') return '1st Term';
    if (t === 2 || t === '2') return '2nd Term';
    if (t === 3 || t === '3') return '3rd Term';
    return ` ${t}`;
  };

  const getClassName = (classId) => {
    const classData = classes.find(c => c.id === classId);
    return classData ? classData.name : 'Unknown Class';
  };

  const getStudentAdmissionNumber = (studentId) => {
    const student = students.find(s => s.id === studentId || s.uid === studentId);
    return student ? (student.admission_number || student.admissionNumber || student.id) : studentId;
  };

  // Calculate teacher subtotal (out of 80) with robust fallbacks
  const teacherScore = Number(result.totalScore ?? result.score ?? ((result.testScore || 0) + (result.examScore || 0))) || 0;
  const originalScore = teacherScore; // out of 80
  const originalMaxScore = 80;

  // Calculate projected final scores
  const projectedAdminScore = parseFloat(formData.adminScore) || 0;
  const projectedTotalScore = originalScore + projectedAdminScore;
  const projectedGrade = calculateGrade(projectedTotalScore, 100);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="bg-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                {isReadOnly ? 'View Result' : 'Admin Review & Assessment'}
              </h2>
              <p className="text-blue-100">
                {getStudentName(result.studentId)} - {getSubjectName(result.subjectId)}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:text-blue-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Student Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-3">Student Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Name:</span>
                  <span className="font-medium">{getStudentName(result.studentId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Student ID:</span>
                  <span className="font-medium">{getStudentAdmissionNumber(result.studentId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Subject:</span>
                  <span className="font-medium">{getSubjectName(result.subjectId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Exam:</span>
                  <span className="font-medium">{`${getTermName(result.term)} / ${result.year || new Date().getFullYear()}`}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-3">Current Scores</h3>
              <div className="space-y-2">
                {result.testScore != null && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Test Score:</span>
                    <span className="font-medium">{result.testScore}/30</span>
                  </div>
                )}
                {result.examScore != null && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Exam Score:</span>
                    <span className="font-medium">{result.examScore}/50</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="text-slate-600 font-medium">Teacher Subtotal (80%):</span>
                  <span className="font-bold">{originalScore}/{originalMaxScore}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Assessment */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Admin Assessment</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Admin Score *
                </label>
                <input
                  type="number"
                  name="adminScore"
                  value={formData.adminScore}
                  onChange={handleChange}
                  min="0"
                  step="0.1"
                  disabled={isReadOnly}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.adminScore ? 'border-red-300' : 'border-slate-300'
                  } ${isReadOnly ? 'bg-gray-50' : ''}`}
                  placeholder="Enter admin assessment score"
                />
                {errors.adminScore && <p className="text-red-600 text-xs mt-1">{errors.adminScore}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Max Score *
                </label>
                <input
                  type="number"
                  name="adminMaxScore"
                  value={formData.adminMaxScore}
                  onChange={handleChange}
                  min="1"
                  disabled={isReadOnly}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.adminMaxScore ? 'border-red-300' : 'border-slate-300'
                  } ${isReadOnly ? 'bg-gray-50' : ''}`}
                  placeholder="Maximum possible score"
                />
                {errors.adminMaxScore && <p className="text-red-600 text-xs mt-1">{errors.adminMaxScore}</p>}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Admin Comments
              </label>
              <textarea
                name="adminComments"
                value={formData.adminComments}
                onChange={handleChange}
                rows={3}
                disabled={isReadOnly}
                className={`w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  isReadOnly ? 'bg-gray-50' : ''
                }`}
                placeholder="Optional comments about the admin assessment..."
              />
            </div>
          </div>

          {/* Score Preview */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Final Score Preview</h3>
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-slate-800">{projectedTotalScore}</div>
                  <div className="text-sm text-slate-600">Total Score</div>
                  <div className="text-xs text-slate-500">out of 100</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {((projectedTotalScore / 100) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-slate-600">Percentage</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{projectedGrade.grade}</div>
                  <div className="text-sm text-slate-600">Grade</div>
                  <div className="text-xs text-slate-500">GPA: {projectedGrade.gpa}</div>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <h4 className="font-medium text-slate-800 mb-2">Score Breakdown</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="flex justify-between">
                      <span>Teacher Score (80%):</span>
                      <span>{originalScore}/80</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Admin Assessment (20%):</span>
                      <span>{projectedAdminScore}/20</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-medium">
                      <span>Final Total:</span>
                      <span>{projectedTotalScore}/100</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Final Grade:</span>
                      <span>{projectedGrade.grade} ({projectedGrade.gpa} GPA)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Teacher Comments */}
          {result.teacherComments && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">Teacher Comments</h3>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-slate-700">{result.teacherComments}</p>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {isReadOnly ? 'Close' : 'Cancel'}
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Submit Review
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminReviewModal;
