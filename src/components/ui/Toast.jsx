import React from 'react';

const Toast = ({ isVisible, message, type = 'success', onClose }) => {
  if (!isVisible) {

    return null;
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'info':
      default:
        return 'bg-blue-500 text-white';
    }
  };

  return (
    <div
      className="fixed right-4 z-[11000] transition-all duration-300 ease-in-out transform translate-x-0"
      style={{ top: 'calc(var(--header-height, 72px) + 16px)' }}
    >
      <div className={`px-4 py-3 rounded-lg shadow-lg ${getTypeStyles()} flex items-center gap-2 max-w-sm`}>
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="ml-2 hover:opacity-75">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toast;
