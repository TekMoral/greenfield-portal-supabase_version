import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import schoolLogo from '../assets/images/greenfield-logo.png';
import { Menu, X, ChevronDown, GraduationCap, BookOpen, FileText, Calendar } from 'lucide-react';

export default function PublicHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAcademicsMenuOpen, setIsAcademicsMenuOpen] = useState(false);
  const localRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const updateHeaderHeight = () => {
      const h = localRef.current?.offsetHeight || 48;
      document.documentElement.style.setProperty('--appbar-height', `${h}px`);
    };
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, [isScrolled]);

  useEffect(() => {
    if (isMenuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
    return undefined;
  }, [isMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.academics-menu-container')) {
        setIsAcademicsMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleMenu = () => setIsMenuOpen(prev => !prev);
  const toggleAcademicsMenu = () => setIsAcademicsMenuOpen(prev => !prev);

  const academicsMenuItems = [
    { path: "/academics/curriculum", label: "Curriculum", Icon: GraduationCap },
    { path: "/academics/subjects", label: "Subjects", Icon: BookOpen },
    { path: "/academics/examinations", label: "Exams", Icon: FileText },
    { path: "/academics/calendar", label: "Academic Calendar", Icon: Calendar }
  ];

  return (
    <header
      ref={localRef}
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
          <div className="flex items-center space-x-3">
            <div className="hidden min-[350px]:block" aria-label="Greenfield Secondary School Logo" role="img">
              <img 
                src={schoolLogo} 
                alt="Greenfield College Logo" 
                className="transition-all duration-300 w-[clamp(28px,8vw,36px)] h-[clamp(28px,8vw,36px)] object-contain rounded-lg bg-white/10 p-0.5"
              />
            </div>
            <Link to="/" className="flex flex-col">
              <h1 className="block font-bold transition-all duration-300 select-none text-sm sm:text-base hover:text-emerald-200">
                <span className="block sm:hidden leading-tight">Greenfield<br />College</span>
                <span className="hidden sm:block whitespace-nowrap">Greenfield College</span>
              </h1>
            </Link>
          </div>

          <nav className="hidden lg:flex items-center space-x-8" aria-label="Primary Navigation">
            <Link to="/about" className="hover:text-emerald-200 transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-300 rounded px-2 py-1">About Us</Link>

            <div className="relative academics-menu-container">
              <button
                onClick={toggleAcademicsMenu}
                className="flex items-center space-x-1 hover:text-emerald-200 transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-300 rounded px-2 py-1"
                aria-label="Academics menu"
                aria-expanded={isAcademicsMenuOpen}
              >
                <span>Academics</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isAcademicsMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isAcademicsMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-200">
                  {academicsMenuItems.map((item, index) => (
                    <Link
                      key={index}
                      to={item.path}
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors duration-200"
                      onClick={() => setIsAcademicsMenuOpen(false)}
                    >
                      <item.Icon className="w-4 h-4" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link to="/admission" className="hover:text-emerald-200 transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-300 rounded px-2 py-1">Admissions</Link>
            <Link to="/news" className="hover:text-emerald-200 transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-300 rounded px-2 py-1">News & Events</Link>
            <Link to="/contact" className="hover:text-emerald-200 transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-300 rounded px-2 py-1">Contact Us</Link>
          </nav>

          <div className="flex items-center space-x-1 xs:space-x-2 sm:space-x-4">
            <Link to="/apply" className="inline-flex items-center bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-md font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-300 shadow-lg text-xs sm:text-sm sm:px-3 sm:py-1.5">
              <span className="sm:hidden">Apply</span>
              <span className="hidden sm:inline">Apply Now</span>
            </Link>
            <Link to="/login" className="inline-flex items-center bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white text-xs sm:text-sm sm:px-3 sm:py-1.5">
              Login
            </Link>
            <button
              onClick={toggleMenu}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            >
              {isMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {createPortal(
          <>
            <div
              className={`lg:hidden fixed inset-0 z-[2147483646] bg-black/50 transition-opacity duration-200 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
              onClick={() => setIsMenuOpen(false)}
            />
            <aside
              className={`lg:hidden fixed top-0 left-0 z-[2147483647] h-full w-72 max-w-[85vw] bg-slate-800 text-white transform transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
              style={{ paddingTop: 'var(--appbar-height, 48px)' }}
              aria-label="Mobile Navigation"
            >
              <div className="h-full overflow-y-auto p-4">
                <div className="flex flex-col space-y-3">
                  <Link to="/about" className="block py-2 hover:text-emerald-200 transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-300 rounded" onClick={() => setIsMenuOpen(false)}>About Us</Link>
                  <div className="space-y-2">
                    <div className="py-2 text-emerald-200 font-medium">Academics</div>
                    <div className="pl-4 space-y-2">
                      {academicsMenuItems.map((item, index) => (
                        <Link key={index} to={item.path} className="flex items-center space-x-2 py-2 hover:text-emerald-200 transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-300 rounded" onClick={() => setIsMenuOpen(false)}>
                          <item.Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <Link to="/admission" className="block py-2 hover:text-emerald-200 transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-300 rounded" onClick={() => setIsMenuOpen(false)}>Admission</Link>
                  <Link to="/news" className="block py-2 hover:text-emerald-200 transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-300 rounded" onClick={() => setIsMenuOpen(false)}>News & Events</Link>
                  <Link to="/contact" className="block py-2 hover:text-emerald-200 transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-300 rounded" onClick={() => setIsMenuOpen(false)}>Contact</Link>
                  <Link to="/login" className="block py-2 hover:text-emerald-200 transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-300 rounded" onClick={() => setIsMenuOpen(false)}>Login</Link>
                </div>
              </div>
            </aside>
          </>,
          document.body
        )}
      </div>
    </header>
  );
}
