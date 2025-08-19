// src/services/supabase/classService.js
import { supabase } from '../../lib/supabaseClient'


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
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[getClassById] Error fetching class:', error);
    return { success: false, error: error.message };
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
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('[getClassesWithStudentCount] Error:', error);
    return { success: false, error: error.message };
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
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('[getStudentsInClass] Error:', error);
    return { success: false, error: error.message };
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
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('[searchClasses] Error searching classes:', error);
    return { success: false, error: error.message };
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
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('[getTeachers] Error fetching teachers:', error);
    return { success: false, error: error.message };
  }
}

// ✅ Alias exports for backward compatibility
export const getAllClasses = getClasses;

// ✅ Export service object for easier usage
export const classService = {
  getClasses,
  getAllClasses,
  getClassById,
  getClassesWithStudentCount,
  getStudentsInClass,
  searchClasses,
  getTeachers
};