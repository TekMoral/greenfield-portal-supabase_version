import React, { useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { useReportsData } from "../../../hooks/useReportsData";
import { useReportSubmission } from "../../../hooks/useReportSubmission";
import ReportFilters from "../../../components/reports/ReportFilters";
import StudentSelection from "../../../components/reports/StudentSelection";
import StudentReportModal from "../../../components/reports/StudentReportModal";
import BulkSubmitModal from "../../../components/reports/BulkSubmitModal";

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
        </div>
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