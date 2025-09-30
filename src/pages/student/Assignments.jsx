import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { getAssignmentsForStudent, submitAssignment, submitObjectiveAssignment } from "../../services/supabase/assignmentService";
import ObjectiveAssignmentModal from "./components/ObjectiveAssignmentModal";
import { getStudentSubjects } from "../../services/supabase/teacherStudentService";
import { supabase } from "../../lib/supabaseClient";
import useToast from '../../hooks/useToast';
import { sendMessageToStudent } from "../../services/supabase/studentManagementService";

const StudentAssignments = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [loading, setLoading] = useState(true);
  const [submissionModal, setSubmissionModal] = useState({ isOpen: false, assignment: null });
  const [objectiveModal, setObjectiveModal] = useState({ isOpen: false, assignment: null });
  const [submissionText, setSubmissionText] = useState("");
  // File upload and type removed; only text submissions are supported
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [theoryQuestions, setTheoryQuestions] = useState([]);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const [studentAssignments, studentSubjects] = await Promise.all([
          getAssignmentsForStudent(user.id),
          getStudentSubjects(user.id)
        ]);

        const normalizedAssignments = studentAssignments?.success
          ? (studentAssignments.data || [])
          : (Array.isArray(studentAssignments) ? studentAssignments : []);

        const normalizedSubjects = studentSubjects?.success
          ? (studentSubjects.data || [])
          : Array.isArray(studentSubjects)
            ? studentSubjects
            : [];
        
        setAssignments(normalizedAssignments);
        setSubjects(normalizedSubjects);
      } catch (error) {
        console.error('Error fetching student assignments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // Fetch theory questions when submission modal opens for a theory assignment
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const a = submissionModal.assignment;
        if (!submissionModal.isOpen) {
          setTheoryQuestions([]);
          return;
        }
        if (!a?.id) return;
        if (String(a?.type).toLowerCase() === 'objective') {
          setTheoryQuestions([]);
          return;
        }
        const st = (typeof getAssignmentStatus === 'function') ? getAssignmentStatus(a) : 'pending';
        if (st !== 'pending') {
          setTheoryQuestions([]);
          return;
        }
        // Try RPC first (SECURITY DEFINER)
        try {
          const { data, error } = await supabase.rpc('rpc_list_questions_for_current_student', { assignment_id: a.id });
          if (error) throw error;
          setTheoryQuestions(Array.isArray(data) ? data : []);
        } catch (rpcErr) {
          // Fallback to direct read if RLS permits
          const { data: direct, error: dirErr } = await supabase
            .from('assignment_questions')
            .select('id, assignment_id, type, text, options, points, order_index')
            .eq('assignment_id', a.id)
            .order('order_index', { ascending: true });
          if (dirErr) {
            console.error('Failed to load theory questions via RPC and direct:', rpcErr?.message || rpcErr, dirErr?.message || dirErr);
            setTheoryQuestions([]);
          } else {
            setTheoryQuestions(Array.isArray(direct) ? direct : []);
          }
        }
      } catch (e) {
        console.error('Error fetching theory questions:', e);
        setTheoryQuestions([]);
      }
    };
    fetchQuestions();
  }, [submissionModal.isOpen, submissionModal.assignment?.id, submissionModal.assignment?.type]);

  const filteredAssignments = selectedSubject === "all" 
    ? assignments 
    : assignments.filter(assignment => assignment.subjectName === selectedSubject);

  const getAssignmentStatus = (assignment) => {
    const submission = assignment.submissions?.find(sub => sub.studentId === user.id);
    if (submission) {
      return submission.status === 'graded' ? 'graded' : 'submitted';
    }
    
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();
    return dueDate < now ? 'overdue' : 'pending';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "graded": return "bg-green-100 text-green-800";
      case "submitted": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "overdue": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleSubmitAssignment = async () => {
    if (!submissionModal.assignment) return;
    
    // Prevent re-submission if already submitted/graded
    const currentStatus = getAssignmentStatus(submissionModal.assignment);
    if (currentStatus !== 'pending') {
      showToast('You have already submitted this assignment.', 'error');
      return;
    }

    // Validation
    if (!submissionText.trim()) {
      showToast('Please enter your submission text.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare DB payload for Supabase
      const payload = {
        assignment_id: submissionModal.assignment.id,
        student_id: user.id,
        submission_text: submissionText,
        attachment_url: null,
      };

      // Perform submission via normalized service API
      const res = await submitAssignment(payload);

      // Build UI submission data for local state update
      const submissionData = {
        submissionType: 'text',
        content: submissionText,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
      };

      // Update local state
      const updatedAssignments = assignments.map(assignment => {
        if (assignment.id === submissionModal.assignment.id) {
          const submissions = assignment.submissions || [];
          const existingIndex = submissions.findIndex(sub => sub.studentId === user.id);
          
          const newSubmission = {
            studentId: user.id,
            ...submissionData
          };
          
          if (existingIndex >= 0) {
            submissions[existingIndex] = newSubmission;
          } else {
            submissions.push(newSubmission);
          }
          
          return {
            ...assignment,
            submissions
          };
        }
        return assignment;
      });

      setAssignments(updatedAssignments);

      // Create in-app notification for the student (fire-and-forget)
      try {
        const title = submissionModal.assignment?.title || 'Assignment';
        await sendMessageToStudent(
          user.id,
          `Your submission for "${title}" was received successfully.`,
          'assignment_submission'
        );
      } catch (_) { /* ignore notification errors */ }
      
      // Reset form
      setSubmissionModal({ isOpen: false, assignment: null });
      setSubmissionText("");
      
      showToast('Assignment submitted successfully!', 'success');
    } catch (error) {
      console.error('Error submitting assignment:', error);
      showToast('Failed to submit assignment. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // No file upload handler; only text submissions supported

  const getSubmissionDetails = (assignment) => {
    const submission = assignment.submissions?.find(sub => sub.studentId === user.id);
    return submission;
  };

  const getSubmissionGrade = (assignment) => {
    const submission = assignment.submissions?.find(sub => sub.studentId === user.id);
    return submission?.grade || null;
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

  const totalCount = assignments.length;
  const pendingCount = assignments.filter(a => getAssignmentStatus(a) === 'pending').length;
  const submittedCount = assignments.filter(a => getAssignmentStatus(a) === 'submitted').length;
  const gradedCount = assignments.filter(a => getAssignmentStatus(a) === 'graded').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 ml-9">My Assignments</h1>
        <div className="text-sm text-slate-600">
          {filteredAssignments.length} Assignment{filteredAssignments.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Stats - Mobile */}
      <div className="block sm:hidden">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800">Assignment Overview</h3>
            <span className="text-xs text-slate-500">This term</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Total */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
              <div>
                <div className="text-xs text-slate-500">Total</div>
                <div className="text-lg font-bold text-slate-800">{totalCount}</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                </svg>
              </div>
            </div>
            {/* Pending */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50">
              <div>
                <div className="text-xs text-amber-700">Pending</div>
                <div className="text-lg font-bold text-amber-800">{pendingCount}</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
                </svg>
              </div>
            </div>
            {/* Submitted */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-blue-50">
              <div>
                <div className="text-xs text-blue-700">Submitted</div>
                <div className="text-lg font-bold text-blue-800">{submittedCount}</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            {/* Graded */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-200 bg-emerald-50">
              <div>
                <div className="text-xs text-emerald-700">Graded</div>
                <div className="text-lg font-bold text-emerald-800">{gradedCount}</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats - Desktop */}
      <div className="hidden sm:grid sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-slate-500">
          <div className="text-2xl font-bold text-slate-800">{totalCount}</div>
          <div className="text-sm text-slate-600">Total</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="text-2xl font-bold text-slate-800">{pendingCount}</div>
          <div className="text-sm text-slate-600">Pending</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="text-2xl font-bold text-slate-800">{submittedCount}</div>
          <div className="text-sm text-slate-600">Submitted</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="text-2xl font-bold text-slate-800">{gradedCount}</div>
          <div className="text-sm text-slate-600">Graded</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-slate-700">Filter by Subject:</label>
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
        >
          <option value="all">All Subjects</option>
          {(Array.isArray(subjects) ? subjects : []).map((subject) => (
            <option key={subject.subjectName || subject.name} value={subject.subjectName || subject.name}>
              {subject.subjectName || subject.name}
            </option>
          ))}
        </select>
      </div>

      
      {/* Assignments List */}
      <div className="space-y-4">
        {filteredAssignments.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-slate-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Assignments Found</h3>
            <p className="text-slate-500">
              {selectedSubject === "all" 
                ? "You don't have any assignments yet." 
                : `No assignments found for ${selectedSubject}.`
              }
            </p>
          </div>
        ) : (
          filteredAssignments.map((assignment) => {
            const status = getAssignmentStatus(assignment);
            const grade = getSubmissionGrade(assignment);
            const submissionDetails = getSubmissionDetails(assignment);
            const dueDate = new Date(assignment.dueDate);
            const isOverdue = dueDate < new Date() && status === 'pending';
            
            return (
              <div key={assignment.id} className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-800">{assignment.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                        {status}
                      </span>
                      {grade && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                          Score: {grade}/{assignment.maxPoints}
                        </span>
                      )}
                      {isOverdue && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                          Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 mb-3">{assignment.description}</p>
                    <div className="flex items-center space-x-6 text-sm text-slate-500 mb-2">
                      <span>Subject: {assignment.subjectName}</span>
                      <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                        Due: {dueDate.toLocaleDateString()}
                      </span>
                                          </div>
                    
                    {/* Submission Details */}
                    {submissionDetails && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                        <div className="text-sm text-slate-600">
                          <div className="flex items-center space-x-4">
                            <span>Submitted: {submissionDetails.submittedAt ? new Date(submissionDetails.submittedAt).toLocaleDateString() : 'Unknown'}</span>
                            {/* Type and File fields removed for text-only submissions */}
                          </div>
                          {submissionDetails.feedback && (
                            <div className="mt-2">
                              <span className="font-medium">Teacher Feedback:</span>
                              <p className="text-slate-700 mt-1">{submissionDetails.feedback}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    {status === 'pending' && (
                      assignment.type === 'objective' ? (
                        <button
                          onClick={() => setObjectiveModal({ isOpen: true, assignment })}
                          className="bg-emerald-600 text-white px-3 py-1 rounded text-sm hover:bg-emerald-700 transition-colors"
                        >
                          Take Objective
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            setSubmissionModal({ isOpen: true, assignment });
                            setSubmissionText("");
                            }}
                          className="bg-slate-600 text-white px-3 py-1 rounded text-sm hover:bg-slate-700 transition-colors"
                        >
                          Submit
                        </button>
                      )
                    )}
                                      </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Submission Modal */}
      {submissionModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-slate-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Submit Assignment</h2>
                  <p className="text-slate-200">{submissionModal.assignment?.title}</p>
                </div>
                <button
                  onClick={() => setSubmissionModal({ isOpen: false, assignment: null })}
                  className="text-white hover:text-slate-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto overflow-x-hidden">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Assignment Description
                  </label>
                  <p className="text-slate-600 bg-slate-50 p-3 rounded-lg">
                    {submissionModal.assignment?.description}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Assignment Details
                  </label>
                  <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600">
                    <div className="grid grid-cols-2 gap-4">
                      <div>Due Date: {new Date(submissionModal.assignment?.dueDate).toLocaleDateString()}</div>
                                            <div>Subject: {submissionModal.assignment?.subjectName}</div>
                      <div>Status: {getAssignmentStatus(submissionModal.assignment)}</div>
                    </div>
                  </div>
                </div>

                {/* Theory Questions (display-only) */}
                {String(submissionModal.assignment?.type).toLowerCase() !== 'objective' && getAssignmentStatus(submissionModal.assignment) === 'pending' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Questions
                    </label>
                    {theoryQuestions.length === 0 ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600">
                        No questions found for this assignment.
                      </div>
                    ) : (
                      <ol className="space-y-2 list-decimal list-inside text-slate-800 text-sm">
                        {theoryQuestions.map((q, idx) => (
                          <li key={q.id || idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                            <div className="flex items-start justify-between gap-3">
                            <div className="font-medium flex-1 min-w-0 break-words whitespace-pre-wrap">{q.text}</div>
                            {typeof q.points === 'number' && (
                            <div className="text-xs text-slate-500 shrink-0">{q.points} marks</div>
                            )}
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}

                {/* Text Submission */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Your Submission
                  </label>
                  <textarea
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder="Enter your assignment submission here..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    rows="8"
                    required
                    disabled={getAssignmentStatus(submissionModal.assignment) !== 'pending'}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Character count: {submissionText.length}
                  </p>
                </div>

                {/* File Upload removed */}

                {/* Show existing submission details for submitted/graded assignments */}
                {getAssignmentStatus(submissionModal.assignment) !== 'pending' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Submission Status
                    </label>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        This assignment has been submitted and cannot be modified.
                      </p>
                      {getSubmissionDetails(submissionModal.assignment)?.content && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-blue-800">Your Submitted Answer:</p>
                          <div className="mt-1 bg-white border border-blue-200 rounded p-2 text-sm text-slate-700 whitespace-pre-wrap">
                            {getSubmissionDetails(submissionModal.assignment).content}
                          </div>
                        </div>
                      )}
                      {getSubmissionDetails(submissionModal.assignment)?.feedback && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-blue-800">Teacher Feedback:</p>
                          <p className="text-sm text-blue-700 mt-1">
                            {getSubmissionDetails(submissionModal.assignment).feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                  setSubmissionModal({ isOpen: false, assignment: null });
                  setSubmissionText("");
                  }}
                  className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  {getAssignmentStatus(submissionModal.assignment) === 'pending' ? 'Cancel' : 'Close'}
                </button>
                {getAssignmentStatus(submissionModal.assignment) === 'pending' && (
                  <button
                    onClick={handleSubmitAssignment}
                    disabled={isSubmitting || !submissionText.trim()}
                    className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    {/* Objective Modal */}
      {objectiveModal.isOpen && (
        <ObjectiveAssignmentModal
          open={objectiveModal.isOpen}
          assignment={objectiveModal.assignment}
          studentId={user?.id}
          onClose={() => setObjectiveModal({ isOpen: false, assignment: null })}
          onSubmitted={async ({ auto_score, total_score }) => {
            const updated = assignments.map((a) => {
              if (a.id !== objectiveModal.assignment.id) return a;
              const submissions = a.submissions || [];
              const mine = submissions.find((s) => s.studentId === user.id) || {};
              const newMine = { ...mine, studentId: user.id, submissionType: 'objective_answers', status: 'submitted', grade: total_score, submittedAt: new Date().toISOString() };
              const nextSubs = submissions.some((s) => s.studentId === user.id)
                ? submissions.map((s) => (s.studentId === user.id ? newMine : s))
                : [...submissions, newMine];
              return { ...a, submissions: nextSubs };
            });
            setAssignments(updated);
            // Notify student of objective submission
            try {
              const title = objectiveModal.assignment?.title || 'Assignment';
              await sendMessageToStudent(
                user.id,
                `Your objective submission for "${title}" was received successfully.`,
                'assignment_submission'
              );
            } catch (_) { /* ignore notification errors */ }
          }}
          submitFn={submitObjectiveAssignment}
        />
      )}
    </div>
  );
};

export default StudentAssignments;