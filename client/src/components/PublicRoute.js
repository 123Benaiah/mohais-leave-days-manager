import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * PublicRoute - For routes that should only be accessible when NOT logged in (like login pages)
 * @param {Object} props
 * @param {React.ReactNode} props.children - The component to render if not authenticated
 * @param {string} props.authType - 'admin' or 'superAdmin' - determines which auth to check
 * @param {function} props.onAlreadyAuthenticated - Callback when already logged in user tries to access
 */
function PublicRoute({ children, authType = 'admin', onAlreadyAuthenticated }) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = () => {
      let token, data;

      if (authType === 'superAdmin') {
        token = localStorage.getItem('superAdminToken');
        data = localStorage.getItem('superAdminData');
      } else {
        token = localStorage.getItem('adminToken');
        data = localStorage.getItem('adminData');
      }

      const authenticated = !!(token && data);
      setIsAuthenticated(authenticated);

      if (authenticated && onAlreadyAuthenticated) {
        onAlreadyAuthenticated();
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [authType, onAlreadyAuthenticated]);

  if (isChecking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #1f1f1f, #2a2a2a, #1f1f1f)'
      }}>
        <div style={{ color: '#fff', fontSize: '1.1rem' }}>Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    const redirectTo = authType === 'superAdmin' ? '/super-admin/dashboard' : '/admin/dashboard';
    return <Navigate to={redirectTo} state={{ from: location, showToast: true }} replace />;
  }

  return children;
}

export default PublicRoute;
