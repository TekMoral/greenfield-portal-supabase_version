// src/services/supabase/userService.js
import { supabase } from '../../lib/supabaseClient'

// ✅ Get current user role from Supabase
export const getUserRole = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log('[getUserRole] No authenticated user')
      return null
    }

    // Get user profile from user_profiles table
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[getUserRole] Error fetching profile:', profileError)
      return null
    }

    return {
      role: profile.role || null,
      isSuperAdmin: profile.role === 'super_admin' || profile.is_super_admin,
      uid: user.id,
      email: user.email,
      profile: profile
    }
  } catch (error) {
    console.error('[getUserRole] Error:', error)
    return null
  }
}

// ✅ Refresh user role (for Supabase, just re-fetch)
export const refreshUserRole = async () => {
  try {
    return await getUserRole()
  } catch (error) {
    console.error('[refreshUserRole] Error:', error)
    return null
  }
}

// ✅ Check if current user has expected role
export const checkUserRole = async (expectedRole) => {
  try {
    const userData = await getUserRole()

    if (!userData) {
      console.log('[checkUserRole] No user data found')
      return false
    }

    const hasRole = userData.role === expectedRole
    console.log('[checkUserRole] Role check:', {
      uid: userData.uid,
      expectedRole,
      actualRole: userData.role,
      hasRole
    })

    return hasRole
  } catch (error) {
    console.error('[checkUserRole] Error checking user role:', error)
    return false
  }
}

// ✅ Get full user profile based on role
export const getUserProfile = async () => {
  try {
    const userData = await getUserRole()
    if (!userData) return null

    const uid = userData.uid

    switch (userData.role) {
      case 'student': {
        const { getStudent } = await import('./studentService')
        return await getStudent(uid)
      }

      case 'teacher': {
        const { getTeacherByUid } = await import('./teacherService')
        return await getTeacherByUid(uid)
      }

      case 'admin':
      case 'super_admin': {
        const { getAdminProfile } = await import('./adminService')
        return await getAdminProfile(uid)
      }
      default:
        return userData.profile
    }
  } catch (error) {
    console.error('[getUserProfile] Error fetching profile:', error)
    throw error
  }
}

// ✅ Verify role and ensure profile completeness
export const verifyUserProfile = async () => {
  try {
    const userData = await getUserRole()
    if (!userData) {
      console.error('[verifyUserProfile] No user data found.')
      return {
        isValid: false,
        error: 'User not authenticated or no role assigned'
      }
    }

    switch (userData.role) {
      case 'student': {
        const { verifyStudentProfile } = await import('./studentService')
        const isStudentValid = await verifyStudentProfile(userData.uid)
        return {
          isValid: isStudentValid,
          error: isStudentValid ? null : 'Student profile incomplete'
        }
      }
      default:
        return { isValid: true, error: null }
    }
  } catch (error) {
    console.error('[verifyUserProfile] Error:', error)
    return { isValid: false, error: error.message }
  }
}

// ✅ Create user profile in Supabase
export const createUserProfile = async (userData) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name || userData.email.split('@')[0],
        role: userData.role || 'student',
        is_active: true,
        status: 'active',
        ...userData
      })
      .select()
      .single()

    if (error) {
      console.error('[createUserProfile] Error:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('[createUserProfile] Error creating profile:', error)
    throw error
  }
}

// ✅ Update user profile
export const updateUserProfile = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('[updateUserProfile] Error:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('[updateUserProfile] Error updating profile:', error)
    throw error
  }
}

// ✅ Export service object for easier usage
export const userService = {
  getUserRole,
  refreshUserRole,
  checkUserRole,
  getUserProfile,
  verifyUserProfile,
  createUserProfile,
  updateUserProfile
}