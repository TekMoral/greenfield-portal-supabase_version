// Test Authentication Flow
// Run this in browser console on your app

console.log('🔍 Testing authentication flow...')

// Test 1: Check if Supabase client is working
console.log('1. Supabase client:', window.supabase || 'Not available')

// Test 2: Check current session
const testAuth = async () => {
  try {
    // Import your supabase client (adjust path as needed)
    const { supabase } = await import('./src/lib/supabaseClient.js')
    
    console.log('2. Supabase client loaded:', supabase)
    
    // Test 3: Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('3. Current session:', { session, sessionError })
    
    // Test 4: Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('4. Current user:', { user, userError })
    
    // Test 5: Try to sign in
    if (!user) {
      console.log('5. No user found, testing sign in...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'folashade@greenfield.edu.ng',
        password: 'YOUR_PASSWORD_HERE' // Replace with actual password
      })
      console.log('5. Sign in result:', { data, error })
    } else {
      console.log('5. User already signed in:', user.email)
    }
    
    // Test 6: Try to fetch profile after authentication
    if (user || data?.user) {
      const userId = user?.id || data?.user?.id
      console.log('6. Fetching profile for user:', userId)
      
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      console.log('6. Profile result:', { profile, profileError })
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testAuth()