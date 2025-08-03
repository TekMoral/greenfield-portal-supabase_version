import { useState, useEffect } from "react";

const Curriculum = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const curriculumLevels = [
    {
      level: "Junior Secondary (JSS 1-3)",
      age: "Ages 10-14",
      description: "Foundation years focusing on core subjects and skill development",
      subjects: [
        "Mathematics", "English Language", "Basic Science", "Social Studies",
        "Computer Studies", "Creative Arts", "Physical Education", "Civic Education"
      ],
      color: "from-blue-400 to-cyan-500"
    },
    {
      level: "Senior Secondary (SSS 1-3)",
      age: "Ages 15-18",
      description: "Specialized education with subject combinations for university preparation",
      subjects: [
        "Core: Mathematics, English, Civic Education",
        "Sciences: Physics, Chemistry, Biology, Further Mathematics",
        "Arts: Literature, Government, Economics, Geography",
        "Commercial: Accounting, Commerce, Economics"
      ],
      color: "from-green-400 to-emerald-500"
    }
  ];

  const features = [
    {
      icon: "🎯",
      title: "Standards-Based Learning",
      description: "Aligned with national curriculum standards and international best practices"
    },
    {
      icon: "🧠",
      title: "Critical Thinking",
      description: "Emphasis on analytical skills, problem-solving, and creative thinking"
    },
    {
      icon: "🌐",
      title: "Global Perspective",
      description: "Preparing students for a connected world with multicultural awareness"
    },
    {
      icon: "💡",
      title: "Innovation Focus",
      description: "STEM education and technology integration across all subjects"
    }
  ];

  return (
    <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 min-h-screen overflow-hidden relative -mt-[var(--header-height,90px)]">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white py-20" style={{ paddingTop: "var(--header-height, 100px)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div
            className={`text-center transform transition-all duration-1000 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
            }`}
          >
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 border border-white/30 rounded-full text-white text-sm font-semibold backdrop-blur-sm">
                <span>📚</span>
                Academic Excellence
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
              Our <span className="text-yellow-300">Curriculum</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-4xl mx-auto leading-relaxed">
              A comprehensive educational framework designed to nurture intellectual growth,
              character development, and prepare students for future success.
            </p>
          </div>
        </div>
      </section>

      {/* Curriculum Overview */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-6 text-gray-800">
              Educational Framework
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our curriculum is structured to provide a solid foundation while allowing for
              specialization and individual growth at every level.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {curriculumLevels.map((level, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300"
              >
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">{level.level}</h3>
                  <p className="text-blue-600 font-semibold mb-4">{level.age}</p>
                  <p className="text-gray-600 leading-relaxed">{level.description}</p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-800">Core Subjects:</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {level.subjects.map((subject, subIndex) => (
                      <div
                        key={subIndex}
                        className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg"
                      >
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-gray-700 font-medium">{subject}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`mt-6 h-1 bg-gradient-to-r ${level.color} rounded-full`}></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Curriculum Features */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-6 text-gray-800">
              Our Approach
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We believe in holistic education that develops not just academic knowledge,
              but also character, creativity, and critical thinking skills.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="text-center group hover:transform hover:scale-105 transition-all duration-300"
              >
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Assessment & Evaluation */}
      <section className="py-20 bg-blue-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-black mb-8 text-gray-800">
                Assessment & Evaluation
              </h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Continuous Assessment</h3>
                    <p className="text-gray-600">Regular evaluation through assignments, projects, and class participation.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Standardized Testing</h3>
                    <p className="text-gray-600">Preparation for WAEC, NECO, and JAMB examinations.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Portfolio Development</h3>
                    <p className="text-gray-600">Students build comprehensive portfolios showcasing their learning journey.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Academic Calendar</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                  <span className="font-semibold text-gray-800">First Term</span>
                  <span className="text-blue-600">Sept - Dec</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                  <span className="font-semibold text-gray-800">Second Term</span>
                  <span className="text-green-600">Jan - Apr</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg">
                  <span className="font-semibold text-gray-800">Third Term</span>
                  <span className="text-yellow-600">May - Jul</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            Ready to Join Our Academic Community?
          </h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            Discover how our comprehensive curriculum can provide your child with
            the foundation for lifelong learning and success.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/admissions"
              className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-8 py-4 rounded-lg font-semibold transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              Apply for Admission
            </a>
            <a
              href="/contact"
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-lg font-semibold transition-colors duration-200 border border-white/20"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Curriculum;
