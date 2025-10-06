import React, { useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { useReportsData } from "../../../hooks/useReportsData";
import { useReportSubmission } from "../../../hooks/useReportSubmission";
import ReportFilters from "../../../components/reports/ReportFilters";
import StudentSelection from "../../../components/reports/StudentSelection";
import StudentReportModal from "../../../components/reports/StudentReportModal";
import BulkSubmitModal from "../../../components/reports/BulkSubmitModal";
import { reportService } from "../../../services/supabase/reportService";
import { supabase } from "../../../lib/supabaseClient";
import { useSearchParams } from "react-router-dom";
import { studentService } from "../../../services/supabase/studentService";
import useToast from '../../../hooks/useToast';
import { useSettings } from "../../../contexts/SettingsContext";
import { formatSessionBadge } from "../../../utils/sessionUtils";

const Reports = () => {
  const { user } = useAuth();
  const {
    // State
    classes,
    selectedClass,
    selectedSubject,
    students,
    selectedStudent,
    attendanceData,
    assignmentSubmissions,
    remarks,
    editingRemarks,
    savingRemarks,
    selectedTerm,
    selectedAcademicYear,
    loading,
    loadingStudents,
    loadingReport,
    reportStatus,
    adminNotes,
    reviewedAt,

    // Setters
    setSelectedClass,
    setSelectedSubject,
    setRemarks,
    setEditingRemarks,
    setSelectedTerm,
    setSelectedAcademicYear,

    // Functions
    getAvailableSubjects,
    fetchAttendanceData,
    fetchAssignmentSubmissions,
    fetchRemarks,
    saveRemarks,
    loadStudentReportData,
    clearReportData
  } = useReportsData(user);

  const {
    submittingReport,
    submittingBulkReports,
    submitReportToAdmin,
    submitBulkReportsToAdmin
  } = useReportSubmission();

  // Modal states
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBulkSubmitModal, setShowBulkSubmitModal] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overview, setOverview] = useState({
    totalStudents: 0,
    draft: 0,
    submitted: 0,
    resubmitted: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    lastUpdated: null,
  });
  const [rejectedLoading, setRejectedLoading] = useState(false);
  const [didAutoJump, setDidAutoJump] = useState(false);
  const [searchParams] = useSearchParams();
  const [rejectedReports, setRejectedReports] = useState([]);
  const [rejectedIndex, setRejectedIndex] = useState(0);
  const { showToast } = useToast();
  const { academicYear: settingsYear, currentTerm } = useSettings();

  // Event handlers
  const handleClassChange = (classId) => {
    setSelectedClass(classId);
    setSelectedSubject("");
    clearReportData();
  };

  const handleSubjectChange = (subject) => {
    setSelectedSubject(subject);
    clearReportData();
  };

  const handleStudentSelect = async (student) => {
    await loadStudentReportData(student);
    setShowReportModal(true);
  };

  const handleCloseReportModal = () => {
    setShowReportModal(false);
    clearReportData();
  };

  const handleSubmitReport = async () => {
    const success = await submitReportToAdmin({
      selectedStudent,
      selectedSubject,
      selectedClass,
      selectedTerm,
      selectedAcademicYear,
      attendanceData,
      assignmentSubmissions,
      remarks,
      classes,
      user
    });

    if (success) {
      handleCloseReportModal();
    }
  };

  const handleSubmitBulkReports = async () => {
    const success = await submitBulkReportsToAdmin({
      selectedClass,
      selectedSubject,
      selectedTerm,
      selectedAcademicYear,
      students,
      classes,
      user,
      fetchAttendanceData,
      fetchAssignmentSubmissions,
      fetchRemarks
    });

    if (success) {
      setShowBulkSubmitModal(false);
    }
  };

  // Quickly open a rejected report by resolving subject/class and loading the student's data
  const resolveSubjectNameById = async (subjectId) => {
    if (!subjectId) return '';
    try {
      const subjects = getAvailableSubjects() || [];
      const match = subjects.find(s => s.subjectId === subjectId);
      if (match) return match.subjectName;
    } catch (_) {}
    try {
      const { data } = await supabase
        .from('subjects')
        .select('name')
        .eq('id', subjectId)
        .limit(1)
        .single();
      return data?.name || '';
    } catch (_) {
      return '';
    }
  };

  const openRejectedReport = async (row) => {
    if (!row) return;
    // Normalize keys across snake/camel cases
    const subjectId = row.subject_id || row.subjectId || null;
    const classId = row.class_id || row.classId || '';
    const studentId = row.student_id || row.studentId;
    const term = row.term ?? selectedTerm;
    const academicYear = String(row.academic_year || row.academicYear || selectedAcademicYear);

    const subjectName = await resolveSubjectNameById(subjectId);
    if (subjectName) setSelectedSubject(subjectName);
    if (classId) setSelectedClass(classId);
    if (term != null) setSelectedTerm(term);
    if (academicYear) setSelectedAcademicYear(academicYear);

    // Enrich student identity from profiles for proper modal display
    let profile = null;
    try {
      const res = await studentService.getStudentById(studentId);
      profile = res?.success ? (res.data || null) : null;
    } catch (_) {
      profile = null;
    }

    const derivedClassName = classes.find(c => c.id === (classId || selectedClass))?.name || profile?.classes?.name || '';
    const fullName = profile?.full_name || [profile?.first_name, profile?.surname].filter(Boolean).join(' ') || '';

    const student = {
      id: studentId,
      name: fullName || row.student_name || row.name || '',
      firstName: profile?.first_name || row.student_first_name || row.firstName || '',
      surname: profile?.surname || row.student_last_name || row.surname || '',
      lastName: row.lastName || row.student_last_name || profile?.surname || '', // backward compatibility
      admissionNumber: profile?.admission_number || row.admission_number || row.studentAdmissionNumber || '',
      className: derivedClassName,
    };

    // Load report data and open modal
    await loadStudentReportData(student);
    setShowReportModal(true);
  };

  // Maintain a list of rejected reports and navigate through them
  const fetchRejectedReports = async () => {
    const res = await reportService.getAllReports({
      teacherId: user.id || user.uid,
      status: 'rejected',
    });
    const rows = res?.success ? (res.data || []) : [];
    setRejectedReports(rows);
    return rows;
  };

  const openRejectedAt = async (index) => {
    if (!rejectedReports || index < 0 || index >= rejectedReports.length) return;
    setRejectedIndex(index);
    await openRejectedReport(rejectedReports[index]);
  };

  const nextRejected = async () => {
    if (rejectedReports.length === 0) return;
    const next = Math.min(rejectedReports.length - 1, rejectedIndex + 1);
    if (next !== rejectedIndex) {
      await openRejectedAt(next);
    }
  };

  const prevRejected = async () => {
    if (rejectedReports.length === 0) return;
    const prev = Math.max(0, rejectedIndex - 1);
    if (prev !== rejectedIndex) {
      await openRejectedAt(prev);
    }
  };

  const openFirstRejected = async () => {
    if (!user?.id) return;
    setRejectedLoading(true);
    try {
      let rows = rejectedReports;
      if (!rows || rows.length === 0) {
        rows = await fetchRejectedReports();
      }
      if (!rows || rows.length === 0) {
        showToast('No rejected reports found.', 'success');
        return;
      }
      await openRejectedAt(0);
    } catch (e) {
      console.error('Failed to open first rejected report:', e);
      showToast('Unable to open a rejected report. Please try again.', 'error');
    } finally {
      setRejectedLoading(false);
    }
  };

  // Overview: compute live status counts for current subject/term/year
  React.useEffect(() => {
    const loadOverview = async () => {
      try {
        setOverviewLoading(true);
        // If no context yet, just reflect student count
        if (!user?.id || !selectedSubject) {
          setOverview((prev) => ({
            ...prev,
            totalStudents: students.length,
            draft: 0,
            submitted: 0,
            resubmitted: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
            lastUpdated: new Date().toISOString(),
          }));
          return;
        }
        // Resolve subject_id once
        let subjectId = null;
        try {
          const { data: subjRow } = await supabase
            .from('subjects')
            .select('id')
            .eq('name', selectedSubject)
            .limit(1)
            .single();
          subjectId = subjRow?.id || null;
        } catch (_) {
          subjectId = null;
        }

        const filters = {
          teacherId: user.id || user.uid,
          term: selectedTerm,
          academicYear: String(selectedAcademicYear),
        };
        if (subjectId) filters.subjectId = subjectId;

        const res = await reportService.getAllReports(filters);
        const rows = res?.success ? (res.data || []) : [];

        const counts = {
          draft: 0,
          submitted: 0,
          resubmitted: 0,
          approved: 0,
          rejected: 0,
        };
        rows.forEach(r => {
          const s = r.status || 'draft';
          if (counts[s] != null) counts[s] += 1;
        });
        const pending = counts.submitted + counts.resubmitted;
        setOverview({
          totalStudents: students.length,
          ...counts,
          pending,
          lastUpdated: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Error loading report overview:', e);
        setOverview(prev => ({ ...prev, totalStudents: students.length, lastUpdated: new Date().toISOString() }));
      } finally {
        setOverviewLoading(false);
      }
    };
    loadOverview();
  }, [user?.id, selectedSubject, selectedTerm, selectedAcademicYear, students.length]);

  // Auto-jump to first rejected report when query parameter is present
  React.useEffect(() => {
    if (didAutoJump) return;
    const flag = searchParams.get('rejected');
    if (user?.id && (flag === '1' || flag === 'true')) {
      openFirstRejected().finally(() => setDidAutoJump(true));
    }
  }, [user?.id, searchParams, didAutoJump]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-10 bg-slate-200 rounded"></div>
          <div className="h-10 bg-slate-200 rounded"></div>
          <div className="h-10 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800">Student Progress Reports</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">View attendance, assignment submissions, and add remarks</p>
          <div className="text-xs sm:text-sm text-slate-500 mt-1">{formatSessionBadge(settingsYear, currentTerm)}</div>
        </div>
      </div>

      {/* Overview */}
      <div className="space-y-3">
        {overview.rejected > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
            <div>
              {overview.rejected} report{overview.rejected === 1 ? '' : 's'} require your attention (rejected)
            </div>
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
              <button
                onClick={openFirstRejected}
                disabled={rejectedLoading}
                className={`px-4 py-2 rounded-md text-white transition-colors text-sm ${rejectedLoading ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {rejectedLoading ? 'Opening…' : (rejectedReports.length > 0 ? 'Open first' : 'Load & open')}
              </button>
              {rejectedReports.length > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={prevRejected}
                    disabled={rejectedIndex <= 0}
                    className="px-3 py-2 rounded-md bg-red-100 text-red-800 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm">{rejectedIndex + 1} of {rejectedReports.length}</span>
                  <button
                    onClick={nextRejected}
                    disabled={rejectedIndex >= rejectedReports.length - 1}
                    className="px-3 py-2 rounded-md bg-red-100 text-red-800 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4 border border-slate-200">
            <div className="text-sm text-slate-600">Total Students</div>
            <div className="text-2xl font-bold text-slate-800">{overview.totalStudents}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border border-slate-200">
            <div className="text-sm text-slate-600">Pending Review</div>
            <div className="text-2xl font-bold text-yellow-600">{overview.pending}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border border-slate-200">
            <div className="text-sm text-slate-600">Approved</div>
            <div className="text-2xl font-bold text-green-600">{overview.approved}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border border-slate-200">
            <div className="text-sm text-slate-600">Rejected</div>
            <div className="text-2xl font-bold text-red-600">{overview.rejected}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border border-slate-200">
            <div className="text-sm text-slate-600">Resubmitted</div>
            <div className="text-2xl font-bold text-indigo-600">{overview.resubmitted}</div>
          </div>
        </div>
        <div className="text-xs text-slate-500">{overviewLoading ? 'Refreshing overview…' : (overview.lastUpdated ? `Last updated ${new Date(overview.lastUpdated).toLocaleTimeString()}` : '')}</div>
      </div>

      {/* Report Filters */}
      <ReportFilters
        classes={classes}
        selectedClass={selectedClass}
        selectedSubject={selectedSubject}
        selectedAcademicYear={selectedAcademicYear}
        selectedTerm={selectedTerm}
        selectedStudent={selectedStudent}
        students={students}
        getAvailableSubjects={getAvailableSubjects}
        onClassChange={handleClassChange}
        onSubjectChange={handleSubjectChange}
        onAcademicYearChange={setSelectedAcademicYear}
        onTermChange={setSelectedTerm}
        onBulkSubmitClick={() => setShowBulkSubmitModal(true)}
      />

      {/* Student Selection */}
      <StudentSelection
        selectedClass={selectedClass}
        selectedSubject={selectedSubject}
        students={students}
        loadingStudents={loadingStudents}
        onStudentSelect={handleStudentSelect}
        term={selectedTerm}
        academicYear={selectedAcademicYear}
      />

      {/* Empty State */}
      {classes.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-12 sm:w-16 h-12 sm:h-16 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-base sm:text-lg font-medium text-slate-800 mb-2">No Classes Found</h3>
          <p className="text-sm sm:text-base text-slate-600">You haven't been assigned to any classes yet. Contact your administrator to get started.</p>
        </div>
      )}

      {/* Student Report Modal */}
      <StudentReportModal
        showReportModal={showReportModal}
        selectedStudent={selectedStudent}
        selectedSubject={selectedSubject}
        selectedClass={selectedClass}
        selectedTerm={selectedTerm}
        selectedAcademicYear={selectedAcademicYear}
        classes={classes}
        loadingReport={loadingReport}
        attendanceData={attendanceData}
        assignmentSubmissions={assignmentSubmissions}
        remarks={remarks}
        editingRemarks={editingRemarks}
        savingRemarks={savingRemarks}
        onClose={handleCloseReportModal}
        onRemarksChange={setRemarks}
        onEditingRemarksChange={setEditingRemarks}
        onSaveRemarks={saveRemarks}
        onSubmitReport={handleSubmitReport}
        submittingReport={submittingReport}
        reportStatus={reportStatus}
        adminNotes={adminNotes}
        reviewedAt={reviewedAt}
      />

      {/* Bulk Submit Modal */}
      <BulkSubmitModal
        showBulkSubmitModal={showBulkSubmitModal}
        students={students}
        selectedSubject={selectedSubject}
        selectedTerm={selectedTerm}
        selectedAcademicYear={selectedAcademicYear}
        classes={classes}
        selectedClass={selectedClass}
        submittingBulkReports={submittingBulkReports}
        onClose={() => setShowBulkSubmitModal(false)}
        onSubmitBulkReports={handleSubmitBulkReports}
      />
    </div>
  );
};

export default Reports;