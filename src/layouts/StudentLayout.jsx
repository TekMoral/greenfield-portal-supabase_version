// File: src/layouts/StudentLayout.jsx
// This file defines the layout for the student portal, including a responsive sidebar and mobile menu.

import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";

const StudentLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { label: "Dashboard", path: "/student" },
    { label: "Profile", path: "/student/profile" },
    { label: "Subjects", path: "/student/subjects" },
    { label: "Assignments", path: "/student/assignments" },
    { label: "Attendance", path: "/student/attendance" },
    { label: "Results", path: "/student/results" },
    { label: "Timetable", path: "/student/timetable" },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-100">
      
      {/* Mobile Toggle Button */}
      <button
        onClick={toggleMobileMenu}
        className="md:hidden fixed top-[var(--mobile-header-height,84px)] left-4 z-[1000] bg-teal-800 text-white px-3 py-2 rounded-md shadow-lg"
        aria-label="Toggle menu"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isMobileMenuOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
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
        className={`md:hidden fixed top-[var(--mobile-header-height,74px)] left-0 z-[1001] w-64 h-[calc(100vh-var(--mobile-header-height,64px))] bg-gradient-to-b from-teal-700 to-teal-800 text-white transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4">
          <div className="mb-6">
            <h1 className="text-lg font-bold text-white text-center">
              Student Portal
            </h1>
            <div className="w-full h-px bg-teal-500 mt-2"></div>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/student"}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  isActive
                    ? "block px-3 py-3 rounded bg-white text-teal-700 font-semibold text-sm"
                    : "block px-3 py-3 rounded hover:bg-teal-600 transition text-sm"
                }
              >
                {item.label}
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
              Student Portal
            </h1>
            <div className="w-full h-px bg-teal-500 mt-3"></div>
          </div>
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/student"}
                className={({ isActive }) =>
                  isActive
                    ? "block px-3 py-2 rounded bg-white text-teal-700 font-semibold text-sm lg:text-base"
                    : "block px-3 py-2 rounded hover:bg-teal-600 transition text-sm lg:text-base"
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 md:ml-48 lg:ml-60">
        {/* Page Content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto pt-24 md:pt-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;
