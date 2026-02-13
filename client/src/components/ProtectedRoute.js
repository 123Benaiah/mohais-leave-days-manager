import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * ProtectedRoute - Protects routes that require authentication
 * @param {Object} props
 * @param {React.ReactNode} props.children - The component to render if authenticated
 * @param {string} props.authType - 'admin' or 'superAdmin' - determines which auth to check
 * @param {function} props.onUnauthorized - Callback when unauthorized access is attempted
 */
function ProtectedRoute({ children, authType = 'admin', onUnauthorized }) {
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

      if (!authenticated && onUnauthorized) {
        onUnauthorized();
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [authType, onUnauthorized]);

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

  if (!isAuthenticated) {
    const redirectTo = authType === 'superAdmin' ? '/super-admin/login' : '/admin/login';
    return <Navigate to={redirectTo} state={{ from: location, showToast: true }} replace />;
  }

  return children;
}

export default ProtectedRoute;
