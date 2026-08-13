import React, { useEffect, useRef } from 'react';

export default function Modal({
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-3xl',
  headerActions = null,
}) {
  const modalRef = useRef(null);
  const previouslyFocused = useRef(null);

  // Focus trap + Escape + focus restore
  useEffect(() => {
    previouslyFocused.current = document.activeElement;

    const getFocusable = () =>
      modalRef.current
        ? Array.from(
          modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.disabled)
        : [];

    // Focus the first focusable element on open
    const focusables = getFocusable();
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      modalRef.current?.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const els = getFocusable();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];

      // Trap Tab / Shift+Tab inside the modal
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Return focus to the element that opened the modal
      previouslyFocused.current?.focus();
    };
  }, [onClose]);

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
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative bg-white rounded-2xl shadow-2xl ${maxWidth} w-full max-h-[90vh] overflow-y-auto outline-none`}
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