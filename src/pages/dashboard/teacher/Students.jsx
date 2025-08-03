import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { getTeacherClassesAndSubjects, getStudentsByTeacherSubject, getStudentsByTeacherSubjectAndClasses } from "../../../services/teacherStudentService";
import { getFullName, getInitials, nameMatchesSearch } from "../../../utils/nameUtils";
import { getAssignmentsByTeacher } from "../../../services/assignmentService";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";

const Students = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Modal states
  const [showAssignmentsModal, setShowAssignmentsModal] = useState(false);
  const [showGradesModal, setShowGradesModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  
  // Data states
  const [studentAssignments, setStudentAssignments] = useState([]);
  const [studentGrades, setStudentGrades] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Message form state
  const [messageForm, setMessageForm] = useState({
    subject: '',
    message: '',
    priority: 'normal'
  });
  
  // Get URL parameters for class filtering
  const urlClassIds = searchParams.get('classIds');
  const urlClassName = searchParams.get('className');

  useEffect(() => {
    const fetchTeacherSubjects = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const classes = await getTeacherClassesAndSubjects(user.uid);
        
        // Extract unique subjects taught by this teacher
        const subjectMap = new Map();
        
        classes.forEach(classItem => {
          classItem.subjectsTaught?.forEach(subject => {
            if (!subjectMap.has(subject.subjectName)) {
              subjectMap.set(subject.subjectName, {
                subjectName: subject.subjectName,
                classes: [],
                totalStudents: 0
              });
            }
            
            const subjectData = subjectMap.get(subject.subjectName);
            
            if (classItem.isGrouped) {
              // For grouped classes, add individual classes
              classItem.individualClasses?.forEach(individualClass => {
                subjectData.classes.push({
                  classId: individualClass.id,
                  className: individualClass.name,
                  level: classItem.level,
                  category: individualClass.category,
                  studentCount: individualClass.studentCount
                });
              });
            } else {
              // For individual classes
              subjectData.classes.push({
                classId: classItem.id,
                className: classItem.name,
                level: classItem.level,
                category: classItem.category,
                studentCount: classItem.studentCount
              });
            }
            
            subjectData.totalStudents += classItem.studentCount;
          });
        });
        
        const subjectsArray = Array.from(subjectMap.values());
        setSubjects(subjectsArray);
        
        // Auto-select first subject if available
        if (subjectsArray.length > 0) {
          setSelectedSubject(subjectsArray[0].subjectName);
        }
      } catch (error) {
        console.error('Error fetching teacher subjects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherSubjects();
  }, [user?.uid]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedSubject || !user?.uid) return;

      setLoadingStudents(true);
      try {
        let studentData;
        
        // If we have URL class IDs, filter by those specific classes
        if (urlClassIds) {
          const classIdsArray = urlClassIds.split(',').filter(id => id.trim());
          studentData = await getStudentsByTeacherSubjectAndClasses(user.uid, selectedSubject, classIdsArray);
        } else {
          // Otherwise, get all students for the subject
          studentData = await getStudentsByTeacherSubject(user.uid, selectedSubject);
        }
        
        setStudents(studentData);
      } catch (error) {
        console.error('Error fetching students:', error);
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [selectedSubject, user?.uid, urlClassIds]);

  const filteredStudents = students.filter(student => {
    const matchesSearch = searchTerm === "" || 
      nameMatchesSearch(student, searchTerm) ||
      student.admissionNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = selectedClass === "all" || student.classId === selectedClass;
    
    return matchesSearch && matchesClass;
  });

  const getUniqueClasses = () => {
    const classMap = new Map();
    students.forEach(student => {
      if (!classMap.has(student.classId)) {
        classMap.set(student.classId, {
          id: student.classId,
          name: student.className,
          level: student.classLevel,
          category: student.classCategory
        });
      }
    });
    return Array.from(classMap.values());
  };

  const openStudentDetails = (student) => {
    setSelectedStudent(student);
  };

  const closeStudentDetails = () => {
    setSelectedStudent(null);
    setShowAssignmentsModal(false);
    setShowGradesModal(false);
    setShowMessageModal(false);
    setStudentAssignments([]);
    setStudentGrades([]);
    setMessageForm({ subject: '', message: '', priority: 'normal' });
  };

  // Fetch student assignments
  const fetchStudentAssignments = async (student) => {
    setLoadingAssignments(true);
    try {
      // Get all assignments for the current subject
      const assignments = await getAssignmentsByTeacher(user.uid);
      const subjectAssignments = assignments.filter(assignment => 
        assignment.subjectName === selectedSubject
      );

      // Process assignments to show student's submission status and grades
      const studentAssignmentData = subjectAssignments.map(assignment => {
        const submission = assignment.submissions?.find(sub => sub.studentId === student.id);
        
        return {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          dueDate: assignment.dueDate,
          maxPoints: assignment.maxPoints,
          status: assignment.status,
          submitted: !!submission,
          submittedAt: submission?.submittedAt,
          grade: submission?.grade,
          feedback: submission?.feedback,
          submissionStatus: submission?.status || 'not_submitted'
        };
      });

      setStudentAssignments(studentAssignmentData);
    } catch (error) {
      console.error('Error fetching student assignments:', error);
      setStudentAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  };

  // Fetch student grades
  const fetchStudentGrades = async (student) => {
    setLoadingGrades(true);
    try {
      // Get grades from assignments
      const assignments = await getAssignmentsByTeacher(user.uid);
      const subjectAssignments = assignments.filter(assignment => 
        assignment.subjectName === selectedSubject
      );

      const gradesData = subjectAssignments
        .map(assignment => {
          const submission = assignment.submissions?.find(sub => sub.studentId === student.id);
          if (submission && submission.grade !== undefined) {
            return {
              assignmentId: assignment.id,
              assignmentTitle: assignment.title,
              maxPoints: assignment.maxPoints,
              grade: submission.grade,
              percentage: Math.round((submission.grade / assignment.maxPoints) * 100),
              feedback: submission.feedback,
              submittedAt: submission.submittedAt,
              gradedAt: submission.gradedAt
            };
          }
          return null;
        })
        .filter(grade => grade !== null);

      setStudentGrades(gradesData);
    } catch (error) {
      console.error('Error fetching student grades:', error);
      setStudentGrades([]);
    } finally {
      setLoadingGrades(false);
    }
  };

  // Send message to student
  const sendMessage = async () => {
    if (!messageForm.subject.trim() || !messageForm.message.trim()) {
      alert('Please fill in both subject and message fields.');
      return;
    }

    setSendingMessage(true);
    try {
      const messageData = {
        from: user.uid,
        fromName: user.displayName || 'Teacher',
        fromEmail: user.email,
        to: selectedStudent.id,
        toName: getFullName(selectedStudent),
        toEmail: selectedStudent.email,
        subject: messageForm.subject.trim(),
        message: messageForm.message.trim(),
        priority: messageForm.priority,
        type: 'teacher_to_student',
        status: 'sent',
        createdAt: new Date(),
        readAt: null
      };

      await addDoc(collection(db, 'messages'), messageData);
      
      alert('Message sent successfully!');
      setShowMessageModal(false);
      setMessageForm({ subject: '', message: '', priority: 'normal' });
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleViewAssignments = (student) => {
    setShowAssignmentsModal(true);
    fetchStudentAssignments(student);
  };

  const handleViewGrades = (student) => {
    setShowGradesModal(true);
    fetchStudentGrades(student);
  };

  const handleSendMessage = (student) => {
    setShowMessageModal(true);
    setMessageForm({
      subject: `Message regarding ${selectedSubject}`,
      message: '',
      priority: 'normal'
    });
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 70) return 'text-blue-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
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
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800">
            {urlClassName ? `${decodeURIComponent(urlClassName)} Students` : 'My Students'}
          </h1>
          {urlClassName && (
            <p className="text-sm text-slate-600 mt-1">
              Showing students from {decodeURIComponent(urlClassName)} only
              <button
                onClick={() => window.location.href = '/teacher/students'}
                className="ml-2 text-green-600 hover:text-green-800 underline"
              >
                View all students
              </button>
            </p>
          )}
        </div>
        <div className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
          {filteredStudents.length} of {students.length} students
        </div>
      </div>

      {/* Subject Selection */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-slate-200">
        <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-4">Select Subject</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {subjects.map((subject) => (
            <button
              key={subject.subjectName}
              onClick={() => setSelectedSubject(subject.subjectName)}
              className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                selectedSubject === subject.subjectName
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="font-semibold text-sm sm:text-base">{subject.subjectName}</div>
              <div className="text-xs sm:text-sm text-slate-600 mt-1">
                {subject.totalStudents} students across {subject.classes.length} class{subject.classes.length !== 1 ? 'es' : ''}
              </div>
              <div className="text-xs text-slate-500 mt-2 line-clamp-2">
                Classes: {subject.classes.map(c => c.className).join(', ')}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedSubject && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-slate-200">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Search Students
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name, admission number, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <svg className="w-4 sm:w-5 h-4 sm:h-5 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Filter by Class
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="all">All Classes</option>
                  {getUniqueClasses().map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name} - {classItem.level}
                      {classItem.category && ` (${classItem.category})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Students List */}
          <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800">
                {selectedSubject} Students
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} found
              </p>
            </div>

            {loadingStudents ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-slate-400 mb-4">
                  <svg className="w-12 sm:w-16 h-12 sm:h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-2">No Students Found</h3>
                <p className="text-sm sm:text-base text-slate-500">
                  {searchTerm || selectedClass !== "all" 
                    ? "Try adjusting your search or filter criteria."
                    : `No students are currently taking ${selectedSubject}.`
                  }
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="block lg:hidden">
                  <div className="divide-y divide-slate-200">
                    {filteredStudents.map((student) => (
                      <div key={student.id} className="p-4 hover:bg-slate-50">
                        <div className="flex items-start space-x-3">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            {student.profileImageUrl ? (
                              <img 
                                src={student.profileImageUrl} 
                                alt={getFullName(student)}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-green-600 font-semibold text-sm">
                                {getInitials(student)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-semibold text-slate-900 truncate">
                                  {getFullName(student)}
                                </h4>
                                <p className="text-xs text-slate-600">{student.admissionNumber}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {student.className} - {student.classLevel}
                                  {student.classCategory && ` (${student.classCategory})`}
                                </p>
                                <div className="flex items-center space-x-2 mt-2">
                                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                    student.subjectType === 'core' ? 'bg-slate-100 text-slate-800' :
                                    student.subjectType === 'Junior' ? 'bg-green-100 text-green-800' :
                                    student.subjectType === 'Science' ? 'bg-green-100 text-green-800' :
                                    student.subjectType === 'Art' ? 'bg-green-100 text-green-800' :
                                    student.subjectType === 'Commercial' ? 'bg-slate-100 text-slate-800' :
                                    'bg-slate-100 text-slate-800'
                                  }`}>
                                    {student.subjectType || 'Unknown'}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => openStudentDetails(student)}
                                className="text-green-600 hover:text-green-900 hover:bg-green-50 px-2 py-1 rounded text-xs font-medium transition-colors ml-2"
                              >
                                View
                              </button>
                            </div>
                            <div className="mt-2 text-xs text-slate-500">
                              <div>{student.email}</div>
                              <div>{student.phoneNumber || 'No phone'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Class
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Subject Type
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-4">
                                {student.profileImageUrl ? (
                                  <img 
                                    src={student.profileImageUrl} 
                                    alt={getFullName(student)}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="text-green-600 font-semibold">
                                    {getInitials(student)}
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-slate-900">
                                  {getFullName(student)}
                                </div>
                                <div className="text-sm text-slate-500">
                                  {student.admissionNumber}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900">{student.className}</div>
                            <div className="text-sm text-slate-500">
                              {student.classLevel}
                              {student.classCategory && ` (${student.classCategory})`}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900">{student.email}</div>
                            <div className="text-sm text-slate-500">{student.phoneNumber || 'No phone'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              student.subjectType === 'core' ? 'bg-slate-100 text-slate-800' :
                              student.subjectType === 'Junior' ? 'bg-green-100 text-green-800' :
                              student.subjectType === 'Science' ? 'bg-green-100 text-green-800' :
                              student.subjectType === 'Art' ? 'bg-green-100 text-green-800' :
                              student.subjectType === 'Commercial' ? 'bg-slate-100 text-slate-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {student.subjectType || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => openStudentDetails(student)}
                              className="text-green-600 hover:text-green-900 hover:bg-green-50 px-3 py-1 rounded-lg transition-colors"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Student Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="bg-green-600 text-white p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                  <div className="w-12 sm:w-16 h-12 sm:h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                    {selectedStudent.profileImageUrl ? (
                      <img 
                        src={selectedStudent.profileImageUrl} 
                        alt={getFullName(selectedStudent)}
                        className="w-12 sm:w-16 h-12 sm:h-16 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-lg sm:text-xl">
                        {getInitials(selectedStudent)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-2xl font-bold truncate">
                      {getFullName(selectedStudent)}
                    </h2>
                    <p className="text-green-100 text-sm sm:text-base">{selectedStudent.admissionNumber}</p>
                  </div>
                </div>
                <button
                  onClick={closeStudentDetails}
                  className="text-white hover:text-green-200 transition-colors ml-4 flex-shrink-0"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3">Contact Information</h3>
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-slate-600 text-sm">Full Name:</span>
                        <span className="font-medium text-sm">{getFullName(selectedStudent)}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-slate-600 text-sm">Email:</span>
                        <span className="font-medium text-sm break-all">{selectedStudent.email}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-slate-600 text-sm">Phone:</span>
                        <span className="font-medium text-sm">{selectedStudent.phoneNumber || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3">Academic Information</h3>
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-slate-600 text-sm">Admission Number:</span>
                        <span className="font-medium text-sm">{selectedStudent.admissionNumber}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-slate-600 text-sm">Class:</span>
                        <span className="font-medium text-sm">{selectedStudent.className}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-slate-600 text-sm">Level:</span>
                        <span className="font-medium text-sm">{selectedStudent.classLevel}</span>
                      </div>
                      {selectedStudent.classCategory && (
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                          <span className="text-slate-600 text-sm">Category:</span>
                          <span className="font-medium text-sm">{selectedStudent.classCategory}</span>
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-slate-600 text-sm">Subject Type:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full w-fit ${
                          selectedStudent.subjectType === 'core' ? 'bg-slate-100 text-slate-800' :
                          selectedStudent.subjectType === 'Junior' ? 'bg-green-100 text-green-800' :
                          selectedStudent.subjectType === 'Science' ? 'bg-green-100 text-green-800' :
                          selectedStudent.subjectType === 'Art' ? 'bg-green-100 text-green-800' :
                          selectedStudent.subjectType === 'Commercial' ? 'bg-slate-100 text-slate-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {selectedStudent.subjectType || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200">
                <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button 
                    onClick={() => handleViewAssignments(selectedStudent)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    View Assignments
                  </button>
                  <button 
                    onClick={() => handleViewGrades(selectedStudent)}
                    className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
                  >
                    View Grades
                  </button>
                  <button 
                    onClick={() => handleSendMessage(selectedStudent)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Send Message
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200">
              <div className="flex justify-end">
                <button
                  onClick={closeStudentDetails}
                  className="bg-slate-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm sm:text-base"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignments Modal */}
      {showAssignmentsModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="bg-green-600 text-white p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold">
                    {getFullName(selectedStudent)} - Assignments
                  </h3>
                  <p className="text-green-100 text-sm sm:text-base">{selectedSubject}</p>
                </div>
                <button
                  onClick={() => setShowAssignmentsModal(false)}
                  className="text-white hover:text-green-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingAssignments ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                </div>
              ) : studentAssignments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-slate-400 text-4xl mb-3">📝</div>
                  <h3 className="text-lg font-medium text-slate-800 mb-2">No Assignments Found</h3>
                  <p className="text-slate-600">No assignments have been created for {selectedSubject} yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {studentAssignments.map((assignment) => (
                    <div key={assignment.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="text-base font-semibold text-slate-800">{assignment.title}</h4>
                          <p className="text-sm text-slate-600 mt-1">{assignment.description}</p>
                          <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500">
                            <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                            <span>Max Points: {assignment.maxPoints}</span>
                            <span className={assignment.submitted ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                              {assignment.submitted ? 'Submitted' : 'Not Submitted'}
                            </span>
                          </div>
                          {assignment.submitted && assignment.submittedAt && (
                            <div className="text-xs text-slate-500 mt-1">
                              Submitted on: {new Date(assignment.submittedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            assignment.submissionStatus === 'graded' ? 'bg-green-100 text-green-800' :
                            assignment.submissionStatus === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {assignment.submissionStatus === 'graded' ? 'Graded' :
                             assignment.submissionStatus === 'submitted' ? 'Pending Review' :
                             'Not Submitted'}
                          </span>
                          {assignment.grade !== undefined && (
                            <div className="text-right">
                              <div className="text-lg font-bold text-slate-800">
                                {assignment.grade}/{assignment.maxPoints}
                              </div>
                              <div className={`text-sm font-medium ${getGradeColor(Math.round((assignment.grade / assignment.maxPoints) * 100))}`}>
                                {Math.round((assignment.grade / assignment.maxPoints) * 100)}%
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {assignment.feedback && (
                        <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                          <div className="text-sm font-medium text-blue-800 mb-1">Teacher Feedback:</div>
                          <div className="text-sm text-blue-700">{assignment.feedback}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grades Modal */}
      {showGradesModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="bg-slate-600 text-white p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold">
                    {getFullName(selectedStudent)} - Grades
                  </h3>
                  <p className="text-slate-100 text-sm sm:text-base">{selectedSubject}</p>
                </div>
                <button
                  onClick={() => setShowGradesModal(false)}
                  className="text-white hover:text-slate-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingGrades ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-500"></div>
                </div>
              ) : studentGrades.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-slate-400 text-4xl mb-3">📊</div>
                  <h3 className="text-lg font-medium text-slate-800 mb-2">No Grades Found</h3>
                  <p className="text-slate-600">No graded assignments found for this student in {selectedSubject}.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Grade Summary */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-slate-800 mb-3">Grade Summary</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-3 border">
                        <div className="text-sm text-slate-600">Total Assignments</div>
                        <div className="text-2xl font-bold text-slate-800">{studentGrades.length}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border">
                        <div className="text-sm text-slate-600">Average Grade</div>
                        <div className={`text-2xl font-bold ${getGradeColor(
                          Math.round(studentGrades.reduce((sum, grade) => sum + grade.percentage, 0) / studentGrades.length)
                        )}`}>
                          {Math.round(studentGrades.reduce((sum, grade) => sum + grade.percentage, 0) / studentGrades.length)}%
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border">
                        <div className="text-sm text-slate-600">Total Points</div>
                        <div className="text-2xl font-bold text-slate-800">
                          {studentGrades.reduce((sum, grade) => sum + grade.grade, 0)}/
                          {studentGrades.reduce((sum, grade) => sum + grade.maxPoints, 0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Individual Grades */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-slate-800">Individual Grades</h4>
                    {studentGrades.map((grade) => (
                      <div key={grade.assignmentId} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1">
                            <h5 className="text-base font-semibold text-slate-800">{grade.assignmentTitle}</h5>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
                              <span>Submitted: {new Date(grade.submittedAt).toLocaleDateString()}</span>
                              {grade.gradedAt && (
                                <span>Graded: {new Date(grade.gradedAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-slate-800">
                              {grade.grade}/{grade.maxPoints}
                            </div>
                            <div className={`text-lg font-medium ${getGradeColor(grade.percentage)}`}>
                              {grade.percentage}%
                            </div>
                          </div>
                        </div>
                        {grade.feedback && (
                          <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                            <div className="text-sm font-medium text-blue-800 mb-1">Teacher Feedback:</div>
                            <div className="text-sm text-blue-700">{grade.feedback}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="bg-blue-600 text-white p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold">
                    Send Message to {getFullName(selectedStudent)}
                  </h3>
                  <p className="text-blue-100 text-sm sm:text-base">{selectedStudent.email}</p>
                </div>
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="text-white hover:text-blue-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
                  <input
                    type="text"
                    value={messageForm.subject}
                    onChange={(e) => setMessageForm({...messageForm, subject: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter message subject..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                  <select
                    value={messageForm.priority}
                    onChange={(e) => setMessageForm({...messageForm, priority: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low Priority</option>
                    <option value="normal">Normal Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
                  <textarea
                    value={messageForm.message}
                    onChange={(e) => setMessageForm({...messageForm, message: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="6"
                    placeholder="Type your message here..."
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={sendingMessage}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingMessage ? 'Sending...' : 'Send Message'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMessageModal(false)}
                    className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;