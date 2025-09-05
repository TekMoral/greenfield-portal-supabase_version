// src/features/assignments/api/questions.js

import { supabase } from '@lib/supabaseClient'

// Generate a UUID v4 if the DB doesn't auto-generate IDs
const makeId = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto?.randomUUID) return crypto.randomUUID();
  } catch (_) {}
  // Fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const getAssignmentQuestions = async (assignmentId) => {
  try {
    const { data, error } = await supabase
      .from('assignment_questions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .order('order_index', { ascending: true });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching assignment questions:', error);
    return { success: false, error: error.message };
  }
};

export const upsertAssignmentQuestions = async (questions, assignmentId) => {
  try {
    const now = new Date().toISOString();
    const rows = (questions || []).map((q, idx) => {
      const isNew = !q?.id;
      return {
        // Ensure ID is always present to satisfy NOT NULL id column
        id: q?.id || makeId(),
        assignment_id: assignmentId,
        type: q.type,
        text: q.text,
        options: q.options || null,
        correct_answer: q.correct_answer ?? null,
        points: q.points ?? 1,
        order_index: q.order_index ?? idx,
        // Preserve created_at for existing rows if the API returned it; otherwise set for new rows
        ...(isNew ? { created_at: now } : {}),
        updated_at: now,
      };
    });
    const { data, error } = await supabase
      .from('assignment_questions')
      .upsert(rows)
      .select();
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error saving assignment questions:', error);
    return { success: false, error: error.message };
  }
};

export const deleteAssignmentQuestion = async (questionId) => {
  try {
    const { data, error } = await supabase
      .from('assignment_questions')
      .delete()
      .eq('id', questionId)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error deleting assignment question:', error);
    return { success: false, error: error.message };
  }
};

export const assignmentQuestionsService = {
  getAssignmentQuestions,
  upsertAssignmentQuestions,
  deleteAssignmentQuestion,
};
