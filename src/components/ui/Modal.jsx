import React, { useEffect, useRef } from 'react';

export default function Modal({ 
  onClose, 
  title, 
  subtitle, 
  children, 
  maxWidth = 'max-w-3xl',
  headerActions = null 
}) {
  const modalRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on backdrop click (but not modal content click)
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4" 
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={handleBackdropClick}
      ></div>

      {/* Modal Container */}
      <div 
        ref={modalRef}
        className={`relative bg-white rounded-2xl shadow-2xl ${maxWidth} w-full max-h-[90vh] overflow-y-auto`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex justify-between items-center rounded-t-2xl z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {headerActions}
            <button 
              onClick={onClose} 
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 text-xl"
              aria-label="بستن"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        {children}
      </div>
    </div>
  );
}