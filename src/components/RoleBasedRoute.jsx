
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";


const RoleBasedRoute = ({ children, allowedRoles }) => {
  const { user, role, loading, isAuthenticated, isActive } = useAuth();

  // Wait until auth + role are fully loaded
  if (loading || (user && !role)) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !isActive) return <Navigate to="/login" />;

  if (!Array.isArray(allowedRoles) || !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};


export default RoleBasedRoute;
