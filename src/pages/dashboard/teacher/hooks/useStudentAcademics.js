import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../../hooks/useAuth';
import { getAssignmentsByTeacher } from '../../../../services/supabase/assignmentService';

const useStudentAcademics = ({ selectedSubject }) => {
  const { user } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [showAssignmentsModal, setShowAssignmentsModal] = useState(false);
  const [showGradesModal, setShowGradesModal] = useState(false);

  const openStudentDetails = useCallback((student) => {
    setSelectedStudent(student);
  }, []);

  const closeStudentDetails = useCallback(() => {
    setSelectedStudent(null);
    setShowAssignmentsModal(false);
    setShowGradesModal(false);
  }, []);

  const openAssignmentsModal = useCallback(() => setShowAssignmentsModal(true), []);
  const closeAssignmentsModal = useCallback(() => setShowAssignmentsModal(false), []);

  const openGradesModal = useCallback(() => setShowGradesModal(true), []);
  const closeGradesModal = useCallback(() => setShowGradesModal(false), []);

  // Assignments for selected student when modal opens
  const {
    data: studentAssignments = [],
    isLoading: loadingAssignments,
    error: assignmentsError,
  } = useQuery({
    queryKey: ['student-assignments', selectedStudent?.id, selectedSubject, user?.id],
    queryFn: async () => {
      if (!selectedStudent || !selectedSubject || !user?.id) return [];
      const res = await getAssignmentsByTeacher(user.id);
      const assignments = res?.success ? (res.data || []) : (Array.isArray(res) ? res : []);
      const subjectAssignments = assignments.filter((assignment) => assignment.subjectName === selectedSubject);
      return subjectAssignments.map((assignment) => {
        const submission = assignment.submissions?.find((sub) => sub.studentId === selectedStudent.id);
        return {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          dueDate: assignment.dueDate,
          maxPoints: assignment.maxPoints,
          status: assignment.status,
          submitted: !!submission,
          submittedAt: submission?.submittedAt,
          grade: submission?.grade,
          feedback: submission?.feedback,
          submissionStatus: submission?.status || 'not_submitted',
        };
      });
    },
    enabled: !!selectedStudent && !!selectedSubject && !!user?.id && showAssignmentsModal,
    staleTime: 5 * 60 * 1000,
  });

  // Grades for selected student when modal opens
  const {
    data: studentGrades = [],
    isLoading: loadingGrades,
    error: gradesError,
  } = useQuery({
    queryKey: ['student-grades', selectedStudent?.id, selectedSubject, user?.id],
    queryFn: async () => {
      if (!selectedStudent || !selectedSubject || !user?.id) return [];
      const res = await getAssignmentsByTeacher(user.id);
      const assignments = res?.success ? (res.data || []) : (Array.isArray(res) ? res : []);
      const subjectAssignments = assignments.filter((assignment) => assignment.subjectName === selectedSubject);
      return subjectAssignments
        .map((assignment) => {
          const submission = assignment.submissions?.find((sub) => sub.studentId === selectedStudent.id);
          if (submission && submission.grade !== undefined) {
            return {
              assignmentId: assignment.id,
              assignmentTitle: assignment.title,
              maxPoints: assignment.maxPoints,
              grade: submission.grade,
              percentage: Math.round((submission.grade / assignment.maxPoints) * 100),
              feedback: submission.feedback,
              submittedAt: submission.submittedAt,
              gradedAt: submission.gradedAt,
            };
          }
          return null;
        })
        .filter((grade) => grade !== null);
    },
    enabled: !!selectedStudent && !!selectedSubject && !!user?.id && showGradesModal,
    staleTime: 5 * 60 * 1000,
  });

  const getGradeColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 70) return 'text-blue-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return {
    // selection
    selectedStudent,
    openStudentDetails,
    closeStudentDetails,

    // assignments modal
    showAssignmentsModal,
    openAssignmentsModal,
    closeAssignmentsModal,
    loadingAssignments,
    studentAssignments,
    assignmentsError,

    // grades modal
    showGradesModal,
    openGradesModal,
    closeGradesModal,
    loadingGrades,
    studentGrades,
    gradesError,

    // helpers
    getGradeColor,
  };
};

export default useStudentAcademics;
