import React from 'react';
import { getStudent } from '@services/supabase/studentService';
import { getFullName } from '../../../utils/nameUtils';

const GradingModal = ({ assignment, onClose, onSubmitGrade }) => {
  const [selectedStudent, setSelectedStudent] = React.useState(null);
  const [grade, setGrade] = React.useState('');
  const [feedback, setFeedback] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [studentDetails, setStudentDetails] = React.useState({});

  const submissions = React.useMemo(() => assignment.submissions || [], [assignment.submissions]);
  const submittedStudents = React.useMemo(
    () => submissions.filter((sub) => sub.status === 'submitted' || sub.status === 'graded'),
    [submissions]
  );

  React.useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      const details = {};
      for (const submission of submittedStudents) {
        if (!isMounted) break;
        try {
          const resp = await getStudent(submission.studentId);
          if (resp?.success && resp.data) {
            const s = resp.data;
            details[submission.studentId] = {
              ...s,
              // Provide camelCase convenience without breaking existing snake_case
              admissionNumber: s.admission_number ?? s.admissionNumber ?? undefined,
            };
          } else {
            details[submission.studentId] = null;
          }
        } catch (e) {
          details[submission.studentId] = null;
        }
      }
      if (isMounted) setStudentDetails(details);
    };
    fetchDetails();
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
        grade: parseInt(grade, 10),
        feedback: feedback.trim() || null,
      });
      setSelectedStudent(null);
      setGrade('');
      setFeedback('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="bg-green-600 text-white p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Grade Assignment</h2>
              <p className="text-green-200 text-sm sm:text-base">{assignment.title}</p>
            </div>
            <button onClick={onClose} className="text-white hover:text-green-200 transition-colors">
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
              <h3 className="text-base sm:text-lg font-semibold text-slate-800">Submissions ({submittedStudents.length})</h3>
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
                        selectedStudent?.studentId === submission.studentId ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-800 text-sm sm:text-base truncate">
                            {student ? (getFullName(student) || student.full_name || 'Unknown') : 'Loading...'}
                          </p>
                          {student && (
                            <p className="text-xs sm:text-sm text-slate-500">ID: {student.admissionNumber || student.admission_number || submission.studentId}</p>
                          )}
                          <p className="text-xs sm:text-sm text-slate-600">Submitted: {new Date(submission.submittedAt).toLocaleDateString()}</p>
                          <p className="text-xs sm:text-sm text-slate-600">Type: {submission.submissionType}</p>
                        </div>
                        <div className="flex flex-col items-end ml-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${submission.status === 'graded' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {submission.status}
                          </span>
                          {submission.grade && <span className="text-xs sm:text-sm font-medium text-slate-700 mt-1">{submission.grade}/{assignment.maxPoints}</span>}
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
                  <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-2">Student Submission</h3>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600 mb-4">
                      <div>Submitted: {new Date(selectedStudent.submittedAt).toLocaleDateString()}</div>
                                            <div>Status: {selectedStudent.status}</div>
                      <div>Student ID: {selectedStudent.studentId}</div>
                    </div>

                    {selectedStudent.content && (
                      <div>
                        <h4 className="font-medium text-slate-700 mb-2 text-sm sm:text-base">Submission Content:</h4>
                        <div className="text-slate-800 whitespace-pre-wrap text-sm sm:text-base">
                          {selectedStudent.content}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <form onSubmit={handleGradeSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Grade (out of {assignment.maxPoints})</label>
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">Feedback (Optional)</label>
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
                        setGrade('');
                        setFeedback('');
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

export default GradingModal;
