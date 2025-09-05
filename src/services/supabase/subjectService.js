// src/services/supabase/subjectService.js
import { supabase } from '../../lib/supabaseClient'

// ✅ Get all subjects
export const getSubjects = async () => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('status', 'active')
      .order('name')

    if (error) {
      console.error('[getSubjects] Error:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('[getSubjects] Error fetching subjects:', error)
    throw error
  }
}

// ✅ Get subject by ID
export const getSubjectById = async (subjectId) => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', subjectId)
      .single()

    if (error) {
      console.error('[getSubjectById] Error:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('[getSubjectById] Error fetching subject:', error)
    throw error
  }
}

// ✅ Create new subject (via Edge Function)
export const createSubject = async (subjectData) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-subject', {
      body: JSON.stringify(subjectData)
    });
    if (error) {
      console.error('❌ [createSubject] Edge Function error:', error.message);
      throw error;
    }
    if (data?.error) {
      throw new Error(data.error);
    }
    return data?.data || null;
  } catch (error) {
    console.error('❌ [createSubject] Failed:', error.message);
    throw error;
  }
}

// ✅ Update subject (via Edge Function)
export const updateSubject = async (subjectId, updates) => {
  try {
    const payload = { id: subjectId, ...updates };
    const { data, error } = await supabase.functions.invoke('update-subject', {
      body: JSON.stringify(payload)
    });
    if (error) {
      console.error('[updateSubject] Edge Function error:', error.message);
      throw error;
    }
    if (data?.error) {
      throw new Error(data.error);
    }
    return data?.data || null;
  } catch (error) {
    console.error('[updateSubject] Error updating subject:', error);
    throw error;
  }
}

// ✅ Delete subject (via Edge Function)
export const deleteSubject = async (subjectId) => {
  try {
    const payload = { id: subjectId };
    const { data, error } = await supabase.functions.invoke('delete-subject', {
      body: JSON.stringify(payload)
    });
    if (error) {
      console.error('[deleteSubject] Edge Function error:', error.message);
      throw error;
    }
    if (data?.error) {
      throw new Error(data.error);
    }
    return data || null;
  } catch (error) {
    console.error('[deleteSubject] Error deleting subject:', error);
    throw error;
  }
}

// ✅ Get subjects by department
export const getSubjectsByDepartment = async (department) => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('department', department)
      .eq('status', 'active')
      .order('name')

    if (error) {
      console.error('[getSubjectsByDepartment] Error:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('[getSubjectsByDepartment] Error:', error)
    throw error
  }
}

// ✅ Search subjects
export const searchSubjects = async (searchTerm) => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%,department.ilike.%${searchTerm}%`)
      .eq('status', 'active')
      .order('name')

    if (error) {
      console.error('[searchSubjects] Error:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('[searchSubjects] Error searching subjects:', error)
    throw error
  }
}

// ✅ Get subjects taught by teacher
export const getSubjectsByTeacher = async (teacherId) => {
  try {
    const { data, error } = await supabase
      .from('teacher_assignments')
      .select(`
        *,
        subject:subjects(*)
      `)
      .eq('teacher_id', teacherId)
      .eq('is_active', true)

    if (error) {
      console.error('[getSubjectsByTeacher] Error:', error)
      throw error
    }

    return data?.map(assignment => assignment.subject) || []
  } catch (error) {
    console.error('[getSubjectsByTeacher] Error:', error)
    throw error
  }
}

// ✅ Export service object for easier usage
export const subjectService = {
  getSubjects,
  getAllSubjects: getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  getSubjectsByDepartment,
  searchSubjects,
  getSubjectsByTeacher
}

export const getAllSubjects = getSubjects