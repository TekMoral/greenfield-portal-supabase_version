// src/contexts/SupabaseAuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getCurrentUser, getUserProfile } from '../lib/supabaseClient'
import { debugUserProfile, checkAndFixUserProfile } from '../utils/authDebug'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null)
  const [isActive, setIsActive] = useState(false)
  const [initialSessionLoaded, setInitialSessionLoaded] = useState(false)
  
  // AbortController for profile fetching
  const profileAbortControllerRef = React.useRef(null)

  useEffect(() => {
    let isMounted = true

    // Cancel any ongoing profile fetch
    const cancelProfileFetch = () => {
      if (profileAbortControllerRef.current) {
        profileAbortControllerRef.current.abort()
        profileAbortControllerRef.current = null
      }
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Error getting initial session:', error)
          if (isMounted) {
            setLoading(false)
            setInitialSessionLoaded(true)
          }
          return
        }
        
        if (session?.user && isMounted) {
          setUser(session.user)
          await fetchUserProfile(session.user.id)
        } else if (isMounted) {
          cancelProfileFetch() // Cancel any ongoing profile fetch
          setUser(null)
          setProfile(null)
          setRole(null)
          setIsActive(false)
        }
      } catch (error) {
        console.error('💥 Exception getting initial session:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
          setInitialSessionLoaded(true)
        }
      }
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only process auth state changes after initial session is loaded
        // This prevents race conditions between initial session and auth state changes
        if (!initialSessionLoaded && event === 'INITIAL_SESSION') {
          if (session?.user && isMounted) {
            setUser(session.user)
            await fetchUserProfile(session.user.id)
          } else if (isMounted) {
            cancelProfileFetch() // Cancel any ongoing profile fetch
            setUser(null)
            setProfile(null)
            setRole(null)
            setIsActive(false)
          }
          if (isMounted) {
            setLoading(false)
            setInitialSessionLoaded(true)
          }
          return
        }

        // Handle other auth events (SIGNED_IN, SIGNED_OUT, etc.)
        if (initialSessionLoaded && isMounted) {
          if (session?.user) {
            setUser(session.user)
            await fetchUserProfile(session.user.id)
          } else {
            cancelProfileFetch() // Cancel any ongoing profile fetch
            setUser(null)
            setProfile(null)
            setRole(null)
            setIsActive(false)
          }
        }
      }
    )

    // Start the initial session check
    getInitialSession()

    return () => {
      isMounted = false
      cancelProfileFetch() // Cancel any ongoing profile fetch on cleanup
      subscription.unsubscribe()
    }
  }, [initialSessionLoaded])

  // Direct profile fetch that bypasses auth context timeouts
  const fetchUserProfileDirect = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Error fetching profile directly:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Error fetching profile directly:', error)
      return null
    }
  }

  const fetchUserProfile = async (userId) => {
    if (!userId) {
      setProfile(null)
      setRole(null)
      setIsActive(false)
      return
    }

    // Cancel any previous profile fetch
    if (profileAbortControllerRef.current) {
      profileAbortControllerRef.current.abort()
    }
    
    // Create new AbortController for this fetch
    profileAbortControllerRef.current = new AbortController()
    const signal = profileAbortControllerRef.current.signal

    try {
      // Check if we should still proceed (component might be unmounted)
      if (signal.aborted) return

      // First try the helper function with abort signal
      let profileData = await getUserProfile(userId, signal)
      
      // Check again if we should proceed
      if (signal.aborted) return
      
      // If that fails, try direct fetch
      if (!profileData) {
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single()
            .abortSignal(signal)
          
          if (!error && data) {
            profileData = data
          }
        } catch (directError) {
          // Don't log abort errors for direct fetch either
          if (directError.name !== 'AbortError' && !signal.aborted) {
            console.error('Direct fetch error:', directError)
          }
        }
      }
      
      // Check again if we should proceed
      if (signal.aborted) return
      
      // If still no profile, try to create one automatically
      if (!profileData) {
        await debugUserProfile(userId)
        
        // Get the current user from Supabase auth
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
        
        if (currentUser && currentUser.id === userId && !signal.aborted) {
          const result = await checkAndFixUserProfile(currentUser)
          
          if (result.success) {
            profileData = result.data
          } else {
            console.error('❌ Failed to create profile:', result.error)
          }
        }
      }
      
      // Final check before setting state
      if (!signal.aborted) {
        if (profileData) {
          setProfile(profileData)
          setRole(profileData.role)
          setIsActive(profileData.is_active !== false) // Default to true unless explicitly false
        } else {
          console.error('❌ No profile found and could not create one for user:', userId)
          setProfile(null)
          setRole(null)
          setIsActive(false)
        }
      }
    } catch (error) {
      // Don't log errors if the request was aborted
      if (!signal.aborted && error.name !== 'AbortError') {
        console.error('💥 Exception in fetchUserProfile:', error)
        setProfile(null)
        setRole(null)
        setIsActive(false)
      }
    }
  }

  const signIn = async (email, password) => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })

      if (error) {
        console.error('Sign in error:', error)
        return { 
          success: false, 
          error: error.message || 'Failed to sign in'
        }
      }

      if (data.user) {
        // Profile will be fetched automatically by the auth state change listener
        return { success: true, user: data.user }
      }

      return { success: false, error: 'No user returned from sign in' }
    } catch (error) {
      console.error('Sign in exception:', error)
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred'
      }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email, password, userData = {}) => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: userData.fullName || '',
            ...userData
          }
        }
      })

      if (error) {
        console.error('Sign up error:', error)
        return { 
          success: false, 
          error: error.message || 'Failed to create account'
        }
      }

      return { 
        success: true, 
        user: data.user,
        needsConfirmation: !data.session
      }
    } catch (error) {
      console.error('Sign up exception:', error)
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred'
      }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      
      // Clear state first to prevent UI issues
      setUser(null)
      setProfile(null)
      setRole(null)
      setIsActive(false)
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Sign out error:', error)
        return { success: false, error: error.message }
      }
      
      console.log('User signed out successfully')
      return { success: true }
    } catch (error) {
      console.error('Sign out exception:', error)
      return { 
        success: false, 
        error: error.message || 'Failed to sign out'
      }
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates) => {
    try {
      if (!user) {
        return { success: false, error: 'No user logged in' }
      }

      // Update auth user if email is being changed
      if (updates.email && updates.email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: updates.email
        })
        
        if (authError) {
          return { success: false, error: authError.message }
        }
      }

      // Update user profile
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Profile update error:', error)
        return { success: false, error: error.message }
      }

      setProfile(data)
      if (data.role) setRole(data.role)
      if (typeof data.is_active === 'boolean') setIsActive(data.is_active)
      
      return { success: true, data }
    } catch (error) {
      console.error('Update profile exception:', error)
      return { 
        success: false, 
        error: error.message || 'Failed to update profile'
      }
    }
  }

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Reset password exception:', error)
      return { 
        success: false, 
        error: error.message || 'Failed to send reset email'
      }
    }
  }

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Session refresh error:', error)
        return { success: false, error: error.message }
      }

      if (data.user) {
        await fetchUserProfile(data.user.id)
      }

      return { success: true, session: data.session }
    } catch (error) {
      console.error('Refresh session exception:', error)
      return { 
        success: false, 
        error: error.message || 'Failed to refresh session'
      }
    }
  }

  // Helper function to check if user has specific role
  const hasRole = (requiredRole) => {
    if (!role) return false
    
    // If user has a role but is_active is explicitly false, deny access
    if (isActive === false) return false
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(role)
    }
    
    return role === requiredRole
  }

  // Helper function to check if user is admin (admin or super_admin)
  const isAdmin = () => {
    return hasRole(['admin', 'super_admin'])
  }

  // Helper function to check if user is super admin
  const isSuperAdmin = () => {
    return hasRole('super_admin')
  }

  const value = {
    // State
    user,
    profile,
    role,
    loading,
    isActive,
    
    // Auth methods
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword,
    refreshSession,
    
    // Helper methods
    hasRole,
    isAdmin,
    isSuperAdmin,
    fetchUserProfile,
    
    // Computed values
    isAuthenticated: !!user && !!profile,
    isStudent: hasRole('student'),
    isTeacher: hasRole('teacher'),
    isAdminUser: isAdmin(),
    isSuperAdminUser: isSuperAdmin()
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}