import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { reportService } from '../../services/supabase/reportService';
import { supabase } from '../../lib/supabaseClient';

const AdminStudentReports = () => {
  const { user } = useAuth();
  
  // Data states
  const [reports, setReports] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    academicYear: new Date().getFullYear().toString(),
    term: '',
    subjectId: '',
    teacherId: '',
    classId: '',
    status: 'submitted'
  });
  
  // Modal states
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [filters]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Fetch reference data
      const [subjectsRes, classesRes, teachersRes, studentsRes] = await Promise.all([
        supabase.from('subjects').select('id, name').order('name'),
        supabase.from('classes').select('id, name, level, category').order('name'),
        supabase.from('user_profiles').select('id, full_name, email').eq('role', 'teacher').order('full_name'),
        supabase.from('user_profiles').select('id, full_name, admission_number, class_id').eq('role', 'student').order('full_name')
      ]);

      setSubjects(subjectsRes.data || []);
      setClasses(classesRes.data || []);
      setTeachers(teachersRes.data || []);
      setStudents(studentsRes.data || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await reportService.getAllReports(filters);
      const reportsData = res?.success ? (res.data || []) : [];
      setReports(reportsData);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setReports([]);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      academicYear: new Date().getFullYear().toString(),
      term: '',
      subjectId: '',
      teacherId: '',
      classId: '',
      status: 'submitted'
    });
  };

  const handleUpdateReportStatus = async (reportId, newStatus, admin_notes = '') => {
    try {
      setUpdating(true);
      const res = await reportService.updateReportStatus(reportId, newStatus, admin_notes);
      
      if (res?.success) {
        // Update local state
        setReports(prev => prev.map(report => 
          report.id === reportId 
            ? { ...report, status: newStatus, admin_notes, reviewed_at: new Date().toISOString() }
            : report
        ));
        alert(`Report ${newStatus} successfully!`);
      } else {
        alert(res?.error || 'Failed to update report status');
      }
    } catch (error) {
      console.error('Error updating report status:', error);
      alert('Error updating report status');
    } finally {
      setUpdating(false);
    }
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setShowReportModal(true);
  };

  const getTeacherName = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher?.full_name || 'Unknown Teacher';
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student?.full_name || 'Unknown Student';
  };

  const getStudentAdmissionNumber = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student?.admission_number || 'N/A';
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || 'Unknown Subject';
  };

  const getClassName = (classId) => {
    const classData = classes.find(c => c.id === classId);
    return classData?.name || 'Unknown Class';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'resubmitted': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return [current, current - 1, current - 2, current - 3];
  }, []);

  const exportCSV = () => {
    const headers = [
      'Student Name',
      'Admission Number',
      'Teacher',
      'Subject',
      'Class',
      'Term',
      'Academic Year',
      'Total Assignments',
      'Submitted Assignments',
      'Average Score',
      'Status',
      'Teacher Remark',
      'Admin Notes',
      'Submitted At',
      'Reviewed At'
    ];

    const rows = reports.map(report => [
      getStudentName(report.student_id),
      getStudentAdmissionNumber(report.student_id),
      getTeacherName(report.teacher_id),
      getSubjectName(report.subject_id),
      getClassName(report.class_id),
      report.term || '',
      report.academic_year || '',
      report.total_assignments || 0,
      report.submitted_assignments || 0,
      report.average_score || 0,
      report.status || '',
      report.teacher_remark || '',
      report.admin_notes || '',
      report.created_at ? new Date(report.created_at).toLocaleString() : '',
      report.reviewed_at ? new Date(report.reviewed_at).toLocaleString() : ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student_reports_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
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
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">Student Reports</h1>
          <p className="text-slate-600 mt-1">Review and manage teacher-submitted student progress reports</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportCSV} 
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
          <div className="text-2xl font-bold text-slate-800">{reports.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <div className="text-sm text-slate-600">Submitted</div>
          <div className="text-2xl font-bold text-yellow-600">
            {reports.filter(r => r.status === 'submitted').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <div className="text-sm text-slate-600">Approved</div>
          <div className="text-2xl font-bold text-green-600">
            {reports.filter(r => r.status === 'approved').length}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Academic Year</label>
            <select
              value={filters.academicYear}
              onChange={(e) => handleFilterChange('academicYear', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Years</option>
              {years.map(year => (
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
              value={filters.subjectId}
              onChange={(e) => handleFilterChange('subjectId', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Teacher</label>
            <select
              value={filters.teacherId}
              onChange={(e) => handleFilterChange('teacherId', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Teachers</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Class</label>
            <select
              value={filters.classId}
              onChange={(e) => handleFilterChange('classId', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Classes</option>
              {classes.map(classData => (
                <option key={classData.id} value={classData.id}>{classData.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="resubmitted">Resubmitted</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg shadow-md border border-slate-200">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">
              Student Reports ({reports.length})
            </h3>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Teacher-submitted progress reports for admin review and approval
          </p>
        </div>

        <div className="overflow-x-auto">
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-slate-800 mb-2">No Reports Found</h3>
              <p className="text-slate-600">No student reports match the selected filters.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Teacher</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Term/Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Performance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {getStudentName(report.student_id)}
                      </div>
                      <div className="text-sm text-slate-500">
                        ADM: {getStudentAdmissionNumber(report.student_id)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {getTeacherName(report.teacher_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {getSubjectName(report.subject_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {getClassName(report.class_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      Term {report.term} / {report.academic_year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">
                        {report.submitted_assignments || 0}/{report.total_assignments || 0} assignments
                      </div>
                      <div className="text-sm text-slate-500">
                        Avg: {report.average_score || 0}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                        {report.status || 'draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleViewReport(report)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                      {report.status === 'submitted' && (
                        <>
                          <button
                            onClick={() => handleUpdateReportStatus(report.id, 'approved')}
                            disabled={updating}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Reason for rejection (optional):');
                              if (reason !== null) {
                                handleUpdateReportStatus(report.id, 'rejected', reason);
                              }
                            }}
                            disabled={updating}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {report.status === 'resubmitted' && (
                        <>
                          <button
                            onClick={() => handleUpdateReportStatus(report.id, 'approved')}
                            disabled={updating}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Reason for rejection (optional):');
                              if (reason !== null) {
                                handleUpdateReportStatus(report.id, 'rejected', reason);
                              }
                            }}
                            disabled={updating}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Report Detail Modal */}
      {showReportModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="bg-slate-800 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Student Report Details</h3>
                  <p className="text-green-100">
                    {getStudentName(selectedReport.student_id)} - {getSubjectName(selectedReport.subject_id)}
                  </p>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-white hover:text-green-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div>
                  <h4 className="text-lg font-semibold text-slate-800 mb-3">Basic Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Student:</span>
                      <span className="font-medium">{getStudentName(selectedReport.student_id)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Admission Number:</span>
                      <span className="font-medium">{getStudentAdmissionNumber(selectedReport.student_id)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Teacher:</span>
                      <span className="font-medium">{getTeacherName(selectedReport.teacher_id)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Subject:</span>
                      <span className="font-medium">{getSubjectName(selectedReport.subject_id)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Class:</span>
                      <span className="font-medium">{getClassName(selectedReport.class_id)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Term:</span>
                      <span className="font-medium">Term {selectedReport.term}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Academic Year:</span>
                      <span className="font-medium">{selectedReport.academic_year}</span>
                    </div>
                  </div>
                </div>

                {/* Performance Summary */}
                <div>
                  <h4 className="text-lg font-semibold text-slate-800 mb-3">Performance Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Assignments:</span>
                      <span className="font-medium">{selectedReport.total_assignments || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Submitted Assignments:</span>
                      <span className="font-medium">{selectedReport.submitted_assignments || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Average Score:</span>
                      <span className="font-medium">{selectedReport.average_score || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedReport.status)}`}>
                        {selectedReport.status || 'draft'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Teacher Remarks */}
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-slate-800 mb-3">Teacher Remarks</h4>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-slate-800">
                    {selectedReport.teacher_remark || 'No remarks provided.'}
                  </p>
                </div>
              </div>

              {/* Admin Notes */}
              {selectedReport.admin_notes && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-slate-800 mb-3">Admin Notes</h4>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-slate-800">{selectedReport.admin_notes}</p>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-slate-800 mb-3">Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Submitted:</span>
                    <span>{selectedReport.created_at ? new Date(selectedReport.created_at).toLocaleString() : 'N/A'}</span>
                  </div>
                  {selectedReport.reviewed_at && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Reviewed:</span>
                      <span>{new Date(selectedReport.reviewed_at).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedReport.updated_at && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Last Updated:</span>
                      <span>{new Date(selectedReport.updated_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {selectedReport.status === 'submitted' || selectedReport.status === 'resubmitted' ? (
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => {
                      handleUpdateReportStatus(selectedReport.id, 'approved');
                      setShowReportModal(false);
                    }}
                    disabled={updating}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                  >
                    Approve Report
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Reason for rejection (optional):');
                      if (reason !== null) {
                        handleUpdateReportStatus(selectedReport.id, 'rejected', reason);
                        setShowReportModal(false);
                      }
                    }}
                    disabled={updating}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                  >
                    Reject Report
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudentReports;