import { useState, useEffect } from "react";

const Examinations = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("internal");

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const internalExams = [
    {
      name: "Continuous Assessment Tests (CAT)",
      frequency: "Monthly",
      description: "Regular assessments to monitor student progress throughout the term",
      weight: "40%",
      icon: "📝",
      color: "from-blue-400 to-blue-600"
    },
    {
      name: "Mid-Term Examinations",
      frequency: "Mid-Term",
      description: "Comprehensive tests covering half-term curriculum content",
      weight: "30%",
      icon: "📊",
      color: "from-green-400 to-green-600"
    },
    {
      name: "End-of-Term Examinations",
      frequency: "End of Term",
      description: "Final examinations covering the entire term's curriculum",
      weight: "30%",
      icon: "🎯",
      color: "from-purple-400 to-purple-600"
    }
  ];

  const externalExams = [
    {
      name: "Basic Education Certificate Examination (BECE)",
      level: "JSS 3",
      body: "NECO",
      description: "National examination for transition from junior to senior secondary school",
      subjects: "9 subjects including Mathematics, English, and Basic Science",
      icon: "🏆",
      color: "from-orange-400 to-orange-600"
    },
    {
      name: "West African Senior School Certificate Examination (WASSCE)",
      level: "SSS 3",
      body: "WAEC",
      description: "Regional examination for university admission and employment",
      subjects: "Minimum 8 subjects including Mathematics and English",
      icon: "🎓",
      color: "from-red-400 to-red-600"
    },
    {
      name: "National Examination Council (NECO)",
      level: "SSS 3",
      body: "NECO",
      description: "Alternative senior secondary certificate examination",
      subjects: "Minimum 8 subjects with flexible scheduling",
      icon: "📜",
      color: "from-indigo-400 to-indigo-600"
    },
    {
      name: "Joint Admissions and Matriculation Board (JAMB)",
      level: "Post-SSS 3",
      body: "JAMB",
      description: "University entrance examination for tertiary institution admission",
      subjects: "4 subjects relevant to chosen course of study",
      icon: "🎯",
      color: "from-teal-400 to-teal-600"
    }
  ];

  const examPreparation = [
    {
      title: "Study Groups",
      description: "Collaborative learning sessions with peers and teachers",
      icon: "👥"
    },
    {
      title: "Mock Examinations",
      description: "Practice tests simulating actual examination conditions",
      icon: "📋"
    },
    {
      title: "Revision Classes",
      description: "Intensive review sessions before major examinations",
      icon: "📚"
    },
    {
      title: "Past Questions",
      description: "Access to previous years' examination papers and solutions",
      icon: "📄"
    },
    {
      title: "Counseling Support",
      description: "Academic and psychological support during examination periods",
      icon: "🤝"
    },
    {
      title: "Time Management",
      description: "Training on effective study schedules and exam strategies",
      icon: "⏰"
    }
  ];

  const gradingSystem = [
    { grade: "A1", range: "75-100", description: "Excellent", color: "bg-green-500" },
    { grade: "B2", range: "70-74", description: "Very Good", color: "bg-green-400" },
    { grade: "B3", range: "65-69", description: "Good", color: "bg-blue-500" },
    { grade: "C4", range: "60-64", description: "Credit", color: "bg-blue-400" },
    { grade: "C5", range: "55-59", description: "Credit", color: "bg-yellow-500" },
    { grade: "C6", range: "50-54", description: "Credit", color: "bg-yellow-400" },
    { grade: "D7", range: "45-49", description: "Pass", color: "bg-orange-500" },
    { grade: "E8", range: "40-44", description: "Pass", color: "bg-orange-400" },
    { grade: "F9", range: "0-39", description: "Fail", color: "bg-red-500" }
  ];

  return (
    <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-green-50 min-h-screen -mt-[var(--header-height,90px)]">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 text-white py-12 md:py-20" style={{ paddingTop: "calc(var(--header-height, 90px) + 1rem)"}}>
        <div className="max-w-7xl mx-auto px-6">
          <div
            className={`text-center transform transition-all duration-1000 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
            }`}
          >
            <div className="mb-4 md:mb-6">
              <span className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white/20 border border-white/30 rounded-full text-white text-xs sm:text-sm font-semibold backdrop-blur-sm">
                <span>📝</span>
                Assessment & Evaluation
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black mb-4 md:mb-6 leading-tight px-2">
              <span className="text-yellow-300">Examinations</span> & Assessment
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-green-100 max-w-4xl mx-auto leading-relaxed px-2">
              Comprehensive assessment system designed to evaluate student progress
              and prepare them for academic and professional success.
            </p>
          </div>
        </div>
      </section>

      {/* Examination Types Navigation */}
      <section className="py-8 md:py-12 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <button
              onClick={() => setActiveTab("internal")}
              className={`px-6 sm:px-8 py-2 sm:py-3 rounded-full font-semibold transition-all duration-300 text-center ${
                activeTab === "internal"
                  ? "bg-green-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Internal Assessments
            </button>
            <button
              onClick={() => setActiveTab("external")}
              className={`px-6 sm:px-8 py-2 sm:py-3 rounded-full font-semibold transition-all duration-300 text-center ${
                activeTab === "external"
                  ? "bg-green-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              External Examinations
            </button>
          </div>
        </div>
      </section>

      {/* Internal Assessments */}
      {activeTab === "internal" && (
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black mb-6 text-gray-800">
                Internal Assessment System
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Our comprehensive internal assessment system ensures continuous monitoring
                of student progress and provides regular feedback for improvement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {internalExams.map((exam, index) => (
                <div
                  key={index}
                  className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200 hover:shadow-xl hover:transform hover:scale-105 transition-all duration-300"
                >
                  <div className="text-center mb-6">
                    <div className="text-6xl mb-4">{exam.icon}</div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{exam.name}</h3>
                    <p className="text-green-600 font-semibold mb-4">{exam.frequency}</p>
                    <p className="text-gray-600 leading-relaxed">{exam.description}</p>
                  </div>

                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                      <span className="text-2xl font-black text-green-600">{exam.weight}</span>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Weight in Final Grade</p>
                  </div>

                  <div className={`mt-6 h-1 bg-gradient-to-r ${exam.color} rounded-full`}></div>
                </div>
              ))}
            </div>

            {/* Grading System */}
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200">
              <h3 className="text-3xl font-bold text-gray-800 mb-8 text-center">Grading System</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {gradingSystem.map((grade, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className={`w-12 h-12 ${grade.color} rounded-full flex items-center justify-center text-white font-bold`}>
                      {grade.grade}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">{grade.range}%</div>
                      <div className="text-sm text-gray-600">{grade.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* External Examinations */}
      {activeTab === "external" && (
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black mb-6 text-gray-800">
                External Examinations
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Preparation for national and regional examinations that open doors
                to higher education and career opportunities.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {externalExams.map((exam, index) => (
                <div
                  key={index}
                  className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="flex items-start space-x-6">
                    <div className="text-6xl">{exam.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-800 mb-2">{exam.name}</h3>
                      <div className="flex items-center space-x-4 mb-4">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          {exam.level}
                        </span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {exam.body}
                        </span>
                      </div>
                      <p className="text-gray-600 leading-relaxed mb-4">{exam.description}</p>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-2">Subject Requirements:</h4>
                        <p className="text-gray-600 text-sm">{exam.subjects}</p>
                      </div>
                    </div>
                  </div>
                  <div className={`mt-6 h-1 bg-gradient-to-r ${exam.color} rounded-full`}></div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Examination Preparation */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-6 text-gray-800">
              Examination Preparation
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive support system to ensure students are well-prepared
              for all examinations and assessments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {examPreparation.map((item, index) => (
              <div
                key={index}
                className="text-center group hover:transform hover:scale-105 transition-all duration-300"
              >
                <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300">
                  <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Examination Calendar */}
      <section className="py-20 bg-green-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-6 text-gray-800">
              Examination Calendar
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Important examination dates and deadlines for the academic year.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">1st</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="font-semibold text-blue-800">CAT 1</div>
                    <div className="text-sm text-blue-600">Week 4</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="font-semibold text-green-800">Mid-Term</div>
                    <div className="text-sm text-green-600">Week 7</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="font-semibold text-purple-800">End-of-Term</div>
                    <div className="text-sm text-purple-600">Week 13</div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">2nd</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="font-semibold text-blue-800">CAT 2</div>
                    <div className="text-sm text-blue-600">Week 4</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="font-semibold text-green-800">Mid-Term</div>
                    <div className="text-sm text-green-600">Week 7</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="font-semibold text-purple-800">End-of-Term</div>
                    <div className="text-sm text-purple-600">Week 13</div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Third Term</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="font-semibold text-blue-800">CAT 3</div>
                    <div className="text-sm text-blue-600">Week 4</div>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="font-semibold text-orange-800">External Exams</div>
                    <div className="text-sm text-orange-600">Week 8-12</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="font-semibold text-red-800">JAMB</div>
                    <div className="text-sm text-red-600">April-May</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-br from-green-600 to-emerald-700 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            Excel in Your Examinations
          </h2>
          <p className="text-xl text-green-100 mb-8 leading-relaxed">
            Join our comprehensive examination preparation program and achieve
            outstanding results in all your academic assessments.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/academics/curriculum"
              className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-8 py-4 rounded-lg font-semibold transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              View Curriculum
            </a>
            <a
              href="/admissions"
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-lg font-semibold transition-colors duration-200 border border-white/20"
            >
              Apply Now
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Examinations;
