import React, { useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { getTeacherByUid } from "../../../services/supabase/teacherService";
import { getTeacherClassesAndSubjects } from "../../../services/supabase/teacherStudentService";
import { getAssignmentsByTeacher, getAssignmentStats } from "../../../services/assignmentService";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [assignmentStats, setAssignmentStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch teacher profile
        const teacherData = await getTeacherByUid(user.uid);
        setTeacher(teacherData);

        if (teacherData) {
          // Fetch teacher's classes and subjects
          try {
            const classesData = await getTeacherClassesAndSubjects(user.uid);
            setTeacherClasses(classesData || []);
          } catch (classError) {
            console.error('Error fetching classes:', classError);
            setTeacherClasses([]);
          }

          // Fetch teacher's assignments
          try {
            const assignmentsData = await getAssignmentsByTeacher(user.uid);
            setAssignments(assignmentsData || []);

            // Fetch assignment statistics
            const statsData = await getAssignmentStats(user.uid);
            setAssignmentStats(statsData || {});
          } catch (assignmentError) {
            console.error('Error fetching assignments:', assignmentError);
            setAssignments([]);
            setAssignmentStats({});
          }
        }
      } catch (err) {
        console.error('Error fetching teacher data:', err);
        setError('Failed to load teacher information. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 sm:space-y-6">
        <div className="h-6 sm:h-8 bg-slate-200 rounded w-2/3 sm:w-1/3"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-4 sm:p-6 rounded-lg shadow h-20 sm:h-24"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6 text-center">
        <div className="text-red-600 text-3xl sm:text-4xl mb-3 sm:mb-4">⚠️</div>
        <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-2">Error Loading Dashboard</h2>
        <p className="text-sm sm:text-base text-slate-600 mb-3 sm:mb-4">{error}</p>
        <button
          onClick={() => navigate(0)}
          className="bg-slate-800 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  const getCurrentTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Calculate real data for stats
  const totalStudents = teacherClasses.reduce((total, cls) => total + (cls.studentCount || 0), 0);
  const pendingGrades = assignments.reduce((total, assignment) => {
    const submissions = assignment.submissions || [];
    const ungraded = submissions.filter(sub => sub.status !== 'graded').length;
    return total + ungraded;
  }, 0);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4 sm:p-6 rounded-lg shadow-lg border-t-4 border-green-500">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
          {getCurrentTime()}, {teacher?.name || 'Teacher'}!
        </h1>
        <p className="text-slate-200 text-sm sm:text-base">
          Welcome to your teacher dashboard. Manage your classes and students effectively.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-slate-600 uppercase tracking-wide">My Classes</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-800 mt-1">
                {teacherClasses.length}
              </p>
            </div>
            <div className="text-green-600 text-xl sm:text-2xl">📚</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-slate-600 uppercase tracking-wide">Total Students</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-800 mt-1">
                {totalStudents}
              </p>
            </div>
            <div className="text-slate-700 text-xl sm:text-2xl">👥</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-slate-600 uppercase tracking-wide">Pending Grades</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-800 mt-1">
                {pendingGrades}
              </p>
            </div>
            <div className="text-green-600 text-xl sm:text-2xl">📝</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-slate-600">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-slate-600 uppercase tracking-wide">Assignments</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-800 mt-1">
                {assignmentStats.total || 0}
              </p>
            </div>
            <div className="text-slate-700 text-xl sm:text-2xl">📋</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* My Classes */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200">
          <div className="bg-gradient-to-r from-green-600 to-green-700 p-3 sm:p-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center">
              <span className="mr-2">📚</span>
              My Classes
            </h2>
          </div>
          <div className="p-4 sm:p-6 bg-slate-50">
            {teacherClasses.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {teacherClasses.slice(0, 3).map((cls) => (
                  <div key={cls.id} className="bg-white border-l-4 border-green-500 pl-3 sm:pl-4 py-2 sm:py-3 rounded-r-lg shadow-sm">
                    <h4 className="font-semibold text-slate-800 text-sm sm:text-base">
                      {cls.name}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      {cls.subjectsTaught?.map(s => s.subjectName).join(', ')}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {cls.studentCount} students
                    </p>
                  </div>
                ))}
                {teacherClasses.length > 3 && (
                  <div className="text-center pt-2">
                    <p className="text-xs text-slate-500">
                      +{teacherClasses.length - 3} more classes
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-slate-400 text-4xl mb-3">📚</div>
                <p className="text-slate-500 text-sm">No classes assigned yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Assignments */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200">
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-3 sm:p-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center">
              <span className="mr-2">📋</span>
              Recent Assignments
            </h2>
          </div>
          <div className="p-4 sm:p-6 bg-slate-50">
            {assignments.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {assignments.slice(0, 3).map((assignment) => {
                  const createdDate = assignment.createdAt?.seconds
                    ? new Date(assignment.createdAt.seconds * 1000)
                    : new Date();
                  const timeAgo = getTimeAgo(createdDate);
                  const submissions = assignment.submissions || [];
                  const gradedCount = submissions.filter(s => s.status === 'graded').length;

                  return (
                    <div key={assignment.id} className="flex items-start space-x-3 p-2 sm:p-3 bg-white rounded-lg">
                      <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-600 rounded-full"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm font-medium text-slate-800">
                          {assignment.title} - {assignment.subjectName}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {timeAgo} • {gradedCount}/{submissions.length} graded
                        </p>
                      </div>
                    </div>
                  );
                })}
                {assignments.length > 3 && (
                  <div className="text-center pt-2">
                    <p className="text-xs text-slate-500">
                      +{assignments.length - 3} more assignments
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-slate-400 text-4xl mb-3">📋</div>
                <p className="text-slate-500 text-sm">No assignments created yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md border border-slate-200">
        <div className="border-b border-slate-200 p-3 sm:p-4">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center">
            <span className="mr-2">⚡</span>
            Quick Actions
          </h2>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/teacher/assignments')}
              className="cursor-pointer bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-3 sm:p-4 text-center transition-colors"
            >
              <div className="text-blue-600 text-xl sm:text-2xl mb-2">📝</div>
              <span className="text-xs sm:text-sm font-medium text-blue-800">Create Assignment</span>
            </button>
            <button
              onClick={() => navigate('/teacher/grades')}
              className="cursor-pointer bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-3 sm:p-4 text-center transition-colors"
            >
              <div className="text-green-600 text-xl sm:text-2xl mb-2">📊</div>
              <span className="text-xs sm:text-sm font-medium text-green-800">Grade Students</span>
            </button>
            <button
              onClick={() => navigate('/teacher/classes')}
              className="cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg p-3 sm:p-4 text-center transition-colors"
            >
              <div className="text-slate-700 text-xl sm:text-2xl mb-2">👥</div>
              <span className="text-xs sm:text-sm font-medium text-slate-800">View Classes</span>
            </button>
            <button
              onClick={() => navigate('/teacher/timetable')}
              className="cursor-pointer bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg p-3 sm:p-4 text-center transition-colors"
            >
              <div className="text-yellow-600 text-xl sm:text-2xl mb-2">📅</div>
              <span className="text-xs sm:text-sm font-medium text-yellow-800">My Timetable</span>
            </button>
            <button
              onClick={() => navigate('/teacher/attendance')}
              className="cursor-pointer bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg p-3 sm:p-4 text-center transition-colors"
            >
              <div className="text-purple-600 text-xl sm:text-2xl mb-2">✅</div>
              <span className="text-xs sm:text-sm font-medium text-purple-800">Mark Attendance</span>
            </button>
            <button
              onClick={() => navigate('/teacher/reports')}
              className="cursor-pointer bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg p-3 sm:p-4 text-center transition-colors"
            >
              <div className="text-indigo-600 text-xl sm:text-2xl mb-2">📈</div>
              <span className="text-xs sm:text-sm font-medium text-indigo-800">Student Reports</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to calculate time ago
const getTimeAgo = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString();
};

export default Dashboard;
