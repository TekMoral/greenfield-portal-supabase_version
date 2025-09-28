import { useState } from 'react';
import { createAssignment, updateAssignment, deleteAssignment, createAssignmentWithTargets } from '@features/assignments/api/crud';
import { gradeStudentSubmission } from '@features/assignments/api/submissions';
import { publishAssignment } from '@features/assignments/api/management';
import { mapAssignmentRowToUI } from '@features/assignments/api/normalize';
import useToast from '../../../hooks/useToast';

// Utility to map UI form to API payload (per class)
const mapCreatePayload = (form, userId, classId, subjectId = null) => ({
  title: form.title,
  description: form.description,
  subject_id: subjectId ?? form.subjectId ?? null,
  class_id: classId ?? form.classId,
  teacher_id: userId,
  due_date: form.dueDate,
  total_marks: form.totalMarks,
  type: form.type || 'theory',
  instructions: null,
  attachment_url: null,
});

export const useAssignmentMutations = (userId, setAssignments) => {
  const [creating, setCreating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [closing, setClosing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [grading, setGrading] = useState(false);
  const { showToast } = useToast();

  const create = async (form) => {
    setCreating(true);
    try {
      const classIds = Array.isArray(form.classIds) && form.classIds.length > 0
        ? form.classIds.map(String)
        : (form.classId ? [String(form.classId)] : []);

      if (classIds.length === 0) {
        throw new Error('Please select at least one class.');
      }

      // Use a single assignment targeted to multiple classes
      const payload = mapCreatePayload(form, userId, null, form.subjectId);
      const res = await createAssignmentWithTargets(payload, classIds);
      if (res?.success === false) {
        throw new Error(res?.error || 'Failed to create assignment');
      }
      const created = res?.success ? res.data : res;
      const normalized = mapAssignmentRowToUI({
        ...created,
        subjects: created?.subjects,
        classes: created?.classes,
        assignment_submissions: created?.assignment_submissions || [],
      });
      // Patch defaults from the form when Supabase doesn't return them
      normalized.dueDate = normalized.dueDate || form.dueDate;
      normalized.maxPoints = normalized.maxPoints ?? form.totalMarks;
      normalized.subjectName = normalized.subjectName || form.subjectName;

      // Prepend created assignment to the list (newest first)
      setAssignments((prev) => [normalized, ...(Array.isArray(prev) ? prev : [])]);

      // Return it (useful when opening questions editor)
      return normalized;
    } finally {
      setCreating(false);
    }
  };

  const publish = async (assignmentId) => {
    setPublishing(true);
    try {
      const res = await publishAssignment(assignmentId);
      if (!res?.success || !res?.data) {
        throw new Error(res?.error || 'Failed to publish assignment');
      }

      // Normalize the returned row to UI shape (consistency across app)
      const updatedRow = mapAssignmentRowToUI({
        ...res.data,
        subjects: res.data?.subjects,
        classes: res.data?.classes,
        assignment_submissions: res.data?.assignment_submissions || [],
      });

      setAssignments((prev) => (prev || []).map((a) => (a.id === assignmentId ? {
        ...a,
        status: updatedRow.status || 'published',
        maxPoints: updatedRow.maxPoints ?? a.maxPoints,
      } : a)));

      // Feedback via global toast
      showToast('Assignment published successfully!', 'success');
      return updatedRow;
    } catch (e) {
      console.error('Failed to publish assignment:', e);
      showToast(`Failed to publish assignment: ${e.message || 'Unknown error'}`, 'error');
      throw e;
    } finally {
      setPublishing(false);
    }
  };

  const close = async (assignmentId) => {
    setClosing(true);
    try {
      await updateAssignment(assignmentId, { status: 'closed' });
      setAssignments((prev) => (prev || []).map((a) => (a.id === assignmentId ? { ...a, status: 'closed' } : a)));
    } finally {
      setClosing(false);
    }
  };

  const remove = async (assignmentId) => {
    setRemoving(true);
    try {
      await deleteAssignment(assignmentId);
      setAssignments((prev) => (prev || []).filter((a) => a.id !== assignmentId));
    } finally {
      setRemoving(false);
    }
  };

  const grade = async (assignmentId, studentId, gradeData) => {
    setGrading(true);
    try {
      await gradeStudentSubmission(assignmentId, studentId, gradeData.grade, gradeData.feedback);
      setAssignments((prev) => (prev || []).map((a) => {
        if (a.id !== assignmentId) return a;
        const updatedSubs = (a.submissions || []).map((s) =>
          s.studentId === studentId ? { ...s, ...gradeData, status: 'graded' } : s
        );
        return { ...a, submissions: updatedSubs };
      }));
    } finally {
      setGrading(false);
    }
  };

  return { create, publish, close, remove, grade, creating, publishing, closing, removing, grading };
};

export default useAssignmentMutations;
