import { useState, useEffect } from "react";
import Propietor from "../assets/images/Proprietor1.jpg";
import  Principal from "../assets/images/Principal.jpg";
import VicePrincipal from "../assets/images/VicePrincipal.jpg";
import VICollege16 from "../assets/images/VICollege16.jpg";
import { COMPONENT_COLORS, getButtonClasses, getHeadingClasses, getBadgeClasses } from "../constants/colors";

const About = () => {
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

  const values = [
    {
      icon: "🌱",
      title: "Growth Mindset",
      description: "We believe every student has unlimited potential to grow and achieve excellence through dedication and proper guidance.",
      color: "from-emerald-400 to-emerald-500"
    },
    {
      icon: "🤝",
      title: "Community",
      description: "Building strong relationships between students, teachers, parents, and the wider community for holistic development.",
      color: "from-emerald-400 to-teal-500"
    },
    {
      icon: "🎯",
      title: "Excellence",
      description: "Striving for the highest standards in academics, character development, and personal achievement.",
      color: "from-teal-400 to-emerald-500"
    },
    {
      icon: "🌍",
      title: "Global Perspective",
      description: "Preparing students to be responsible global citizens who can make positive contributions to society.",
      color: "from-emerald-500 to-teal-600"
    }
  ];

  const milestones = [
    {
      year: "1998",
      title: "Foundation",
      description: "Greenfield College was established with a vision to provide quality education in a nurturing environment."
    },
    {
      year: "2005",
      title: "Expansion",
      description: "Added modern science laboratories and expanded our curriculum to include advanced STEM programs."
    },
    {
      year: "2012",
      title: "Digital Integration",
      description: "Introduced smart classrooms and digital learning platforms to enhance the educational experience."
    },
    {
      year: "2018",
      title: "Excellence Recognition",
      description: "Received national recognition for academic excellence and innovative teaching methodologies."
    },
    {
      year: "2023",
      title: "Modern Campus",
      description: "Completed our state-of-the-art campus renovation with eco-friendly facilities and advanced technology."
    }
  ];

  const leadership = [
    {
      name: "Mr Akindapo Johnson",
      position: "Proprietor",
      image: Propietor,
      bio: "Mr Akindapo has been the backbone of our successes, as the founder. He has positioned our School to be the World Standard School and to stand out."
    },
    {
      name: "Dr Michael Oluwole",
      position: "Principal",
      image: Principal,
      bio: "Dr. Oluwole oversees all programs and curriculum development, ensuring excellence in teaching and learning."
    },
    {
      name: "Mrs. Umoh Naomi",
      position: "Vice Principal",
      image: VicePrincipal,
      bio: "Mrs. Naomi focuses on student welfare, extracurricular activities, and creating a supportive school environment."
    }
  ];

  return (
    <div className={`${COMPONENT_COLORS.backgrounds.gradient} overflow-hidden relative -mt-[var(--header-height,90px)]`}>
      {/* Hero Section */}
      <section
        className={`min-h-screen flex flex-col justify-center items-center text-center px-6 relative ${COMPONENT_COLORS.backgrounds.hero}`}
        style={{
          minHeight: "100vh",
          paddingTop: "var(--header-height, 100px)"
        }}
      >
        <div className="absolute inset-0 bg-black/20"></div>
        <div
          className={`relative z-10 transform transition-all duration-1200 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
          }`}
          style={{ transform: `translateY(${scrollY * 0.1}px)` }}
        >
          <div className="mb-8">
            <span className={`inline-flex items-center gap-2 px-6 py-3 bg-white/90 border border-emerald-200 rounded-full text-gray-700 text-sm font-semibold backdrop-blur-sm shadow-lg`}>
              <span className="animate-pulse">🏫</span>
              About Our School
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-8 leading-tight text-white">
            <span className="block">Nurturing</span>
            <span className="bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">
              Excellence
            </span>
            <span className="block">Since 1998</span>
          </h1>

          <p className="text-xl md:text-2xl text-white max-w-4xl mx-auto mb-12 leading-relaxed font-medium">
            At Greenfield College, we cultivate an environment where academic excellence meets character development,
            preparing students for success in an ever-changing world.
          </p>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className={`py-20 ${COMPONENT_COLORS.backgrounds.primary} relative`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="mb-6">
                <span className={getBadgeClasses('emerald')}>
                  🎯 Our Purpose
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black mb-8">
                <span className={COMPONENT_COLORS.headings.gradient}>
                  Mission & Vision
                </span>
              </h2>

              <div className="space-y-8">
                <div className="bg-gradient-to-r from-emerald-50 to-emerald-50 p-6 rounded-2xl border border-emerald-100">
                  <h3 className="text-2xl font-bold text-emerald-800 mb-4 flex items-center gap-2">
                    <span>🚀</span> Our Mission
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    To provide a comprehensive, innovative education that empowers students to become confident,
                    creative, and responsible global citizens while fostering a lifelong love of learning.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-amber-50 to-amber-50 p-6 rounded-2xl border border-amber-100">
                  <h3 className="text-2xl font-bold text-amber-800 mb-4 flex items-center gap-2">
                    <span>🔭</span> Our Vision
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    To be a leading educational institution recognized for excellence in teaching, learning,
                    and character development, preparing students to thrive in the 21st century.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-emerald-100 to-emerald-100 rounded-3xl p-8 shadow-2xl">
                <img
                  src={VICollege16}
                  alt="Students in classroom"
                  className="w-full h-80 object-cover rounded-2xl shadow-lg"
                />
                <div className="mt-6 text-center">
                  <h4 className="text-xl font-bold text-gray-800 mb-2">Excellence in Education</h4>
                  <p className="text-gray-600">Creating tomorrow's leaders today</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className={`py-20 ${COMPONENT_COLORS.backgrounds.secondary}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="mb-6">
              <span className={getBadgeClasses('amber')}>
                💎 Our Foundation
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className={COMPONENT_COLORS.headings.gradient}>
                Core Values
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The principles that guide everything we do and shape the character of our school community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="group relative bg-white rounded-3xl p-8 border border-gray-200 hover:border-emerald-300 transition-all duration-500 transform hover:scale-105 hover:-translate-y-3 shadow-lg hover:shadow-2xl"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className="text-6xl mb-6 transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                  {value.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4 group-hover:text-emerald-700 transition-colors duration-300">
                  {value.title}
                </h3>
                <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                  {value.description}
                </p>
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${value.color} rounded-b-3xl transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* History Timeline Section - Responsive Design */}
      <section className="py-20 bg-gradient-to-br from-amber-50 to-amber-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="mb-6">
              <span className={getBadgeClasses('amber')}>
                📚 Our Journey
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className={COMPONENT_COLORS.headings.gradient}>
                Our History
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A timeline of growth, innovation, and achievement spanning over two decades of educational excellence.
            </p>
          </div>

          {/* Mobile Timeline - Single Column */}
          <div className="block lg:hidden">
            <div className="relative">
              {/* Mobile timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full"></div>

              <div className="space-y-8">
                {milestones.map((milestone, index) => (
                  <div key={index} className="relative flex items-start">
                    {/* Timeline dot */}
                    <div className="absolute left-2.5 top-6 w-6 h-6 bg-amber-500 rounded-full border-4 border-white shadow-lg z-10"></div>

                    {/* Content */}
                    <div className="ml-12 w-full">
                      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300">
                        <div className="text-2xl sm:text-3xl font-black text-amber-600 mb-2">
                          {milestone.year}
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3">
                          {milestone.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                          {milestone.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop Timeline - Alternating Layout */}
          <div className="hidden lg:block">
            <div className="relative">
              {/* Desktop timeline line */}
              <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-amber-400 to-amber-600 rounded-full"></div>

              <div className="space-y-12">
                {milestones.map((milestone, index) => (
                  <div
                    key={index}
                    className={`flex items-center ${
                      index % 2 === 0 ? "flex-row" : "flex-row-reverse"
                    }`}
                  >
                    <div className={`w-1/2 ${index % 2 === 0 ? "pr-8 text-right" : "pl-8 text-left"}`}>
                      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300">
                        <div className="text-3xl font-black text-amber-600 mb-2">
                          {milestone.year}
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-3">
                          {milestone.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed">
                          {milestone.description}
                        </p>
                      </div>
                    </div>

                    {/* Timeline dot */}
                    <div className="relative z-10 w-6 h-6 bg-amber-500 rounded-full border-4 border-white shadow-lg"></div>

                    <div className="w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership Team Section */}
      <section className={`py-20 ${COMPONENT_COLORS.backgrounds.primary}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="mb-6">
              <span className={getBadgeClasses('emerald')}>
                👥 Our Leaders
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className={COMPONENT_COLORS.headings.gradient}>
                Leadership Team
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Meet the dedicated professionals who guide our school's vision and ensure excellence in education.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {leadership.map((leader, index) => (
              <div
                key={index}
                className="group bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-200 hover:border-emerald-300 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 shadow-lg hover:shadow-2xl"
              >
                <div className="relative mb-6">
                  <img
                    src={leader.image}
                    alt={leader.name}
                    className="w-45 h-42 rounded-full mx-auto object-cover border-4 border-white shadow-lg group-hover:shadow-xl transition-shadow duration-300"
                  />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-emerald-700 transition-colors duration-300">
                    {leader.name}
                  </h3>
                  <p className="text-emerald-600 font-semibold mb-4">
                    {leader.position}
                  </p>
                  <p className="text-gray-600 leading-relaxed">
                    {leader.bio}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500 text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-extrabold mb-4">
              Our Impact in Numbers
            </h3>
            <p className="text-emerald-100 text-lg max-w-xl mx-auto">
              Celebrating our achievements and the success of our school community
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { number: "25+", label: "Years of Excellence", icon: "🏆" },
              { number: "300+", label: "Current Students", icon: "👨‍🎓" },
              { number: "50+", label: "Dedicated Staff", icon: "👩‍🏫" },
              { number: "98%", label: "University Acceptance", icon: "🎯" },
            ].map((stat, index) => (
              <div
                key={index}
                className="group bg-white/10 backdrop-blur-lg rounded-xl p-6 hover:bg-white/20 transition-all duration-300 border border-white/20"
              >
                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-300">
                  {stat.icon}
                </div>
                <div className="text-3xl md:text-4xl font-black mb-1">
                  {stat.number}
                </div>
                <div className="text-emerald-100 font-medium group-hover:text-white transition-colors duration-300">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            Join Our Community
          </h2>
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            Discover how Greenfield College can provide your child with an exceptional education
            that prepares them for future success.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/admission"
              className={getButtonClasses('accent')}
            >
              Learn About Admissions
            </a>
            <a
              href="/contact"
              className={getButtonClasses('ghost')}
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
