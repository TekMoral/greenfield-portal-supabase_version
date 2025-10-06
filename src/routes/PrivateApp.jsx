import React from 'react';
import { AuthProvider } from '../contexts/SupabaseAuthContext';
import Header from '../components/Header';

export default function PrivateApp({ children }) {
  return (
    <AuthProvider>
      <Header />
      <div className="app-content">{children}</div>
    </AuthProvider>
  );
}
