import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import PasswordInput from "../components/ui/PasswordInput";
import PasswordResetModal from "../components/auth/PasswordResetModal";
import schoolLogo from "../assets/images/greenfield-logo.png";
import toast from "react-hot-toast";
import { Shield, UserCheck, GraduationCap } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const roleOptions = [
    { key: 'admin', label: 'Admin', Icon: Shield },
    { key: 'teacher', label: 'Teacher', Icon: UserCheck },
    { key: 'student', label: 'Student', Icon: GraduationCap },
  ];

  const navigate = useNavigate();
  const { user, role, signIn, signOut, isAuthenticated } = useAuth();

  // Redirect after auth with selected-role validation
  useEffect(() => {
    if (!isAuthenticated || !role) return;

    // Validate selected role when provided (admin selection includes super_admin)
    const matchesSelected = (() => {
      if (!selectedRole) return true;
      if (selectedRole === 'admin') return role === 'admin' || role === 'super_admin';
      return role === selectedRole;
    })();

    if (!matchesSelected) {
      toast.error('Selected role does not match your account. Please choose the correct role.');
      try { signOut && signOut(); } catch (_) {}
      setPassword('');
      return; // Stay on login page
    }

    switch (role) {
      case "admin":
      case "super_admin":
        navigate("/dashboard");
        break;
      case "teacher":
        navigate("/teacher");
        break;
      case "student":
        navigate("/student");
        break;
    }
  }, [isAuthenticated, role, selectedRole, navigate, signOut]);
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!selectedRole) {
      setError("Please select your role to continue.");
      toast.error("Please select your role to continue.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const result = await signIn(email, password);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      if (result.user) {
        // Don't show toast here - let the auth context handle navigation
        // The useEffect will redirect based on role
        console.log("Login successful, waiting for role-based redirect...");
      }
    } catch (err) {
      console.error("Login error:", err);
      const errorMessage = err.message || "Invalid credentials or network issue.";
      setError(errorMessage);
      // Only show error toast, not success toast to avoid duplicates
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
            Welcome Back
          </h1>
          <p className="text-gray-600">Sign in to your Greenfield College account</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Role Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select your role</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {roleOptions.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedRole(key)}
                  className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg border transition-all ${
                    selectedRole === key
                      ? 'border-green-600 bg-green-50 text-green-700 shadow-sm'
                      : 'border-gray-200 hover:border-green-300 text-gray-700 bg-white'
                  }`}
                  aria-pressed={selectedRole === key}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span className="font-semibold text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
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
                      d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                    />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 outline-none"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
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
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
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
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Additional Links */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setShowPasswordReset(true)}
              className="text-green-600 hover:text-green-800 text-sm font-medium transition-colors duration-200"
            >
              Forgot your password?
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 text-sm">
            Don't have an account?{" "}
            <a
              href="#"
              className="text-green-600 hover:text-green-800 font-medium transition-colors duration-200"
            >
              Contact your administrator
            </a>
          </p>
        </div>
      </div>

      {/* Password Reset Modal */}
      <PasswordResetModal
        isOpen={showPasswordReset}
        onClose={() => setShowPasswordReset(false)}
        userType="general"
      />
    </div>
  );
};

export default Login;