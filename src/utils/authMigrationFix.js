// src/utils/authMigrationFix.js
import { supabase } from '../lib/supabaseClient'

/**
 * Migration utility to fix authentication issues after Firebase to Supabase migration
 * This addresses the issue where users can sign in but have no roles assigned
 */

// Function to check if user has a profile
export const checkUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking user profile:', error)
      return { exists: false, error: error.message }
    }
    
    return { 
      exists: !!data, 
      profile: data,
      error: null 
    }
  } catch (error) {
    console.error('Exception checking user profile:', error)
    return { exists: false, error: error.message }
  }
}

// Function to create missing user profile
export const createUserProfile = async (user, defaultRole = 'student') => {
  try {
    const profileData = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email.split('@')[0],
      role: defaultRole,
      is_active: true,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .insert(profileData)
      .select()
      .single()

    if (error) {
      console.error('Error creating user profile:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ User profile created successfully:', data)
    return { success: true, profile: data }
  } catch (error) {
    console.error('Exception creating user profile:', error)
    return { success: false, error: error.message }
  }
}

// Function to fix current user's profile
export const fixCurrentUserProfile = async (defaultRole = 'student') => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { 
        success: false, 
        error: 'No authenticated user found' 
      }
    }

    console.log('🔍 Checking profile for user:', user.email)

    // Check if profile exists
    const profileCheck = await checkUserProfile(user.id)
    
    if (profileCheck.error) {
      return { 
        success: false, 
        error: `Error checking profile: ${profileCheck.error}` 
      }
    }

    if (profileCheck.exists) {
      console.log('✅ User profile already exists:', profileCheck.profile)
      return { 
        success: true, 
        message: 'Profile already exists',
        profile: profileCheck.profile 
      }
    }

    // Create missing profile
    console.log('🔧 Creating missing user profile...')
    const createResult = await createUserProfile(user, defaultRole)
    
    if (!createResult.success) {
      return { 
        success: false, 
        error: `Failed to create profile: ${createResult.error}` 
      }
    }

    return {
      success: true,
      message: 'Profile created successfully',
      profile: createResult.profile
    }
  } catch (error) {
    console.error('Exception in fixCurrentUserProfile:', error)
    return { 
      success: false, 
      error: error.message 
    }
  }
}

// Function to bulk fix all users missing profiles
export const bulkFixUserProfiles = async () => {
  try {
    // This would require admin privileges to list all auth users
    // For now, we'll focus on fixing the current user
    console.log('⚠️ Bulk fix requires admin privileges')
    console.log('💡 Use fixCurrentUserProfile() for individual users')
    
    return {
      success: false,
      error: 'Bulk fix requires admin privileges. Use fixCurrentUserProfile() instead.'
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Function to update user role (admin function)
export const updateUserRole = async (userId, newRole) => {
  try {
    const validRoles = ['student', 'teacher', 'admin', 'super_admin']
    
    if (!validRoles.includes(newRole)) {
      return { 
        success: false, 
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
      }
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        role: newRole,
        is_super_admin: newRole === 'super_admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user role:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ User role updated successfully:', data)
    return { success: true, profile: data }
  } catch (error) {
    console.error('Exception updating user role:', error)
    return { success: false, error: error.message }
  }
}

// Function to diagnose authentication issues
export const diagnoseAuthIssues = async () => {
  try {
    const issues = []
    const fixes = []

    // Check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      issues.push('No authenticated user found')
      fixes.push('Please sign in first')
      return { issues, fixes, canProceed: false }
    }

    console.log('👤 Current user:', user.email)

    // Check profile existence
    const profileCheck = await checkUserProfile(user.id)
    
    if (profileCheck.error) {
      issues.push(`Error checking profile: ${profileCheck.error}`)
      fixes.push('Check database connection and permissions')
    } else if (!profileCheck.exists) {
      issues.push('User profile does not exist in user_profiles table')
      fixes.push('Run fixCurrentUserProfile() to create missing profile')
    } else {
      const profile = profileCheck.profile
      console.log('📋 Current profile:', profile)
      
      if (!profile.role) {
        issues.push('User profile exists but has no role assigned')
        fixes.push('Update role in user_profiles table')
      }
      
      if (!profile.is_active) {
        issues.push('User profile is inactive')
        fixes.push('Set is_active = true in user_profiles table')
      }
    }

    // Check database connection
    try {
      const { error: dbError } = await supabase
        .from('user_profiles')
        .select('count')
        .limit(1)
      
      if (dbError) {
        issues.push(`Database connection issue: ${dbError.message}`)
        fixes.push('Check Supabase configuration and RLS policies')
      }
    } catch (dbError) {
      issues.push(`Database connection failed: ${dbError.message}`)
      fixes.push('Verify Supabase URL and API key')
    }

    return {
      issues,
      fixes,
      canProceed: issues.length === 0,
      user: user,
      profile: profileCheck.exists ? profileCheck.profile : null
    }
  } catch (error) {
    return {
      issues: [`Diagnosis failed: ${error.message}`],
      fixes: ['Check console for detailed error information'],
      canProceed: false
    }
  }
}

// Export all functions
export default {
  checkUserProfile,
  createUserProfile,
  fixCurrentUserProfile,
  bulkFixUserProfiles,
  updateUserRole,
  diagnoseAuthIssues
}