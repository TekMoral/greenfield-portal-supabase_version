// src/pages/ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import PasswordInput from '../components/ui/PasswordInput';
import schoolLogo from '../assets/images/greenfield-logo.png';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('loading'); // 'loading', 'reset', 'success', 'error'

  // Helper to parse URL hash and query for tokens/code
  const getAuthParamsFromUrl = () => {
    const url = new URL(window.location.href);
    const query = url.searchParams;
    const hash = url.hash?.startsWith('#') ? url.hash.slice(1) : url.hash || '';
    const hashParams = new URLSearchParams(hash);

    const params = {
      code: query.get('code') || hashParams.get('code'),
      accessToken: query.get('access_token') || hashParams.get('access_token'),
      refreshToken: query.get('refresh_token') || hashParams.get('refresh_token'),
      type: query.get('type') || hashParams.get('type'),
      email: query.get('email') || hashParams.get('email')
    };

    return params;
  };

  // Remove sensitive tokens from the URL after processing
  const cleanUrl = () => {
    try {
      const url = new URL(window.location.href);
      const clean = url.origin + url.pathname; // drop query + hash
      window.history.replaceState({}, document.title, clean);
    } catch (_) {
      // no-op
    }
  };

  useEffect(() => {
    const handlePasswordReset = async () => {
      const { code, accessToken, refreshToken, type, email } = getAuthParamsFromUrl();

      // Prefer the modern code exchange flow if available
      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Exchange code error:', error);
            setError('Invalid or expired reset link. Please request a new password reset.');
            setStep('error');
            return;
          }

          if (data?.user) {
            setStep('reset');
            cleanUrl();
            return;
          }

          setError('Unable to verify reset link. Please try again.');
          setStep('error');
          return;
        } catch (err) {
          console.error('Reset link (code) error:', err);
          setError('An error occurred. Please try again.');
          setStep('error');
          return;
        }
      }

      // Fallback to legacy access_token/refresh_token flow (hash-based params)
      if (accessToken) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            // refresh token may not always be present on recovery links, supply if available
            refresh_token: refreshToken || undefined
          });

          if (error) {
            console.error('Session error:', error);
            setError('Invalid or expired reset link. Please request a new password reset.');
            setStep('error');
            return;
          }

          if (data?.user) {
            setStep('reset');
            cleanUrl();
          } else {
            setError('Unable to verify reset link. Please try again.');
            setStep('error');
          }
        } catch (err) {
          console.error('Reset link error:', err);
          setError('An error occurred. Please try again.');
          setStep('error');
        }
        return;
      }

      // If only email was present (from a custom link), inform the user
      if (email) {
        setError('Please use the reset link from your email to continue.');
        setStep('error');
        return;
      }

      // If we at least have the recovery type but no tokens, indicate invalid
      if (type === 'recovery') {
        setError('Invalid reset link. Please request a new password reset.');
        setStep('error');
        return;
      }

      // No recognizable params
      setError('Invalid reset link. Please request a new password reset.');
      setStep('error');
    };

    handlePasswordReset();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      setStep('success');
      toast.success('Password updated successfully!');

      // Best-effort: clear first-login flag when present
      try { await supabase.rpc('rpc_clear_require_password_change'); } catch (_) {}

      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      console.error('Password update error:', err);
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-28 h-28 bg-white rounded-full mb-4 shadow-lg p-3">
            <img 
              src={schoolLogo} 
              alt="Greenfield College Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {step === 'success' ? 'Password Updated!' : step === 'error' ? 'Reset Link Issue' : 'Reset Your Password'}
          </h1>
          <p className="text-gray-600">
            {step === 'success' 
              ? 'Your password has been successfully updated'
              : step === 'error' 
                ? 'There was an issue with your reset link'
                : 'Enter your new password below'
            }
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {step === 'reset' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* New Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <PasswordInput
                    id="password"
                    placeholder="Enter your new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 outline-none"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Password must be at least 6 characters long
                </p>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <PasswordInput
                    id="confirmPassword"
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                  <svg
                    className="h-5 w-5 text-red-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Password Updated Successfully!
                </h3>
                <p className="text-gray-600 mb-4">
                  Your password has been updated. You can now sign in with your new password.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    You will be redirected to the login page in a few seconds...
                  </p>
                </div>
              </div>

              <button
                onClick={handleBackToLogin}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                Go to Login
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Reset Link Issue
                </h3>
                <p className="text-gray-600 mb-4">
                  {error}
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                  <h4 className="font-medium text-blue-900 mb-2">What to do:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Check your email for the latest reset link</li>
                    <li>• Make sure you're using the complete link from the email</li>
                    <li>• Request a new password reset if the link has expired</li>
                    <li>• Contact support if you continue having issues</li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleBackToLogin}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Back to Login
                </button>
                <button
                  onClick={() => (window.location.href = '/login')}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  Request New Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;