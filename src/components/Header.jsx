import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { COMPONENT_COLORS } from '../constants/colors';
import schoolLogo from '../assets/images/greenfield-logo.png';
import { Menu, X, ChevronDown } from 'lucide-react';

const Header = forwardRef((props, ref) => {
  const { user, role, signOut } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAcademicsMenuOpen, setIsAcademicsMenuOpen] = useState(false);
  const localRef = useRef(null);

  // Helper function to get dashboard link based on user role
  const getDashboardLink = () => {
    switch (role) {
      case "admin":
      case "super_admin":
        return { path: "/dashboard", label: "Dashboard" };
      case "teacher":
        return { path: "/teacher", label: "Dashboard" };
      case "student":
        return { path: "/student", label: "Dashboard" };
      default:
        return null;
    }
  };

  const dashboardLink = getDashboardLink();

  // Helper function to get profile route based on user role
  const getProfilePath = () => {
    switch (role) {
      case "teacher":
        return "/teacher/profile";
      case "student":
        return "/student/profile";
      case "admin":
      case "super_admin":
        return "/dashboard/profile"; // Admin personal profile page
      default:
        return "/login";
    }
  };
  const profilePath = getProfilePath();

  const navigate = useNavigate();

  // Handle scroll effect to change header style
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Measure header height and expose as CSS var for mobile drawer offset
  useEffect(() => {
    const updateHeaderHeight = () => {
      const h = localRef.current?.offsetHeight || 48;
      document.documentElement.style.setProperty('--appbar-height', `${h}px`);
    };
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, [isScrolled]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMenuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
    return undefined;
  }, [isMenuOpen]);

  const handleLogout = async () => {
    try {
      await signOut();
      setIsMenuOpen(false);
      setIsUserMenuOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleMenu = () => setIsMenuOpen(prev => !prev);
  const toggleUserMenu = () => setIsUserMenuOpen(prev => !prev);
  const toggleAcademicsMenu = () => setIsAcademicsMenuOpen(prev => !prev);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.user-menu-container')) {
        setIsUserMenuOpen(false);
      }
      if (!event.target.closest('.academics-menu-container')) {
        setIsAcademicsMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const academicsMenuItems = [];

  return (
    <header
      ref={(el) => {
        localRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
      }}
      className={`
        fixed top-0 left-0 right-0 z-[9999]
        transition-all duration-200 ease-in-out
        ${isScrolled ? 'bg-slate-800/95 backdrop-blur-md shadow-md' : 'bg-slate-800'}
        text-white
        py-1 sm:py-2
      `}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo and School Name */}
          <div className="flex items-center space-x-3">
            {/* School Logo */}
            <div className="hidden min-[350px]:block" aria-label="Greenfield Secondary School Logo" role="img">
              <img 
                src={schoolLogo} 
                alt="Greenfield College Logo" 
                className="transition-all duration-300 w-[clamp(28px,8vw,36px)] h-[clamp(28px,8vw,36px)] object-contain rounded-lg bg-white/10 p-0.5"
              />
            </div>
            <Link to="/" className="flex flex-col">
              <h1 className="block font-bold transition-all duration-300 select-none text-sm sm:text-base hover:text-emerald-200">
                <span className="block sm:hidden leading-tight">
                  Greenfield<br />Portal
                </span>
                <span className="hidden sm:block whitespace-nowrap">
                  Greenfield Portal
                </span>
              </h1>
            </Link>
          </div>

          {/* Main Navigation Links - Desktop (management-only, no marketing links) */}
          <nav className="hidden lg:flex items-center space-x-8" aria-label="Primary Navigation"></nav>

          {/* Primary CTAs */}
          <div className="flex items-center space-x-1 xs:space-x-2 sm:space-x-4">
            {/* Removed Apply CTA for management-only */}

            {/* User Section */}
            {user ? (
              <div className="flex items-center space-x-2">
                <div className="relative user-menu-container">
                {/* User Menu Button */}
                <button
                  onClick={toggleUserMenu}
                  className="flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white text-xs sm:text-sm sm:px-3 sm:py-1.5"
                  aria-label="User menu"
                  aria-expanded={isUserMenuOpen}
                >
                  <div className="w-6 h-6 sm:w-7 sm:h-7 bg-white/20 rounded-full flex items-center justify-center text-white font-medium">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden md:block font-medium truncate max-w-[10ch] sm:max-w-[16ch]">
                    {user.name || 'User'}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
                    <Link
                      to={profilePath}
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    {dashboardLink && (
                      <Link
                        to={dashboardLink.path}
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        {dashboardLink.label}
                      </Link>
                    )}
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-red-700 hover:bg-gray-100 transition-colors duration-200"
                    >
                      Logout
                    </button>
                  </div>
                )}
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white text-xs sm:text-sm sm:px-3 sm:py-1.5"
              >
                Login
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMenu}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Drawer + Overlay rendered via portal to avoid stacking issues */}
        {createPortal(
          <>
            {/* Overlay */}
            <div
              className={`lg:hidden fixed inset-0 z-[2147483646] bg-black/50 transition-opacity duration-200 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
              onClick={() => setIsMenuOpen(false)}
            />
            {/* Drawer Panel */}
            <aside
              className={`lg:hidden fixed top-0 left-0 z-[2147483647] h-full w-72 max-w-[85vw] bg-slate-800 text-white transform transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
              style={{ paddingTop: 'var(--appbar-height, 48px)' }}
              aria-label="Mobile Navigation"
            >
              <div className="h-full overflow-y-auto p-4">
                <div className="flex flex-col space-y-3">
                  
                  
                  {user && (
                    <>
                      <div className="border-t border-white/20 my-3 pt-3">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-medium">
                            {user.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="text-sm">
                            <div className="font-medium">{user.name || 'User'}</div>
                            <div className="text-emerald-200 text-xs">{user.email}</div>
                          </div>
                        </div>
                        <Link
                          to={profilePath}
                          className="block py-2 hover:text-emerald-200 transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-300 rounded"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Profile
                        </Link>
                        {dashboardLink && (
                          <Link
                            to={dashboardLink.path}
                            className="block py-2 hover:text-emerald-200 transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-300 rounded"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            {dashboardLink.label}
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className="w-full text-left py-2 hover:text-emerald-200 transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-300 rounded"
                        >
                          Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </aside>
          </>,
          document.body
        )}
      </div>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;
