// src/features/assignments/api/normalize.js
// Centralized normalization utilities for Assignments domain

// Map a submission row (snake_case from DB or mixed) to UI shape (camelCase)
export const mapSubmissionRowToUI = (s = {}) => ({
  id: s.id,
  studentId: s.student_id ?? s.studentId,
  grade: s.score ?? s.grade,
  feedback: s.feedback ?? null,
  status: s.status,
  submittedAt: s.submitted_at ?? s.submittedAt,
  gradedAt: s.graded_at ?? s.gradedAt,
  submissionType: s.submission_type ?? s.submissionType ?? 'text',
  content: s.submission_text ?? s.content ?? null,
  attachmentUrl: s.attachment_url ?? s.attachmentUrl ?? null,
  autoScore: s.auto_score ?? s.autoScore,
  totalScore: s.total_score ?? s.totalScore,
});

// Map an assignment row (snake_case from DB or mixed) to UI shape (camelCase)
export const mapAssignmentRowToUI = (a = {}) => ({
  // Keep original fields to avoid breaking consumers; new UI fields follow below
  ...a,
  dueDate: a.dueDate || a.due_date || null,
  maxPoints: a.maxPoints ?? a.total_marks ?? null,
  subjectName: a.subjectName || a.subjects?.name || a.subject?.name || a.subject_name || a.subject || 'Unknown',
  className: a.class_name || a.classes?.name || a.className,
  submissions: (a.assignment_submissions || a.submissions || []).map(mapSubmissionRowToUI),
});
