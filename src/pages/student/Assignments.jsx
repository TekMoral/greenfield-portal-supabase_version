import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { getAssignmentsForStudent, submitAssignment } from "../../services/assignmentService";
import { getStudentSubjects } from "../../services/teacherStudentService";

const StudentAssignments = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [loading, setLoading] = useState(true);
  const [submissionModal, setSubmissionModal] = useState({ isOpen: false, assignment: null });
  const [submissionText, setSubmissionText] = useState("");
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submissionType, setSubmissionType] = useState("text");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const [studentAssignments, studentSubjects] = await Promise.all([
          getAssignmentsForStudent(user.uid),
          getStudentSubjects(user.uid)
        ]);
        
        setAssignments(studentAssignments);
        setSubjects(studentSubjects);
      } catch (error) {
        console.error('Error fetching student assignments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.uid]);

  const filteredAssignments = selectedSubject === "all" 
    ? assignments 
    : assignments.filter(assignment => assignment.subjectName === selectedSubject);

  const getAssignmentStatus = (assignment) => {
    const submission = assignment.submissions?.find(sub => sub.studentId === user.uid);
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
    
    // Validation
    if (submissionType === 'text' && !submissionText.trim()) {
      alert('Please enter your submission text.');
      return;
    }
    
    if (submissionType === 'file' && !submissionFile) {
      alert('Please select a file to upload.');
      return;
    }

    setIsSubmitting(true);

    try {
      const submissionData = {
        submissionType,
        status: 'submitted'
      };

      if (submissionType === 'text') {
        submissionData.content = submissionText;
      } else if (submissionType === 'file') {
        // For now, we'll store file info (in a real app, you'd upload to storage)
        submissionData.fileName = submissionFile.name;
        submissionData.fileSize = submissionFile.size;
        submissionData.fileType = submissionFile.type;
        // TODO: Implement file upload to Firebase Storage
        submissionData.fileUrl = 'placeholder-url'; // This would be the actual uploaded file URL
      }

      await submitAssignment(submissionModal.assignment.id, user.uid, submissionData);

      // Update local state
      const updatedAssignments = assignments.map(assignment => {
        if (assignment.id === submissionModal.assignment.id) {
          const submissions = assignment.submissions || [];
          const existingIndex = submissions.findIndex(sub => sub.studentId === user.uid);
          
          const newSubmission = {
            studentId: user.uid,
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
      
      // Reset form
      setSubmissionModal({ isOpen: false, assignment: null });
      setSubmissionText("");
      setSubmissionFile(null);
      setSubmissionType("text");
      
      alert('Assignment submitted successfully!');
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert('Failed to submit assignment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload a valid file type (PDF, Word, Text, or Image)');
        return;
      }
      
      setSubmissionFile(file);
    }
  };

  const getSubmissionDetails = (assignment) => {
    const submission = assignment.submissions?.find(sub => sub.studentId === user.uid);
    return submission;
  };

  const getSubmissionGrade = (assignment) => {
    const submission = assignment.submissions?.find(sub => sub.studentId === user.uid);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">My Assignments</h1>
        <div className="text-sm text-slate-600">
          {filteredAssignments.length} Assignment{filteredAssignments.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-slate-500">
          <div className="text-2xl font-bold text-slate-800">{assignments.length}</div>
          <div className="text-sm text-slate-600">Total</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="text-2xl font-bold text-slate-800">
            {assignments.filter(a => getAssignmentStatus(a) === 'pending').length}
          </div>
          <div className="text-sm text-slate-600">Pending</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="text-2xl font-bold text-slate-800">
            {assignments.filter(a => getAssignmentStatus(a) === 'submitted').length}
          </div>
          <div className="text-sm text-slate-600">Submitted</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="text-2xl font-bold text-slate-800">
            {assignments.filter(a => getAssignmentStatus(a) === 'graded').length}
          </div>
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
          {subjects.map((subject) => (
            <option key={subject.subjectName} value={subject.subjectName}>
              {subject.subjectName}
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
                          {grade}/{assignment.maxPoints}
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
                      <span>Points: {assignment.maxPoints}</span>
                    </div>
                    
                    {/* Submission Details */}
                    {submissionDetails && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                        <div className="text-sm text-slate-600">
                          <div className="flex items-center space-x-4">
                            <span>Submitted: {submissionDetails.submittedAt ? new Date(submissionDetails.submittedAt).toLocaleDateString() : 'Unknown'}</span>
                            <span>Type: {submissionDetails.submissionType}</span>
                            {submissionDetails.fileName && (
                              <span>File: {submissionDetails.fileName}</span>
                            )}
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
                      <button 
                        onClick={() => {
                          setSubmissionModal({ isOpen: true, assignment });
                          setSubmissionText("");
                          setSubmissionFile(null);
                          setSubmissionType("text");
                        }}
                        className="bg-slate-600 text-white px-3 py-1 rounded text-sm hover:bg-slate-700 transition-colors"
                      >
                        Submit
                      </button>
                    )}
                    {(status === 'submitted' || status === 'graded') && submissionDetails && (
                      <button 
                        onClick={() => {
                          setSubmissionModal({ isOpen: true, assignment });
                          setSubmissionText(submissionDetails.content || "");
                          setSubmissionType(submissionDetails.submissionType || "text");
                        }}
                        className="border border-slate-300 text-slate-700 px-3 py-1 rounded text-sm hover:bg-slate-50 transition-colors"
                      >
                        View Submission
                      </button>
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
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
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

            <div className="p-6">
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
                      <div>Max Points: {submissionModal.assignment?.maxPoints}</div>
                      <div>Subject: {submissionModal.assignment?.subjectName}</div>
                      <div>Status: {getAssignmentStatus(submissionModal.assignment)}</div>
                    </div>
                  </div>
                </div>

                {/* Submission Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Submission Type
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="text"
                        checked={submissionType === "text"}
                        onChange={(e) => setSubmissionType(e.target.value)}
                        className="mr-2"
                        disabled={getAssignmentStatus(submissionModal.assignment) !== 'pending'}
                      />
                      <span className="text-sm">Text Submission</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="file"
                        checked={submissionType === "file"}
                        onChange={(e) => setSubmissionType(e.target.value)}
                        className="mr-2"
                        disabled={getAssignmentStatus(submissionModal.assignment) !== 'pending'}
                      />
                      <span className="text-sm">File Upload</span>
                    </label>
                  </div>
                </div>
                
                {/* Text Submission */}
                {submissionType === "text" && (
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
                )}

                {/* File Upload */}
                {submissionType === "file" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Upload File
                    </label>
                    {getAssignmentStatus(submissionModal.assignment) === 'pending' ? (
                      <div>
                        <input
                          type="file"
                          onChange={handleFileChange}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Accepted formats: PDF, Word, Text, Images (Max 10MB)
                        </p>
                        {submissionFile && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                            <p className="text-sm text-green-800">
                              Selected: {submissionFile.name} ({(submissionFile.size / 1024 / 1024).toFixed(2)} MB)
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg">
                        <p className="text-sm text-slate-600">
                          {getSubmissionDetails(submissionModal.assignment)?.fileName || 'No file submitted'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

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
                    setSubmissionFile(null);
                    setSubmissionType("text");
                  }}
                  className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  {getAssignmentStatus(submissionModal.assignment) === 'pending' ? 'Cancel' : 'Close'}
                </button>
                {getAssignmentStatus(submissionModal.assignment) === 'pending' && (
                  <button
                    onClick={handleSubmitAssignment}
                    disabled={
                      isSubmitting || 
                      (submissionType === 'text' && !submissionText.trim()) ||
                      (submissionType === 'file' && !submissionFile)
                    }
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
    </div>
  );
};

export default StudentAssignments;