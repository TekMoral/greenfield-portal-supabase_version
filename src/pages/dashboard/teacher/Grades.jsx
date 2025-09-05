import React, { useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { getAssignmentsByTeacher, gradeStudentSubmission, getAssignmentSubmissions } from "../../../services/supabase/assignmentService";
import { getTeacherSubjectsWithStudents } from "../../../services/supabase/teacherStudentService";
import { getStudent } from "../../../services/supabase/studentService";
import { getFullName } from "../../../utils/nameUtils";

const Grades = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch teacher's assignments and subjects
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch teacher's subjects and assignments
        const [subjectsRes, assignmentsRes] = await Promise.all([
          getTeacherSubjectsWithStudents(user.id),
          getAssignmentsByTeacher(user.id)
        ]);
        
        const subjectsData = subjectsRes?.success ? (subjectsRes.data || []) : (Array.isArray(subjectsRes) ? subjectsRes : []);
        const assignmentsData = assignmentsRes?.success ? (assignmentsRes.data || []) : (Array.isArray(assignmentsRes) ? assignmentsRes : []);
        
        setSubjects(subjectsData);
        setAssignments(assignmentsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // Filter assignments by subject and only show those with submissions
  const filteredAssignments = Array.isArray(assignments) ? assignments.filter(assignment => {
    const hasSubmissions = assignment.submissions && assignment.submissions.length > 0;
    const matchesSubject = selectedSubject === "all" || assignment.subjectName === selectedSubject;
    return hasSubmissions && matchesSubject;
  }) : [];

  const handleGradeAssignment = async (assignment) => {
    try {
      const res = await getAssignmentSubmissions(assignment.id);
      const subs = res?.success ? (res.data || []) : (Array.isArray(res) ? res : []);
      const uiSubs = (subs || []).map((s) => ({
        id: s.id,
        studentId: s.student_id,
        grade: s.total_score ?? s.score ?? null,
        feedback: s.feedback ?? null,
        status: s.status,
        submittedAt: s.submitted_at,
        gradedAt: s.graded_at,
        submissionType: s.submission_type ?? ((s.responses || []).length > 0 ? 'objective_answers' : 'text'),
        content: s.submission_text ?? null,
        attachmentUrl: s.attachment_url ?? null,
        autoScore: s.auto_score ?? null,
        totalScore: s.total_score ?? null,
        responses: (s.responses || []).map((r) => ({
          id: r.id,
          questionId: r.question_id,
          answer: r.answer,
          autoScore: r.auto_score,
          isCorrect: r.is_correct,
          question: r.question || null,
        })),
      }));
      setSelectedAssignment({ ...assignment, submissions: uiSubs });
    } catch (e) {
      console.error('Error loading assignment submissions:', e);
      setSelectedAssignment(assignment);
    } finally {
      setShowGradingModal(true);
    }
  };

  const handleSubmitGrade = async (studentId, gradeData) => {
    try {
      // Persist grade to Supabase and ensure it succeeded
      const res = await gradeStudentSubmission(selectedAssignment.id, studentId, gradeData.grade, gradeData.feedback);
      if (!res?.success) {
        throw new Error(res?.error || 'Failed to grade submission');
      }

      // Re-fetch submissions from DB to guarantee persisted state
      try {
        const refreshed = await getAssignmentSubmissions(selectedAssignment.id);
        if (refreshed?.success) {
          const subs = refreshed.data || [];
          const uiSubs = subs.map((s) => ({
            id: s.id,
            studentId: s.student_id,
            grade: s.total_score ?? s.score ?? null,
            feedback: s.feedback ?? null,
            status: s.status,
            submittedAt: s.submitted_at,
            gradedAt: s.graded_at,
            submissionType: s.submission_type ?? ((s.responses || []).length > 0 ? 'objective_answers' : 'text'),
            content: s.submission_text ?? null,
            attachmentUrl: s.attachment_url ?? null,
            autoScore: s.auto_score ?? null,
            totalScore: s.total_score ?? null,
            responses: (s.responses || []).map((r) => ({
              id: r.id,
              questionId: r.question_id,
              answer: r.answer,
              autoScore: r.auto_score,
              isCorrect: r.is_correct,
              question: r.question || null,
            })),
          }));
          setSelectedAssignment((prev) => ({ ...(prev || {}), submissions: uiSubs }));

          // Also update list view state
          setAssignments((prev) => Array.isArray(prev) ? prev.map((a) => a.id === selectedAssignment.id ? { ...a, submissions: uiSubs } : a) : prev);
        }
      } catch (e) {
        // If refresh fails, fallback to optimistic local update
        setAssignments(Array.isArray(assignments) ? assignments.map(assignment => {
          if (assignment.id === selectedAssignment.id) {
            const updatedSubmissions = assignment.submissions.map(submission => {
              if (submission.studentId === studentId) {
                return {
                  ...submission,
                  ...gradeData,
                  status: 'graded'
                };
              }
              return submission;
            });
            return { ...assignment, submissions: updatedSubmissions };
          }
          return assignment;
        }) : assignments);

        setSelectedAssignment(prev => ({
          ...prev,
          submissions: prev.submissions.map(submission => {
            if (submission.studentId === studentId) {
              return { ...submission, ...gradeData, status: 'graded' };
            }
            return submission;
          })
        }));
      }

      alert('Grade submitted successfully!');
    } catch (error) {
      console.error('Error grading assignment:', error);
      alert(error?.message || 'Failed to submit grade. Please try again.');
    }
  };

  // Get assignment status based on due date and submissions
  const getAssignmentStatus = (assignment) => {
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    
    if (assignment.status === 'draft') return 'draft';
    if (assignment.status === 'closed') return 'closed';
    
    const totalSubmissions = assignment.submissions?.length || 0;
    const gradedSubmissions = assignment.submissions?.filter(sub => sub.status === 'graded').length || 0;
    
    if (gradedSubmissions === totalSubmissions && totalSubmissions > 0) {
      return 'fully-graded';
    }
    
    if (gradedSubmissions > 0) {
      return 'partially-graded';
    }
    
    if (dueDate < now) {
      return 'overdue';
    }
    
    return assignment.status;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "published": return "bg-blue-100 text-blue-800";
      case "fully-graded": return "bg-green-100 text-green-800";
      case "partially-graded": return "bg-yellow-100 text-yellow-800";
      case "overdue": return "bg-red-100 text-red-800";
      case "closed": return "bg-slate-100 text-slate-800";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "published": return "Active";
      case "fully-graded": return "Fully Graded";
      case "partially-graded": return "Partially Graded";
      case "overdue": return "Overdue";
      case "closed": return "Closed";
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalAssignmentsWithSubmissions = filteredAssignments.length;
  const fullyGradedCount = filteredAssignments.filter(a => getAssignmentStatus(a) === 'fully-graded').length;
  const partiallyGradedCount = filteredAssignments.filter(a => getAssignmentStatus(a) === 'partially-graded').length;
  const pendingGradingCount = filteredAssignments.filter(a => {
    const status = getAssignmentStatus(a);
    return status === 'published' || status === 'overdue';
  }).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800">Grade Management</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Grade student submissions and track progress</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="text-lg sm:text-2xl font-bold text-slate-800">{totalAssignmentsWithSubmissions}</div>
          <div className="text-xs sm:text-sm text-slate-600">Assignments with Submissions</div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="text-lg sm:text-2xl font-bold text-slate-800">{fullyGradedCount}</div>
          <div className="text-xs sm:text-sm text-slate-600">Fully Graded</div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="text-lg sm:text-2xl font-bold text-slate-800">{partiallyGradedCount}</div>
          <div className="text-xs sm:text-sm text-slate-600">Partially Graded</div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="text-lg sm:text-2xl font-bold text-slate-800">{pendingGradingCount}</div>
          <div className="text-xs sm:text-sm text-slate-600">Pending Grading</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <label className="text-sm font-medium text-slate-700">Filter by Subject:</label>
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full sm:w-auto"
        >
          <option value="all">All Subjects</option>
          {Array.isArray(subjects) && subjects.map((subject) => (
            <option key={subject.subjectName} value={subject.subjectName}>
              {subject.subjectName} ({subject.totalStudents} students)
            </option>
          ))}
        </select>
      </div>

      {/* Assignments List */}
      <div className="space-y-3 sm:space-y-4">
        {filteredAssignments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-slate-400 text-4xl mb-3">📝</div>
            <h3 className="text-base sm:text-lg font-medium text-slate-800 mb-2">No Assignments with Submissions</h3>
            <p className="text-sm sm:text-base text-slate-600">
              {selectedSubject === "all" 
                ? "No assignments have received submissions yet." 
                : `No assignments in ${selectedSubject} have received submissions yet.`
              }
            </p>
          </div>
        ) : (
          filteredAssignments.map((assignment) => {
            const currentStatus = getAssignmentStatus(assignment);
            const dueDate = new Date(assignment.dueDate);
            const now = new Date();
            const isOverdue = dueDate < now && assignment.status === 'published';
            
            const totalSubmissions = assignment.submissions?.length || 0;
            const gradedSubmissions = assignment.submissions?.filter(sub => sub.status === 'graded').length || 0;
            const pendingSubmissions = totalSubmissions - gradedSubmissions;
            
            return (
              <div key={assignment.id} className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-slate-200">
                {/* Mobile Layout */}
                <div className="block lg:hidden">
                  <div className="space-y-3">
                    {/* Title and Status */}
                    <div className="flex flex-wrap items-start gap-2">
                      <h3 className="text-base font-semibold text-slate-800 flex-1 min-w-0">{assignment.title}</h3>
                      <div className="flex flex-wrap gap-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentStatus)}`}>
                          {getStatusText(currentStatus)}
                        </span>
                        {isOverdue && (
                          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                            Past Due
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Description */}
                    <p className="text-sm text-slate-600 line-clamp-2">{assignment.description}</p>
                    
                    {/* Assignment Details */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                      <div>Subject: <span className="font-medium">{assignment.subjectName}</span></div>
                      <div className={dueDate < now ? 'text-red-600 font-medium' : ''}>
                        Due: <span className="font-medium">{new Date(assignment.dueDate).toLocaleDateString()}</span>
                      </div>
                      <div>Max Points: <span className="font-medium">{assignment.maxPoints}</span></div>
                      <div>Submissions: <span className="font-medium">{totalSubmissions}</span></div>
                    </div>
                    
                    {/* Grading Progress */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                        Graded: {gradedSubmissions}
                      </span>
                      <span className="text-yellow-600 font-medium bg-yellow-50 px-2 py-1 rounded">
                        Pending: {pendingSubmissions}
                      </span>
                      {isOverdue && (
                        <span className="text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded">
                          Past Due
                        </span>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex flex-col gap-2 pt-2">
                      <button 
                        onClick={() => handleGradeAssignment(assignment)}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg text-xs hover:bg-green-700 transition-colors font-medium"
                      >
                        Grade Submissions ({pendingSubmissions} pending)
                      </button>
                      {gradedSubmissions > 0 && (
                        <button 
                          onClick={() => handleGradeAssignment(assignment)}
                          className="border border-green-600 text-green-600 px-3 py-2 rounded-lg text-xs hover:bg-green-50 transition-colors font-medium"
                        >
                          Review Grades ({gradedSubmissions} graded)
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden lg:flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-800">{assignment.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentStatus)}`}>
                        {getStatusText(currentStatus)}
                      </span>
                      {isOverdue && (
                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                          Past Due
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 mb-3">{assignment.description}</p>
                    <div className="flex items-center flex-wrap gap-4 lg:gap-6 text-sm text-slate-500">
                      <span>Subject: {assignment.subjectName}</span>
                      <span className={dueDate < now ? 'text-red-600 font-medium' : ''}>
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </span>
                      <span>Max Points: {assignment.maxPoints}</span>
                      <span>Total Submissions: {totalSubmissions}</span>
                    </div>
                    <div className="flex items-center flex-wrap gap-4 text-xs text-slate-400 mt-2">
                      <span className="text-green-600 font-medium">
                        Graded: {gradedSubmissions}
                      </span>
                      <span className="text-yellow-600 font-medium">
                        Pending: {pendingSubmissions}
                      </span>
                      {isOverdue && (
                        <span className="text-orange-600 font-medium">
                          • Assignment is past due date
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 ml-4 flex-shrink-0">
                    <button 
                      onClick={() => handleGradeAssignment(assignment)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors font-medium"
                    >
                      Grade Submissions ({pendingSubmissions} pending)
                    </button>
                    {gradedSubmissions > 0 && (
                      <button 
                        onClick={() => handleGradeAssignment(assignment)}
                        className="border border-green-600 text-green-600 px-4 py-2 rounded-lg text-sm hover:bg-green-50 transition-colors font-medium"
                      >
                        Review Grades ({gradedSubmissions} graded)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Grading Modal */}
      {showGradingModal && selectedAssignment && (
        <GradingModal
          assignment={selectedAssignment}
          onClose={() => {
            setShowGradingModal(false);
            setSelectedAssignment(null);
          }}
          onSubmitGrade={handleSubmitGrade}
        />
      )}
    </div>
  );
};

// Grading Modal Component - Responsive version
const GradingModal = ({ assignment, onClose, onSubmitGrade }) => {
  const [selectedStudent, setSelectedStudent] = React.useState(null);
  const [grade, setGrade] = React.useState("");
  const [feedback, setFeedback] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [studentDetails, setStudentDetails] = React.useState({});

  const submissions = React.useMemo(() => assignment.submissions || [], [assignment.submissions]);
  const submittedStudents = React.useMemo(() => 
    submissions.filter(sub => sub.status === 'submitted' || sub.status === 'graded'),
    [submissions]
  );

  // Fetch student details
  React.useEffect(() => {
    let isMounted = true;
    
    const fetchStudentDetails = async () => {
      if (submittedStudents.length === 0) {
        if (isMounted) {
          setStudentDetails({});
        }
        return;
      }
      
      const details = {};
      
      try {
        // Process students sequentially to avoid overwhelming the API
        for (const submission of submittedStudents) {
          if (!isMounted) break; // Exit early if component unmounted
          try {
            const resp = await getStudent(submission.studentId);
            if (isMounted && resp?.success && resp.data) {
              const s = resp.data;
              const first = s.first_name ?? (s.full_name ? s.full_name.split(' ')[0] : undefined) ?? '';
              const last = s.surname ?? (s.full_name ? s.full_name.split(' ').slice(1).join(' ') : undefined) ?? '';
              details[submission.studentId] = {
                ...s,
                firstName: first,
                surname: last,
                admissionNumber: s.admission_number ?? s.admissionNumber ?? ''
              };
            }
          } catch (error) {
            console.error(`Error fetching student ${submission.studentId}:`, error);
            if (isMounted) {
              details[submission.studentId] = {
                firstName: 'Unknown',
                surname: 'Student',
                admissionNumber: submission.studentId
              };
            }
          }
        }
        
        if (isMounted) {
          setStudentDetails(details);
        }
      } catch (error) {
        console.error('Error fetching student details:', error);
      }
    };

    fetchStudentDetails();
    
    return () => {
      isMounted = false;
    };
  }, [submittedStudents, assignment.id]);

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !grade) return;

    setIsSubmitting(true);
    try {
      await onSubmitGrade(selectedStudent.studentId, {
        grade: parseInt(grade),
        feedback: feedback.trim() || null
      });
      
      // Reset form
      setSelectedStudent(null);
      setGrade("");
      setFeedback("");
    } catch (error) {
      console.error('Error submitting grade:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="bg-green-600 text-white p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold truncate">Grade Assignment</h2>
              <p className="text-green-200 text-sm sm:text-base">{assignment.title}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-green-200 transition-colors ml-4 flex-shrink-0"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row h-[calc(90vh-120px)]">
          {/* Submissions List */}
          <div className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-slate-200 overflow-y-auto">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800">
                Submissions ({submittedStudents.length})
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {submittedStudents.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-slate-400 text-4xl mb-3">📝</div>
                  <p className="text-slate-500">No submissions yet</p>
                </div>
              ) : (
                submittedStudents.map((submission) => {
                  const student = studentDetails[submission.studentId];
                  return (
                    <div
                      key={submission.studentId}
                      onClick={() => setSelectedStudent(submission)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedStudent?.studentId === submission.studentId
                          ? 'border-green-500 bg-green-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-800 text-sm sm:text-base truncate">
                            {student ? (getFullName(student) || student.full_name || 'Unknown') : 'Loading...'}
                          </p>
                          {student && (
                            <p className="text-xs sm:text-sm text-slate-500">
                              Admission No: {student.admissionNumber || student.admission_number || '—'}
                            </p>
                          )}
                          <p className="text-xs sm:text-sm text-slate-600">
                            Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs sm:text-sm text-slate-600">
                            Type: {submission.submissionType}
                          </p>
                        </div>
                        <div className="flex flex-col items-end ml-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            submission.status === 'graded'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {submission.status}
                          </span>
                          {submission.grade !== undefined && (
                            <span className="text-xs sm:text-sm font-medium text-slate-700 mt-1">
                              {submission.grade}/{assignment.maxPoints}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Grading Panel */}
          <div className="w-full lg:w-1/2 overflow-y-auto">
            {selectedStudent ? (
              <div className="p-4 sm:p-6">
                <div className="mb-6">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-2">
                    Student Submission
                  </h3>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="mb-4">
                      {studentDetails[selectedStudent.studentId] && (
                        <div className="mb-3">
                          <h4 className="font-medium text-slate-800 text-sm sm:text-base">
                            {getFullName(studentDetails[selectedStudent.studentId])}
                          </h4>
                          <p className="text-xs sm:text-sm text-slate-600">
                            Admission Number: {studentDetails[selectedStudent.studentId].admissionNumber || selectedStudent.studentId}
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600">
                        <div>Submitted: {new Date(selectedStudent.submittedAt).toLocaleDateString()}</div>
                        <div>Type: {selectedStudent.submissionType}</div>
                        <div>Status: {selectedStudent.status}</div>
                      </div>
                    </div>
                    
                    {selectedStudent.submissionType === 'text' && selectedStudent.content && (
                      <div>
                        <h4 className="font-medium text-slate-700 mb-2 text-sm sm:text-base">Submission Content:</h4>
                        <div className="bg-white p-3 rounded border max-h-40 overflow-y-auto">
                          <p className="text-slate-800 whitespace-pre-wrap text-sm">{selectedStudent.content}</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedStudent.submissionType === 'file' && (
                      <div>
                        <h4 className="font-medium text-slate-700 mb-2 text-sm sm:text-base">File Submission:</h4>
                        <div className="bg-white p-3 rounded border">
                          <p className="text-slate-800 text-sm">
                            📎 {selectedStudent.fileName || 'File submitted'}
                          </p>
                          {selectedStudent.fileSize && (
                            <p className="text-xs sm:text-sm text-slate-600">
                              Size: {(selectedStudent.fileSize / 1024 / 1024).toFixed(2)} MB
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {(selectedStudent.submissionType === 'objective_answers' || (Array.isArray(selectedStudent.responses) && selectedStudent.responses.length > 0)) && (
                      <div className="mt-4">
                        <h4 className="font-medium text-slate-700 mb-2 text-sm sm:text-base">Objective Answers:</h4>
                        {Array.isArray(selectedStudent.responses) && selectedStudent.responses.length > 0 ? (
                          <div className="space-y-3">
                            {selectedStudent.responses.map((resp, idx) => {
                              const q = resp.question || {};
                              const options = Array.isArray(q.options) ? q.options : [];
                              const isMcq = options.length > 0 || q.type === 'mcq';
                              const isTf = q.type === 'true_false';
                              const formatAnswer = (ans) => {
                                if (isMcq && typeof ans === 'number' && options[ans] !== undefined) return options[ans];
                                if (isTf) return ans ? 'True' : 'False';
                                return String(ans ?? '').trim();
                              };
                              const yourAnswer = formatAnswer(resp.answer);
                              const correctAnswer = formatAnswer(q.correct_answer);
                              return (
                                <div key={resp.id || idx} className="bg-white border rounded p-3">
                                  <div className="flex items-start justify-between">
                                    <div className="text-sm text-slate-800">
                                      <div className="font-medium mb-1">Q{(q.order_index ?? idx) + 1}. {q.text || 'Question'}</div>
                                      {isMcq && options.length > 0 && (
                                        <ul className="list-disc ml-5 text-slate-600 text-xs sm:text-sm mb-2">
                                          {options.map((opt, i) => (
                                            <li key={i} className={i === resp.answer ? 'font-semibold text-slate-800' : ''}>
                                              {String.fromCharCode(65 + i)}. {opt}
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                      <div className="text-xs sm:text-sm">
                                        <div>Student's answer: <span className="font-medium">{yourAnswer || '—'}</span></div>
                                        <div>Correct answer: <span className="font-medium">{correctAnswer || '—'}</span></div>
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end ml-3">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${resp.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {resp.isCorrect ? 'Correct' : 'Incorrect'}
                                      </span>
                                      <span className="text-xs sm:text-sm text-slate-700 mt-1">
                                        Score: {resp.autoScore ?? 0}/{q.points ?? 0}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-xs sm:text-sm text-slate-600">No answers found.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <form onSubmit={handleGradeSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Grade (out of {assignment.maxPoints})
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={assignment.maxPoints}
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder={`Enter grade (0-${assignment.maxPoints})`}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Feedback (Optional)
                    </label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      rows="4"
                      placeholder="Provide feedback to the student..."
                    />
                  </div>

                  {selectedStudent.status === 'graded' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>Current Grade:</strong> {selectedStudent.grade}/{assignment.maxPoints}
                      </p>
                      {selectedStudent.feedback && (
                        <p className="text-sm text-blue-700">
                          <strong>Current Feedback:</strong> {selectedStudent.feedback}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting || !grade}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : selectedStudent.status === 'graded' ? 'Update Grade' : 'Submit Grade'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudent(null);
                        setGrade("");
                        setFeedback("");
                      }}
                      className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
                    >
                      Clear
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-slate-400 text-4xl mb-3">👈</div>
                  <p className="text-slate-500">Select a submission to grade</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Grades;