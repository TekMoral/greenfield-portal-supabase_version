import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { Menu, X, LayoutDashboard, Users, Layers, ClipboardList, CalendarCheck, BarChart3, FileText, Calendar, User } from 'lucide-react';

const TeacherLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { label: "Dashboard", path: "/teacher", Icon: LayoutDashboard },
    { label: "Classes", path: "/teacher/classes", Icon: Layers },
    { label: "Students", path: "/teacher/students", Icon: Users },
    { label: "Results", path: "/teacher/exam-results", Icon: BarChart3 },
    { label: "Assignments", path: "/teacher/assignments", Icon: ClipboardList },
    { label: "Gradebook", path: "/teacher/grades", Icon: FileText },
    { label: "Timetable", path: "/teacher/timetable", Icon: Calendar },
    { label: "Attendance", path: "/teacher/attendance", Icon: CalendarCheck },
    { label: "Profile", path: "/teacher/profile", Icon: User },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="flex flex-col md:flex-row bg-gray-100 overflow-hidden h-[calc(100dvh-var(--header-height,90px))]">
      
      {/* Mobile Toggle Button */}
      <button
        onClick={toggleMobileMenu}
        className="md:hidden fixed top-[var(--appbar-height,56px)] left-4 z-[1000] bg-teal-800 text-white px-2 py-1 rounded-md shadow-lg"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <X className="w-4 h-4" />
        ) : (
          <Menu className="w-4 h-4" />
        )}
      </button>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-[900]"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`md:hidden fixed top-[var(--appbar-height,56px)] left-0 z-[1001] w-64 h-[calc(100vh-var(--appbar-height,56px))] bg-gradient-to-b from-teal-700 to-teal-800 text-white transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4">
          <div className="mb-6">
            <h1 className="text-lg font-bold text-white text-center">
              Teacher Portal
            </h1>
            <div className="w-full h-px bg-teal-500 mt-2"></div>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/teacher"}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  isActive
                    ? "block px-3 py-3 rounded bg-white text-teal-700 font-semibold text-sm"
                    : "block px-3 py-3 rounded hover:bg-teal-600 transition text-sm"
                }
              >
                <div className="flex items-center gap-2">
                  {item.Icon && <item.Icon className="w-4 h-4" aria-hidden="true" />}
                  <span>{item.label}</span>
                </div>
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Fixed Desktop Sidebar */}
      <aside className="hidden md:block fixed top-0 left-0 h-full w-48 lg:w-60 bg-gradient-to-b from-slate-700 to-slate-800 text-white shadow-lg z-30">
        <div className="p-4 lg:p-6 h-full overflow-y-auto">
          <div className="mb-6 mt-12">
            <h1 className="text-xl lg:text-2xl font-bold text-white text-center">
              Teacher Portal
            </h1>
            <div className="w-full h-px bg-teal-500 mt-3"></div>
          </div>
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/teacher"}
                className={({ isActive }) =>
                  isActive
                    ? "block px-3 py-2 rounded bg-white text-teal-700 font-semibold text-sm lg:text-base"
                    : "block px-3 py-2 rounded hover:bg-teal-600 transition text-sm lg:text-base"
                }
              >
                <div className="flex items-center gap-2">
                  {item.Icon && <item.Icon className="w-4 h-4" aria-hidden="true" />}
                  <span>{item.label}</span>
                </div>
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 md:ml-48 lg:ml-60">
        {/* Page Content */}
        <main
          className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto"
          style={{ overscrollBehaviorY: 'contain', WebkitOverflowScrolling: 'touch' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;
