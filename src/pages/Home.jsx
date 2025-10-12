import ImageCarousel from "../components/common/ImageCarousel";
import { carouselService } from "../services/supabase";
import { COMPONENT_COLORS, ICON_COLORS } from "../constants/colors";

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  GraduationCap,
  UserCheck,
  Users,
  ArrowRight,
} from "lucide-react";

// Public URL to homepage hero image in Supabase Storage
const HERO_IMAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/homepage/home.webp`;

const Home = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [carouselImages, setCarouselImages] = useState([]);
  const [carouselLoading, setCarouselLoading] = useState(true);

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

  // Load carousel images
  useEffect(() => {
    const loadCarouselImages = async () => {
      try {
        setCarouselLoading(true);
        const images = await carouselService.getActiveCarouselImages();

        // If no images in database, use fallback images
        if ((images || []).length === 0) {
          setCarouselImages([
            {
              src: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
              alt: "Modern School Building",
              title: "Our Campus",
              caption: "A safe, modern environment for learning",
            },
            {
              src: "https://images.unsplash.com/photo-1509062522246-3755977927d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
              alt: "Students in Classroom",
              title: "Learning Together",
              caption: "Collaborative classrooms and supportive mentors",
            },
          ]);
        } else {
          setCarouselImages(images);
        }
      } catch (error) {
        console.error('Error loading carousel images:', error);
        // Use a simple fallback
        setCarouselImages([
          {
            src: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
            alt: "Modern School Building",
            title: "Our Campus",
            caption: "A safe, modern environment for learning",
          },
        ]);
      } finally {
        setCarouselLoading(false);
      }
    };

    loadCarouselImages();
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
    <div className={`${COMPONENT_COLORS.backgrounds.gradient} overflow-hidden relative -mt-[var(--header-height,90px)]`}>
      {/* Hero Section */}
      <section
        className="min-h-[75vh] flex flex-col justify-center items-center text-center px-6 relative"
        style={{ paddingTop: "var(--header-height, 90px)" }}
      >
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${HERO_IMAGE_URL})`,
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
            Greenfield School Portal
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

      {/* Highlights (Carousel) */}
      <section id="highlights" className={`py-14 sm:py-16 ${COMPONENT_COLORS.backgrounds.primary} relative`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800">Highlights</h2>
            <p className="text-gray-600 text-sm sm:text-base mt-1">A glimpse of campus and activities</p>
          </div>
          <div className="max-w-5xl mx-auto">
            {carouselLoading ? (
              <div className="w-full h-64 sm:h-96 bg-gray-200 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 sm:h-12 w-8 sm:w-12 border-b-2 border-emerald-600 mx-auto mb-4" />
                  <p className="text-gray-600 text-sm sm:text-base">Loading...</p>
                </div>
              </div>
            ) : (carouselImages || []).length > 0 ? (
              <ImageCarousel
                images={carouselImages}
                autoPlay={true}
                interval={5000}
                showDots={true}
                showArrows={true}
              />
            ) : (
              <div className="w-full h-64 sm:h-96 bg-gray-100 rounded-2xl flex items-center justify-center">
                <div className="text-center px-4">
                  <div className="text-gray-400 mb-2">
                    <Users className={`h-12 w-12 ${ICON_COLORS.primary}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">No Highlights Yet</h3>
                  <p className="text-gray-500 text-sm">Gallery images will appear here once uploaded by administrators.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
