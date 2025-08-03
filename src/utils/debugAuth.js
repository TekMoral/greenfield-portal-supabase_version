// Debug authentication helper
export const createMockAdminSession = () => {
  const mockAdmin = {
    user: {
      id: 'debug-admin-001',
      email: 'admin@victoryintl.edu.ng',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    profile: {
      id: 'debug-admin-001',
      email: 'admin@victoryintl.edu.ng',
      role: 'super_admin',
      is_active: true,
      firstName: 'System',
      lastName: 'Administrator',
      name: 'System Administrator'
    }
  };

  // Store in localStorage for the auth context to pick up
  localStorage.setItem('supabase.auth.token', JSON.stringify(mockAdmin));
  
  console.log('🔧 Debug: Mock admin session created');
  return mockAdmin;
};

export const clearMockSession = () => {
  localStorage.removeItem('supabase.auth.token');
  console.log('🔧 Debug: Mock session cleared');
};

export const getCurrentMockSession = () => {
  try {
    const mockAuth = localStorage.getItem('supabase.auth.token');
    return mockAuth ? JSON.parse(mockAuth) : null;
  } catch (error) {
    console.error('Error parsing mock session:', error);
    return null;
  }
};