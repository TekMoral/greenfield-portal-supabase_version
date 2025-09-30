import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  SubjectSelector,
  StudentsFilters,
  StudentsTable,
  StudentsMobileCards,
  StudentDetailsModal,
  AssignmentsModal,
  GradesModal,
  MessageModal,
} from './components/StudentsUI';
import useStudentsData from './hooks/useStudentsData';
import useStudentAcademics from './hooks/useStudentAcademics';
import useStudentMessaging from './hooks/useStudentMessaging';
import ImageModal from '../../../components/common/ImageModal';

const StudentsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlClassName = searchParams.get('className');

  // Data and filtering
  const {
    loading,
    error,
    subjects,
    students,
    filteredStudents,
    selectedSubject,
    setSelectedSubject,
    selectedClass,
    setSelectedClass,
    searchTerm,
    setSearchTerm,
    classOptions,
  } = useStudentsData();

  // Academics (assignments + grades)
  const {
    selectedStudent,
    openStudentDetails,
    closeStudentDetails,
    showAssignmentsModal,
    openAssignmentsModal,
    closeAssignmentsModal,
    loadingAssignments,
    studentAssignments,
    showGradesModal,
    openGradesModal,
    closeGradesModal,
    loadingGrades,
    studentGrades,
    getGradeColor,
  } = useStudentAcademics({ selectedSubject });

  // Messaging
  const {
    showMessageModal,
    openMessageModal,
    closeMessageModal,
    messageForm,
    setMessageForm,
    sending,
    sendMessage,
  } = useStudentMessaging({ selectedSubject, selectedStudent });

  // Image preview state (must be before any returns to preserve hook order)
  const [imageOpen, setImageOpen] = React.useState(false);
  const [imageStudent, setImageStudent] = React.useState(null);
  const openImage = (st) => { setImageStudent(st); setImageOpen(true); };
  const closeImage = () => { setImageOpen(false); setImageStudent(null); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          <span className="text-slate-600 font-medium text-lg">Loading your students...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6 text-center mx-2 sm:mx-0">
        <div className="text-red-600 text-3xl sm:text-4xl mb-3 sm:mb-4">⚠️</div>
        <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-2">Error Loading Students</h2>
        <p className="text-sm sm:text-base text-slate-600 mb-3 sm:mb-4">{error?.message || 'Failed to load your students. Please try again.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-slate-800 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm sm:text-base"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 ml-3 sm:ml-6">
            {urlClassName ? `${decodeURIComponent(urlClassName)} Students` : 'My Students'}
          </h1>
          {urlClassName && (
            <p className="text-sm text-slate-600 mt-1">
              Showing students from {decodeURIComponent(urlClassName)} only
              <button
                onClick={() => navigate('/teacher/students')}
                className="ml-2 text-green-600 hover:text-green-800 underline"
              >
                View all students
              </button>
            </p>
          )}
        </div>
        {selectedSubject && (
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-sm">{`${filteredStudents?.length || 0} of ${students?.length || 0} students`}</span>
          </div>
        )}
      </div>

      <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 rounded-full"></div>

      {/* Subject Selection */}
      <SubjectSelector
        subjects={subjects}
        selectedSubject={selectedSubject}
        onSelect={setSelectedSubject}
      />

      {selectedSubject && (
        <>
          {/* Filters */}
          <StudentsFilters
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            selectedClass={selectedClass}
            onClassChange={setSelectedClass}
            classOptions={classOptions}
          />

          {/* Students List */}
          <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
              <h3 className="text-base sm:text-lg font-semibold">{selectedSubject} Students</h3>
              <p className="text-sm text-emerald-50/90 mt-1">
                {`${filteredStudents?.length || 0} student${(filteredStudents?.length || 0) !== 1 ? 's' : ''} found`}
              </p>
            </div>

            {filteredStudents?.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-slate-400 mb-4">
                  <svg className="w-12 sm:w-16 h-12 sm:h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-2">No Students Found</h3>
                <p className="text-sm sm:text-base text-slate-500">
                  {searchTerm || selectedClass !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : `No students are currently taking ${selectedSubject}.`}
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <StudentsMobileCards students={filteredStudents} onOpenStudent={openStudentDetails} onOpenImage={openImage} />

                {/* Desktop Table View */}
                <StudentsTable students={filteredStudents} selectedSubject={selectedSubject} onOpenStudent={openStudentDetails} onOpenImage={openImage} />
              </>
            )}
          </div>
        </>
      )}

      {/* Student Details Modal */}
      <StudentDetailsModal
        student={selectedStudent}
        onClose={closeStudentDetails}
        onViewAssignments={openAssignmentsModal}
        onViewGrades={openGradesModal}
        onSendMessage={() => {
          openMessageModal();
          setMessageForm({ subject: `Message regarding ${selectedSubject}`, message: '', priority: 'normal' });
        }}
      />

      {/* Assignments Modal */}
      <AssignmentsModal
        open={showAssignmentsModal}
        student={selectedStudent}
        subject={selectedSubject}
        loading={loadingAssignments}
        assignments={studentAssignments}
        onClose={closeAssignmentsModal}
      />

      {/* Grades Modal */}
      <GradesModal
        open={showGradesModal}
        student={selectedStudent}
        subject={selectedSubject}
        loading={loadingGrades}
        grades={studentGrades}
        getGradeColor={getGradeColor}
        onClose={closeGradesModal}
      />

      {/* Message Modal */}
      <MessageModal
        open={showMessageModal}
        student={selectedStudent}
        subject={selectedSubject}
        form={messageForm}
        onFormChange={setMessageForm}
        sending={sending}
        onSend={sendMessage}
        onClose={closeMessageModal}
      />
    <ImageModal isOpen={imageOpen} onClose={closeImage} student={imageStudent} />
    </div>
  );
};

export default StudentsPage;
