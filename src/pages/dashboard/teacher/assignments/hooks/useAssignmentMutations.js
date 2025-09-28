import { useState } from 'react';
import { createAssignment, updateAssignment, deleteAssignment } from '@features/assignments/api/crud';
import { gradeStudentSubmission } from '@features/assignments/api/submissions';
import { publishAssignment } from '@features/assignments/api/management';

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

  const create = async (form) => {
    setCreating(true);
    try {
      const classIds = Array.isArray(form.classIds) && form.classIds.length > 0
        ? form.classIds.map(String)
        : (form.classId ? [String(form.classId)] : []);

      if (classIds.length === 0) {
        // Fallback: prevent creating without class
        throw new Error('Please select at least one class.');
      }

      // Clamp total marks to maximum 50
      const safeForm = { ...form };
      if (safeForm && typeof safeForm.totalMarks === 'number') {
        if (safeForm.totalMarks > 50) safeForm.totalMarks = 50;
        if (safeForm.totalMarks < 1) safeForm.totalMarks = 1;
      }

      const results = [];
      for (const cid of classIds) {
        const payload = mapCreatePayload(safeForm, userId, cid, safeForm.subjectId);
        const res = await createAssignment(payload);
        if (res?.success === false) {
          throw new Error(res?.error || 'Failed to create assignment');
        }
        const created = res?.success ? res.data : res;
        const normalized = {
          ...created,
          dueDate: created?.due_date || form.dueDate,
          maxPoints: created?.total_marks ?? form.totalMarks,
          subjectName: created?.subjects?.name || created?.subjectName || form.subjectName,
          submissions: created?.assignment_submissions || [],
        };
        results.push(normalized);
      }

      // Prepend all created assignments to the list (newest first)
      setAssignments((prev) => [
        ...results,
        ...(Array.isArray(prev) ? prev : []),
      ]);

      // Return the first one (useful when opening questions editor)
      return results[0];
    } finally {
      setCreating(false);
    }
  };

  const publish = async (assignmentId) => {
    setPublishing(true);
    try {
      const res = await publishAssignment(assignmentId);
      if (res?.success && res.data) {
        const updated = res.data;
        setAssignments((prev) => (prev || []).map((a) => (a.id === assignmentId ? {
          ...a,
          status: updated.status,
          maxPoints: updated.total_marks ?? a.maxPoints,
        } : a)));
      }
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
