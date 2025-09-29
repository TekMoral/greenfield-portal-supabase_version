// src/contexts/ToastContext.jsx
import { createContext, useState, useCallback } from 'react';
import Toast from '../components/ui/Toast'; 


const ToastContext = createContext(); // ✅ DO NOT export this

const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({
    isVisible: false,
    message: '',
    type: 'success',
  });

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    try {
      const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
      const { sanitizePublicMessage } = require('../utils/errorUtils');
      const safe = sanitizePublicMessage(message);
      if (isDev) {
        console.log('🍞 Toast called:', { message: safe, type, duration });
      }
      setToast({ isVisible: true, message: safe, type });
      setTimeout(() => {
        setToast(prev => ({ ...prev, isVisible: false }));
      }, duration);
    } catch (_) {
      setToast({ isVisible: true, message: String(message || 'Notice'), type });
      setTimeout(() => {
        setToast(prev => ({ ...prev, isVisible: false }));
      }, duration);
    }
  }, []);

  const onClose = () => setToast(prev => ({ ...prev, isVisible: false }));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={onClose}
      />
    </ToastContext.Provider>
  );
};

export { ToastProvider };
export default ToastContext; // ✅ Default export
