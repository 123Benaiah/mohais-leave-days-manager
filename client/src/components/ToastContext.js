import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

/* =========================
   Config
========================= */
const TOAST_DURATION = 7000; // 7 seconds
const HIDE_ANIMATION_DURATION = 600;

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({
    show: false,
    type: '',
    title: '',
    message: '',
    hiding: false
  });

  const showToast = useCallback((type, title, message) => {
    setToast({
      show: true,
      type,
      title,
      message,
      hiding: false
    });

    // Start hide after 7 seconds
    setTimeout(() => {
      setToast(prev => ({
        ...prev,
        hiding: true
      }));

      // Remove toast after hide animation
      setTimeout(() => {
        setToast({
          show: false,
          type: '',
          title: '',
          message: '',
          hiding: false
        });
      }, HIDE_ANIMATION_DURATION);

    }, TOAST_DURATION);
  }, []);

  const closeToast = useCallback(() => {
    setToast(prev => ({
      ...prev,
      hiding: true
    }));

    setTimeout(() => {
      setToast({
        show: false,
        type: '',
        title: '',
        message: '',
        hiding: false
      });
    }, HIDE_ANIMATION_DURATION);
  }, []);

  const getIconColor = () => {
    switch (toast.type) {
      case 'success': return '#22c55e';
      case 'error': return '#f60505';
      case 'warning': return '#f10f0f';
      default: return '#3b82f6';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '!';
      default: return 'i';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, closeToast }}>
      {children}

      {/* Toast Overlay */}
      {toast.show && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingTop: '10px',
            zIndex: 99999,
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              width: '380px',
              backgroundColor: '#fff',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              pointerEvents: 'auto',
              opacity: toast.hiding ? 0 : 1,
              transform: toast.hiding ? 'scale(0.95)' : 'scale(1)',
              transition: 'opacity 0.3s ease, transform 0.3s ease'
            }}
          >
            {/* Top color bar */}
            <div
              style={{
                height: '4px',
                backgroundColor: getIconColor()
              }}
            />

            <div
              style={{
                display: 'flex',
                gap: '14px',
                padding: '20px',
                alignItems: 'flex-start'
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: getIconColor(),
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}
              >
                {getIcon()}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4
                  style={{
                    margin: '0 0 6px',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#1f2937'
                  }}
                >
                  {toast.title}
                </h4>
                <p
                  style={{
                    margin: 0,
                    fontSize: '14px',
                    color: '#6b7280',
                    lineHeight: 1.5
                  }}
                >
                  {toast.message}
                </p>
              </div>

              {/* Close */}
              <button
                onClick={closeToast}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  padding: 0,
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>

            {/* Progress bar */}
            <div
              style={{
                height: '3px',
                backgroundColor: '#f3f4f6',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: getIconColor(),
                  animation: `toastProgress ${TOAST_DURATION}ms linear forwards`
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Progress animation */}
      <style>{`
        @keyframes toastProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export default ToastContext;