// src/features/assignments/api/crud.js
// CRUD operations for assignments (create, read, update, delete)

import { supabase } from '@lib/supabaseClient'

export async function createAssignment(assignmentData) {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .insert({
        title: assignmentData.title,
        description: assignmentData.description,
        subject_id: assignmentData.subject_id,
        class_id: assignmentData.class_id,
        teacher_id: assignmentData.teacher_id,
        type: assignmentData.type || 'theory',
        due_date: assignmentData.due_date,
        total_marks: assignmentData.total_marks || 100,
        instructions: assignmentData.instructions,
        attachment_url: assignmentData.attachment_url,
        status: 'draft'
      })
      .select(`
        *,
        subjects ( id, name, code ),
        classes ( id, name )
      `)
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error creating assignment:', error)
    return { success: false, error: error.message }
  }
}

export async function getAllAssignments() {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        subjects ( id, name, code ),
        classes ( id, name )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching assignments:', error)
    return { success: false, error: error.message }
  }
}

export async function getAssignmentsByTeacher(teacherId) {
  try {
    // 1) Fetch assignments without nested submissions to avoid relationship/RLS join issues
    const { data: assignments, error: aErr } = await supabase
      .from('assignments')
      .select(`
        *,
        subjects ( id, name, code ),
        classes ( id, name )
      `)
      .eq('teacher_id', teacherId)
      .in('status', ['draft', 'published', 'closed'])
      .order('created_at', { ascending: false })
    if (aErr) throw aErr

    const rows = assignments || []
    if (rows.length === 0) return { success: true, data: rows }

    // 2) Fetch submissions separately and attach
    const assignmentIds = rows.map(r => r.id)
    const { data: subs, error: sErr } = await supabase
      .from('assignment_submissions')
      .select(`
        id,
        assignment_id,
        student_id,
        submission_text,
        attachment_url,
        score,
        feedback,
        status,
        submitted_at,
        graded_at,
        submission_type,
        total_score,
        auto_score
      `)
      .in('assignment_id', assignmentIds)
    if (sErr) {
      // If we cannot read submissions (RLS), still return assignments
      return { success: true, data: rows }
    }

    const byAssignment = {}
    for (const s of (subs || [])) {
      if (!byAssignment[s.assignment_id]) byAssignment[s.assignment_id] = []
      byAssignment[s.assignment_id].push(s)
    }

    const enriched = rows.map(r => ({
      ...r,
      assignment_submissions: byAssignment[r.id] || []
    }))

    return { success: true, data: enriched }
  } catch (error) {
    console.error('Error fetching assignments by teacher:', error)
    return { success: false, error: error.message }
  }
}

export async function getAssignmentsByClass(classId) {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        subjects ( id, name, code )
      `)
      .eq('class_id', classId)
      .eq('status', 'active')
      .order('due_date', { ascending: true })

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching assignments by class:', error)
    return { success: false, error: error.message }
  }
}

export async function getAssignmentsForStudent(studentId) {
  try {
    // Resolve student's class_id robustly
    let classId = null;
    try {
      const { data: byId, error: byIdErr } = await supabase
        .from('user_profiles')
        .select('class_id')
        .eq('id', studentId)
        .single();
      if (!byIdErr && byId?.class_id) classId = byId.class_id;
    } catch (_) {}

    
    if (!classId) return { success: true, data: [] };

    // Primary query with relationships (nice to have)
    let assignments = null;
    let assignmentsError = null;
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          subjects ( id, name, code ),
          classes ( id, name ),
          assignment_targets!inner ( class_id ),
          assignment_submissions (
            id,
            student_id,
            submission_text,
            attachment_url,
            score,
            feedback,
            status,
            submitted_at,
            graded_at,
            submission_type,
            total_score,
            auto_score
          )
        `)
        .eq('assignment_targets.class_id', classId)
        .in('status', ['published'])
        .order('due_date', { ascending: true });
      assignments = data || [];
      assignmentsError = error || null;
    } catch (e) {
      assignmentsError = e;
    }

    // Fallback: fetch without relationships to avoid RLS join issues
    if (assignmentsError) {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('class_id', classId)
        .in('status', ['published'])
        .order('due_date', { ascending: true });
      if (error) throw error;
      assignments = data || [];
    }

    return { success: true, data: assignments };
  } catch (error) {
    console.error('Error fetching assignments for student:', error);
    return { success: false, error: error.message };
  }
}

export async function updateAssignment(assignmentId, updateData) {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId)
      .select(`
        *,
        subjects ( id, name, code ),
        classes ( id, name )
      `)
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error updating assignment:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteAssignment(assignmentId) {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error deleting assignment:', error)
    return { success: false, error: error.message }
  }
}

// Create a single assignment and attach it to multiple classes via assignment_targets
export async function createAssignmentWithTargets(assignmentData, classIds = []) {
  try {
    // Normalize class_id: ensure null if empty/invalid
    const normalizedClassId = assignmentData.class_id && String(assignmentData.class_id).trim().length > 0
      ? String(assignmentData.class_id).trim()
      : null;

    // 1) Insert assignment row (no per-class scope here; targets define visibility)
    const { data: assignment, error: aErr } = await supabase
      .from('assignments')
      .insert({
        title: assignmentData.title,
        description: assignmentData.description,
        subject_id: assignmentData.subject_id,
        // class_id optional/legacy; prefer targeting via assignment_targets
        class_id: normalizedClassId,
        teacher_id: assignmentData.teacher_id,
        type: assignmentData.type || 'theory',
        due_date: assignmentData.due_date,
        total_marks: assignmentData.total_marks || 100,
        instructions: assignmentData.instructions ?? null,
        attachment_url: assignmentData.attachment_url ?? null,
        status: 'draft',
      })
      .select(`
        *,
        subjects ( id, name, code ),
        classes ( id, name )
      `)
      .single();
    if (aErr) throw aErr;

    // 2) Insert targets for each classId (validate UUIDs, dedupe)
    if (Array.isArray(classIds) && classIds.length > 0) {
      // Accept any non-empty identifier; DB will enforce type (UUID) if required
      const cleanIds = Array.from(new Set((classIds || [])
        .map((cid) => String(cid || '').trim())
        .filter((cid) => cid.length > 0)));

      if (cleanIds.length === 0) {
        // No valid targets, cleanup and error out to avoid orphaned assignment
        try { await supabase.from('assignments').delete().eq('id', assignment.id); } catch (_) {}
        throw new Error('No valid class IDs provided for assignment targets.');
      }

      const rows = cleanIds.map((cid) => ({ assignment_id: assignment.id, class_id: cid }));
      const { error: tErr } = await supabase
        .from('assignment_targets')
        .upsert(rows, { onConflict: 'assignment_id,class_id' });
      if (tErr) {
        // Best-effort cleanup to avoid orphan assignments when targets fail
        try { await supabase.from('assignments').delete().eq('id', assignment.id); } catch (_) {}
        throw tErr;
      }
    }

    return { success: true, data: assignment };
  } catch (error) {
    console.error('Error creating assignment with targets:', error);
    return { success: false, error: error.message };
  }
}