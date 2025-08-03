import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const Sidebar = ({ onMenuItemClick }) => {
  const { userRole } = useAuth();
  
  // STRICT: Only technical consultants and system admins (NOT super_admin)
  const isTechnicalConsultant = userRole === 'technical_consultant' || 
                                userRole === 'system_admin';

  const navItems = [
    { path: "/dashboard", label: "Overview" },
    { path: "/dashboard/students", label: "Students" },
    { path: "/dashboard/teachers", label: "Teachers" },
    { path: "/dashboard/classes", label: "Classes" },
    { path: "/dashboard/subjects", label: "Subjects" },
    { path: "/dashboard/reports", label: "Reports" },
    { path: "/dashboard/carousel", label: "Carousel Management" },
    { path: "/dashboard/news", label: "News & Events" },
    { path: "/dashboard/admin-review", label: "Admin Review" },
    { path: "/dashboard/activity-logs", label: "Activity Logs" },
    // Only show Log Cleanup for technical consultants (NOT super_admin)
    ...(isTechnicalConsultant ? [{ path: "/dashboard/log-cleanup", label: "Log Cleanup", restricted: true }] : []),
    { path: "/dashboard/admins", label: "Admins" },
    { path: "/dashboard/settings", label: "Settings" },
  ];

  return (
    <div className="h-full">
      {onMenuItemClick && (
        <button
          className="mb-4 text-white bg-red-500 px-3 py-1 rounded"
          onClick={onMenuItemClick}
        >
          Close Menu
        </button>
      )}
      <h2 className="mt-4 h-6 text-xl font-bold mb-6">Admin Panel</h2>
      <nav className="space-y-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onMenuItemClick}
            className={({ isActive }) =>
              `block px-3 py-2 rounded hover:bg-gray-700 transition-colors duration-200 ${
                isActive ? "bg-gray-700 font-medium" : ""
              } ${item.restricted ? "border-l-4 border-orange-500" : ""}`
            }
          >
            <div className="flex items-center justify-between">
              <span>{item.label}</span>
              {item.restricted && (
                <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded">
                  TECH
                </span>
              )}
            </div>
          </NavLink>
        ))}
      </nav>
      
      {/* Technical Consultant Badge */}
      {isTechnicalConsultant && (
        <div className="mt-6 p-3 bg-blue-900 rounded-lg border border-blue-700">
          <div className="flex items-center text-blue-100">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-xs font-medium">Technical Access</span>
          </div>
          <p className="text-xs text-blue-200 mt-1">
            Independent system maintenance privileges
          </p>
        </div>
      )}
      
      {/* Security Notice for Super Admins */}
      {userRole === 'super_admin' && (
        <div className="mt-6 p-3 bg-yellow-900 rounded-lg border border-yellow-700">
          <div className="flex items-center text-yellow-100">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-xs font-medium">Security Notice</span>
          </div>
          <p className="text-xs text-yellow-200 mt-1">
            Log cleanup restricted to technical consultants for compliance
          </p>
        </div>
      )}
    </div>
  );
};

export default Sidebar;