// src/services/supabase/assignmentService.js
// Normalized service facade for assignments during migration
// Provides UI-shape data (camelCase fields) for legacy pages while leveraging feature APIs.

import { 
  getAssignmentsByTeacher as rawGetAssignmentsByTeacher,
  getAllAssignments as rawGetAllAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from '@features/assignments/api/crud'
import { supabase } from '@lib/supabaseClient'

import {
  submitAssignment,
  gradeAssignment,
  gradeStudentSubmission,
  getAssignmentSubmissions,
  getStudentSubmissions,
  submitObjectiveAssignment,
} from '@features/assignments/api/submissions'

import {
  publishAssignment,
  getAssignmentStats,
} from '@features/assignments/api/management'

import {
  getAssignmentQuestions,
  upsertAssignmentQuestions,
  deleteAssignmentQuestion,
} from '@features/assignments/api/questions'

// Keep aggregated legacy-style object available if used elsewhere
export { assignmentService } from '@features/assignments/api/assignments'

// Normalization helpers (shared)
import { mapAssignmentRowToUI, mapSubmissionRowToUI } from '@features/assignments/api/normalize'

// Normalized fetchers for legacy pages
export async function getAssignmentsByTeacher(teacherId) {
  const res = await rawGetAssignmentsByTeacher(teacherId)
  if (res?.success) {
    return { success: true, data: (res.data || []).map(mapAssignmentRowToUI) }
  }
  return Array.isArray(res) ? res.map(mapAssignmentRowToUI) : res
}

export async function getAllAssignments() {
  const res = await rawGetAllAssignments()
  if (res?.success) {
    return { success: true, data: (res.data || []).map(mapAssignmentRowToUI) }
  }
  return Array.isArray(res) ? res.map(mapAssignmentRowToUI) : res
}

export async function getAssignmentsForStudent(studentId) {
  try {
    // Fetch via SECURITY DEFINER RPC (uses auth.uid() on server; studentId arg ignored)
    const { data, error } = await supabase.rpc('rpc_list_assignments_for_current_student', {
      p_only_published: true,
    });
    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    const subjectIds = Array.from(new Set(rows.map((r) => r.subject_id).filter(Boolean)));
    const assignmentIds = Array.from(new Set(rows.map((r) => r.id).filter(Boolean)));

    // Enrich with subject names for UI
    let subjectMap = {};
    if (subjectIds.length > 0) {
      const { data: subs, error: sErr } = await supabase
        .from('subjects')
        .select('id, name, code')
        .in('id', subjectIds);
      if (!sErr && Array.isArray(subs)) {
        subjectMap = Object.fromEntries(subs.map((s) => [s.id, s]));
      }
    }

    // Enrich with assignment type so UI can decide to show objective modal
    let typeMap = {};
    if (assignmentIds.length > 0) {
      const { data: typeRows, error: tErr } = await supabase
        .from('assignments')
        .select('id, type')
        .in('id', assignmentIds);
      if (!tErr && Array.isArray(typeRows)) {
        typeMap = Object.fromEntries(typeRows.map((tr) => [tr.id, tr.type]));
      }
    }

    // Enrich with current student's submission per assignment to disable re-attempts
    let submissionMap = {};
    if (assignmentIds.length > 0 && studentId) {
      const { data: subRows, error: subErr } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, status, submission_type, total_score, auto_score, submitted_at')
        .eq('student_id', studentId)
        .in('assignment_id', assignmentIds);
      if (!subErr && Array.isArray(subRows)) {
        submissionMap = Object.fromEntries(subRows.map((s) => [s.assignment_id, s]));
      }
    }

    // Map to UI-friendly shape expected by legacy student page
    const ui = rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      subjectId: r.subject_id,
      subjectName: subjectMap[r.subject_id]?.name,
      dueDate: r.due_date,
      maxPoints: r.total_marks,
      status: r.status,
      // Include assignment type so the objective modal can show
      type: typeMap[r.id] || undefined,
      // Include current student's submission (if any) to reflect submitted/graded state in UI
      submissions: submissionMap[r.id]
        ? [{
            studentId: studentId,
            submissionType: submissionMap[r.id].submission_type || 'objective_answers',
            status: submissionMap[r.id].status || 'submitted',
            grade: (submissionMap[r.id].status === 'graded')
              ? (submissionMap[r.id].total_score ?? submissionMap[r.id].auto_score ?? null)
              : null,
            submittedAt: submissionMap[r.id].submitted_at || null,
          }]
        : [],
    }));

    // Keep existing consumer compatibility: return array directly
    return ui;
  } catch (e) {
    console.error('Error fetching assignments via RPC:', e);
    return { success: false, error: e.message };
  }
}

// Re-export other APIs (no shape changes)
export {
  createAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  gradeAssignment,
  gradeStudentSubmission,
  getAssignmentSubmissions,
  getStudentSubmissions,
  submitObjectiveAssignment,
  publishAssignment,
  getAssignmentStats,
  getAssignmentQuestions,
  upsertAssignmentQuestions,
  deleteAssignmentQuestion,
}
