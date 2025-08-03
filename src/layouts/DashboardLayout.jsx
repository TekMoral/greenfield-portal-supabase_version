// File: src/layouts/DashboardLayout.jsx

import { useState, useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const DashboardLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileHeaderRef = useRef(null);

  // Set --mobile-header-height (fallback if you want to reference it independently)
  useEffect(() => {
    if (!mobileHeaderRef.current) return;

    const updateHeaderHeight = () => {
      const height = mobileHeaderRef.current.offsetHeight;
      document.documentElement.style.setProperty('--mobile-header-height', `${height}px`);
    };

    const observer = new ResizeObserver(() => {
      {
        updateHeaderHeight();
      }
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
    <div className="h-screen bg-gray-50">
      {/* Desktop Layout */}
      <div className="hidden lg:flex h-full">
        <aside className="w-52 pt-6 bg-gray-800 text-white flex-shrink-0">
          <Sidebar />
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Main Content Area */}
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col h-full">
        {/* Toggle Button */}
        <button
          onClick={toggleMobileMenu}
          className="fixed top-[var(--header-height,90px)] left-4 z-[1000] bg-gray-800 text-white px-3 py-2 rounded-md"
        >
          ☰
        </button>

        {/* Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0  bg-opacity-50 z-[900]"
            onClick={closeMobileMenu}
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={`fixed top-[var(--header-height,68px)] left-0 z-[1001] w-45 h-[calc(100vh-var(--header-height,90px))] bg-gray-800 text-white transform transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-4">
            <Sidebar onMenuItemClick={closeMobileMenu} />
          </div>
        </aside>

        {/* Main content */}
        <main
          className="flex-1 overflow-auto p-4"
          style={{ paddingTop: "var(--header-height, 90px)" }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
