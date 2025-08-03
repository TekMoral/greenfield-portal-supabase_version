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
    { label: "Results", path: "/student/results" },
    { label: "Timetable", path: "/student/timetable" },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-100">
      {/* Mobile Header */}
      <div className="md:hidden bg-gradient-to-r from-slate-800 to-slate-900 text-white p-3  flex items-center ">
        <button
          onClick={toggleMobileMenu}
          className="p-2 rounded-md hover:bg-slate-700 transition-colors"
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
        <div className="text-xl font-bold">Student Portal</div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed left-0 right-0 bottom-0 top-[64px] z-50 h-80">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white w-64 h-full p-6 space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div className="text-xl font-bold">Student Portal</div>
              <button
                onClick={toggleMobileMenu}
                className="p-2 rounded-md hover:bg-slate-700 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
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
                      ? "block px-3 py-3 rounded bg-white text-green-700 font-semibold text-sm"
                      : "block px-3 py-3 rounded hover:bg-green-600 transition text-sm"
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-48 lg:w-60 bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4 lg:p-6 space-y-4">
        <div className="text-xl lg:text-2xl font-bold mb-6">Student Portal</div>
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/student"}
              className={({ isActive }) =>
                isActive
                  ? "block px-3 py-2 rounded bg-white text-green-700 font-semibold text-sm lg:text-base"
                  : "block px-3 py-2 rounded hover:bg-green-600 transition text-sm lg:text-base"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Page Content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;
