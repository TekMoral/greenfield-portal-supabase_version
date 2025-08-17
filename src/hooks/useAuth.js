// src/hooks/useAuth.js
import { useContext, createContext } from 'react'

// Create a context reference that matches the one in SupabaseAuthContext
const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Export the context so it can be used by the AuthProvider
export { AuthContext }