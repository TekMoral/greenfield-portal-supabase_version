// File: src/pages/student/Dashboard.jsx
// This file defines the student dashboard, displaying student information, notices, exams, and recent activity

import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { getStudent } from "../../services/studentService";
import { getAllClasses } from "../../services/classService";
import { getAssignmentsForStudent } from "../../services/assignmentService";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const [studentData, classesData] = await Promise.all([
          getStudent(user.uid),
          getAllClasses()
        ]);
        
        if (studentData) {
          // Enrich student data with class information
          const classData = classesData.find(cls => cls.id === studentData.classId);
          const enrichedStudent = {
            ...studentData,
            class: classData?.name || "N/A",
            level: classData?.level || "",
            category: classData?.category || ""
          };
          setStudent(enrichedStudent);

          // Fetch student assignments
          try {
            const studentAssignments = await getAssignmentsForStudent(user.uid);
            setAssignments(studentAssignments || []);
          } catch (assignmentError) {
            console.error('Error fetching assignments:', assignmentError);
            setAssignments([]);
          }
        }
      } catch (err) {
        console.error('Error fetching student data:', err);
        setError('Failed to load student information. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [user?.uid]);

  // Loading state
  if (loading) {
    return (
      <div className="animate-pulse space-y-4 sm:space-y-6">
        <div className="h-6 sm:h-8 bg-slate-200 rounded w-2/3 sm:w-1/3"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-4 sm:p-6 rounded-lg shadow h-20 sm:h-24"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow h-28 sm:h-32"></div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow h-28 sm:h-32"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6 text-center mx-2 sm:mx-0">
        <div className="text-red-600 text-3xl sm:text-4xl mb-3 sm:mb-4">⚠️</div>
        <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-2">Error Loading Dashboard</h2>
        <p className="text-sm sm:text-base text-slate-600 mb-3 sm:mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-slate-800 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm sm:text-base"
        >
          Try Again
        </button>
      </div>
    );
  }

  // No user state
  if (!user) {
    return (
      <div className="text-center mx-2 sm:mx-0">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 sm:p-6">
          <div className="text-yellow-600 text-3xl sm:text-4xl mb-3 sm:mb-4">🔐</div>
          <h2 className="text-lg sm:text-xl font-semibold text-yellow-800">Please Log In</h2>
          <p className="text-sm sm:text-base text-yellow-600">You need to be logged in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  // No student data state
  if (!student) {
    return (
      <div className="text-center mx-2 sm:mx-0">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
          <div className="text-blue-600 text-3xl sm:text-4xl mb-3 sm:mb-4">👤</div>
          <h2 className="text-lg sm:text-xl font-semibold text-blue-800">Student Profile Not Found</h2>
          <p className="text-sm sm:text-base text-blue-600">Unable to find your student information. Please contact support.</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const statusColors = {
      active: 'text-green-800 bg-green-100 border border-green-200',
      inactive: 'text-red-800 bg-red-100 border border-red-200',
      suspended: 'text-yellow-800 bg-yellow-100 border border-yellow-200',
      graduated: 'text-slate-800 bg-slate-100 border border-slate-200'
    };
    return statusColors[status?.toLowerCase()] || 'text-slate-700 bg-slate-100 border border-slate-200';
  };

  const getCurrentTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Helper functions for assignments
  const getAssignmentStatus = (assignment) => {
    const submission = assignment.submissions?.find(sub => sub.studentId === user.uid);
    if (submission) {
      return submission.status === 'graded' ? 'graded' : 'submitted';
    }
    
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();
    return dueDate < now ? 'overdue' : 'pending';
  };

  const getPendingAssignments = () => {
    return assignments.filter(assignment => {
      const status = getAssignmentStatus(assignment);
      return status === 'pending' || status === 'overdue';
    }).slice(0, 3);
  };

  const pendingAssignments = getPendingAssignments();

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4 sm:p-6 rounded-lg shadow-lg border-t-4 border-green-500 mx-2 sm:mx-0">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
          {getCurrentTime()}, {student.firstName}! 
        </h1>
        <p className="text-slate-200 text-sm sm:text-base">
          Welcome back to your student dashboard. 
          {pendingAssignments.length > 0 && (
            <span className="block mt-1">
              📋 You have {pendingAssignments.length} pending assignment{pendingAssignments.length !== 1 ? 's' : ''}.
            </span>
          )}
        </p>
      </div>

      {/* Student Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 px-2 sm:px-0">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-medium text-slate-600 uppercase tracking-wide">Current Class</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-800 mt-1 truncate">{student.class || 'N/A'}</p>
            </div>
            <div className="text-green-600 text-xl sm:text-2xl ml-2 flex-shrink-0">🎓</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-slate-700">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-medium text-slate-600 uppercase tracking-wide">Admission No.</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-800 mt-1 truncate">{student.admissionNumber || 'N/A'}</p>
            </div>
            <div className="text-slate-700 text-xl sm:text-2xl ml-2 flex-shrink-0">🆔</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-green-600">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-medium text-slate-600 uppercase tracking-wide">Status</h3>
              <span className={`inline-flex px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold mt-1 ${getStatusColor(student.status)}`}>
                {student.status ? student.status.charAt(0).toUpperCase() + student.status.slice(1) : 'N/A'}
              </span>
            </div>
            <div className="text-green-600 text-xl sm:text-2xl ml-2 flex-shrink-0">📊</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-slate-600">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-medium text-slate-600 uppercase tracking-wide">Academic Year</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-800 mt-1">
                {student.academicYear || new Date().getFullYear()}
              </p>
            </div>
            <div className="text-slate-700 text-xl sm:text-2xl ml-2 flex-shrink-0">📅</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 px-2 sm:px-0">
        {/* Latest Notice */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200">
          <div className="bg-gradient-to-r from-green-600 to-green-700 p-3 sm:p-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center">
              <span className="mr-2">📢</span>
              <span className="truncate">Latest Announcements</span>
            </h2>
          </div>
          <div className="p-4 sm:p-6 bg-slate-50">
            {student.notices && student.notices.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {student.notices.slice(0, 3).map((notice, index) => (
                  <div key={index} className="bg-white border-l-4 border-green-500 pl-3 sm:pl-4 py-2 sm:py-3 rounded-r-lg shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-semibold text-slate-800 text-sm sm:text-base line-clamp-2">{notice.title}</h4>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 line-clamp-2">{notice.content}</p>
                    <span className="text-xs text-slate-400 mt-1 sm:mt-2 block">{notice.date}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <div className="text-slate-400 text-3xl sm:text-4xl mb-2 sm:mb-3">📝</div>
                <p className="text-slate-600 font-medium text-sm sm:text-base">No new announcements at this time.</p>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">Check back later for updates!</p>
              </div>
            )}
          </div>
        </div>

        {/* Pending Assignments */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200">
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center">
                <span className="mr-2">📋</span>
                <span className="truncate">Pending Assignments</span>
              </h2>
              {pendingAssignments.length > 0 && (
                <button
                  onClick={() => navigate('/student/assignments')}
                  className="text-slate-200 hover:text-white text-sm underline"
                >
                  View All
                </button>
              )}
            </div>
          </div>
          <div className="p-4 sm:p-6 bg-slate-50">
            {pendingAssignments.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {pendingAssignments.map((assignment) => {
                  const status = getAssignmentStatus(assignment);
                  const dueDate = new Date(assignment.dueDate);
                  const isOverdue = status === 'overdue';
                  
                  return (
                    <div 
                      key={assignment.id} 
                      className={`bg-white border-l-4 pl-3 sm:pl-4 py-2 sm:py-3 rounded-r-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                        isOverdue ? 'border-red-500' : 'border-slate-600'
                      }`}
                      onClick={() => navigate('/student/assignments')}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800 text-sm sm:text-base line-clamp-1">
                            {assignment.title}
                          </h4>
                          <p className="text-xs sm:text-sm text-slate-600 mt-1">
                            {assignment.subjectName}
                          </p>
                          <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Due: {dueDate.toLocaleDateString()} • {assignment.maxPoints} points
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isOverdue 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {isOverdue ? 'Overdue' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <div className="text-slate-400 text-3xl sm:text-4xl mb-2 sm:mb-3">✅</div>
                <p className="text-slate-600 font-medium text-sm sm:text-base">All assignments completed!</p>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">Great job staying on top of your work!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md border border-slate-200 mx-2 sm:mx-0">
        <div className="border-b border-slate-200 p-3 sm:p-4">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center">
            <span className="mr-2">📈</span>
            <span>Recent Activity</span>
          </h2>
        </div>
        <div className="p-4 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {student.recentActivity && student.recentActivity.length > 0 ? (
              student.recentActivity.slice(0, 4).map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-2 sm:p-3 bg-slate-50 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-600 rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-slate-800 line-clamp-2">{activity.action}</p>
                    <p className="text-xs text-slate-500 mt-1">{activity.timestamp}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 sm:py-6">
                <div className="text-slate-400 text-2xl sm:text-3xl mb-2">📊</div>
                <p className="text-slate-600 text-sm sm:text-base">No recent activity to display.</p>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">Your activities will appear here as you use the portal.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
