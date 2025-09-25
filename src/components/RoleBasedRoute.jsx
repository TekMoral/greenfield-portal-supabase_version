
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";


const RoleBasedRoute = ({ children, allowedRoles }) => {
  const { user, role, loading, isAuthenticated, isActive, profile } = useAuth();

  // Wait until auth + role are fully loaded
  if (loading || (user && !role)) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !isActive) return <Navigate to="/login" />;

  // Enforce first-login password change (with one-time bypass after successful update)
  if (profile?.require_password_change === true) {
    // Check for one-time bypass flag set after successful password change
    try {
      const justCompleted = sessionStorage.getItem('pwChangeJustCompleted');
      if (justCompleted === '1') {
        // Clear the flag and allow passage this one time
        sessionStorage.removeItem('pwChangeJustCompleted');
        console.log('🔓 Password change bypass activated - allowing access');
      } else {
        console.log('🔒 Password change required - redirecting');
        return <Navigate to="/force-password-change" />;
      }
    } catch (_) {
      // If sessionStorage fails, default to redirect
      console.log('🔒 SessionStorage unavailable - redirecting to password change');
      return <Navigate to="/force-password-change" />;
    }
  }

  if (!Array.isArray(allowedRoles) || !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};


export default RoleBasedRoute;
