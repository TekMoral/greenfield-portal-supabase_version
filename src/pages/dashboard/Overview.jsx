import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getDashboardStats } from "../../services/supabase/dashboardService";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const Overview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    activeExams: 0,
    newStudentsThisMonth: 0,
    newTeachersThisMonth: 0,
    examsEndingThisWeek: 0
  });
  const queryClient = useQueryClient();

  const fetchOverviewQuery = async () => {
    const result = await getDashboardStats();
    if (!result.success) throw new Error(result.error || 'Failed to fetch dashboard stats');
    const overview = result.data.overview || {};
    return {
      totalStudents: overview.totalStudents || 0,
      totalTeachers: overview.totalTeachers || 0,
      totalClasses: overview.totalClasses || 0,
      activeExams: overview.totalExams || 0,
      newStudentsThisMonth: overview.newStudentsThisMonth || 0,
      newTeachersThisMonth: overview.newTeachersThisMonth || 0,
      examsEndingThisWeek: overview.examsEndingThisWeek || 0
    };
  };

  const { data: overviewData, isLoading, error } = useQuery({ queryKey: ['dashboard', 'overview'], queryFn: fetchOverviewQuery });

  useEffect(() => {
    if (overviewData) setStats(overviewData);
  }, [overviewData]);

  // Data fetched via React Query

  const handleQuickAction = (action) => {
    switch (action) {
      case 'add-student':
        navigate('/dashboard/students');
        break;
      case 'new-class':
        navigate('/dashboard/classes');
        break;
      case 'reports':
        navigate('/dashboard/reports');
        break;
      case 'settings':
        navigate('/dashboard/settings');
        break;
      default:
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Dashboard</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard', 'overview'] })}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard Overview
          </h2>
          <p className="text-gray-600">
            Welcome back, <span className="inline-block bg-gray-200 text-gray-800 font-semibold px-2 py-1 rounded-md">{user?.email?.split("@")[0]?.toUpperCase() || "ADMIN"}!</span> Here's what's happening at your school today.
          </p>
        </div>
        <div className="hidden sm:block">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live data</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Students Card */}
        <div className="group bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl rounded-xl p-6 border border-gray-200/50 transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">
                Total Students
              </p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.totalStudents}</h3>
              <div className="flex items-center mt-2">
                <span className="text-green-600 text-sm font-semibold">
                  +{stats.newStudentsThisMonth}
                </span>
                <span className="text-gray-500 text-sm ml-1">this month</span>
              </div>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-200 transition-colors duration-300">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Teachers Card */}
        <div className="group bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl rounded-xl p-6 border border-gray-200/50 transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">
                Teachers
              </p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.totalTeachers}</h3>
              <div className="flex items-center mt-2">
                <span className="text-green-600 text-sm font-semibold">+{stats.newTeachersThisMonth}</span>
                <span className="text-gray-500 text-sm ml-1">this month</span>
              </div>
            </div>
            <div className="bg-purple-100 p-3 rounded-xl group-hover:bg-purple-200 transition-colors duration-300">
              <svg
                className="w-8 h-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Classes Card */}
        <div className="group bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl rounded-xl p-6 border border-gray-200/50 transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">
                Classes
              </p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.totalClasses}</h3>
              <div className="flex items-center mt-2">
                <span className="text-blue-600 text-sm font-semibold">
                  Active
                </span>
                <span className="text-gray-500 text-sm ml-1">
                  this semester
                </span>
              </div>
            </div>
            <div className="bg-green-100 p-3 rounded-xl group-hover:bg-green-200 transition-colors duration-300">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Active Exams Card */}
        <div className="group bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl rounded-xl p-6 border border-gray-200/50 transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">
                Total Exams
              </p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.activeExams}</h3>
              <div className="flex items-center mt-2">
                <span className="text-orange-600 text-sm font-semibold">
                  {stats.examsEndingThisWeek} ending
                </span>
                <span className="text-gray-500 text-sm ml-1">this week</span>
              </div>
            </div>
            <div className="bg-orange-100 p-3 rounded-xl group-hover:bg-orange-200 transition-colors duration-300">
              <svg
                className="w-8 h-8 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-xl p-6 border border-gray-200/50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button
            onClick={() => handleQuickAction('add-student')}
            className="flex flex-col items-center p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors duration-200 group cursor-pointer"
          >
            <svg
              className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <span className="text-sm font-medium text-gray-700">
              Add Student
            </span>
          </button>
          <button
            onClick={() => handleQuickAction('new-class')}
            className="flex flex-col items-center p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors duration-200 group cursor-pointer"
          >
            <svg
              className="w-6 h-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2M8 7v8a2 2 0 002 2h4a2 2 0 002-2V7"
              />
            </svg>
            <span className="text-sm font-medium text-gray-700">New Class</span>
          </button>
          <button
            onClick={() => handleQuickAction('reports')}
            className="flex flex-col items-center p-4 rounded-lg bg-green-50 hover:bg-green-100 transition-colors duration-200 group cursor-pointer"
          >
            <svg
              className="w-6 h-6 text-green-600 mb-2 group-hover:scale-110 transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 00-2 2v6a2 2 0 00-2 2zm6-10V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v4h6z"
              />
            </svg>
            <span className="text-sm font-medium text-gray-700">Reports</span>
          </button>
          <button
            onClick={() => handleQuickAction('settings')}
            className="flex flex-col items-center p-4 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors duration-200 group cursor-pointer"
          >
            <svg
              className="w-6 h-6 text-orange-600 mb-2 group-hover:scale-110 transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-sm font-medium text-gray-700">Settings</span>
          </button>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-xl p-6 border border-gray-200/50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          System Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center p-3 bg-green-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Database</p>
              <p className="text-xs text-gray-600">Connected</p>
            </div>
          </div>
          <div className="flex items-center p-3 bg-blue-50 rounded-lg">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Students</p>
              <p className="text-xs text-gray-600">{stats.totalStudents} enrolled</p>
            </div>
          </div>
          <div className="flex items-center p-3 bg-purple-50 rounded-lg">
            <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Classes</p>
              <p className="text-xs text-gray-600">{stats.totalClasses} active</p>
            </div>
          </div>
        </div>
      </div>

      </div>
  );
};

export default Overview;