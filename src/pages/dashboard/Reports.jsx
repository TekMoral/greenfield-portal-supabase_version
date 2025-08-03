import React, { useEffect, useState } from "react";
import {
  getAllReports,
  getAcademicYears,
  getReportSubjects,
  getReportClasses,
  updateReportStatus,
  deleteReport
} from "../../services/supabase/reportService";
import { getInitials } from "../../utils/nameUtils";

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    academicYear: '',
    term: '',
    subjectName: '',
    className: '',
    studentName: '',
    teacherName: '',
    status: ''
  });

  // Data for filter dropdowns
  const [academicYears, setAcademicYears] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [reportsPerPage] = useState(10);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [reports, filters]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [
        reportsData,
        yearsData,
        subjectsData,
        classesData
      ] = await Promise.all([
        getAllReports(),
        getAcademicYears(),
        getReportSubjects(),
        getReportClasses()
      ]);

      setReports(reportsData);
      setAcademicYears(yearsData);
      setSubjects(subjectsData);
      setClasses(classesData);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reports];

    // Apply filters
    if (filters.academicYear) {
      filtered = filtered.filter(report => report.academicYear === parseInt(filters.academicYear));
    }
    if (filters.term) {
      filtered = filtered.filter(report => report.term === parseInt(filters.term));
    }
    if (filters.subjectName) {
      filtered = filtered.filter(report => report.subjectName === filters.subjectName);
    }
    if (filters.className) {
      filtered = filtered.filter(report => report.className === filters.className);
    }
    if (filters.studentName) {
      filtered = filtered.filter(report =>
        report.studentName.toLowerCase().includes(filters.studentName.toLowerCase())
      );
    }
    if (filters.teacherName) {
      filtered = filtered.filter(report =>
        report.teacherName.toLowerCase().includes(filters.teacherName.toLowerCase())
      );
    }
    if (filters.status) {
      filtered = filtered.filter(report => report.status === filters.status);
    }

    setFilteredReports(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      academicYear: '',
      term: '',
      subjectName: '',
      className: '',
      studentName: '',
      teacherName: '',
      status: ''
    });
  };

  const handleReportStatusUpdate = async (reportId, status, adminNotes = '') => {
    try {
      // Show confirmation dialog for rejection
      if (status === 'rejected') {
        const reason = prompt('Please provide a reason for rejection (this will be visible to the teacher):');
        if (reason === null) return; // User cancelled
        adminNotes = reason || 'No specific reason provided';
      }

      console.log('Updating report status:', { reportId, status, adminNotes });

      // The updateReportStatus function in reportService.js will handle notification creation
      await updateReportStatus(reportId, status, adminNotes);

      // Update local state
      setReports(prev => prev.map(report =>
        report.id === reportId
          ? { ...report, status, adminNotes, reviewedAt: new Date() }
          : report
      ));

      const statusText = status === 'reviewed' ? 'approved' : status;
      alert(`Report ${statusText} successfully. The teacher will be notified.`);
    } catch (error) {
      console.error('Error updating report status:', error);
      alert('Error updating report status');
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      await deleteReport(reportId);
      setReports(prev => prev.filter(report => report.id !== reportId));
      alert('Report deleted successfully');
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Error deleting report');
    }
  };

  const exportReports = () => {
    const csvContent = [
      // CSV Headers
      [
        'Student Name',
        'Admission Number',
        'Class',
        'Subject',
        'Teacher',
        'Academic Year',
        'Term',
        'Attendance Rate',
        'Average Score',
        'Status',
        'Submitted Date',
        'Remarks'
      ].join(','),
      // CSV Data
      ...filteredReports.map(report => [
        `"${report.studentName}"`,
        `"${report.studentAdmissionNumber}"`,
        `"${report.className}"`,
        `"${report.subjectName}"`,
        `"${report.teacherName}"`,
        report.academicYear,
        report.term,
        `${report.attendanceRate || 0}%`,
        `${report.averageScore || 0}%`,
        `"${report.status}"`,
        `"${report.submittedAt?.toLocaleDateString() || ''}"`,
        `"${(report.remarks || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student_reports_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Pagination logic
  const indexOfLastReport = currentPage * reportsPerPage;
  const indexOfFirstReport = indexOfLastReport - reportsPerPage;
  const currentReports = filteredReports.slice(indexOfFirstReport, indexOfLastReport);
  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'reviewed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTermName = (term) => {
    switch (term) {
      case 1: return '1st Term';
      case 2: return '2nd Term';
      case 3: return '3rd Term';
      default: return `Term ${term}`;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-200 rounded"></div>
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">
            Student Reports
          </h1>
          <p className="text-slate-600 mt-1">
            View and manage student progress reports from teachers
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportReports}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <div className="text-sm text-slate-600">Total Reports</div>
          <div className="text-2xl font-bold text-slate-800">
            {reports.length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <div className="text-sm text-slate-600">Pending Review</div>
          <div className="text-2xl font-bold text-blue-600">
            {reports.filter((r) => r.status === "submitted").length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <div className="text-sm text-slate-600">Reviewed</div>
          <div className="text-2xl font-bold text-green-600">
            {reports.filter((r) => r.status === "reviewed").length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <div className="text-sm text-slate-600">This Term</div>
          <div className="text-2xl font-bold text-purple-600">
            {
              reports.filter(
                (r) => r.term === Math.ceil(new Date().getMonth() / 4) + 1
              ).length
            }
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Filters</h2>
          <button
            onClick={clearFilters}
            className="text-sm text-slate-600 hover:text-slate-800 underline"
          >
            Clear All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Academic Year
            </label>
            <select
              value={filters.academicYear}
              onChange={(e) =>
                handleFilterChange("academicYear", e.target.value)
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Years</option>
              {academicYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Term
            </label>
            <select
              value={filters.term}
              onChange={(e) => handleFilterChange("term", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Terms</option>
              <option value="1">1st Term</option>
              <option value="2">2nd Term</option>
              <option value="3">3rd Term</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Subject
            </label>
            <select
              value={filters.subjectName}
              onChange={(e) =>
                handleFilterChange("subjectName", e.target.value)
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Class
            </label>
            <select
              value={filters.className}
              onChange={(e) => handleFilterChange("className", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Classes</option>
              {classes.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Student Name
            </label>
            <input
              type="text"
              value={filters.studentName}
              onChange={(e) =>
                handleFilterChange("studentName", e.target.value)
              }
              placeholder="Search student..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Teacher Name
            </label>
            <input
              type="text"
              value={filters.teacherName}
              onChange={(e) =>
                handleFilterChange("teacherName", e.target.value)
              }
              placeholder="Search teacher..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg shadow-md border border-slate-200">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">
            Reports ({filteredReports.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Teacher
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Term/Year
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {currentReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-semibold text-sm">
                          {getInitials({
                            firstName: report.studentName.split(" ")[0],
                            lastName: report.studentName.split(" ")[1] || "",
                          })}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-slate-900">
                          {report.studentName}
                        </div>
                        <div className="text-sm text-slate-500">
                          {report.studentAdmissionNumber}
                        </div>
                        <div className="text-sm text-slate-500">
                          {report.className}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">
                      {report.subjectName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">
                      {report.teacherName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">
                      {getTermName(report.term)}
                    </div>
                    <div className="text-sm text-slate-500">
                      {report.academicYear}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">
                      Attendance: {report.attendanceRate || 0}%
                    </div>
                    <div className="text-sm text-slate-500">
                      Average: {report.averageScore || 0}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        report.status
                      )}`}
                    >
                      {report.status.charAt(0).toUpperCase() +
                        report.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => {
                        setSelectedReport(report);
                        setShowReportModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </button>
                    {["submitted", "resubmitted"].includes(report.status) && (
                      <>
                        <button
                          onClick={() =>
                            handleReportStatusUpdate(report.id, "reviewed")
                          }
                          className="text-green-600 hover:text-green-900"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            handleReportStatusUpdate(report.id, "rejected")
                          }
                          className="text-red-600 hover:text-red-900"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDeleteReport(report.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-700">
                Showing {indexOfFirstReport + 1} to{" "}
                {Math.min(indexOfLastReport, filteredReports.length)} of{" "}
                {filteredReports.length} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                >
                  Previous
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1 border rounded text-sm ${
                      currentPage === i + 1
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredReports.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto text-slate-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-lg font-medium text-slate-800 mb-2">
              No Reports Found
            </h3>
            <p className="text-slate-600">
              No student reports match your current filters.
            </p>
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {showReportModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[95vh] overflow-hidden">
            <div className="bg-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">
                    {selectedReport.studentName} - {selectedReport.subjectName}
                  </h3>
                  <p className="text-blue-100">
                    {getTermName(selectedReport.term)}{" "}
                    {selectedReport.academicYear} | {selectedReport.className}
                  </p>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-white hover:text-blue-200 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Student Info */}
                <div>
                  <h4 className="text-lg font-semibold text-slate-800 mb-3">
                    Student Information
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Name:</span>
                      <span className="font-medium">
                        {selectedReport.studentName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Admission Number:</span>
                      <span className="font-medium">
                        {selectedReport.studentAdmissionNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Class:</span>
                      <span className="font-medium">
                        {selectedReport.className}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Subject:</span>
                      <span className="font-medium">
                        {selectedReport.subjectName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Report Info */}
                <div>
                  <h4 className="text-lg font-semibold text-slate-800 mb-3">
                    Report Information
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Teacher:</span>
                      <span className="font-medium">
                        {selectedReport.teacherName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Term:</span>
                      <span className="font-medium">
                        {getTermName(selectedReport.term)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Academic Year:</span>
                      <span className="font-medium">
                        {selectedReport.academicYear}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Submitted:</span>
                      <span className="font-medium">
                        {selectedReport.submittedAt?.toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Status:</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          selectedReport.status
                        )}`}
                      >
                        {selectedReport.status.charAt(0).toUpperCase() +
                          selectedReport.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Summary */}
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-slate-800 mb-3">
                  Performance Summary
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="text-sm text-slate-600">
                      Attendance Rate
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {selectedReport.attendanceRate || 0}%
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="text-sm text-slate-600">Average Score</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedReport.averageScore || 0}%
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="text-sm text-slate-600">
                      Total Assignments
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      {selectedReport.totalAssignments || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Data */}
              {selectedReport.attendanceData && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-slate-800 mb-3">
                    Attendance Details
                  </h4>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-sm text-slate-600">Total Days</div>
                        <div className="text-xl font-bold">
                          {selectedReport.attendanceData.totalDays || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600">Present</div>
                        <div className="text-xl font-bold text-green-600">
                          {selectedReport.attendanceData.presentDays || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600">Absent</div>
                        <div className="text-xl font-bold text-red-600">
                          {selectedReport.attendanceData.absentDays || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedReport.assignmentData && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-slate-800 mb-3">
                    Assignment Performance
                  </h4>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-sm text-slate-600">
                          Total Assignments
                        </div>
                        <div className="text-xl font-bold">
                          {selectedReport.assignmentData.total || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600">Submitted</div>
                        <div className="text-xl font-bold text-green-600">
                          {selectedReport.assignmentData.submitted || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600">
                          Average Score
                        </div>
                        <div className="text-xl font-bold text-blue-600">
                          {selectedReport.assignmentData.averageScore || 0}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Teacher Remarks */}
              {selectedReport.remarks && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-slate-800 mb-3">
                    Teacher Remarks
                  </h4>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-slate-700">{selectedReport.remarks}</p>
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              {selectedReport.adminNotes && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-slate-800 mb-3">
                    Admin Notes
                  </h4>
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <p className="text-slate-700">
                      {selectedReport.adminNotes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
