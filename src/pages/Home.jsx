import ImageCarousel from "../components/common/ImageCarousel";
import { carouselService } from "../services/supabase";
import VICollege24 from "../assets/images/VICollege24.jpg";
import { COMPONENT_COLORS, getButtonClasses, getHeadingClasses, getBadgeClasses } from "../constants/colors";

import { useState, useEffect } from "react";

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
        if (images.length === 0) {
          setCarouselImages([
            {
              src: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
              alt: "Modern School Building",
              title: "Our Beautiful Campus",
              caption: "State-of-the-art facilities designed for optimal learning"
            },
            {
              src: "https://images.unsplash.com/photo-1509062522246-3755977927d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
              alt: "Students in Classroom",
              title: "Interactive Learning",
              caption: "Engaging classroom environments that foster creativity and critical thinking"
            },
            {
              src: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
              alt: "Science Laboratory",
              title: "Advanced Laboratories",
              caption: "Fully equipped science labs for hands-on experimentation and discovery"
            }
          ]);
        } else {
          setCarouselImages(images);
        }
      } catch (error) {
        console.error('Error loading carousel images:', error);
        // Use fallback images on error
        setCarouselImages([
          {
            src: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
            alt: "Modern School Building",
            title: "Our Beautiful Campus",
            caption: "State-of-the-art facilities designed for optimal learning"
          }
        ]);
      } finally {
        setCarouselLoading(false);
      }
    };

    loadCarouselImages();
  }, []);

  const features = [
    {
      icon: "📚",
      title: "Academic Excellence",
      description:
        "A commitment to high academic standards across all grade levels.",
      accentColor: "from-emerald-400 to-emerald-500",
    },
    {
      icon: "🎓",
      title: "Experienced Staff",
      description:
        "Dedicated teachers and staff fostering growth and curiosity.",
      accentColor: "from-emerald-400 to-teal-500",
    },
    {
      icon: "🏫",
      title: "Modern Facilities",
      description:
        "State-of-the-art classrooms, labs, and learning environments.",
      accentColor: "from-teal-400 to-emerald-500",
    },
    {
      icon: "🌿",
      title: "Green Campus",
      description: "Eco-friendly and safe campus promoting sustainable habits.",
      accentColor: "from-emerald-400 to-emerald-500",
    },
  ];

  return (
    <div
      className={`${COMPONENT_COLORS.backgrounds.gradient} overflow-hidden relative -mt-[var(--header-height,90px)]`}
    >
      {/* Hero Section with Responsive Background */}
      <section
        className="min-h-screen flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-8 relative"
        style={{
          minHeight: "100vh",
          paddingTop: "var(--header-height, 90px)",
        }}
      >
        {/* Responsive Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${VICollege24})`,
            backgroundAttachment: window.innerWidth > 768 ? "fixed" : "scroll",
          }}
        >
          {/* Responsive overlay gradients for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/50 sm:bg-gradient-to-r sm:from-black/40 sm:via-black/30 sm:to-black/40 lg:bg-gradient-to-br lg:from-black/30 lg:via-black/40 lg:to-black/50"></div>
        </div>

        {/* Content */}
        <div
          className={`relative z-10 transform transition-all duration-1200 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
          }`}
          style={{ transform: `translateY(${scrollY * 0.1}px)` }}
        >
          <div className="mb-6 sm:mb-8">
            <span
              className={`inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white/90 border border-emerald-200 rounded-full text-gray-700 text-xs sm:text-sm font-semibold backdrop-blur-sm shadow-lg`}
            >
              <span className="animate-pulse">💡</span>
              Nurturing Growth Since 2002
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black mb-6 sm:mb-8 leading-tight">
            <span className="text-white drop-shadow-lg block">Welcome to</span>
            <span
              className={`${COMPONENT_COLORS.headings.accentGradient} drop-shadow-lg block`}
            >
              Greenfield
            </span>
          </h1>

          <p className="text-lg sm:text-xl lg:text-2xl text-white max-w-xs sm:max-w-2xl lg:max-w-4xl mx-auto mb-8 sm:mb-12 leading-relaxed font-medium drop-shadow-lg px-4 sm:px-0">
            Where nature meets nurture in education. A thriving ecosystem of
            learning where every student{" "}
            <span className="text-emerald-200">blossoms</span> into their
            fullest potential.
          </p>

          {/* Responsive CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
            <a
              href="#gallery"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Explore Campus
            </a>
            <a
              href="/about"
              className="bg-white/10 hover:bg-white/20 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold transition-colors duration-200 border border-white/30 backdrop-blur-sm"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Campus Gallery Carousel Section */}
      <section
        id="gallery"
        className={`py-16 sm:py-20 ${COMPONENT_COLORS.backgrounds.primary} relative`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <div className="mb-6">
              <span className={getBadgeClasses("emerald")}>
                📸 Campus Gallery
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black mb-6">
              <span className={COMPONENT_COLORS.headings.gradient}>
                Explore Our
              </span>
              <br />
              <span className={COMPONENT_COLORS.headings.accentGradient}>
                Learning Environment
              </span>
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4 sm:px-0">
              Take a visual journey through our state-of-the-art facilities,
              vibrant classrooms, and the spaces where learning comes alive
              every day.
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            {carouselLoading ? (
              <div className="w-full h-64 sm:h-96 lg:h-[500px] xl:h-[600px] bg-gray-200 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 sm:h-12 w-8 sm:w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 text-sm sm:text-base">
                    Loading gallery...
                  </p>
                </div>
              </div>
            ) : carouselImages.length > 0 ? (
              <ImageCarousel
                images={carouselImages}
                autoPlay={true}
                interval={5000}
                showDots={true}
                showArrows={true}
              />
            ) : (
              <div className="w-full h-64 sm:h-96 lg:h-[500px] xl:h-[600px] bg-gray-100 rounded-2xl flex items-center justify-center">
                <div className="text-center px-4">
                  <div className="text-gray-400 text-4xl sm:text-6xl mb-4">
                    📸
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
                    No Images Available
                  </h3>
                  <p className="text-gray-500 text-sm sm:text-base">
                    Gallery images will appear here once uploaded by
                    administrators.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        className={`py-20 sm:py-32 relative ${COMPONENT_COLORS.backgrounds.secondary}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 sm:mb-20">
            <div className="mb-6">
              <span className={getBadgeClasses("emerald")}>
                🌳 Our Strengths
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-7xl font-black mb-6">
              <span className={COMPONENT_COLORS.headings.gradient}>
                Why Choose
              </span>
              <br />
              <span className={COMPONENT_COLORS.headings.accentGradient}>
                Greenfield?
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4 sm:px-0">
              Like a well-tended garden, we provide the perfect environment for
              growth, learning, and flourishing at every stage of development.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-gray-200 hover:border-emerald-300 transition-all duration-500 transform hover:scale-105 hover:-translate-y-3 shadow-lg hover:shadow-2xl hover:shadow-emerald-200/50"
                style={{
                  animationDelay: `${index * 200}ms`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-emerald-50/50 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="relative z-10">
                  <div className="text-4xl sm:text-6xl mb-4 sm:mb-6 transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4 group-hover:text-emerald-700 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300 text-sm sm:text-base">
                    {feature.description}
                  </p>
                </div>

                <div
                  className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.accentColor} rounded-b-3xl transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}
                ></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section
        className={`py-16 sm:py-24 ${COMPONENT_COLORS.backgrounds.primary} relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-300/10 to-emerald-300/10 pointer-events-none"></div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12 sm:mb-16">
            <h3
              className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold ${COMPONENT_COLORS.headings.primary} mb-4`}
            >
              Our Growing Impact
            </h3>
            <p className="text-gray-600 text-base sm:text-lg max-w-xl mx-auto px-4 sm:px-0">
              Numbers that reflect our commitment to nurturing excellence
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 text-center">
            {[
              { number: "300+", label: "Flourishing Students", icon: "🌱" },
              { number: "20+", label: "Expert Educators", icon: "👩‍🏫" },
              { number: "15+", label: "Years of Growth", icon: "🌳" },
              { number: "98%", label: "Exam Success Rate", icon: "🏆" },
            ].map((stat, index) => (
              <div
                key={index}
                className="group bg-white/90 backdrop-blur-lg shadow-lg rounded-xl p-4 sm:p-6 hover:bg-white transition-all duration-300 border border-gray-100"
              >
                <div className="text-2xl sm:text-4xl mb-2 group-hover:scale-110 transition-transform duration-300">
                  {stat.icon}
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-black text-gray-800 mb-1">
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium group-hover:text-gray-700 transition-colors duration-300 text-xs sm:text-sm lg:text-base">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-gray-100 py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-900/90"></div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center">
            <div className="space-y-3 text-gray-300 text-sm sm:text-base lg:text-lg">
              <p className="flex items-center justify-center gap-2 flex-wrap">
                <span>🏫</span>Plot 17, Adewale Fajuyi Street, Off Awolowo Road,
                Ikoyi, Lagos Island, Nigeria 100225
              </p>
              <p className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
                <a
                  href="mailto:info@greenfield.edu"
                  className="hover:text-white transition duration-200 flex items-center gap-1"
                >
                  <span>📧</span> info@greenfield.edu.ng
                </a>
                <span className="hidden sm:inline">|</span>
                <a
                  href="tel:+11234567890"
                  className="hover:text-white transition duration-200 flex items-center gap-1"
                >
                  <span>📞</span> +234 08034543622
                </a>
              </p>
            </div>

            <div className="mt-5 pt-2 border-t border-gray-700">
              <p className="text-gray-500 text-xs sm:text-sm flex items-center justify-center gap-1 flex-wrap">
                © 2025 Greenfield School. All rights reserved. | Cultivated with
                💚 for education
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
