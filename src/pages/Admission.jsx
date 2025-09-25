import { useState, useEffect } from "react";
import { COMPONENT_COLORS, getButtonClasses, getBadgeClasses, ICON_COLORS } from "../constants/colors";
import {
  GraduationCap,
  ClipboardList,
  FileText,
  Pencil,
  CheckCircle2,
  Sprout,
  BookOpen,
  CreditCard,
  Building2,
  CalendarDays,
  Lightbulb,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";

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
      description:
        "Complete and submit the online application form with all required information.",
      Icon: ClipboardList,
      details: [
        "Fill out student personal information",
        "Provide parent/guardian details",
        "Submit previous academic records",
        "Upload required documents",
      ],
    },
    {
      step: "02",
      title: "Document Submission",
      description:
        "Submit all required documents for verification and processing.",
      Icon: FileText,
      details: [
        "Birth certificate or age declaration",
        "Previous school reports/transcripts",
        "Passport photographs",
        "Medical certificate",
      ],
    },
    {
      step: "03",
      title: "Entrance Assessment",
      description:
        "Participate in our comprehensive entrance examination and interview.",
      Icon: Pencil,
      details: [
        "Written examination in core subjects",
        "Oral assessment and interview",
        "Aptitude and reasoning tests",
        "Parent-student interview session",
      ],
    },
    {
      step: "04",
      title: "Admission Decision",
      description:
        "Receive admission decision and complete enrollment process.",
      Icon: CheckCircle2,
      details: [
        "Admission results notification",
        "Fee payment and confirmation",
        "School orientation program",
        "Class allocation and timetable",
      ],
    },
  ];

  const entryRequirements = [
    {
      level: "Nursery (Ages 3-5)",
      Icon: Sprout,
      requirements: [
        "Minimum age of 3 years",
        "Basic toilet training",
        "Birth certificate",
        "Immunization records",
        "Passport photographs (4 copies)",
      ],
      color: "from-slate-800 to-emerald-700",
    },
    {
      level: "Primary (Ages 6-11)",
      Icon: BookOpen,
      requirements: [
        "Minimum age of 6 years for Primary 1",
        "Previous school report (if applicable)",
        "Birth certificate or age declaration",
        "Transfer certificate (if from another school)",
        "Medical fitness certificate",
      ],
      color: "from-emerald-700 to-teal-600",
    },
    {
      level: "Secondary (Ages 12-17)",
      Icon: GraduationCap,
      requirements: [
        "Primary School Leaving Certificate",
        "Common Entrance Examination result",
        "Previous school testimonial",
        "Birth certificate or age declaration",
        "Medical certificate of fitness",
      ],
      color: "from-slate-800 to-teal-700",
    },
  ];

  const feeStructure = [
    {
      category: "Application Fees",
      Icon: CreditCard,
      items: [
        {
          item: "Application Form",
          amount: "₦5,000",
          description: "Non-refundable application processing fee",
        },
        {
          item: "Entrance Examination",
          amount: "₦10,000",
          description: "Assessment and evaluation fee",
        },
        {
          item: "Interview Session",
          amount: "₦3,000",
          description: "Parent-student interview fee",
        },
      ],
      color: "from-slate-800 to-emerald-700",
    },
    {
      category: "Admission Charges",
      Icon: Building2,
      items: [
        {
          item: "Admission Fee",
          amount: "₦50,000",
          description: "One-time admission processing charge",
        },
        {
          item: "Development Levy",
          amount: "₦25,000",
          description: "School infrastructure development",
        },
        {
          item: "Registration Fee",
          amount: "₦15,000",
          description: "Student registration and documentation",
        },
      ],
      color: "from-emerald-700 to-teal-600",
    },
    {
      category: "Annual Fees",
      Icon: CalendarDays,
      items: [
        {
          item: "Tuition Fee",
          amount: "₦200,000 - ₦350,000",
          description: "Varies by class level and program",
        },
        {
          item: "Uniform & Books",
          amount: "₦30,000 - ��50,000",
          description: "School materials and uniforms",
        },
        {
          item: "Extracurricular",
          amount: "₦20,000",
          description: "Sports, clubs, and activities",
        },
      ],
      color: "from-slate-800 to-teal-700",
    },
  ];

  const keyDates = [
    {
      period: "Application Period",
      Icon: ClipboardList,
      dates: [
        { event: "Application Opens", date: "January 15, 2025", status: "upcoming" },
        { event: "Application Deadline", date: "March 31, 2025", status: "upcoming" },
        { event: "Late Application (with penalty)", date: "April 15, 2025", status: "upcoming" },
      ],
    },
    {
      period: "Assessment Period",
      Icon: Pencil,
      dates: [
        { event: "Entrance Examination", date: "April 20-22, 2025", status: "upcoming" },
        { event: "Interview Sessions", date: "April 25-30, 2025", status: "upcoming" },
        { event: "Results Publication", date: "May 10, 2025", status: "upcoming" },
      ],
    },
    {
      period: "Enrollment Period",
      Icon: GraduationCap,
      dates: [
        { event: "Admission Confirmation", date: "May 15-31, 2025", status: "upcoming" },
        { event: "Fee Payment Deadline", date: "June 15, 2025", status: "upcoming" },
        { event: "New Student Orientation", date: "September 5, 2025", status: "upcoming" },
      ],
    },
  ];

  return (
    <div className={`${COMPONENT_COLORS.backgrounds.gradient} overflow-hidden relative -mt-[var(--header-height,90px)]`}>
      {/* Hero Section */}
      <section
        className={`min-h-screen flex flex-col justify-center items-center text-center px-6 relative ${COMPONENT_COLORS.backgrounds.hero}`}
        style={{
          minHeight: "100vh",
          paddingTop: "var(--header-height, 90px)",
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
              <GraduationCap className={`h-4 w-4 animate-pulse ${ICON_COLORS.primary}`} />
              Join Our School Community
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-8 leading-tight text-white">
            <span className="block">Admission</span>
            <span className="bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">
              Information
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-white max-w-4xl mx-auto mb-12 leading-relaxed font-medium">
            Begin your journey with Greenfield College. Discover our admission process, requirements,
            and how to become part of our thriving educational community.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#application-process" className={getButtonClasses("primary")}>
              Start Application
            </a>
            <a href="#requirements" className={getButtonClasses("ghost")}>
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
              <span className={getBadgeClasses("emerald")}>
                <span className="inline-flex items-center gap-2 align-middle">
                  <ClipboardList className={`h-4 w-4 ${ICON_COLORS.primary}`} /> Step by Step
                </span>
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className={COMPONENT_COLORS.headings.gradient}>
                Admission Process
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our streamlined admission process is designed to be clear, fair, and comprehensive.
              Follow these simple steps to join our school community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {admissionSteps.map((step, index) => {
              const Icon = step.Icon;
              return (
                <div
                  key={index}
                  className="group relative bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-200 hover:border-emerald-300 transition-all duration-500 transform hover:scale-105 hover:-translate-y-3 shadow-lg hover:shadow-2xl hover:shadow-emerald-200/50"
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  <div className="absolute top-4 right-4 text-6xl font-black text-emerald-100 group-hover:text-emerald-200 transition-colors duration-300">
                    {step.step}
                  </div>

                  <div className="relative z-10">
                    <div className="mb-6 transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                      <Icon className={`h-12 w-12 ${ICON_COLORS.primary}`} aria-hidden="true" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-4 group-hover:text-emerald-700 transition-colors duration-300">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed mb-6 group-hover:text-gray-700 transition-colors duration-300">
                      {step.description}
                    </p>

                    <div className="space-y-2">
                      {step.details.map((detail, detailIndex) => (
                        <div key={detailIndex} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle2 className={`h-4 w-4 ${ICON_COLORS.primary} mt-0.5 flex-shrink-0`} />
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-b-3xl transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Entry Requirements Section */}
      <section id="requirements" className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="mb-6">
              <span className={getBadgeClasses("emerald")}>
                <span className="inline-flex items-center gap-2 align-middle">
                  <FileText className={`h-4 w-4 ${ICON_COLORS.primary}`} /> Requirements
                </span>
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className={COMPONENT_COLORS.headings.gradient}>
                Entry Requirements
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Review the specific requirements for each level to ensure your child meets
              the eligibility criteria for admission.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {entryRequirements.map((level, index) => {
              const Icon = level.Icon;
              return (
                <div
                  key={index}
                  className="group bg-white rounded-3xl p-8 border border-gray-200 hover:border-emerald-300 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 shadow-lg hover:shadow-2xl"
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  <div className="text-center mb-6">
                    <div className="mb-4 transform group-hover:scale-110 transition-all duration-300">
                      <Icon className={`h-12 w-12 ${ICON_COLORS.primary}`} aria-hidden="true" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-emerald-700 transition-colors duration-300">
                      {level.level}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {level.requirements.map((requirement, reqIndex) => (
                      <div
                        key={reqIndex}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors duration-300"
                      >
                        <CheckCircle2 className={`h-4 w-4 ${ICON_COLORS.primary} mt-1 flex-shrink-0`} />
                        <span className="text-gray-700 text-sm leading-relaxed">{requirement}</span>
                      </div>
                    ))}
                  </div>

                  <div className={`mt-6 h-1 bg-gradient-to-r ${level.color} rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Fee Structure Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="mb-6">
              <span className={getBadgeClasses("emerald")}>
                <span className="inline-flex items-center gap-2 align-middle">
                  <CreditCard className={`h-4 w-4 ${ICON_COLORS.primary}`} /> Investment in Education
                </span>
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className={COMPONENT_COLORS.headings.gradient}>
                Application Fees & Charges
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transparent fee structure designed to provide exceptional value for quality education.
              All fees are subject to annual review.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {feeStructure.map((category, index) => {
              const Icon = category.Icon;
              return (
                <div
                  key={index}
                  className="group bg-white rounded-3xl p-8 border border-gray-200 hover:border-emerald-300 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 shadow-lg hover:shadow-2xl"
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  <div className="text-center mb-6">
                    <div className="mb-4 transform group-hover:scale-110 transition-all duration-300">
                      <Icon className={`h-12 w-12 ${ICON_COLORS.primary}`} aria-hidden="true" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-emerald-700 transition-colors duration-300">
                      {category.category}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {category.items.map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className="p-4 bg-gray-50 rounded-xl group-hover:bg-gray-100 transition-colors duration-300"
                      >
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
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg max-w-2xl mx-auto">
              <h4 className="text-xl font-bold text-gray-800 mb-3 flex items-center justify-center gap-2">
                <Lightbulb className={`h-5 w-5 ${ICON_COLORS.primary}`} /> Payment Information
              </h4>
              <div className="text-gray-600 space-y-2 text-sm">
                <p className="flex items-start gap-2 justify-center"><CheckCircle2 className={`h-4 w-4 ${ICON_COLORS.primary} mt-0.5`} /> Payment plans available for annual fees</p>
                <p className="flex items-start gap-2 justify-center"><CheckCircle2 className={`h-4 w-4 ${ICON_COLORS.primary} mt-0.5`} /> Sibling discounts apply for multiple enrollments</p>
                <p className="flex items-start gap-2 justify-center"><CheckCircle2 className={`h-4 w-4 ${ICON_COLORS.primary} mt-0.5`} /> Early payment discounts available</p>
                <p className="flex items-start gap-2 justify-center"><CheckCircle2 className={`h-4 w-4 ${ICON_COLORS.primary} mt-0.5`} /> All fees are quoted in Nigerian Naira (₦)</p>
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
              <span className={getBadgeClasses("emerald")}>
                <span className="inline-flex items-center gap-2 align-middle">
                  <CalendarDays className={`h-4 w-4 ${ICON_COLORS.primary}`} /> Important Dates
                </span>
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className={COMPONENT_COLORS.headings.gradient}>
                Key Dates & Timeline
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Stay informed about important admission dates and deadlines.
              Mark your calendar to ensure you don't miss any crucial steps.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {keyDates.map((period, index) => {
              const Icon = period.Icon;
              return (
                <div
                  key={index}
                  className="group bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-200 hover:border-emerald-300 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 shadow-lg hover:shadow-2xl hover:shadow-emerald-200/50"
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  <div className="text-center mb-6">
                    <div className="mb-4 transform group-hover:scale-110 transition-all duration-300">
                      <Icon className={`h-12 w-12 ${ICON_COLORS.primary}`} aria-hidden="true" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-emerald-700 transition-colors duration-300">
                      {period.period}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {period.dates.map((date, dateIndex) => (
                      <div
                        key={dateIndex}
                        className="p-4 bg-white rounded-xl border border-gray-100 group-hover:border-emerald-200 transition-colors duration-300 shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-800 text-sm">{date.event}</h4>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              date.status === "upcoming"
                                ? "bg-emerald-100 text-emerald-700"
                                : date.status === "current"
                                ? "bg-teal-100 text-teal-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {date.status}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-emerald-700">{date.date}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 h-1 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact & Support Section */}
      <section className={`${COMPONENT_COLORS.backgrounds.hero} py-20 text-white`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-6">Need Help with Your Application?</h2>
            <p className="text-xl text-emerald-100 mb-8 leading-relaxed max-w-3xl mx-auto">
              Our admissions team is here to guide you through every step of the process.
              Don't hesitate to reach out with any questions or concerns.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="mb-4 flex items-center justify-center">
                <Phone className={`h-6 w-6 ${ICON_COLORS.onDark}`} />
              </div>
              <h3 className="text-xl font-bold mb-2">Call Us</h3>
              <p className="text-emerald-100 mb-3">Speak directly with our admissions team</p>
              <a
                href="tel:+2348034543622"
                className="text-white font-semibold hover:text-emerald-200 transition-colors"
              >
                +234 803 454 3622
              </a>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="mb-4 flex items-center justify-center">
                <Mail className={`h-6 w-6 ${ICON_COLORS.onDark}`} />
              </div>
              <h3 className="text-xl font-bold mb-2">Email Us</h3>
              <p className="text-emerald-100 mb-3">Send us your questions anytime</p>
              <a
                href="mailto:admissions@greenfield.edu.ng"
                className="text-white font-semibold hover:text-emerald-200 transition-colors"
              >
                admissions@greenfield.edu.ng
              </a>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="mb-4 flex items-center justify-center">
                <MapPin className={`h-6 w-6 ${ICON_COLORS.onDark}`} />
              </div>
              <h3 className="text-xl font-bold mb-2">Visit Us</h3>
              <p className="text-emerald-100 mb-3">Schedule a campus tour</p>
              <p className="text-white font-semibold">Mon - Fri: 8:00 AM - 4:00 PM</p>
            </div>
          </div>

          <div className="text-center mt-12">
            <a href="/contact" className={getButtonClasses("secondary")}>
              Contact Admissions Office
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            Ready to Begin Your Journey?
          </h2>
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            Take the first step towards an exceptional education at Greenfield College.
            Your child's bright future starts here.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#application-process" className={getButtonClasses("primary")}>
              Start Application Now
            </a>
            <a href="/about" className={getButtonClasses("ghost")}>
              Learn More About Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Admission;
