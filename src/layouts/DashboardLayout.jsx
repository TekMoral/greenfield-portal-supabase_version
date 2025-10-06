// File: src/layouts/DashboardLayout.jsx

import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Menu } from 'lucide-react';


const DashboardLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileHeaderRef = useRef(null);
  const location = useLocation();

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
      {/* Fixed Desktop Sidebar */}
      <aside
        className="hidden lg:block fixed left-0 w-48 lg:w-60 bg-gradient-to-b from-slate-700 to-slate-800 text-white flex-shrink-0 shadow-lg z-30"
        style={{ top: 'var(--appbar-height, 56px)', height: 'calc(100vh - var(--appbar-height, 56px))' }}
      >
        <div className="h-full overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      {/* Desktop Main Content with margin for fixed sidebar */}
      <div className="hidden lg:block lg:ml-60 min-h-screen">
        <main className="flex-1 overflow-auto p-6">
          <Outlet key={location.pathname} />
        </main>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col h-full">
        {/* Toggle Button */}
        <button
          onClick={toggleMobileMenu}
          className="fixed top-[calc(var(--appbar-height,56px)+8px)] left-4 z-[900] bg-teal-800 text-white px-2 py-1 rounded-md shadow-lg"
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[1000]"
            onClick={closeMobileMenu}
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={`fixed top-[var(--appbar-height,56px)] left-0 z-[1001] w-64 h-[calc(100vh-var(--appbar-height,56px))] bg-gradient-to-b from-teal-700 to-teal-800 text-white overflow-y-auto overscroll-contain transform transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="px-4 pb-24">
            <Sidebar onNavigate={closeMobileMenu} />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4">
          <Outlet key={location.pathname} />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
