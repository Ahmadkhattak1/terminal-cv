// src/components/PrivateRoute.js
import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebaseConfig';

function PrivateRoute({ children }) {
  const [user, loading, error] = useAuthState(auth);
  const navigate = useNavigate();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    console.error('Authentication error:', error);
    return <div className="error">Error: {error.message}</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  const authorizedEmail = 'ahdfactz@gmail.com'; // Use lowercase for consistency
  if (user.email.toLowerCase() !== authorizedEmail.toLowerCase()) {
    console.warn(`Unauthorized email attempted access: ${user.email}`);
    return (
      <div className="admin-unauthorized">
        <p>Unauthorized Access</p>
        <button
          onClick={() => {
            auth.signOut();
            navigate('/login');
          }}
          className="unauthorized-logout-button"
        >
          Logout
        </button>
        <button
          onClick={() => {
            auth.signOut();
            navigate('/login');
          }}
          className="unauthorized-login-button"
        >
          Retry Login
        </button>
      </div>
    );
  }

  return children;
}

export default PrivateRoute;
