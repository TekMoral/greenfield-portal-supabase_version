import { COMPONENT_COLORS } from "../constants/colors";
import homepageHero from "../assets/images/homepage.webp";

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  GraduationCap,
  UserCheck,
  ArrowRight,
} from "lucide-react";

const Home = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    setIsVisible(true);

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Minimal SEO metadata for Home
  useEffect(() => {
    try {
      const title = 'Greenfield School Portal';
      const description = 'Role-based school management portal for students, teachers, administrators, and parents.';
      document.title = title;
      const setMeta = (name, content) => {
        if (!content) return;
        let el = document.head.querySelector(`meta[name="${name}"]`);
        if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
        el.setAttribute('content', content);
      };
      setMeta('description', description);
    } catch (_) {}
  }, []);

  const roles = [
    { label: 'Admin', Icon: Shield },
    { label: 'Teacher', Icon: UserCheck },
    { label: 'Student', Icon: GraduationCap },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden relative">
      {/* Hero Section */}
      <section
        className="flex-1 flex flex-col justify-center items-center text-center px-6 relative"
        style={{ paddingTop: "var(--header-height, 90px)" }}
      >
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${homepageHero})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/40 to-black/60" />
        </div>

        {/* Content */}
        <div
          className={`relative z-10 transform transition-all duration-700 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
          style={{ transform: `translateY(${scrollY * 0.06}px)` }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white drop-shadow mb-4">
            Mordern School Portal
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
            A unified digital platform for seamless learning, communication, and school management.
          </p>

          {/* Who should log in */}
          <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-2 sm:gap-3">
            {roles.map(({ label, Icon }, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white border border-white/20 backdrop-blur-md text-sm"
              >
                <Icon className="w-4 h-4" aria-hidden="true" /> {label}
              </span>
            ))}
          </div>

          {/* Login CTA */}
          <div className="mt-8 sm:mt-10">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              Login to Portal <ArrowRight className="w-4 h-4" />
            </Link>
            <div className="mt-3 text-white/80 text-xs sm:text-sm">
              Trouble logging in? Contact your school administrator.
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/80 backdrop-blur-sm border-t border-white/10 py-4 px-6 relative z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          <p className="text-white/70 text-sm sm:text-base font-medium">
            Powered by <span className="text-emerald-400 font-semibold">TekMoral Solutions</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
