import React, { useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { 
  createAssignment, 
  getAssignmentsByTeacher, 
  updateAssignment, 
  deleteAssignment,
  gradeAssignment 
} from "../../../services/assignmentService";
import { getTeacherSubjectsWithStudents } from "../../../services/teacherStudentService";
import { getStudent } from "../../../services/studentService";

const Assignments = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    subjectName: "",
    targetType: "subject", // "subject" or "class"
    targetClasses: [], // specific classes when targetType is "class"
    dueDate: "",
    maxPoints: "",
    status: "draft"
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch teacher's subjects and assignments
        const [teacherSubjects, teacherAssignments] = await Promise.all([
          getTeacherSubjectsWithStudents(user.uid),
          getAssignmentsByTeacher(user.uid)
        ]);
        
        setSubjects(teacherSubjects);
        setAssignments(teacherAssignments);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.uid]);

  const filteredAssignments = selectedSubject === "all" 
    ? assignments 
    : assignments.filter(assignment => assignment.subjectName === selectedSubject);

  const handleCreateAssignment = async (e, status = "draft") => {
    e.preventDefault();
    
    // Validation for class-specific assignments
    if (newAssignment.targetType === "class" && newAssignment.targetClasses.length === 0) {
      alert('Please select at least one class for this assignment.');
      return;
    }
    
    try {
      let targetClasses = [];
      
      if (newAssignment.targetType === "subject") {
        // Target all classes for this subject
        const subject = subjects.find(s => s.subjectName === newAssignment.subjectName);
        targetClasses = subject ? subject.classes.map(c => c.classId) : [];
      } else {
        // Target specific classes only
        targetClasses = newAssignment.targetClasses;
      }
      
      const assignmentData = {
        ...newAssignment,
        teacherId: user.uid,
        targetClasses,
        maxPoints: parseInt(newAssignment.maxPoints),
        status: status
      };
      
      const createdAssignment = await createAssignment(assignmentData);
      setAssignments([createdAssignment, ...assignments]);
      
      // Reset form
      setNewAssignment({
        title: "",
        description: "",
        subjectName: "",
        targetType: "subject",
        targetClasses: [],
        dueDate: "",
        maxPoints: "",
        status: "draft"
      });
      setShowCreateForm(false);
      
      if (status === "published") {
        alert('Assignment created and published successfully! Students can now see it.');
      } else {
        alert('Assignment saved as draft successfully!');
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      alert('Failed to create assignment. Please try again.');
    }
  };

  const handlePublishAssignment = async (assignmentId) => {
    try {
      await updateAssignment(assignmentId, { status: "published" });
      
      // Update local state
      setAssignments(assignments.map(assignment => 
        assignment.id === assignmentId 
          ? { ...assignment, status: "published" }
          : assignment
      ));
      
      alert('Assignment published successfully! Students can now see it.');
    } catch (error) {
      console.error('Error publishing assignment:', error);
      alert('Failed to publish assignment. Please try again.');
    }
  };

  const handleGradeAssignment = (assignment) => {
    setSelectedAssignment(assignment);
    setShowGradingModal(true);
  };

  const handleSubmitGrade = async (studentId, gradeData) => {
    try {
      await gradeAssignment(selectedAssignment.id, studentId, gradeData);
      
      // Update local state
      setAssignments(assignments.map(assignment => {
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
          return {
            ...assignment,
            submissions: updatedSubmissions
          };
        }
        return assignment;
      }));
      
      // Update selected assignment for the modal
      setSelectedAssignment(prev => ({
        ...prev,
        submissions: prev.submissions.map(submission => {
          if (submission.studentId === studentId) {
            return {
              ...submission,
              ...gradeData,
              status: 'graded'
            };
          }
          return submission;
        })
      }));
      
      alert('Grade submitted successfully!');
    } catch (error) {
      console.error('Error grading assignment:', error);
      alert('Failed to submit grade. Please try again.');
    }
  };

  const handleDeleteAssignment = async (assignmentId, assignmentTitle) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${assignmentTitle}"?\n\nThis action cannot be undone and will remove all student submissions.`
    );
    
    if (!confirmDelete) return;
    
    try {
      await deleteAssignment(assignmentId);
      
      // Update local state
      setAssignments(assignments.filter(assignment => assignment.id !== assignmentId));
      
      alert('Assignment deleted successfully.');
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert('Failed to delete assignment. Please try again.');
    }
  };

  const handleCloseAssignment = async (assignmentId) => {
    try {
      await updateAssignment(assignmentId, { status: "closed" });
      
      // Update local state
      setAssignments(assignments.map(assignment => 
        assignment.id === assignmentId 
          ? { ...assignment, status: "closed" }
          : assignment
      ));
      
      alert('Assignment closed successfully. Students can no longer submit.');
    } catch (error) {
      console.error('Error closing assignment:', error);
      alert('Failed to close assignment. Please try again.');
    }
  };

  // Helper function to get assignment status based on due date
  const getAssignmentStatus = (assignment) => {
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    
    if (assignment.status === 'draft') return 'draft';
    if (assignment.status === 'closed') return 'closed';
    
    if (dueDate < now) {
      return 'overdue';
    }
    
    return assignment.status;
  };

  // Helper function to check if assignment can be deleted
  const canDeleteAssignment = (assignment) => {
    const status = getAssignmentStatus(assignment);
    return status === 'draft' || status === 'overdue' || status === 'closed';
  };

  // Helper function to check if assignment is past due
  const isAssignmentOverdue = (assignment) => {
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    return dueDate < now && assignment.status === 'published';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "published": return "bg-green-100 text-green-800";
      case "draft": return "bg-yellow-100 text-yellow-800";
      case "closed": return "bg-slate-100 text-slate-800";
      case "overdue": return "bg-red-100 text-red-800";
      default: return "bg-slate-100 text-slate-800";
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800">Assignments</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm sm:text-base w-full sm:w-auto"
        >
          + Create Assignment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="text-lg sm:text-2xl font-bold text-slate-800">{assignments.length}</div>
          <div className="text-xs sm:text-sm text-slate-600">Total</div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="text-lg sm:text-2xl font-bold text-slate-800">
            {assignments.filter(a => getAssignmentStatus(a) === "published").length}
          </div>
          <div className="text-xs sm:text-sm text-slate-600">Active</div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="text-lg sm:text-2xl font-bold text-slate-800">
            {assignments.filter(a => getAssignmentStatus(a) === "overdue").length}
          </div>
          <div className="text-xs sm:text-sm text-slate-600">Overdue</div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow border-l-4 border-slate-500">
          <div className="text-lg sm:text-2xl font-bold text-slate-800">
            {assignments.filter(a => getAssignmentStatus(a) === "closed" || a.status === "draft").length}
          </div>
          <div className="text-xs sm:text-sm text-slate-600">Closed/Draft</div>
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
          {subjects.map((subject) => (
            <option key={subject.subjectName} value={subject.subjectName}>
              {subject.subjectName} ({subject.totalStudents} students)
            </option>
          ))}
        </select>
      </div>

      {/* Assignments List */}
      <div className="space-y-3 sm:space-y-4">
        {filteredAssignments.map((assignment) => {
          const currentStatus = getAssignmentStatus(assignment);
          const isOverdue = isAssignmentOverdue(assignment);
          const canDelete = canDeleteAssignment(assignment);
          const dueDate = new Date(assignment.dueDate);
          const now = new Date();
          
          return (
            <div key={assignment.id} className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-slate-200">
              {/* Mobile Layout */}
              <div className="block sm:hidden">
                <div className="space-y-3">
                  {/* Title and Status */}
                  <div className="flex flex-wrap items-start gap-2">
                    <h3 className="text-base font-semibold text-slate-800 flex-1 min-w-0">{assignment.title}</h3>
                    <div className="flex flex-wrap gap-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentStatus)}`}>
                        {currentStatus}
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
                    <div>Points: <span className="font-medium">{assignment.maxPoints}</span></div>
                    <div>Submissions: <span className="font-medium">{assignment.submissions?.length || 0}</span></div>
                  </div>
                  
                  {/* Target Info */}
                  <div className="text-xs text-slate-400">
                    Target: {assignment.targetType === "subject" 
                      ? `All ${assignment.subjectName} classes` 
                      : `${assignment.targetClasses?.length || 0} specific class(es)`
                    }
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {(currentStatus === 'published' || currentStatus === 'overdue') && (
                      <button 
                        onClick={() => handleGradeAssignment(assignment)}
                        className="bg-green-600 text-white px-3 py-1.5 rounded text-xs hover:bg-green-700 transition-colors flex-1 min-w-0"
                      >
                        Grade ({assignment.submissions?.length || 0})
                      </button>
                    )}
                    {currentStatus === 'draft' && (
                      <button 
                        onClick={() => handlePublishAssignment(assignment.id)}
                        className="bg-green-600 text-white px-3 py-1.5 rounded text-xs hover:bg-green-700 transition-colors flex-1"
                      >
                        Publish
                      </button>
                    )}
                    {currentStatus === 'published' && !isOverdue && (
                      <button 
                        onClick={() => handleCloseAssignment(assignment.id)}
                        className="bg-orange-600 text-white px-3 py-1.5 rounded text-xs hover:bg-orange-700 transition-colors flex-1"
                      >
                        Close
                      </button>
                    )}
                    <button className="border border-slate-300 text-slate-700 px-3 py-1.5 rounded text-xs hover:bg-slate-50 transition-colors">
                      Edit
                    </button>
                    {canDelete && (
                      <button 
                        onClick={() => handleDeleteAssignment(assignment.id, assignment.title)}
                        className="border border-red-300 text-red-700 px-3 py-1.5 rounded text-xs hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden sm:flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-800">{assignment.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentStatus)}`}>
                      {currentStatus}
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
                      Due: {assignment.dueDate}
                    </span>
                    <span>Points: {assignment.maxPoints}</span>
                    <span>Submissions: {assignment.submissions?.length || 0}</span>
                  </div>
                  <div className="flex items-center flex-wrap gap-4 text-xs text-slate-400 mt-1">
                    <span>
                      Target: {assignment.targetType === "subject" 
                        ? `All ${assignment.subjectName} classes` 
                        : `${assignment.targetClasses?.length || 0} specific class(es)`
                      }
                    </span>
                    {isOverdue && (
                      <span className="text-orange-600 font-medium">
                        • Assignment is past due date
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col space-y-2 ml-4 flex-shrink-0">
                  {/* Primary Actions */}
                  <div className="flex space-x-2">
                    {(currentStatus === 'published' || currentStatus === 'overdue') && (
                      <button 
                        onClick={() => handleGradeAssignment(assignment)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        Grade ({assignment.submissions?.length || 0})
                      </button>
                    )}
                    {currentStatus === 'draft' && (
                      <button 
                        onClick={() => handlePublishAssignment(assignment.id)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        Publish
                      </button>
                    )}
                    {currentStatus === 'published' && !isOverdue && (
                      <button 
                        onClick={() => handleCloseAssignment(assignment.id)}
                        className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700 transition-colors"
                      >
                        Close Early
                      </button>
                    )}
                  </div>
                  
                  {/* Secondary Actions */}
                  <div className="flex space-x-2">
                    <button className="border border-slate-300 text-slate-700 px-3 py-1 rounded text-sm hover:bg-slate-50 transition-colors">
                      Edit
                    </button>
                    {canDelete && (
                      <button 
                        onClick={() => handleDeleteAssignment(assignment.id, assignment.title)}
                        className="border border-red-300 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredAssignments.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-slate-400 text-4xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">No assignments found</h3>
          <p className="text-slate-600 mb-4">
            {selectedSubject === "all" 
              ? "You haven't created any assignments yet." 
              : `No assignments found for ${selectedSubject}.`
            }
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Create Your First Assignment
          </button>
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">Create New Assignment</h2>
            </div>
            <form onSubmit={handleCreateAssignment} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={newAssignment.description}
                  onChange={(e) => setNewAssignment({...newAssignment, description: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <select
                  value={newAssignment.subjectName}
                  onChange={(e) => setNewAssignment({...newAssignment, subjectName: e.target.value, targetClasses: []})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="">Select a subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.subjectName} value={subject.subjectName}>
                      {subject.subjectName} ({subject.totalStudents} students)
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignment Target Type */}
              {newAssignment.subjectName && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Assignment Target</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="subject"
                        checked={newAssignment.targetType === "subject"}
                        onChange={(e) => setNewAssignment({...newAssignment, targetType: e.target.value, targetClasses: []})}
                        className="mr-2"
                      />
                      <span className="text-sm">All classes taking {newAssignment.subjectName}</span>
                      <span className="text-xs text-slate-500 ml-2">
                        ({subjects.find(s => s.subjectName === newAssignment.subjectName)?.totalStudents || 0} students)
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="class"
                        checked={newAssignment.targetType === "class"}
                        onChange={(e) => setNewAssignment({...newAssignment, targetType: e.target.value, targetClasses: []})}
                        className="mr-2"
                      />
                      <span className="text-sm">Specific classes only</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Class Selection for Class-specific assignments */}
              {newAssignment.targetType === "class" && newAssignment.subjectName && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Classes</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2">
                    {subjects.find(s => s.subjectName === newAssignment.subjectName)?.classes.map((classItem) => (
                      <label key={classItem.classId} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newAssignment.targetClasses.includes(classItem.classId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewAssignment({
                                ...newAssignment,
                                targetClasses: [...newAssignment.targetClasses, classItem.classId]
                              });
                            } else {
                              setNewAssignment({
                                ...newAssignment,
                                targetClasses: newAssignment.targetClasses.filter(id => id !== classItem.classId)
                              });
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">
                          {classItem.className} - {classItem.level}
                          {classItem.category && ` (${classItem.category})`}
                        </span>
                        <span className="text-xs text-slate-500 ml-2">
                          ({classItem.studentCount} students)
                        </span>
                      </label>
                    ))}
                  </div>
                  {newAssignment.targetClasses.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">Please select at least one class</p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newAssignment.dueDate}
                    onChange={(e) => setNewAssignment({...newAssignment, dueDate: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Points</label>
                  <input
                    type="number"
                    value={newAssignment.maxPoints}
                    onChange={(e) => setNewAssignment({...newAssignment, maxPoints: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={(e) => handleCreateAssignment(e, "draft")}
                  className="flex-1 border border-green-600 text-green-600 py-2 rounded-lg hover:bg-green-50 transition-colors font-medium text-sm"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={(e) => handleCreateAssignment(e, "published")}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                >
                  Create & Publish
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

// Grading Modal Component
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
            const student = await getStudent(submission.studentId);
            if (student && isMounted) {
              details[submission.studentId] = student;
            }
          } catch (error) {
            console.error(`Error fetching student ${submission.studentId}:`, error);
            if (isMounted) {
              details[submission.studentId] = {
                firstName: 'Unknown',
                lastName: 'Student',
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
  }, [submittedStudents, assignment.id]); // Depend on submittedStudents and assignment ID

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
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Grade Assignment</h2>
              <p className="text-green-200 text-sm sm:text-base">{assignment.title}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-green-200 transition-colors"
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
                            {student ? `${student.firstName} ${student.lastName}` : 'Loading...'}
                          </p>
                          {student && (
                            <p className="text-xs sm:text-sm text-slate-500">
                              ID: {student.admissionNumber || submission.studentId}
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
                          {submission.grade && (
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
                            {studentDetails[selectedStudent.studentId].firstName} {studentDetails[selectedStudent.studentId].lastName}
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
                        <div>Student ID: {selectedStudent.studentId}</div>
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

export default Assignments;