import { useState, useEffect } from "react";
import { COMPONENT_COLORS, getButtonClasses } from "../../constants/colors";

const Subjects = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState("core");

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const subjectCategories = {
    core: {
      title: "Core Subjects",
      description: "Essential subjects required for all students",
      color: "from-slate-800 to-emerald-700",
      subjects: [
        {
          name: "Mathematics",
          description: "Algebra, Geometry, Statistics, and Applied Mathematics",
          icon: "🔢",
          levels: ["JSS 1-3", "SSS 1-3"],
          skills: ["Problem Solving", "Logical Thinking", "Analytical Skills"]
        },
        {
          name: "English Language",
          description: "Grammar, Literature, Composition, and Communication Skills",
          icon: "📝",
          levels: ["JSS 1-3", "SSS 1-3"],
          skills: ["Communication", "Critical Reading", "Writing"]
        },
        {
          name: "Civic Education",
          description: "Citizenship, Democracy, Human Rights, and Social Responsibility",
          icon: "🏛️",
          levels: ["JSS 1-3", "SSS 1-3"],
          skills: ["Leadership", "Social Awareness", "Ethics"]
        }
      ]
    },
    sciences: {
      title: "Science Subjects",
      description: "STEM-focused subjects for future scientists and engineers",
      color: "from-emerald-700 to-teal-600",
      subjects: [
        {
          name: "Physics",
          description: "Mechanics, Electricity, Waves, and Modern Physics",
          icon: "⚛️",
          levels: ["SSS 1-3"],
          skills: ["Scientific Method", "Data Analysis", "Problem Solving"]
        },
        {
          name: "Chemistry",
          description: "Organic, Inorganic, and Physical Chemistry",
          icon: "🧪",
          levels: ["SSS 1-3"],
          skills: ["Laboratory Skills", "Chemical Analysis", "Research"]
        },
        {
          name: "Biology",
          description: "Life Sciences, Ecology, Genetics, and Human Biology",
          icon: "🧬",
          levels: ["SSS 1-3"],
          skills: ["Scientific Observation", "Research", "Critical Thinking"]
        },
        {
          name: "Basic Science",
          description: "Introduction to Scientific Concepts and Methods",
          icon: "🔬",
          levels: ["JSS 1-3"],
          skills: ["Scientific Inquiry", "Observation", "Experimentation"]
        },
        {
          name: "Further Mathematics",
          description: "Advanced Mathematical Concepts and Applications",
          icon: "📐",
          levels: ["SSS 1-3"],
          skills: ["Advanced Problem Solving", "Mathematical Modeling", "Logic"]
        }
      ]
    },
    arts: {
      title: "Arts & Humanities",
      description: "Subjects focusing on human culture, society, and expression",
      color: "from-slate-800 to-teal-700",
      subjects: [
        {
          name: "Literature in English",
          description: "Poetry, Drama, Prose, and Literary Analysis",
          icon: "📚",
          levels: ["SSS 1-3"],
          skills: ["Critical Analysis", "Creative Writing", "Cultural Awareness"]
        },
        {
          name: "Government",
          description: "Political Science, Governance, and Public Administration",
          icon: "🏛️",
          levels: ["SSS 1-3"],
          skills: ["Political Analysis", "Critical Thinking", "Debate"]
        },
        {
          name: "Geography",
          description: "Physical and Human Geography, Environmental Studies",
          icon: "🌍",
          levels: ["JSS 1-3", "SSS 1-3"],
          skills: ["Spatial Analysis", "Environmental Awareness", "Research"]
        },
        {
          name: "History",
          description: "World History, African History, and Historical Analysis",
          icon: "📜",
          levels: ["JSS 1-3", "SSS 1-3"],
          skills: ["Historical Analysis", "Research", "Critical Thinking"]
        },
        {
          name: "Creative Arts",
          description: "Visual Arts, Music, Drama, and Creative Expression",
          icon: "🎨",
          levels: ["JSS 1-3"],
          skills: ["Creativity", "Artistic Expression", "Cultural Appreciation"]
        }
      ]
    },
    commercial: {
      title: "Commercial Subjects",
      description: "Business and commerce-oriented subjects",
      color: "from-slate-800 to-emerald-700",
      subjects: [
        {
          name: "Economics",
          description: "Microeconomics, Macroeconomics, and Economic Theory",
          icon: "💰",
          levels: ["SSS 1-3"],
          skills: ["Economic Analysis", "Data Interpretation", "Critical Thinking"]
        },
        {
          name: "Accounting",
          description: "Financial Accounting, Cost Accounting, and Auditing",
          icon: "📊",
          levels: ["SSS 1-3"],
          skills: ["Financial Analysis", "Attention to Detail", "Problem Solving"]
        },
        {
          name: "Commerce",
          description: "Business Studies, Trade, and Commercial Practices",
          icon: "🏢",
          levels: ["SSS 1-3"],
          skills: ["Business Acumen", "Communication", "Analytical Skills"]
        },
        {
          name: "Computer Studies",
          description: "Programming, Digital Literacy, and Information Technology",
          icon: "💻",
          levels: ["JSS 1-3", "SSS 1-3"],
          skills: ["Programming", "Digital Literacy", "Problem Solving"]
        }
      ]
    }
  };

  const categories = Object.keys(subjectCategories);

  return (
    <div className={`${COMPONENT_COLORS.backgrounds.gradient} min-h-screen`}>
      {/* Hero Section */}
      <section className={`${COMPONENT_COLORS.backgrounds.hero} text-white py-20`} style={{ paddingTop: "var(--header-height, 100px)"}}>
        <div className="max-w-7xl mx-auto px-6">
          <div
            className={`text-center transform transition-all duration-1000 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
            }`}
          >
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 border border-white/30 rounded-full text-white text-sm font-semibold backdrop-blur-sm">
                <span>📖</span>
                Academic Subjects
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
              Our <span className="text-emerald-200">Subjects</span>
            </h1>
            <p className="text-xl md:text-2xl text-emerald-100 max-w-4xl mx-auto leading-relaxed">
              Comprehensive subject offerings designed to provide students with diverse
              learning opportunities and pathways to success.
            </p>
          </div>
        </div>
      </section>

      {/* Subject Categories Navigation */}
      <section className="py-12 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                  activeCategory === category
                    ? "bg-slate-800 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {subjectCategories[category].title}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Active Category Display */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className={`text-4xl md:text-5xl font-black mb-6 bg-gradient-to-r ${subjectCategories[activeCategory].color} bg-clip-text text-transparent`}>
              {subjectCategories[activeCategory].title}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {subjectCategories[activeCategory].description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {subjectCategories[activeCategory].subjects.map((subject, index) => (
              <div
                key={index}
                className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200 hover:shadow-xl hover:transform hover:scale-105 transition-all duration-300"
              >
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">{subject.icon}</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">{subject.name}</h3>
                  <p className="text-gray-600 leading-relaxed">{subject.description}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Available Levels
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {subject.levels.map((level, levelIndex) => (
                        <span
                          key={levelIndex}
                          className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium"
                        >
                          {level}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Key Skills Developed
                    </h4>
                    <div className="space-y-1">
                      {subject.skills.map((skill, skillIndex) => (
                        <div key={skillIndex} className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <span className="text-gray-700 text-sm">{skill}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={`mt-6 h-1 bg-gradient-to-r ${subjectCategories[activeCategory].color} rounded-full`}></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subject Combinations */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-6 text-gray-800">
              Subject Combinations
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Strategic subject combinations to prepare students for their chosen career paths.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200">
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">🔬</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Science Track</h3>
                <p className="text-gray-600">For future doctors, engineers, and scientists</p>
              </div>
              <div className="space-y-2">
                <div className="p-3 bg-emerald-50 rounded-lg text-emerald-800 font-medium">
                  Mathematics + Physics + Chemistry + Biology
                </div>
                <div className="p-3 bg-teal-50 rounded-lg text-teal-800 font-medium">
                  Mathematics + Physics + Chemistry + Further Math
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200">
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">💼</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Commercial Track</h3>
                <p className="text-gray-600">For future business leaders and entrepreneurs</p>
              </div>
              <div className="space-y-2">
                <div className="p-3 bg-emerald-50 rounded-lg text-emerald-800 font-medium">
                  Mathematics + Economics + Accounting + Commerce
                </div>
                <div className="p-3 bg-sky-50 rounded-lg text-sky-800 font-medium">
                  Mathematics + Economics + Geography + Government
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200">
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">🎭</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Arts Track</h3>
                <p className="text-gray-600">For future lawyers, writers, and social scientists</p>
              </div>
              <div className="space-y-2">
                <div className="p-3 bg-emerald-50 rounded-lg text-emerald-800 font-medium">
                  Literature + Government + History + Economics
                </div>
                <div className="p-3 bg-teal-50 rounded-lg text-teal-800 font-medium">
                  Literature + Government + Geography + Economics
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            Explore Your Academic Journey
          </h2>
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            Discover the subjects that will shape your future and unlock your potential
            in your chosen field of study.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/academics/curriculum"
              className={getButtonClasses('accent')}
            >
              View Curriculum
            </a>
            <a
              href="/admissions"
              className={getButtonClasses('ghost')}
            >
              Apply Now
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Subjects;
