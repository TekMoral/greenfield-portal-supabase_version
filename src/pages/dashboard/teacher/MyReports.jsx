import React, { useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { listenToTeacherReports, updateReportRemarks } from "../../../services/reportService";
import { getInitials } from "../../../utils/nameUtils";

const MyReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [editingRemarks, setEditingRemarks] = useState(false);
  const [remarksText, setRemarksText] = useState('');
  const [submittingRemarks, setSubmittingRemarks] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    academicYear: '',
    term: '',
    subjectName: '',
    className: '',
    studentName: '',
    status: ''
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [reportsPerPage] = useState(10);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    const unsubscribe = listenToTeacherReports(user.uid, (reportsData) => {
      const processedReports = reportsData.map(report => ({
        ...report,
        submittedAt: report.submittedAt?.toDate?.() || report.submittedAt,
        createdAt: report.createdAt?.toDate?.() || report.createdAt,
        updatedAt: report.updatedAt?.toDate?.() || report.updatedAt,
        reviewedAt: report.reviewedAt?.toDate?.() || report.reviewedAt
      }));
      setReports(processedReports);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [reports, filters]);



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
      status: ''
    });
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'submitted':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'reviewed':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'rejected':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
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

  // Get unique values for filter dropdowns
  const getUniqueValues = (key) => {
    const values = new Set(reports.map(report => report[key]).filter(Boolean));
    return Array.from(values).sort();
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
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">My Submitted Reports</h1>
          <p className="text-slate-600 mt-1">Track the status of your submitted student reports</p>
        </div>

      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <div className="text-sm text-slate-600">Total Reports</div>
          <div className="text-2xl font-bold text-slate-800">{reports.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <div className="text-sm text-slate-600">Pending Review</div>
          <div className="text-2xl font-bold text-blue-600">
            {reports.filter(r => r.status === 'submitted').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <div className="text-sm text-slate-600">Approved</div>
          <div className="text-2xl font-bold text-green-600">
            {reports.filter(r => r.status === 'reviewed').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <div className="text-sm text-slate-600">Rejected</div>
          <div className="text-2xl font-bold text-red-600">
            {reports.filter(r => r.status === 'rejected').length}
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Academic Year</label>
            <select
              value={filters.academicYear}
              onChange={(e) => handleFilterChange('academicYear', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Years</option>
              {getUniqueValues('academicYear').map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Term</label>
            <select
              value={filters.term}
              onChange={(e) => handleFilterChange('term', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Terms</option>
              <option value="1">1st Term</option>
              <option value="2">2nd Term</option>
              <option value="3">3rd Term</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
            <select
              value={filters.subjectName}
              onChange={(e) => handleFilterChange('subjectName', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Subjects</option>
              {getUniqueValues('subjectName').map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Class</label>
            <select
              value={filters.className}
              onChange={(e) => handleFilterChange('className', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Classes</option>
              {getUniqueValues('className').map(className => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Student Name</label>
            <input
              type="text"
              value={filters.studentName}
              onChange={(e) => handleFilterChange('studentName', e.target.value)}
              placeholder="Search student..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="submitted">Pending Review</option>
              <option value="reviewed">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg shadow-md border border-slate-200">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">
            My Reports ({filteredReports.length})
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
                  Term/Year
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Submitted
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
                          {getInitials({ firstName: report.studentName.split(' ')[0], lastName: report.studentName.split(' ')[1] || '' })}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-slate-900">{report.studentName}</div>
                        <div className="text-sm text-slate-500">{report.studentAdmissionNumber}</div>
                        <div className="text-sm text-slate-500">{report.className}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{report.subjectName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{getTermName(report.term)}</div>
                    <div className="text-sm text-slate-500">{report.academicYear}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{report.submittedAt?.toLocaleDateString()}</div>
                    <div className="text-sm text-slate-500">{report.submittedAt?.toLocaleTimeString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                        {getStatusIcon(report.status)}
                        {report.status === 'submitted' ? 'Pending Review' : 
                         report.status === 'reviewed' ? 'Approved' : 
                         report.status === 'rejected' ? 'Rejected' : 
                         report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </span>
                    </div>
                    {report.reviewedAt && (
                      <div className="text-xs text-slate-500 mt-1">
                        Reviewed: {report.reviewedAt?.toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setRemarksText(report.remarks || '');
                          setEditingRemarks(false);
                          setShowReportModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                      {report.status === 'rejected' && (
                        <button
                          onClick={() => {
                            setSelectedReport(report);
                            setRemarksText(report.remarks || '');
                            setEditingRemarks(true);
                            setShowReportModal(true);
                          }}
                          className="text-orange-600 hover:text-orange-900 text-sm"
                        >
                          Edit Remarks
                        </button>
                      )}
                    </div>
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
                Showing {indexOfFirstReport + 1} to {Math.min(indexOfLastReport, filteredReports.length)} of {filteredReports.length} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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
            <svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-slate-800 mb-2">No Reports Found</h3>
            <p className="text-slate-600">
              {reports.length === 0 
                ? "You haven't submitted any reports yet." 
                : "No reports match your current filters."}
            </p>
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {showReportModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[95vh] overflow-hidden">
            <div className={`text-white p-6 ${
              selectedReport.status === 'reviewed' ? 'bg-green-600' :
              selectedReport.status === 'rejected' ? 'bg-red-600' :
              'bg-blue-600'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">
                    {selectedReport.studentName} - {selectedReport.subjectName}
                    {selectedReport.status === 'rejected' && editingRemarks && (
                      <span className="text-sm font-normal ml-2">(Editing Remarks)</span>
                    )}
                  </h3>
                  <p className={`${
                    selectedReport.status === 'reviewed' ? 'text-green-100' :
                    selectedReport.status === 'rejected' ? 'text-red-100' :
                    'text-blue-100'
                  }`}>
                    {getTermName(selectedReport.term)} {selectedReport.academicYear} | {selectedReport.className}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setEditingRemarks(false);
                    setRemarksText('');
                  }}
                  className={`text-white hover:opacity-75 transition-opacity`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
              {/* Status Information */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-800 mb-3">Report Status</h4>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-600">Current Status:</span>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedReport.status)}`}>
                      {getStatusIcon(selectedReport.status)}
                      {selectedReport.status === 'submitted' ? 'Pending Review' : 
                       selectedReport.status === 'reviewed' ? 'Approved' : 
                       selectedReport.status === 'rejected' ? 'Rejected' : 
                       selectedReport.status.charAt(0).toUpperCase() + selectedReport.status.slice(1)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Submitted:</span>
                      <div className="font-medium">{selectedReport.submittedAt?.toLocaleString()}</div>
                    </div>
                    {selectedReport.reviewedAt && (
                      <div>
                        <span className="text-slate-600">Reviewed:</span>
                        <div className="font-medium">{selectedReport.reviewedAt?.toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Admin Notes */}
              {selectedReport.adminNotes && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-slate-800 mb-3">Admin Feedback</h4>
                  <div className={`rounded-lg p-4 border ${
                    selectedReport.status === 'rejected' 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <p className="text-slate-700">{selectedReport.adminNotes}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Student Info */}
                <div>
                  <h4 className="text-lg font-semibold text-slate-800 mb-3">Student Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Name:</span>
                      <span className="font-medium">{selectedReport.studentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Admission Number:</span>
                      <span className="font-medium">{selectedReport.studentAdmissionNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Class:</span>
                      <span className="font-medium">{selectedReport.className}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Subject:</span>
                      <span className="font-medium">{selectedReport.subjectName}</span>
                    </div>
                  </div>
                </div>

                {/* Report Info */}
                <div>
                  <h4 className="text-lg font-semibold text-slate-800 mb-3">Report Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Term:</span>
                      <span className="font-medium">{getTermName(selectedReport.term)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Academic Year:</span>
                      <span className="font-medium">{selectedReport.academicYear}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Submitted:</span>
                      <span className="font-medium">{selectedReport.submittedAt?.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Summary */}
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-slate-800 mb-3">Performance Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="text-sm text-slate-600">Attendance Rate</div>
                    <div className="text-2xl font-bold text-green-600">{selectedReport.attendanceRate || 0}%</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="text-sm text-slate-600">Average Score</div>
                    <div className="text-2xl font-bold text-blue-600">{selectedReport.averageScore || 0}%</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="text-sm text-slate-600">Total Assignments</div>
                    <div className="text-2xl font-bold text-purple-600">{selectedReport.totalAssignments || 0}</div>
                  </div>
                </div>
              </div>

              {/* Teacher Remarks */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-slate-800">Your Remarks</h4>
                  {selectedReport.status === 'rejected' && !editingRemarks && (
                    <button
                      onClick={() => {
                        setEditingRemarks(true);
                        setRemarksText(selectedReport.remarks || '');
                      }}
                      className="text-sm bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700"
                    >
                      Edit Remarks
                    </button>
                  )}
                </div>
                
                {editingRemarks ? (
                  <div className="space-y-4">
                    <textarea
                      value={remarksText}
                      onChange={(e) => setRemarksText(e.target.value)}
                      placeholder="Add your remarks about this student's performance..."
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setSubmittingRemarks(true);
                          try {
                            await updateReportRemarks(selectedReport.id, remarksText);
                            setEditingRemarks(false);
                            setShowReportModal(false);
                          } catch (error) {
                            console.error('Error updating remarks:', error);
                            alert('Failed to update remarks. Please try again.');
                          } finally {
                            setSubmittingRemarks(false);
                          }
                        }}
                        disabled={submittingRemarks}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {submittingRemarks ? 'Resubmitting...' : 'Resubmit Report'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingRemarks(false);
                          setRemarksText(selectedReport.remarks || '');
                        }}
                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-slate-700">
                      {selectedReport.remarks || 'No remarks added yet.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyReports;