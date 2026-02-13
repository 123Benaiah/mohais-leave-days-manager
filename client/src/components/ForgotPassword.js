import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BASE_URL } from '../config';
import './css/ForgotPassword.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

 const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  setMessage('');

  try {
    console.log('Sending forgot password request for email:', email);
    const response = await fetch(`${BASE_URL}/api/admin/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    console.log('Server response:', data);

    if (data.success) {
      setSubmitted(true);
      setMessage(data.message);
    } else {
      setError(data.message || 'Request failed');
    }
  } catch (err) {
    console.error('Network error:', err);
    setError('Server error. Please try again.');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <div className="forgot-password-header">
          <div className="brand-logo">MOHAIS</div>
          <h1>Reset Password</h1>
        </div>

        <div className="forgot-password-content">
          {submitted ? (
            <div className="success-state">
              <div className="success-message">
                {message || 'Reset link sent successfully!'}
              </div>
              <p className="instruction-text">
                Check your email for the password reset link. If you don't see it, check your spam folder.
              </p>
              <Link to="/admin/login" style={{ textDecoration: 'none' }}>
                <button className="back-btn">
                  Back to Login
                </button>
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <p className="instruction-text">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form className="forgot-password-form" onSubmit={handleSubmit}>
                <div className="input-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="loading-spinner"></div>
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>

                <div className="form-footer">
                  <Link to="/admin/login" className="back-link">
                    Back to Login
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;