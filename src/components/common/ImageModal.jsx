import React, { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';

const ImageModal = ({ isOpen, onClose, student }) => {
  const location = useLocation();

  // Stable handlers (avoid recreating listeners unnecessarily)
  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  // Keep scroll position stable while modal is open; lock body to prevent jump-to-top on close
  const scrollYRef = useRef(0);
  const prevBodyStylesRef = useRef({ overflow: '', position: '', top: '', width: '' });

  useEffect(() => {
    if (!isOpen) return;

    const body = document.body;
    // Save previous inline styles
    prevBodyStylesRef.current = {
      overflow: body.style.overflow || '',
      position: body.style.position || '',
      top: body.style.top || '',
      width: body.style.width || ''
    };

    // Save current scrollY
    scrollYRef.current = window.scrollY || window.pageYOffset || 0;

    document.addEventListener('keydown', handleKeyDown);

    // Lock scroll using fixed positioning
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollYRef.current}px`;
    body.style.width = '100%';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore styles
      const topVal = body.style.top;
      body.style.overflow = prevBodyStylesRef.current.overflow;
      body.style.position = prevBodyStylesRef.current.position;
      body.style.top = prevBodyStylesRef.current.top;
      body.style.width = prevBodyStylesRef.current.width;

      // Restore scroll position
      const offset = topVal ? parseInt(topVal, 10) : 0;
      if (!Number.isNaN(offset)) {
        window.scrollTo(0, -offset);
      } else if (typeof scrollYRef.current === 'number') {
        window.scrollTo(0, scrollYRef.current);
      }
    };
  }, [isOpen, handleKeyDown]);

  // Auto-close if route changes while open (prevents stale overlays)
  useEffect(() => {
    if (isOpen) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Final safety: ensure inline styles are cleared on unmount
  useEffect(() => {
    return () => {
      const body = document.body;
      body.style.overflow = '';
      body.style.position = '';
      body.style.top = '';
      body.style.width = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  const admissionNumber = student?.admission_number || student?.admissionNumber || 'N/A';
  const classDisplay = student?.className || (student?.classes && student.classes.name) || 'N/A';

  // After all hooks are called, you may return null when closed
  if (!isOpen || !student) return null;

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl w-auto max-w-lg overflow-hidden">
        {/* Header with Close Button */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Student Profile</h2>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
            className="text-white hover:text-gray-200 transition-colors duration-200"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex flex-col items-center space-y-4">
            {/* Large Profile Image */}
            <div className="relative w-72 h-72">
              {(student?.profileImageUrl || student?.profile_image || student?.image) ? (
                <img
                  src={student.profileImageUrl || student.profile_image || student.image}
                  alt={`${(student?.full_name || `${student?.firstName || ''} ${student?.surname || ''}`).trim()}`}
                  className="w-full h-full object-cover rounded-lg shadow-lg"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      (student?.full_name || `${student?.firstName || ''} ${student?.surname || ''}`).trim()
                    )}&size=288&background=random&color=fff&bold=true&format=png`;
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg shadow-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-gray-400 mb-2">
                      {(student?.firstName?.[0] || student?.full_name?.[0] || '')}{(student?.surname?.[0] || '')}
                    </div>
                    <p className="text-gray-500 text-sm">No photo available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Student Info */}
            <div className="text-center space-y-3 w-full">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col items-center space-y-1 bg-blue-50 rounded-lg p-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="font-medium text-blue-800 text-center">{admissionNumber}</span>
                </div>
                <div className="flex flex-col items-center space-y-1 bg-green-50 rounded-lg p-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span className="font-medium text-green-800 text-center">{classDisplay}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default ImageModal;
