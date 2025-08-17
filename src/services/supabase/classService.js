// src/services/supabase/classService.js
import { supabase } from '../../lib/supabaseClient'

// Helper function to validate and clean teacher ID
const validateTeacherId = (teacherId) => {
  if (!teacherId || !teacherId.trim()) {
    return null;
  }

  const cleanId = teacherId.trim();

  // Check if it's a valid UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(cleanId)) {
    throw new Error(`Teacher ID must be a valid UUID, not a name. Please leave empty or use the actual teacher ID from the system.`);
  }

  return cleanId;
};

// ✅ Get all classes
export const getClasses = async () => {
  try {
    console.log('🔄 Fetching classes...');

    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('❌ [getClasses] Error:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Classes fetched successfully:', data?.length || 0);
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('❌ [getClasses] Error fetching classes:', error);
    return { success: false, error: error.message };
  }
}

// ✅ Get class by ID
export const getClassById = async (classId) => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (error) {
      console.error('[getClassById] Error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[getClassById] Error fetching class:', error);
    throw error;
  }
}

// ✅ Create new class (via Edge Function)
export const createClass = async (classData) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-class', {
      body: JSON.stringify(classData)
    });
    if (error) {
      console.error('❌ [createClass] Edge Function error:', error.message);
      throw error;
    }
    if (data?.error) {
      throw new Error(data.error);
    }
    return data?.data || null;
  } catch (error) {
    console.error('❌ [createClass] Failed:', error.message);
    throw error;
  }
};

// ✅ Update class (via Edge Function)
export const updateClass = async (classId, updates) => {
  try {
    const payload = { id: classId, ...updates };
    const { data, error } = await supabase.functions.invoke('update-class', {
      body: JSON.stringify(payload)
    });
    if (error) {
      console.error('[updateClass] Edge Function error:', error.message);
      throw error;
    }
    if (data?.error) {
      throw new Error(data.error);
    }
    return data?.data || null;
  } catch (error) {
    console.error('[updateClass] Error updating class:', error);
    throw error;
  }
}

// ✅ Delete class (via Edge Function)
export const deleteClass = async (classId) => {
  try {
    const payload = { id: classId };
    const { data, error } = await supabase.functions.invoke('delete-class', {
      body: JSON.stringify(payload)
    });
    if (error) {
      console.error('[deleteClass] Edge Function error:', error.message);
      throw error;
    }
    if (data?.error) {
      throw new Error(data.error);
    }
    return data || null;
  } catch (error) {
    console.error('[deleteClass] Error deleting class:', error);
    throw error;
  }
}

// ✅ Get classes with student count
export const getClassesWithStudentCount = async () => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        student_count:user_profiles(count)
      `)
      .eq('status', 'active')
      .eq('user_profiles.role', 'student')
      .order('name');

    if (error) {
      console.error('[getClassesWithStudentCount] Error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[getClassesWithStudentCount] Error:', error);
    throw error;
  }
}

// ✅ Get students in a class
export const getStudentsInClass = async (classId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('class_id', classId)
      .eq('role', 'student')
      .eq('is_active', true)
      .order('full_name');

    if (error) {
      console.error('[getStudentsInClass] Error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[getStudentsInClass] Error:', error);
    throw error;
  }
}

// ✅ Search classes
export const searchClasses = async (searchTerm) => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,level.ilike.%${searchTerm}%`)
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('[searchClasses] Error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[searchClasses] Error searching classes:', error);
    throw error;
  }
}

// ✅ Get all teachers for dropdown
export const getTeachers = async () => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('role', 'teacher')
      .eq('is_active', true)
      .order('full_name');

    if (error) {
      console.error('[getTeachers] Error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[getTeachers] Error fetching teachers:', error);
    throw error;
  }
}

// ✅ Alias exports for backward compatibility
export const getAllClasses = getClasses;

// ✅ Export service object for easier usage
export const classService = {
  getClasses,
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  getClassesWithStudentCount,
  getStudentsInClass,
  searchClasses,
  getTeachers
};