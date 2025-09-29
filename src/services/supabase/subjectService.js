// src/services/supabase/subjectService.js
import { supabase } from '../../lib/supabaseClient'
import { getAccessToken, cookieAuth } from '../../lib/cookieAuthClient'

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
    // Include Authorization bearer for functions (HttpOnly cookie flow does not auto-attach here)
    let token = getAccessToken && getAccessToken();
    let headers = token ? { Authorization: `Bearer ${token}` } : {};

    let { data, error } = await supabase.functions.invoke('create-subject', {
      body: JSON.stringify(subjectData),
      headers
    });

    // If we failed without a token, try a cookie refresh once and retry
    if ((error || data?.error) && !token) {
      try {
        const refreshed = await cookieAuth.refresh();
        if (refreshed?.success) {
          token = getAccessToken && getAccessToken();
          headers = token ? { Authorization: `Bearer ${token}` } : {};
          ({ data, error } = await supabase.functions.invoke('create-subject', { body: JSON.stringify(subjectData), headers }));
        }
      } catch (_) { /* ignore */ }
    }

    if (error) {
      console.error('❌ [createSubject] Edge Function error:', error.message || error);
      throw error;
    }
    if (data?.error) {
      throw new Error(data.error);
    }
    return data?.data || null;
  } catch (error) {
    console.error('❌ [createSubject] Failed:', error.message || error);
    throw error;
  }
}

// ✅ Update subject (via Edge Function)
export const updateSubject = async (subjectId, updates) => {
  try {
    const payload = { id: subjectId, ...updates };
    let token = getAccessToken && getAccessToken();
    let headers = token ? { Authorization: `Bearer ${token}` } : {};

    let { data, error } = await supabase.functions.invoke('update-subject', {
      body: JSON.stringify(payload),
      headers
    });

    if ((error || data?.error) && !token) {
      try {
        const refreshed = await cookieAuth.refresh();
        if (refreshed?.success) {
          token = getAccessToken && getAccessToken();
          headers = token ? { Authorization: `Bearer ${token}` } : {};
          ({ data, error } = await supabase.functions.invoke('update-subject', { body: JSON.stringify(payload), headers }));
        }
      } catch (_) { /* ignore */ }
    }

    if (error) {
      console.error('[updateSubject] Edge Function error:', error.message || error);
      throw error;
    }
    if (data?.error) {
      throw new Error(data.error);
    }
    return data?.data || null;
  } catch (error) {
    console.error('[updateSubject] Error updating subject:', error.message || error);
    throw error;
  }
}

// ✅ Delete subject (via Edge Function)
export const deleteSubject = async (subjectId) => {
  try {
    const payload = { id: subjectId };
    let token = getAccessToken && getAccessToken();
    let headers = token ? { Authorization: `Bearer ${token}` } : {};

    let { data, error } = await supabase.functions.invoke('delete-subject', {
      body: JSON.stringify(payload),
      headers
    });

    if ((error || data?.error) && !token) {
      try {
        const refreshed = await cookieAuth.refresh();
        if (refreshed?.success) {
          token = getAccessToken && getAccessToken();
          headers = token ? { Authorization: `Bearer ${token}` } : {};
          ({ data, error } = await supabase.functions.invoke('delete-subject', { body: JSON.stringify(payload), headers }));
        }
      } catch (_) { /* ignore */ }
    }

    if (error) {
      console.error('[deleteSubject] Edge Function error:', error.message || error);
      throw error;
    }
    if (data?.error) {
      throw new Error(data.error);
    }
    return data || null;
  } catch (error) {
    console.error('[deleteSubject] Error deleting subject:', error.message || error);
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