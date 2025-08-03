// Authentication debugging utilities
import { supabase } from '../lib/supabaseClient'

export const debugAuth = async () => {
  console.group('🔍 Authentication Debug Information')
  
  try {
    // Check current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('Current session:', session)
    if (sessionError) console.error('Session error:', sessionError)
    
    // Check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('Current user:', user)
    if (userError) console.error('User error:', userError)
    
    // If user exists, try to fetch profile
    if (user) {
      console.log('Attempting to fetch user profile...')
      
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      console.log('User profile:', profile)
      if (profileError) {
        console.error('Profile error:', profileError)
        
        // Check if table exists and user has access
        const { data: tableCheck, error: tableError } = await supabase
          .from('user_profiles')
          .select('count')
          .limit(1)
        
        console.log('Table access check:', tableCheck)
        if (tableError) console.error('Table access error:', tableError)
      }
    }
    
    // Check environment variables
    console.log('Environment check:', {
      hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
      hasSupabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL
    })
    
  } catch (error) {
    console.error('Debug error:', error)
  }
  
  console.groupEnd()
}

export const debugUserProfile = async (userId) => {
  console.group(`🔍 User Profile Debug for: ${userId}`)
  
  try {
    // Direct query
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
    
    console.log('Query result:', { data, error })
    
    if (data && data.length === 0) {
      console.warn('No profile found - user may need to be created in user_profiles table')
    }
    
    if (error) {
      console.error('Query error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
    }
    
  } catch (error) {
    console.error('Debug error:', error)
  }
  
  console.groupEnd()
}

// Function to create a user profile if it doesn't exist
export const createUserProfile = async (user, additionalData = {}) => {
  try {
    console.log('Creating user profile for:', user.email)
    
    const profileData = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email,
      role: 'student', // Default role
      is_active: true,
      ...additionalData
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
    
    console.log('User profile created successfully:', data)
    return { success: true, data }
    
  } catch (error) {
    console.error('Exception creating user profile:', error)
    return { success: false, error: error.message }
  }
}

// Function to check and fix user profile issues
export const checkAndFixUserProfile = async (user) => {
  if (!user) {
    console.warn('No user provided to checkAndFixUserProfile')
    return { success: false, error: 'No user provided' }
  }
  
  try {
    // First, check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (fetchError && fetchError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      console.log('Profile not found, creating new profile...')
      return await createUserProfile(user)
    }
    
    if (fetchError) {
      console.error('Error fetching profile:', fetchError)
      return { success: false, error: fetchError.message }
    }
    
    // Profile exists, check if it needs updates
    if (existingProfile) {
      console.log('Profile exists:', existingProfile)
      
      // Check if email needs updating
      if (existingProfile.email !== user.email) {
        console.log('Updating email in profile...')
        const { data: updatedProfile, error: updateError } = await supabase
          .from('user_profiles')
          .update({ email: user.email })
          .eq('id', user.id)
          .select()
          .single()
        
        if (updateError) {
          console.error('Error updating profile:', updateError)
          return { success: false, error: updateError.message }
        }
        
        return { success: true, data: updatedProfile }
      }
      
      return { success: true, data: existingProfile }
    }
    
  } catch (error) {
    console.error('Exception in checkAndFixUserProfile:', error)
    return { success: false, error: error.message }
  }
}