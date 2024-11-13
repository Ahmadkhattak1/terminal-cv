// src/components/Login.js
import React, { useEffect, useState } from 'react';
import './Login.css';
import { auth, provider } from '../firebaseConfig';
import { signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';

function Login() {
  const [user, loadingAuthState, error] = useAuthState(auth);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false); // Local loading state

  useEffect(() => {
    if (loadingAuthState) return; // Do nothing while loading
    if (user) {
      // If user is authenticated, navigate to admin
      navigate('/admin');
    }
  }, [user, loadingAuthState, navigate]);

  const handleLogin = async () => {
    setIsLoading(true); // Start loading
    try {
      const result = await signInWithPopup(auth, provider);
      console.log('Signed in as:', result.user.email);
      // The useAuthState hook will handle the navigation
    } catch (error) {
      console.error('Error during sign-in:', error);
      // Optionally, you can set an error state here to display to the user
    } finally {
      setIsLoading(false); // End loading
    }
  };

  return (
    <div className="login-container">
      <h1>Admin Login</h1>
      {error && <p className="error-message">Error: {error.message}</p>}
      <button
        onClick={handleLogin}
        className="login-button"
        disabled={isLoading} // Disable button while loading
        aria-busy={isLoading}
        aria-label={isLoading ? 'Signing in' : 'Sign in with Google'}
      >
        {isLoading ? (
          <>
            <div className="spinner" aria-hidden="true"></div>
            <span className="loading-text">Signing in...</span>
          </>
        ) : (
          'Sign in with Google'
        )}
      </button>
    </div>
  );
}

export default Login;
