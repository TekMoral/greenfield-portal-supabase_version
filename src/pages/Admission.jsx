import { useState, useEffect } from "react";

const Admission = () => {
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

  const admissionSteps = [
    {
      step: "01",
      title: "Application Form",
      description: "Complete and submit the online application form with all required information.",
      icon: "📝",
      details: [
        "Fill out student personal information",
        "Provide parent/guardian details",
        "Submit previous academic records",
        "Upload required documents"
      ]
    },
    {
      step: "02",
      title: "Document Submission",
      description: "Submit all required documents for verification and processing.",
      icon: "📄",
      details: [
        "Birth certificate or age declaration",
        "Previous school reports/transcripts",
        "Passport photographs",
        "Medical certificate"
      ]
    },
    {
      step: "03",
      title: "Entrance Assessment",
      description: "Participate in our comprehensive entrance examination and interview.",
      icon: "✏️",
      details: [
        "Written examination in core subjects",
        "Oral assessment and interview",
        "Aptitude and reasoning tests",
        "Parent-student interview session"
      ]
    },
    {
      step: "04",
      title: "Admission Decision",
      description: "Receive admission decision and complete enrollment process.",
      icon: "🎉",
      details: [
        "Admission results notification",
        "Fee payment and confirmation",
        "School orientation program",
        "Class allocation and timetable"
      ]
    }
  ];

  const entryRequirements = [
    {
      level: "Nursery (Ages 3-5)",
      icon: "🧸",
      requirements: [
        "Minimum age of 3 years",
        "Basic toilet training",
        "Birth certificate",
        "Immunization records",
        "Passport photographs (4 copies)"
      ],
      color: "from-pink-400 to-rose-500"
    },
    {
      level: "Primary (Ages 6-11)",
      icon: "📚",
      requirements: [
        "Minimum age of 6 years for Primary 1",
        "Previous school report (if applicable)",
        "Birth certificate or age declaration",
        "Transfer certificate (if from another school)",
        "Medical fitness certificate"
      ],
      color: "from-blue-400 to-indigo-500"
    },
    {
      level: "Secondary (Ages 12-17)",
      icon: "🎓",
      requirements: [
        "Primary School Leaving Certificate",
        "Common Entrance Examination result",
        "Previous school testimonial",
        "Birth certificate or age declaration",
        "Medical certificate of fitness"
      ],
      color: "from-green-400 to-emerald-500"
    }
  ];

  const feeStructure = [
    {
      category: "Application Fees",
      icon: "💳",
      items: [
        { item: "Application Form", amount: "₦5,000", description: "Non-refundable application processing fee" },
        { item: "Entrance Examination", amount: "₦10,000", description: "Assessment and evaluation fee" },
        { item: "Interview Session", amount: "₦3,000", description: "Parent-student interview fee" }
      ],
      color: "from-purple-400 to-violet-500"
    },
    {
      category: "Admission Charges",
      icon: "🏫",
      items: [
        { item: "Admission Fee", amount: "₦50,000", description: "One-time admission processing charge" },
        { item: "Development Levy", amount: "₦25,000", description: "School infrastructure development" },
        { item: "Registration Fee", amount: "₦15,000", description: "Student registration and documentation" }
      ],
      color: "from-orange-400 to-red-500"
    },
    {
      category: "Annual Fees",
      icon: "📅",
      items: [
        { item: "Tuition Fee", amount: "₦200,000 - ₦350,000", description: "Varies by class level and program" },
        { item: "Uniform & Books", amount: "₦30,000 - ₦50,000", description: "School materials and uniforms" },
        { item: "Extracurricular", amount: "₦20,000", description: "Sports, clubs, and activities" }
      ],
      color: "from-teal-400 to-cyan-500"
    }
  ];

  const keyDates = [
    {
      period: "Application Period",
      icon: "📝",
      dates: [
        { event: "Application Opens", date: "January 15, 2025", status: "upcoming" },
        { event: "Application Deadline", date: "March 31, 2025", status: "upcoming" },
        { event: "Late Application (with penalty)", date: "April 15, 2025", status: "upcoming" }
      ]
    },
    {
      period: "Assessment Period",
      icon: "✏️",
      dates: [
        { event: "Entrance Examination", date: "April 20-22, 2025", status: "upcoming" },
        { event: "Interview Sessions", date: "April 25-30, 2025", status: "upcoming" },
        { event: "Results Publication", date: "May 10, 2025", status: "upcoming" }
      ]
    },
    {
      period: "Enrollment Period",
      icon: "🎒",
      dates: [
        { event: "Admission Confirmation", date: "May 15-31, 2025", status: "upcoming" },
        { event: "Fee Payment Deadline", date: "June 15, 2025", status: "upcoming" },
        { event: "New Student Orientation", date: "September 5, 2025", status: "upcoming" }
      ]
    }
  ];

  return (
    <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-green-50 overflow-hidden relative -mt-[var(--header-height,90px)]">
      {/* Hero Section */}
      <section 
        className="min-h-screen flex flex-col justify-center items-center text-center px-6 relative bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600"
        style={{
          minHeight: "100vh",
          paddingTop: "var(--header-height, 90px)"
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
            <span className="inline-flex items-center gap-2 px-6 py-3 bg-white/90 border border-green-200 rounded-full text-gray-700 text-sm font-semibold backdrop-blur-sm shadow-lg">
              <span className="animate-pulse">🎓</span>
              Join Our School Community
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-8 leading-tight text-white">
            <span className="block">Admission</span>
            <span className="bg-gradient-to-r from-white to-green-100 bg-clip-text text-transparent">
              Information
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-white max-w-4xl mx-auto mb-12 leading-relaxed font-medium">
            Begin your journey with Greenfield College. Discover our admission process, requirements,
            and how to become part of our thriving educational community.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#application-process"
              className="bg-white text-green-600 px-8 py-4 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:bg-green-50"
            >
              Start Application
            </a>
            <a
              href="#requirements"
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-lg font-semibold transition-colors duration-200 border border-white/20 backdrop-blur-sm"
            >
              View Requirements
            </a>
          </div>
        </div>
      </section>

      {/* Admission Process Section */}
      <section id="application-process" className="py-20 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="mb-6">
              <span className="inline-block px-4 py-2 bg-green-100 border border-green-200 rounded-full text-green-700 text-sm font-semibold">
                📋 Step by Step
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className="bg-gradient-to-r from-gray-800 to-slate-700 bg-clip-text text-transparent">
                Admission Process
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our streamlined admission process is designed to be clear, fair, and comprehensive.
              Follow these simple steps to join our school community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {admissionSteps.map((step, index) => (
              <div
                key={index}
                className="group relative bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-200 hover:border-green-300 transition-all duration-500 transform hover:scale-105 hover:-translate-y-3 shadow-lg hover:shadow-2xl hover:shadow-green-200/50"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className="absolute top-4 right-4 text-6xl font-black text-green-100 group-hover:text-green-200 transition-colors duration-300">
                  {step.step}
                </div>

                <div className="relative z-10">
                  <div className="text-6xl mb-6 transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                    {step.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4 group-hover:text-green-700 transition-colors duration-300">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-6 group-hover:text-gray-700 transition-colors duration-300">
                    {step.description}
                  </p>
                  
                  <div className="space-y-2">
                    {step.details.map((detail, detailIndex) => (
                      <div key={detailIndex} className="flex items-start gap-2 text-sm text-gray-500">
                        <span className="text-green-500 mt-1">•</span>
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-b-3xl transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Entry Requirements Section */}
      <section id="requirements" className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="mb-6">
              <span className="inline-block px-4 py-2 bg-blue-100 border border-blue-200 rounded-full text-blue-700 text-sm font-semibold">
                📋 Requirements
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className="bg-gradient-to-r from-gray-800 to-slate-700 bg-clip-text text-transparent">
                Entry Requirements
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                & Eligibility
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Review the specific requirements for each level to ensure your child meets
              the eligibility criteria for admission.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {entryRequirements.map((level, index) => (
              <div
                key={index}
                className="group bg-white rounded-3xl p-8 border border-gray-200 hover:border-gray-300 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 shadow-lg hover:shadow-2xl"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4 transform group-hover:scale-110 transition-all duration-300">
                    {level.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-gray-900 transition-colors duration-300">
                    {level.level}
                  </h3>
                </div>

                <div className="space-y-3">
                  {level.requirements.map((requirement, reqIndex) => (
                    <div key={reqIndex} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors duration-300">
                      <span className="text-green-500 mt-1 flex-shrink-0">✓</span>
                      <span className="text-gray-700 text-sm leading-relaxed">{requirement}</span>
                    </div>
                  ))}
                </div>

                <div className={`mt-6 h-1 bg-gradient-to-r ${level.color} rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fee Structure Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="mb-6">
              <span className="inline-block px-4 py-2 bg-indigo-100 border border-indigo-200 rounded-full text-indigo-700 text-sm font-semibold">
                💰 Investment in Education
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className="bg-gradient-to-r from-gray-800 to-slate-700 bg-clip-text text-transparent">
                Application Fees
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                & Charges
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transparent fee structure designed to provide exceptional value for quality education.
              All fees are subject to annual review.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {feeStructure.map((category, index) => (
              <div
                key={index}
                className="group bg-white rounded-3xl p-8 border border-gray-200 hover:border-gray-300 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 shadow-lg hover:shadow-2xl"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4 transform group-hover:scale-110 transition-all duration-300">
                    {category.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-gray-900 transition-colors duration-300">
                    {category.category}
                  </h3>
                </div>

                <div className="space-y-4">
                  {category.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="p-4 bg-gray-50 rounded-xl group-hover:bg-gray-100 transition-colors duration-300">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-800">{item.item}</h4>
                        <span className="font-bold text-lg text-gray-900">{item.amount}</span>
                      </div>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  ))}
                </div>

                <div className={`mt-6 h-1 bg-gradient-to-r ${category.color} rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}></div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg max-w-2xl mx-auto">
              <h4 className="text-xl font-bold text-gray-800 mb-3">💡 Payment Information</h4>
              <div className="text-gray-600 space-y-2 text-sm">
                <p>• Payment plans available for annual fees</p>
                <p>• Sibling discounts apply for multiple enrollments</p>
                <p>• Early payment discounts available</p>
                <p>• All fees are quoted in Nigerian Naira (₦)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Dates & Timeline Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="mb-6">
              <span className="inline-block px-4 py-2 bg-orange-100 border border-orange-200 rounded-full text-orange-700 text-sm font-semibold">
                📅 Important Dates
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className="bg-gradient-to-r from-gray-800 to-slate-700 bg-clip-text text-transparent">
                Key Dates
              </span>
              <br />
              <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                & Timeline
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Stay informed about important admission dates and deadlines.
              Mark your calendar to ensure you don't miss any crucial steps.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {keyDates.map((period, index) => (
              <div
                key={index}
                className="group bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-200 hover:border-orange-300 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 shadow-lg hover:shadow-2xl hover:shadow-orange-200/50"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4 transform group-hover:scale-110 transition-all duration-300">
                    {period.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-orange-700 transition-colors duration-300">
                    {period.period}
                  </h3>
                </div>

                <div className="space-y-4">
                  {period.dates.map((date, dateIndex) => (
                    <div key={dateIndex} className="p-4 bg-white rounded-xl border border-gray-100 group-hover:border-orange-200 transition-colors duration-300 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-800 text-sm">{date.event}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          date.status === 'upcoming' ? 'bg-green-100 text-green-700' : 
                          date.status === 'current' ? 'bg-orange-100 text-orange-700' : 
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {date.status}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-orange-600">{date.date}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 h-1 bg-gradient-to-r from-orange-400 to-red-500 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact & Support Section */}
      <section className="py-20 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-6">
              Need Help with Your Application?
            </h2>
            <p className="text-xl text-green-100 mb-8 leading-relaxed max-w-3xl mx-auto">
              Our admissions team is here to guide you through every step of the process.
              Don't hesitate to reach out with any questions or concerns.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="text-4xl mb-4">📞</div>
              <h3 className="text-xl font-bold mb-2">Call Us</h3>
              <p className="text-green-100 mb-3">Speak directly with our admissions team</p>
              <a href="tel:+2348034543622" className="text-white font-semibold hover:text-green-200 transition-colors">
                +234 803 454 3622
              </a>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="text-4xl mb-4">📧</div>
              <h3 className="text-xl font-bold mb-2">Email Us</h3>
              <p className="text-green-100 mb-3">Send us your questions anytime</p>
              <a href="mailto:admissions@greenfield.edu.ng" className="text-white font-semibold hover:text-green-200 transition-colors">
                admissions@greenfield.edu.ng
              </a>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="text-4xl mb-4">🏫</div>
              <h3 className="text-xl font-bold mb-2">Visit Us</h3>
              <p className="text-green-100 mb-3">Schedule a campus tour</p>
              <p className="text-white font-semibold">
                Mon - Fri: 8:00 AM - 4:00 PM
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <a
              href="/contact"
              className="bg-white text-green-600 px-8 py-4 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:bg-green-50 inline-block"
            >
              Contact Admissions Office
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-br from-gray-900 to-slate-800 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            Ready to Begin Your Journey?
          </h2>
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            Take the first step towards an exceptional education at Greenfield College.
            Your child's bright future starts here.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#application-process"
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              Start Application Now
            </a>
            <a
              href="/about"
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-lg font-semibold transition-colors duration-200 border border-white/20"
            >
              Learn More About Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Admission;