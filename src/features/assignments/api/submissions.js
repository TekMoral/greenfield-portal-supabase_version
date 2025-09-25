// src/features/assignments/api/submissions.js
// Submissions and grading operations

import { supabase } from '@lib/supabaseClient'
import { sanitizeText, clampNumber, isValidURL } from '../../../utils/sanitize'

export async function submitAssignment(submissionData) {
  try {
    // Enforce single submission per (assignment_id, student_id)
    const { data: existing, error: findErr } = await supabase
      .from('assignment_submissions')
      .select('id, status')
      .eq('assignment_id', submissionData.assignment_id)
      .eq('student_id', submissionData.student_id)
      .single()

    if (!findErr && existing?.id) {
      // Already have a submission; block re-submission
      return { success: false, error: 'You have already submitted this assignment.' }
    }

    // Create new submission (sanitized)
    const cleanText = sanitizeText(submissionData.submission_text, { maxLength: 10000 });
    const cleanAttachment = submissionData.attachment_url && isValidURL(submissionData.attachment_url, { protocols: ['https'] })
      ? submissionData.attachment_url.trim()
      : null;

    const { data, error } = await supabase
      .from('assignment_submissions')
      .insert({
        assignment_id: submissionData.assignment_id,
        student_id: submissionData.student_id,
        submission_text: cleanText,
        attachment_url: cleanAttachment,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .select(`
        *,
        assignments ( title, due_date, total_marks )
      `)
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    // If the error indicates no rows found from .single() (PGRST116), continue with insert path already done
    if (String(error?.code) === 'PGRST116') {
      try {
        const cleanText = sanitizeText(submissionData.submission_text, { maxLength: 10000 });
        const cleanAttachment = submissionData.attachment_url && isValidURL(submissionData.attachment_url, { protocols: ['https'] })
          ? submissionData.attachment_url.trim()
          : null;

        const { data, error: insErr } = await supabase
          .from('assignment_submissions')
          .insert({
            assignment_id: submissionData.assignment_id,
            student_id: submissionData.student_id,
            submission_text: cleanText,
            attachment_url: cleanAttachment,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
          })
          .select(`
            *,
            assignments ( title, due_date, total_marks )
          `)
          .single()
        if (insErr) throw insErr
        return { success: true, data }
      } catch (insCatch) {
        console.error('Error submitting assignment:', insCatch)
        return { success: false, error: insCatch.message }
      }
    }
    console.error('Error submitting assignment:', error)
    return { success: false, error: error.message }
  }
}

export async function gradeAssignment(submissionId, score, feedback) {
  try {
    const safeScore = clampNumber(score, { min: 0, max: 1000 });
    const safeFeedback = sanitizeText(feedback, { maxLength: 1000 });

    const { data, error } = await supabase
      .from('assignment_submissions')
      .update({
        score: safeScore,
        feedback: safeFeedback,
        graded_at: new Date().toISOString(),
        status: 'graded'
      })
      .eq('id', submissionId)
      .select(`
        *,
        assignments ( title, total_marks )
      `)
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error grading assignment:', error)
    return { success: false, error: error.message }
  }
}

export async function gradeStudentSubmission(assignmentId, studentId, score, feedback) {
  try {
    const { data: sub, error: findErr } = await supabase
      .from('assignment_submissions')
      .select('id')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .single()
    if (findErr) throw findErr

    const safeScore = clampNumber(score, { min: 0, max: 1000 });
    const safeFeedback = sanitizeText(feedback, { maxLength: 1000 });

    const { data, error } = await supabase
      .from('assignment_submissions')
      .update({
        score: safeScore,
        total_score: safeScore,
        feedback: safeFeedback,
        graded_at: new Date().toISOString(),
        status: 'graded',
      })
      .eq('id', sub.id)
      .select('*')
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error grading student assignment:', error)
    return { success: false, error: error.message }
  }
}

export async function getAssignmentSubmissions(assignmentId) {
  try {
    // 1) Fetch submissions for the assignment
    const { data: submissions, error: subErr } = await supabase
      .from('assignment_submissions')
      .select(`*`)
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false })
    if (subErr) throw subErr

    const rows = submissions || [];
    if (rows.length === 0) return { success: true, data: rows };

    // 2) Fetch all responses for these submissions
    const submissionIds = rows.map((r) => r.id);
    const { data: responses, error: respErr } = await supabase
      .from('assignment_question_responses')
      .select('id, submission_id, question_id, answer, auto_score, is_correct')
      .in('submission_id', submissionIds)
    if (respErr) throw respErr

    // 3) Fetch question details for this assignment
    const { data: questions, error: qErr } = await supabase
      .from('assignment_questions')
      .select('id, text, options, correct_answer, points, order_index')
      .eq('assignment_id', assignmentId)
    if (qErr) throw qErr

    const qMap = Object.fromEntries((questions || []).map((q) => [q.id, q]))

    // 4) Attach responses (with question details) to their submissions
    const responsesBySubmission = {};
    for (const r of (responses || [])) {
      const list = responsesBySubmission[r.submission_id] || (responsesBySubmission[r.submission_id] = []);
      list.push({ ...r, question: qMap[r.question_id] });
    }

    const enriched = rows.map((s) => ({
      ...s,
      responses: responsesBySubmission[s.id] || [],
    }));

    return { success: true, data: enriched };
  } catch (error) {
    console.error('Error fetching assignment submissions:', error)
    return { success: false, error: error.message }
  }
}

export async function getStudentSubmissions(studentId) {
  try {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select(`
        *,
        assignments (
          title,
          due_date,
          total_marks,
          subjects ( name, code ),
          classes ( name )
        )
      `)
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false })

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching student submissions:', error)
    return { success: false, error: error.message }
  }
}

export async function submitObjectiveAssignment({ assignment_id, student_id, answers }) {
  try {
    const { data: submission, error: subErr } = await supabase
      .from('assignment_submissions')
      .insert({
        assignment_id,
        student_id,
        submission_type: 'objective_answers',
        answers_snapshot: answers,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (subErr) throw subErr

    const { data: questions, error: qErr } = await supabase
      .from('assignment_questions')
      .select('id, type, correct_answer, points, order_index')
      .eq('assignment_id', assignment_id)
      .order('order_index', { ascending: true })
    if (qErr) throw qErr

    const answerArray = Array.isArray(answers) ? answers : (answers?.answers || [])
    const rows = (questions || []).map((q, idx) => {
      const ans = answerArray[idx]
      let isCorrect = false
      if (q.type === 'mcq') {
        isCorrect = String(ans) === String(q.correct_answer)
      } else if (q.type === 'true_false') {
        isCorrect = Boolean(ans) === Boolean(q.correct_answer)
      } else {
        if (typeof ans === 'string' && typeof q.correct_answer === 'string') {
          isCorrect = ans.trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase()
        } else {
          isCorrect = false
        }
      }
      const auto = isCorrect ? (q.points || 0) : 0
      return {
        assignment_id,
        submission_id: submission.id,
        question_id: q.id,
        student_id,
        answer: ans ?? null,
        auto_score: auto,
        is_correct: isCorrect,
      }
    })

    if (rows.length) {
      const { error: insErr } = await supabase
        .from('assignment_question_responses')
        .insert(rows)
      if (insErr) throw insErr
    }

    const autoSum = rows.reduce((s, r) => s + (r.auto_score || 0), 0)
    // Do not mark as graded or expose total_score automatically; leave for teacher to finalize
    await supabase
      .from('assignment_submissions')
      .update({ auto_score: autoSum })
      .eq('id', submission.id)

    return { success: true, data: { submission_id: submission.id, auto_score: autoSum } }
  } catch (error) {
    console.error('Error submitting objective assignment:', error)
    return { success: false, error: error.message }
  }
}
