// src/features/assignments/api/management.js
// Assignment Publishing, Stats & Management Operations

import { supabase } from '@lib/supabaseClient'

export async function getAssignmentStats(assignmentId) {
  try {
    const { count: totalSubmissions } = await supabase
      .from('assignment_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('assignment_id', assignmentId)

    const { count: gradedSubmissions } = await supabase
      .from('assignment_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('assignment_id', assignmentId)
      .eq('status', 'graded')

    const { data: scores } = await supabase
      .from('assignment_submissions')
      .select('score')
      .eq('assignment_id', assignmentId)
      .not('score', 'is', null)

    const averageScore = scores?.length > 0
      ? scores.reduce((sum, submission) => sum + submission.score, 0) / scores.length
      : 0

    return {
      success: true,
      data: {
        totalSubmissions: totalSubmissions || 0,
        gradedSubmissions: gradedSubmissions || 0,
        pendingGrading: (totalSubmissions || 0) - (gradedSubmissions || 0),
        averageScore: Math.round(averageScore * 100) / 100
      }
    }
  } catch (error) {
    console.error('Error fetching assignment stats:', error)
    return { success: false, error: error.message }
  }
}

export async function publishAssignment(assignmentId) {
  try {
    const { data: assignment, error: aErr } = await supabase
      .from('assignments')
      .select('id, type, total_marks, status')
      .eq('id', assignmentId)
      .single()
    if (aErr) throw aErr

    if (assignment.type === 'objective') {
      const { data: qRows, error: qErr } = await supabase
        .from('assignment_questions')
        .select('points')
        .eq('assignment_id', assignmentId)
      if (qErr) throw qErr

      const total = (qRows || []).reduce((sum, r) => sum + (r.points || 0), 0)
      if (total <= 0) throw new Error('Objective assignments must have at least one question with points > 0 before publishing.')

      const { data: updated, error: uErr } = await supabase
        .from('assignments')
        .update({ status: 'published', total_marks: total, updated_at: new Date().toISOString() })
        .eq('id', assignmentId)
        .select(`
          *,
          subjects ( id, name, code ),
          classes ( id, name )
        `)
        .single()
      if (uErr) throw uErr

      return { success: true, data: updated }
    } else {
      if (!assignment.total_marks || assignment.total_marks <= 0) {
        throw new Error('Theory assignments require total marks > 0 before publishing.')
      }

      const { data: updated, error: uErr } = await supabase
        .from('assignments')
        .update({ status: 'published', updated_at: new Date().toISOString() })
        .eq('id', assignmentId)
        .select(`
          *,
          subjects ( id, name, code ),
          classes ( id, name )
        `)
        .single()
      if (uErr) throw uErr

      return { success: true, data: updated }
    }
  } catch (error) {
    console.error('Error publishing assignment:', error)
    return { success: false, error: error.message }
  }
}
