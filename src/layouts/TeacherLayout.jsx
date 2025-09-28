import { NavLink, Outlet } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Menu, X, LayoutDashboard, Users, Layers, ClipboardList, CalendarCheck, BarChart3, FileText, Calendar, User } from 'lucide-react';

const TeacherLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileHeaderRef = useRef(null);

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

  // Set --mobile-header-height for consistent spacing
  useEffect(() => {
    if (!mobileHeaderRef.current) return;

    const updateHeaderHeight = () => {
      const height = mobileHeaderRef.current.offsetHeight;
      document.documentElement.style.setProperty('--mobile-header-height', `${height}px`);
    };

    const observer = new ResizeObserver(() => {
      updateHeaderHeight();
    });

    observer.observe(mobileHeaderRef.current);
    updateHeaderHeight();

    return () => observer.disconnect();
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Fixed Desktop Sidebar */}
      <aside className="hidden md:block fixed top-0 left-0 h-full w-46 lg:w-60 bg-gradient-to-b from-slate-700 to-slate-800 text-white shadow-lg z-30">
        <div className="p-4 lg:p-6 h-full overflow-y-auto">
          {/* Teacher Portal Header */}
          <div className="mb-6 mt-12">
            <h1 className="text-xl lg:text-2xl font-bold text-white text-center">
              Teacher Portal
            </h1>
            <div className="w-full h-px bg-teal-500 mt-3"></div>
          </div>

          {/* Navigation Links */}
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

      {/* Desktop Main Content with margin for fixed sidebar */}
      <div className="hidden md:block md:ml-48 lg:ml-60 min-h-screen">
        <main className="p-3 sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col h-screen">


        {/* Mobile Toggle Button */}
        <button
          onClick={toggleMobileMenu}
          className="fixed top-[calc(var(--appbar-height,56px)+8px)] left-4 z-[10000] bg-teal-800 text-white px-2 py-1 rounded-md shadow-lg"
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
            className="fixed inset-0 bg-black bg-opacity-50 z-[900]"
            onClick={closeMobileMenu}
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={`fixed top-[var(--appbar-height,56px)] left-0 z-[1001] w-64 h-[calc(100vh-var(--appbar-height,56px))] bg-gradient-to-b from-teal-700 to-teal-800 text-white transform transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-4">
            {/* Teacher Portal Header for Mobile */}
            <div className="mb-6">
              <h1 className="text-lg font-bold text-white text-center">
                Teacher Portal
              </h1>
              <div className="w-full h-px bg-teal-500 mt-2"></div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-2">
              {menuItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/teacher"}
                  onClick={closeMobileMenu}
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

        {/* Mobile Main Content */}
        <main
          className="flex-1 overflow-auto p-4"
          style={{ paddingTop: "calc(var(--mobile-header-height, 64px) + 16px)" }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;
