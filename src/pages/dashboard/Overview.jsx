import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getDashboardStats } from "../../services/supabase/dashboardService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AttendanceDonut from "../../components/common/AttendanceDonut";

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
    examsEndingThisWeek: 0,
    pendingReviewCount: 0,
    pendingReviewItems: [],
    attendanceTodayPercent: 0,
  });
  const queryClient = useQueryClient();

  const fetchOverviewQuery = async () => {
    const result = await getDashboardStats();
    if (!result.success) throw new Error(result.error || 'Failed to fetch dashboard stats');
    const overview = result.data.overview || {};
    const pending = result.data.pendingReview || { count: 0, items: [] };
    return {
      totalStudents: overview.totalStudents || 0,
      totalTeachers: overview.totalTeachers || 0,
      totalClasses: overview.totalClasses || 0,
      activeExams: overview.totalExams || 0,
      newStudentsThisMonth: overview.newStudentsThisMonth || 0,
      newTeachersThisMonth: overview.newTeachersThisMonth || 0,
      examsEndingThisWeek: overview.examsEndingThisWeek || 0,
      pendingReviewCount: pending.count || 0,
      pendingReviewItems: Array.isArray(pending.items) ? pending.items : [],
      attendanceTodayPercent: overview.attendanceTodayPercent ?? 0,
    };
  };

  const { data: overviewData, isLoading, error } = useQuery({ queryKey: ['dashboard', 'overview'], queryFn: fetchOverviewQuery });

  useEffect(() => {
    if (overviewData) setStats(overviewData);
  }, [overviewData]);

  const handleQuickAction = (action) => {
    switch (action) {
      case 'add-student':
        navigate('/dashboard/students');
        break;
      case 'add-teacher':
        navigate('/dashboard/teachers');
        break;
      case 'reports':
        navigate('/dashboard/reports');
        break;
      default:
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto mb-4"></div>
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
          <div className="text-gray-600 mb-4">{String(error.message || error)}</div>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard', 'overview'] })}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const firstName = (user?.email || '').split('@')[0] || 'Admin';
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-8">
      {/* Hero / Header */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25), transparent 40%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.15), transparent 35%)'}} />
        <div className="p-6 sm:p-8 relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Overview</h2>
              <p className="mt-2 text-emerald-100 text-sm sm:text-base">
                Welcome back, <span className="inline-block bg-white/15 px-2 py-1 rounded-md font-semibold">{firstName.toUpperCase()}</span>
                <span className="mx-2">•</span>
                <span className="text-emerald-50">{today}</span>
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-emerald-50 text-sm">
              <span className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></span>
              Live data
            </div>
          </div>
        </div>
      </div>

      {/* KPIs - Desktop */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Students */}
        <div className="group relative rounded-xl border border-emerald-100 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
          <div className="absolute inset-x-0 -top-px h-1 bg-gradient-to-r from-emerald-500/80 to-teal-500/80 rounded-t-xl" />
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-700/80">Students</p>
                <h3 className="mt-2 text-3xl font-bold text-slate-900">{stats.totalStudents}</h3>
                <div className="mt-2 text-sm"><span className="text-emerald-600 font-semibold">+{stats.newStudentsThisMonth}</span><span className="text-slate-500 ml-1">this month</span></div>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-100">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197"/></svg>
              </div>
            </div>
          </div>
        </div>
        {/* Teachers */}
        <div className="group relative rounded-xl border border-emerald-100 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
          <div className="absolute inset-x-0 -top-px h-1 bg-gradient-to-r from-sky-500/80 to-emerald-500/80 rounded-t-xl" />
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-sky-700/80">Teachers</p>
                <h3 className="mt-2 text-3xl font-bold text-slate-900">{stats.totalTeachers}</h3>
                <div className="mt-2 text-sm"><span className="text-emerald-600 font-semibold">+{stats.newTeachersThisMonth}</span><span className="text-slate-500 ml-1">this month</span></div>
              </div>
              <div className="rounded-lg bg-sky-50 p-3 ring-1 ring-sky-100">
                <svg className="w-8 h-8 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              </div>
            </div>
          </div>
        </div>
        {/* Classes */}
        <div className="group relative rounded-xl border border-emerald-100 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
          <div className="absolute inset-x-0 -top-px h-1 bg-gradient-to-r from-teal-500/80 to-emerald-500/80 rounded-t-xl" />
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-teal-700/80">Classes</p>
                <h3 className="mt-2 text-3xl font-bold text-slate-900">{stats.totalClasses}</h3>
                <div className="mt-2 text-sm"><span className="text-sky-600 font-semibold">Active</span><span className="text-slate-500 ml-1">this semester</span></div>
              </div>
              <div className="rounded-lg bg-teal-50 p-3 ring-1 ring-teal-100">
                <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16M9 7h1m-1 4h1m4-4h1m-1 4h1"/></svg>
              </div>
            </div>
          </div>
        </div>
        {/* Active Exams */}
        <div className="group relative rounded-xl border border-emerald-100 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
          <div className="absolute inset-x-0 -top-px h-1 bg-gradient-to-r from-amber-500/80 to-emerald-500/80 rounded-t-xl" />
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-amber-700/80">Active Exams</p>
                <h3 className="mt-2 text-3xl font-bold text-slate-900">{stats.activeExams}</h3>
                <div className="mt-2 text-sm text-slate-500">{stats.examsEndingThisWeek} ending this week</div>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 ring-1 ring-amber-100">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile summary */}
      <div className="sm:hidden space-y-4">
        <div className="bg-white/90 backdrop-blur-sm shadow rounded-xl p-4 border border-emerald-200/60">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-slate-900">School Totals</h3>
            <div className="flex items-center space-x-1 text-xs text-slate-500">
              <span className="w-2 h-2 bg-lime-500 rounded-full animate-pulse"></span>
              <span>Live</span>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-200">
            <div className="px-2 text-center">
              <div className="text-2xl font-bold text-slate-900">{stats.totalStudents}</div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 mt-1">Students</div>
              <div className="text-xs text-emerald-600 mt-1 font-medium">+{stats.newStudentsThisMonth}</div>
            </div>
            <div className="px-2 text-center">
              <div className="text-2xl font-bold text-slate-900">{stats.totalTeachers}</div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 mt-1">Teachers</div>
              <div className="text-xs text-emerald-600 mt-1 font-medium">+{stats.newTeachersThisMonth}</div>
            </div>
            <div className="px-2 text-center">
              <div className="text-2xl font-bold text-slate-900">{stats.totalClasses}</div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 mt-1">Classes</div>
              <div className="text-xs text-sky-600 mt-1 font-medium">Active</div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Today */}
      <div className="bg-white/90 backdrop-blur-sm shadow rounded-2xl p-6 border border-emerald-200/60">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Attendance Today</h3>
          <span className="text-sm text-slate-500">School‑wide</span>
        </div>
        <div className="flex items-center gap-6">
          <AttendanceDonut percent={stats.attendanceTodayPercent} size={120} />
          <div>
            <p className="text-sm text-slate-600">Percentage of present students today</p>
            <p className="text-xs text-slate-500 mt-1">Updated in real time</p>
          </div>
        </div>
      </div>

      {/* Pending Exam Reviews */}
      <div className="rounded-2xl border border-amber-200/60 bg-white/90 backdrop-blur-sm shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-medium ring-1 ring-amber-200">Pending</span>
            <h3 className="text-lg font-semibold text-slate-900">Exam Reviews</h3>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin-review')}
            className="inline-flex items-center text-sm font-medium text-amber-700 hover:text-amber-800"
          >
            Grade Results
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
        <p className="text-sm text-slate-700">Total pending: <span className={stats.pendingReviewCount > 0 ? 'text-rose-600 font-semibold' : 'text-slate-700 font-semibold'}>{stats.pendingReviewCount}</span></p>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-slate-200/60 bg-white/90 backdrop-blur-sm shadow p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => handleQuickAction('add-student')}
            className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 transition-all ring-1 ring-emerald-100"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-white p-2 ring-1 ring-emerald-100">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v12m6-6H6"/></svg>
              </div>
              <span className="text-sm font-medium text-slate-800">Add Student</span>
            </div>
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
          </button>

          <button
            onClick={() => handleQuickAction('add-teacher')}
            className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-sky-50 to-emerald-50 hover:from-sky-100 hover:to-emerald-100 transition-all ring-1 ring-sky-100"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-white p-2 ring-1 ring-sky-100">
                <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              </div>
              <span className="text-sm font-medium text-slate-800">Add Teacher</span>
            </div>
            <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Overview;