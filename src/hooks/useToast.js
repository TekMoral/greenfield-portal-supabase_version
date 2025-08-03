// src/hooks/useToast.js
import { useContext } from 'react';
import ToastContext from '../contexts/ToastContext'; // ✅ Import default

const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default useToast;
// ✅ Export default useToast
// This hook provides access to the showToast function from the ToastContext