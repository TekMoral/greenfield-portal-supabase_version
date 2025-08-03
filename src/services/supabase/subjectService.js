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

// ✅ Create new subject
export const createSubject = async (subjectData) => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .insert({
        name: subjectData.name,
        code: subjectData.code,
        description: subjectData.description || '',
        department: subjectData.department || '',
        credit_hours: subjectData.credit_hours || 1,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('[createSubject] Error:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('[createSubject] Error creating subject:', error)
    throw error
  }
}

// ✅ Update subject
export const updateSubject = async (subjectId, updates) => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', subjectId)
      .select()
      .single()

    if (error) {
      console.error('[updateSubject] Error:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('[updateSubject] Error updating subject:', error)
    throw error
  }
}

// ✅ Delete subject (soft delete)
export const deleteSubject = async (subjectId) => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', subjectId)
      .select()
      .single()

    if (error) {
      console.error('[deleteSubject] Error:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('[deleteSubject] Error deleting subject:', error)
    throw error
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

// ✅ Add subject to department (legacy compatibility function)
export const addSubjectToDepartment = async (department, subjectName) => {
  try {
    // Generate a simple code from the subject name
    const code = subjectName.toUpperCase().replace(/\s+/g, '_').substring(0, 10)
    
    const subjectData = {
      name: subjectName,
      code: code,
      department: department,
      description: `${subjectName} for ${department} department`,
      credit_hours: 1,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('subjects')
      .insert(subjectData)
      .select()
      .single()

    if (error) {
      console.error('[addSubjectToDepartment] Error:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('[addSubjectToDepartment] Error adding subject:', error)
    throw error
  }
}

// ✅ Remove subject from department (legacy compatibility function)
export const removeSubjectFromDepartment = async (department, subjectName) => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('name', subjectName)
      .eq('department', department)
      .select()

    if (error) {
      console.error('[removeSubjectFromDepartment] Error:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('[removeSubjectFromDepartment] Error removing subject:', error)
    throw error
  }
}

// ✅ Export service object for easier usage
export const subjectService = {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  getSubjectsByDepartment,
  searchSubjects,
  getSubjectsByTeacher,
  addSubjectToDepartment,
  removeSubjectFromDepartment
}