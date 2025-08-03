import React, { useState, useEffect } from 'react';
import { getTeacherClassesAndSubjects, getStudentsByTeacherSubjectAndClasses } from '../../../services/teacherStudentService';

import { submitResult } from '../../../services/studentResultService';
import { useAuth } from '../../../hooks/useAuth';
import useToast from '../../../hooks/useToast';
import ExamResultEntryForm from '../../../components/results/ExamResultEntryForm';
import BulkExamResultUpload from '../../../components/results/BulkExamResultUpload';


const ExamResults = () => {

  const { user } = useAuth();
  const { showToast } = useToast();

  const [teacherClasses, setTeacherClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState([]);

  const [submittedResults, setSubmittedResults] = useState(new Set()); // Track submitted students
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('individual');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Helper function to get student full name
  const getStudentName = (student) => {
    if (student.firstName && student.lastName) {
      return `${student.firstName} ${student.lastName}`;
    }
    return student.name || 'Unknown Student';
  };

  useEffect(() => {
    fetchTeacherData();
  }, [user]);

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      fetchStudents();
    }
  }, [selectedClass, selectedSubject]);





  const fetchTeacherData = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const classes = await getTeacherClassesAndSubjects(user.uid);
      console.log('Teacher classes:', classes); // Debug log
      setTeacherClasses(classes);

      // Auto-select first class and subject if available
      if (classes.length > 0) {
        setSelectedClass(classes[0].id);
        if (classes[0].subjectsTaught && classes[0].subjectsTaught.length > 0) {
          setSelectedSubject(classes[0].subjectsTaught[0].subjectName);
        }
      }
    } catch (error) {
      console.error('Error fetching teacher data:', error);
      showToast('Failed to load teacher data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!selectedClass || !selectedSubject || !user?.uid) return;

    try {
      const selectedClassData = teacherClasses.find(c => c.id === selectedClass);

      if (selectedClassData) {
        let classIds = [];

        if (selectedClassData.isGrouped) {
          // For grouped classes, get all individual class IDs
          classIds = selectedClassData.individualClasses.map(c => c.id);
        } else {
          // For individual classes, use the single class ID
          classIds = [selectedClass];
        }

        const studentsData = await getStudentsByTeacherSubjectAndClasses(
          user.uid,
          selectedSubject,
          classIds
        );
        console.log('Students data:', studentsData); // Debug log
        setStudents(studentsData);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      showToast('Failed to load students', 'error');
    }
  };





  const handleClassChange = (classId) => {
    setSelectedClass(classId);
    setSelectedSubject('');
    setStudents([]);
    setSubmittedResults(new Set());

    // Auto-select first subject for the new class
    const classData = teacherClasses.find(c => c.id === classId);
    if (classData && classData.subjectsTaught && classData.subjectsTaught.length > 0) {
      setSelectedSubject(classData.subjectsTaught[0].subjectName);
    }
  };

  const getAvailableSubjects = () => {
    const classData = teacherClasses.find(c => c.id === selectedClass);
    return classData ? classData.subjectsTaught : [];
  };

  const getSelectedClassData = () => {
    return teacherClasses.find(c => c.id === selectedClass);
  };

  const handleIndividualResultSubmit = async (resultData) => {
    if (!selectedClass || !selectedSubject) {
      showToast('Please select class and subject', 'error');
      return;
    }

    try {
      setSubmitting(true);
      // Use the new submitResult function
      await submitResult({
        studentId: resultData.studentId,
        subjectId: selectedSubject,
        term: resultData.term,
        year: resultData.session,
        testScore: resultData.testScore,
        examScore: resultData.examScore,
      });
      setSubmittedResults(prev => new Set([...prev, resultData.studentId]));
      setShowEntryForm(false);
      setSelectedStudent(null);
      showToast('Exam result submitted for admin approval', 'success');
    } catch (error) {
      console.error('Error submitting result:', error);
      if (error.message.includes('already submitted')) {
        showToast(error.message, 'error');
      } else if (error.message.includes('permission')) {
        showToast('Permission denied. Please contact your administrator.', 'error');
      } else if (error.message.includes('unavailable')) {
        showToast('Service temporarily unavailable. Please try again later.', 'error');
      } else {
        showToast(`Failed to submit result: ${error.message}`, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkResultSubmit = async (bulkResults) => {
    if (!selectedClass || !selectedSubject) {
      showToast('Please select class and subject', 'error');
      return;
    }

    try {
      setSubmitting(true);

      const classData = getSelectedClassData();
      const submissionData = {
        type: 'bulk',
        subject: selectedSubject,
        classId: selectedClass,
        className: classData?.name || 'Unknown Class',
        teacherId: user.uid,
        teacherName: user.name || user.email,
        examTitle: `${selectedSubject} - Bulk Results`,
        session: bulkResults[0]?.session || new Date().getFullYear().toString(),
        term: bulkResults[0]?.term || 'First Term',
        results: bulkResults.map(result => ({
          ...result,
          classId: selectedClass,
          subject: selectedSubject,
          teacherId: user.uid
        })),
        totalStudents: bulkResults.length
      };

      // Submit each result individually
      let successCount = 0;
      let alreadySubmittedCount = 0;
      for (const result of bulkResults) {
        try {
          await submitResult({
            studentId: result.studentId,
            subjectId: selectedSubject,
            term: result.term,
            year: result.session,
            testScore: result.testScore,
            examScore: result.examScore,
          });
          successCount++;
        } catch (error) {
          if (error.message.includes('already submitted')) {
            alreadySubmittedCount++;
          } else {
            throw error;
          }
        }
      }
      // Mark all students as submitted
      const submittedStudentIds = bulkResults.map(r => r.studentId);
      setSubmittedResults(prev => new Set([...prev, ...submittedStudentIds]));
      showToast(`${successCount} results submitted. ${alreadySubmittedCount} already submitted.`, 'success');
    } catch (error) {
      console.error('Error submitting bulk results:', error);
      if (error.message.includes('already submitted')) {
        showToast(error.message, 'error');
      } else if (error.message.includes('permission')) {
        showToast('Permission denied. Please contact your administrator.', 'error');
      } else if (error.message.includes('unavailable')) {
        showToast('Service temporarily unavailable. Please try again later.', 'error');
      } else {
        showToast(`Failed to submit bulk results: ${error.message}`, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isStudentSubmitted = (studentId) => {
    return submittedResults.has(studentId);
  };

  const getResultsStats = () => {
    const total = students.length;
    const submitted = submittedResults.size;
    const pending = total - submitted;

    return { total, submitted, pending };
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const stats = getResultsStats();

  const selectedClassData = getSelectedClassData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Submit Exam Results</h2>
          <p className="text-gray-600 mt-1">Submit exam and test scores for admin review and final grading</p>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-800">Scoring System</h3>
            <p className="text-sm text-blue-700">
              Submit exam scores (max 50) + test scores (max 30) = 80% of total grade.
              Admin will add assignment (15%) and attendance (5%) scores before publishing.
            </p>
          </div>
        </div>
      </div>

      {/* Duplicate Prevention Notice */}
      {submittedResults.size > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Duplicate Prevention</h3>
              <p className="text-sm text-yellow-700">
                {submittedResults.size} student(s) already have submitted results for this subject and term.
                You cannot submit results twice for the same student.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Class and Subject Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select Class and Subject</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a class</option>
              {teacherClasses.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} - {cls.level}
                  {cls.category && cls.category !== 'All Categories' && ` (${cls.category})`}
                  {cls.isGrouped && ' (All Categories)'}
                  {' '}({cls.studentCount} students)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedClass}
            >
              <option value="">Select a subject</option>
              {getAvailableSubjects().map(subject => (
                <option key={subject.subjectName} value={subject.subjectName}>
                  {subject.subjectName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Class Info */}
        {selectedClassData && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Class Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Type:</span> {selectedClassData.isGrouped ? 'Grouped Classes' : 'Individual Class'}
              </div>
              <div>
                <span className="font-medium">Level:</span> {selectedClassData.level}
              </div>
              <div>
                <span className="font-medium">Total Students:</span> {selectedClassData.studentCount}
              </div>
            </div>
            {selectedClassData.isGrouped && selectedClassData.individualClasses && (
              <div className="mt-2">
                <span className="text-sm font-medium text-gray-700">Includes classes: </span>
                <span className="text-sm text-gray-600">
                  {selectedClassData.individualClasses.map(c => c.name).join(', ')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {selectedClass && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Submitted</p>
                <p className="text-2xl font-bold text-gray-900">{stats.submitted}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('individual')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'individual'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Individual Entry
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'bulk'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Bulk Upload
            </button>

          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'individual' && selectedClass && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Individual Result Entry</h3>
                <button
                  onClick={() => setShowEntryForm(true)}
                  disabled={!selectedSubject}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Result
                </button>
              </div>

              <div className="grid gap-4">
                {students.map(student => {
                  const isSubmitted = isStudentSubmitted(student.id);
                  const studentName = getStudentName(student);
                  return (
                    <div
                      key={student.id}
                      className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                        isSubmitted
                          ? 'border-green-200 bg-green-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isSubmitted ? 'bg-green-200' : 'bg-gray-200'
                        }`}>
                          <span className={`text-sm font-medium ${
                            isSubmitted ? 'text-green-800' : 'text-gray-600'
                          }`}>
                            {studentName.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{`${student?.firstName || ''} ${student?.surname || ''}`}</p>
                          <p className="text-sm text-gray-600">{student.admissionNumber}</p>
                          <p className="text-xs text-gray-500">{student.className}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {isSubmitted ? (
                          <div className="text-right">
                            <p className="font-medium text-green-700">Result Submitted</p>
                            <p className="text-sm text-green-600">Pending Admin Review</p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No result submitted</span>
                        )}
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setShowEntryForm(true);
                          }}
                          disabled={isSubmitted || !selectedSubject}
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            isSubmitted
                              ? 'bg-green-100 text-green-700 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                          }`}
                        >
                          {isSubmitted ? 'Submitted' : 'Add Result'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'bulk' && selectedClass && (
            <BulkExamResultUpload
              students={students.filter(student => !isStudentSubmitted(student.id))} // Only show unsubmitted students
              subject={selectedSubject}
              onSubmit={handleBulkResultSubmit}
              submitting={submitting}
              submittedResults={submittedResults}
            />
          )}



          {!selectedClass && (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select Class and Subject</h3>
              <p className="text-gray-600">Please select a class and subject to start submitting results.</p>
            </div>
          )}
        </div>
      </div>

      {/* Individual Result Entry Modal */}
      {showEntryForm && selectedStudent && (
        <ExamResultEntryForm
          student={selectedStudent}
          subject={selectedSubject}
          onSubmit={handleIndividualResultSubmit}
          onClose={() => {
            setShowEntryForm(false);
            setSelectedStudent(null);
          }}
          submitting={submitting}
        />
      )}
    </div>
  );
};

export default ExamResults;
