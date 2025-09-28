import { useState, useEffect } from "react";
import {
  applicationFees,
  applicationDeadlines,
  applicationContact,
  applicationSteps,
  formSections,
  requiredDocuments,
  schoolBenefits,
  formDownload
} from "../data/applicationData";
import { COMPONENT_COLORS, getButtonClasses, getHeadingClasses, getBadgeClasses } from "../constants/colors";
import useToast from '../hooks/useToast';

const Apply = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const { showToast } = useToast();

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

  const handleDownloadForm = () => {
    // In a real application, this would trigger a PDF download
    showToast("PDF download would be triggered here. For now, please visit our campus to collect the form.", 'success');
  };

  return (
    <div className={`${COMPONENT_COLORS.backgrounds.gradient} overflow-hidden relative -mt-[var(--header-height,90px)]`}>
      {/* Hero Section */}
      <section 
        className={`min-h-screen flex flex-col justify-center items-center text-center px-6 relative ${COMPONENT_COLORS.backgrounds.hero}`}
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
            <span className="inline-flex items-center gap-2 px-6 py-3 bg-white/90 border border-emerald-200 rounded-full text-gray-700 text-sm font-semibold backdrop-blur-sm shadow-lg">
              <span className="animate-pulse">🎓</span>
              Start Your Journey
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-8 leading-tight text-white">
            <span className="block">Apply to</span>
            <span className="bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">
              Greenfield
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-white max-w-4xl mx-auto mb-12 leading-relaxed font-medium">
            Take the first step towards an exceptional education. Join our community of learners 
            where every student is nurtured to reach their full potential.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#application-steps"
              className={getButtonClasses('secondary')}
            >
              View Application Process
            </a>
            <a
              href="#download-form"
              className={getButtonClasses('ghost')}
            >
              Get Application Form
            </a>
          </div>
        </div>
      </section>

      {/* Welcome Message */}
      <section className={`py-20 ${COMPONENT_COLORS.backgrounds.primary}`}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="mb-8">
            <span className={getBadgeClasses('emerald')}>
              🌟 Welcome to Our Family
            </span>
            <h2 className="text-4xl md:text-5xl font-black mb-6 text-gray-800">
              Your Child's Bright Future Starts Here
            </h2>
          </div>

          <div className="prose prose-lg mx-auto text-gray-600 leading-relaxed">
            <p className="text-xl mb-6">
              At Greenfield College, we believe every child has unlimited potential. Our nurturing environment, 
              experienced teachers, and comprehensive curriculum create the perfect foundation for academic 
              excellence and character development.
            </p>
            <p className="text-lg mb-6">
              We're excited that you're considering joining our school family! Our application process is 
              designed to be straightforward and personal, allowing us to get to know your child and 
              understand how we can best support their educational journey.
            </p>
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-50 p-6 rounded-2xl border border-emerald-200 mt-8">
              <p className="text-emerald-800 font-semibold text-lg mb-2">
                🎯 Why Choose Greenfield College?
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-emerald-700">
                {schoolBenefits.map((benefit, index) => (
                  <div key={index}>• {benefit}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Application Steps */}
      <section id="application-steps" className={`py-20 ${COMPONENT_COLORS.backgrounds.secondary}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className={getBadgeClasses('emerald')}>
              📋 Application Process
            </span>
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className={COMPONENT_COLORS.headings.gradient}>
                How to Apply
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Follow these simple steps to complete your application. Our admissions team is here 
              to guide you through every step of the process.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {applicationSteps.map((step, index) => (
              <div
                key={index}
                className="group relative bg-white rounded-3xl p-8 border border-gray-200 hover:border-emerald-300 transition-all duration-500 transform hover:scale-105 hover:-translate-y-3 shadow-lg hover:shadow-2xl hover:shadow-emerald-200/50"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className="absolute top-4 right-4 text-6xl font-black text-emerald-100 group-hover:text-emerald-200 transition-colors duration-300">
                  {step.step}
                </div>

                <div className="relative z-10">
                  <div className="text-6xl mb-6 transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                    {step.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4 group-hover:text-emerald-700 transition-colors duration-300">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-6 group-hover:text-gray-700 transition-colors duration-300">
                    {step.description}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    {step.details.map((detail, detailIndex) => (
                      <div key={detailIndex} className="flex items-start gap-2 text-sm text-gray-500">
                        <span className="text-emerald-500 mt-1">•</span>
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full inline-block">
                    ⏱️ {step.duration}
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-b-3xl transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form Download */}
      <section id="download-form" className={`py-20 ${COMPONENT_COLORS.backgrounds.primary}`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className={getBadgeClasses('emerald')}>
                📄 Application Form
              </span>
              <h2 className="text-4xl font-black text-gray-800 mb-6">
                Get Your Application Form
              </h2>
              <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                You can obtain the application form in two ways: visit our campus for a personal consultation 
                and guidance, or download the PDF version below for your convenience.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="bg-emerald-100 p-2 rounded-full">
                    <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-emerald-800 mb-1">Recommended: Campus Visit</h3>
                    <p className="text-emerald-700 text-sm">
                      Get personalized guidance, campus tour, and immediate answers to your questions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="bg-slate-100 p-2 rounded-full">
                    <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-1">Alternative: PDF Download</h3>
                    <p className="text-slate-700 text-sm">
                      Download and print the form at home, then submit with required documents.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleDownloadForm}
                  className={getButtonClasses('primary')}
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Download PDF Form
                </button>
                <a
                  href="/contact"
                  className={getButtonClasses('secondary')}
                >
                  Visit Campus
                </a>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-3xl border border-gray-200 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                📍 Campus Visit Information
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-full">
                    <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Location</p>
                    <p className="text-gray-600 text-sm">{applicationContact.office}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-full">
                    <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Office Hours</p>
                    <p className="text-gray-600 text-sm">{applicationContact.officeHours.weekdays}</p>
                    <p className="text-gray-600 text-sm">{applicationContact.officeHours.saturday}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-full">
                    <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Contact</p>
                    <p className="text-gray-600 text-sm">{applicationContact.phone}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-800 text-sm font-semibold mb-1">💡 Pro Tip</p>
                <p className="text-amber-700 text-sm">
                  Call ahead to schedule your visit and ensure our admissions counselor is available to assist you.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Application Fees & Deadline */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 to-emerald-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className={getBadgeClasses('amber')}>
              💰 Important Information
            </span>
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className={COMPONENT_COLORS.headings.gradient}>
                Fees & Deadlines
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Application Fees */}
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200 hover:shadow-2xl transition-all duration-500">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">💳</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Application Fees</h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Application Form</span>
                  <span className="font-bold text-gray-900">{applicationFees.applicationForm}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Processing Fee</span>
                  <span className="font-bold text-gray-900">{applicationFees.processingFee}</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="font-semibold text-emerald-800">Total Amount</span>
                    <span className="font-bold text-xl text-emerald-900">{applicationFees.total}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-emerald-800 text-sm font-semibold mb-1">💡 Payment Methods</p>
                <p className="text-emerald-700 text-sm">
                  Bank transfer, cash payment at school, or mobile money transfer accepted.
                </p>
              </div>
            </div>

            {/* Deadline */}
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200 hover:shadow-2xl transition-all duration-500">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Application Deadline</h3>
              </div>

              <div className="text-center space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 font-semibold text-lg">{applicationDeadlines.regularDeadline.date}</p>
                  <p className="text-red-700 text-sm">by {applicationDeadlines.regularDeadline.time}</p>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-800 font-semibold text-sm mb-1">Late Applications</p>
                  <p className="text-amber-700 text-sm">
                    Until {applicationDeadlines.lateDeadline.date} with {applicationDeadlines.lateDeadline.penalty} penalty
                  </p>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-emerald-800 font-semibold text-sm mb-1">⏰ Time Remaining</p>
                  <p className="text-emerald-700 text-sm">Submit early to avoid last-minute rush!</p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200 hover:shadow-2xl transition-all duration-500">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">📞</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Need Help?</h3>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-emerald-800 font-semibold text-sm mb-1">📞 Call Us</p>
                  <a href={`tel:${applicationContact.phone}`} className="text-emerald-700 font-semibold hover:text-emerald-800 transition-colors">
                    {applicationContact.phone}
                  </a>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-emerald-800 font-semibold text-sm mb-1">📧 Email Us</p>
                  <a href={`mailto:${applicationContact.email}`} className="text-emerald-700 font-semibold hover:text-emerald-800 transition-colors">
                    {applicationContact.email}
                  </a>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-slate-800 font-semibold text-sm mb-1">🏢 Visit Us</p>
                  <p className="text-slate-700 text-sm">{applicationContact.office}</p>
                </div>
              </div>

              <div className="mt-6">
                <a
                  href="/contact"
                  className={`w-full ${getButtonClasses('primary')} block text-center`}
                >
                  Get Full Contact Details
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Form Fields Preview */}
      <section className={`py-20 ${COMPONENT_COLORS.backgrounds.primary}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className={getBadgeClasses('slate')}>
              👀 Form Preview
            </span>
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className={COMPONENT_COLORS.headings.gradient}>
                What to Expect
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Here's a preview of the information you'll need to provide in the application form. 
              Prepare these details in advance to make the process smoother.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {formSections.map((section, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-6 border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                  {section.section}
                </h3>
                <div className="space-y-2">
                  {section.fields.map((field, fieldIndex) => (
                    <div key={fieldIndex} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-emerald-500">•</span>
                      <span>{field}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Required Documents */}
      <section className={`py-20 ${COMPONENT_COLORS.backgrounds.secondary}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className={getBadgeClasses('emerald')}>
              📋 Required Documents
            </span>
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className={COMPONENT_COLORS.headings.gradient}>
                Documents Checklist
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Gather these documents before submitting your application to ensure a smooth process.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {requiredDocuments.map((doc, index) => (
              <div
                key={index}
                className="group bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-2xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-center">
                  <div className="text-5xl mb-4 transform group-hover:scale-110 transition-all duration-300">
                    {doc.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-emerald-600 transition-colors duration-300">
                    {doc.document}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {doc.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 max-w-2xl mx-auto">
              <h3 className="text-xl font-bold text-amber-800 mb-3">📝 Important Notes</h3>
              <div className="text-amber-700 space-y-2 text-sm text-left">
                <p>• All documents must be original with photocopies</p>
                <p>• Documents in other languages must be translated to English</p>
                <p>• Ensure all photocopies are clear and legible</p>
                <p>• Missing documents may delay application processing</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-600 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            Ready to Begin Your Journey?
          </h2>
          <p className="text-xl text-emerald-100 mb-8 leading-relaxed">
            Don't wait! Start your application process today and secure your child's place 
            in our exceptional learning community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleDownloadForm}
              className="bg-white text-emerald-600 px-8 py-4 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:bg-emerald-50"
            >
              Download Application Form
            </button>
            <a
              href="/contact"
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-lg font-semibold transition-colors duration-200 border border-white/20"
            >
              Visit Our Campus
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Apply;