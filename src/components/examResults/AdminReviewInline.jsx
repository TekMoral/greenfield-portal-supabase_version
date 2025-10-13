import React, { useState, useEffect } from 'react';
import { calculateGrade } from '../../services/supabase/studentResultService';

const AdminReviewInline = ({
  result,
  onSubmit,
  onClose,
  exams,
  classes,
  subjects,
  students,
  isReadOnly = false
}) => {
  const [approving, setApproving] = useState(false);

  const [errors, setErrors] = useState({});

  useEffect(() => {
    // no-op for approval-only flow
  }, [result]);

  const handleChange = () => {};

  const validateForm = () => true;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    try {
      setApproving(true);
      if (onSubmit) {
        await onSubmit({ result });
      }
    } catch (error) {
      setErrors({ approve: error.message });
    } finally {
      setApproving(false);
    }
  };

  if (!result) return null;

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId || s.uid === studentId);
    if (!student) return 'Unknown Student';
    if (student.full_name) return student.full_name;
    if (student.firstName && student.surname) return `${student.firstName} ${student.surname}`;
    if (student.name) return student.name;
    return 'Unknown Student';
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

  const getStudentAdmissionNumber = (studentId) => {
    const student = students.find(s => s.id === studentId || s.uid === studentId);
    return student ? (student.admission_number || student.admissionNumber || student.id) : studentId;
  };

  // Calculate teacher total (out of 100) with robust fallbacks
  const teacherScore = Number(result.totalScore ?? result.score ?? ((result.testScore || 0) + (result.examScore || 0))) || 0;
  const originalScore = teacherScore; // out of 100
  const originalMaxScore = 100;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {isReadOnly ? 'View Result' : 'Admin Review & Approval'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {getStudentName(result.studentId)} - {getSubjectName(result.subjectId)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Student Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Student Information</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-600">Name:</span>
            <span className="font-medium ml-2">{getStudentName(result.studentId)}</span>
          </div>
          <div>
            <span className="text-gray-600">Student ID:</span>
            <span className="font-medium ml-2">{getStudentAdmissionNumber(result.studentId)}</span>
          </div>
          <div>
            <span className="text-gray-600">Subject:</span>
            <span className="font-medium ml-2">{getSubjectName(result.subjectId)}</span>
          </div>
          <div>
            <span className="text-gray-600">Term:</span>
            <span className="font-medium ml-2">{`${getTermName(result.term)} / ${result.year || new Date().getFullYear()}`}</span>
          </div>
        </div>
      </div>

      {/* Current Scores Card */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-3">Current Teacher Scores</h4>
        <div className="space-y-2 text-sm">
          {result.testScore != null && (
            <div className="flex justify-between">
              <span className="text-blue-700">CA Score:</span>
              <span className="font-medium">{result.testScore}/30</span>
            </div>
          )}
          {result.examScore != null && (
            <div className="flex justify-between">
              <span className="text-blue-700">Exam Score:</span>
              <span className="font-medium">{result.examScore}/70</span>
            </div>
          )}
          <div className="flex justify-between border-t border-blue-200 pt-2 font-medium">
            <span className="text-blue-800">Teacher Total (100%):</span>
            <span className="text-blue-900">{originalScore}/{originalMaxScore}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Approval */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Approval</h4>
          <p className="text-sm text-gray-600 mb-3">Approving will finalize the teacher’s total (Exam 70% + CA 30%) and mark this result as graded.</p>
          {!isReadOnly && (
            <button
              onClick={handleSubmit}
              disabled={approving}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {approving ? 'Approving...' : 'Approve Result'}
            </button>
          )}
          {isReadOnly && (
            <div className="text-green-700">Approved</div>
          )}
        </div>

        {/* Final summary (approval-only): show current teacher total and grade */}
        <div className="bg-green-50 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">Final Score</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-green-700">Total Score:</span>
              <span className="font-medium ml-2">{originalScore}/100</span>
            </div>
            <div>
              <span className="text-green-700">Final Grade:</span>
              <span className="font-medium ml-2">{calculateGrade(originalScore, 100).grade}</span>
            </div>
          </div>
          <div className="mt-3 text-center">
            <div className="text-2xl font-bold text-green-800">{((originalScore / 100) * 100).toFixed(1)}%</div>
            <div className="text-sm text-green-600">Final Percentage</div>
          </div>
        </div>

        {/* Teacher Comments */}
        {result.teacherComments && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teacher Comments
            </label>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">{result.teacherComments}</p>
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
          Approval will mark this result as graded. Publishing is a separate step.
          </p>
          </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
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
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Submit Review
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AdminReviewInline;