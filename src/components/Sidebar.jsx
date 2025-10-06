import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  ShieldCheck,
  AlertTriangle,
  LayoutDashboard,
  GraduationCap,
  Users,
  UserCog,
  Layers,
  BookOpen,
  BarChart3,
  FileText,
  CalendarCheck,
  Image,
  Newspaper,
  Settings,
  ClipboardList,
  Trash2,
  Calendar,
} from "lucide-react";

const Sidebar = ({ onNavigate }) => {
  const { role } = useAuth();

  // STRICT: Only technical consultants and system admins (NOT super_admin)
  const isTechnicalConsultant =
    role === "technical_consultant" || role === "system_admin";

  // Only super admins can access activity logs
  const isSuperAdmin = role === "super_admin";

  const navItems = [
    { path: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { path: "/dashboard/students", label: "Students", Icon: GraduationCap },
    { path: "/dashboard/teachers", label: "Teachers", Icon: Users },
    { path: "/dashboard/classes", label: "Classes", Icon: Layers },
    { path: "/dashboard/subjects", label: "Subjects", Icon: BookOpen },
    { path: "/dashboard/reports", label: "Results", Icon: BarChart3 },
    { path: "/dashboard/timetable", label: "Timetable", Icon: Calendar },
    {
      path: "/dashboard/admin-review",
      label: "Grading Review",
      Icon: ClipboardList,
    },
    { path: "/dashboard/report-cards", label: "Report Cards", Icon: FileText },
    { path: "/dashboard/attendance", label: "Attendance", Icon: CalendarCheck },
    { path: "/dashboard/carousel", label: "Carousel", Icon: Image },
    { path: "/dashboard/news", label: "News & Events", Icon: Newspaper },
    // Admin Review parent handled as custom dropdown below
    // Only show Activity Logs for super admins
    ...(isSuperAdmin
      ? [
          { path: "/dashboard/admins", label: "Admins", Icon: UserCog },
          { path: "/dashboard/settings", label: "Settings", Icon: Settings },
          {
            path: "/dashboard/activity-logs",
            label: "Audit Logs",
            restricted: true,
            Icon: ClipboardList,
          },
        ]
      : []),
    // Only show Log Cleanup for technical consultants (NOT super_admin)
    ...(isTechnicalConsultant
      ? [
          {
            path: "/dashboard/log-cleanup",
            label: "Logs Maintenance",
            restricted: true,
            Icon: Trash2,
          },
        ]
      : []),
  ];

  return (
    <div className="h-full">
      <div className="mb-4 mt-0">
        <h1 className="text-xl lg:text-2xl font-bold text-white text-center">
          Admin Panel
        </h1>
        <div className="w-full h-px bg-teal-500 mt-3"></div>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/dashboard"}
            onClick={() => {
              if (typeof onNavigate === "function") onNavigate();
            }}
            className={({ isActive }) =>
              `block px-3 py-2 rounded transition-colors duration-200 ${
                isActive
                  ? "bg-white text-teal-700 font-semibold"
                  : "hover:bg-teal-600"
              } ${item.restricted ? "border-l-4 border-orange-500" : ""}`
            }
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {item.Icon && (
                  <item.Icon className="w-4 h-4" aria-hidden="true" />
                )}
                <span>{item.label}</span>
              </div>
              {item.restricted && (
                <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded">
                  {item.label === "Audit Logs" ? "SUPER" : "TECH"}
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
            <ShieldCheck className="w-4 h-4 mr-2" />
            <span className="text-xs font-medium">Technical Access</span>
          </div>
          <p className="text-xs text-blue-200 mt-1">
            Independent system maintenance privileges
          </p>
        </div>
      )}

      {/* Security Notice for Super Admins */}
      {role === "super_admin" && (
        <div className="mt-6 p-3 bg-yellow-900 rounded-lg border border-yellow-700">
          <div className="flex items-center text-yellow-100">
            <AlertTriangle className="w-4 h-4 mr-2" />
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
