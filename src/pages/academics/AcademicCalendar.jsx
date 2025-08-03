import { useState, useEffect } from "react";

const AcademicCalendar = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState("first");

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const academicYear = "2024/2025";

  const terms = {
    first: {
      name: "First Term",
      period: "September - December 2024",
      color: "from-blue-500 to-indigo-600",
      weeks: 13,
      events: [
        { date: "Sept 9, 2024", event: "School Resumption", type: "academic", icon: "🏫" },
        { date: "Sept 16, 2024", event: "Orientation Week", type: "orientation", icon: "🎯" },
        { date: "Oct 1, 2024", event: "Independence Day Holiday", type: "holiday", icon: "🇳🇬" },
        { date: "Oct 7-11, 2024", event: "CAT 1 Examinations", type: "exam", icon: "📝" },
        { date: "Oct 28-Nov 1, 2024", event: "Mid-Term Break", type: "break", icon: "🏖️" },
        { date: "Nov 4-8, 2024", event: "Mid-Term Examinations", type: "exam", icon: "����" },
        { date: "Nov 25-29, 2024", event: "Inter-House Sports", type: "sports", icon: "🏃" },
        { date: "Dec 9-13, 2024", event: "End-of-Term Examinations", type: "exam", icon: "🎯" },
        { date: "Dec 20, 2024", event: "Term Ends", type: "academic", icon: "🎉" },
        { date: "Dec 21, 2024 - Jan 7, 2025", event: "Christmas Holiday", type: "holiday", icon: "🎄" }
      ]
    },
    second: {
      name: "Second Term",
      period: "January - April 2025",
      color: "from-green-500 to-emerald-600",
      weeks: 13,
      events: [
        { date: "Jan 8, 2025", event: "School Resumption", type: "academic", icon: "🏫" },
        { date: "Jan 13-17, 2025", event: "Registration Week", type: "academic", icon: "📋" },
        { date: "Feb 3-7, 2025", event: "CAT 2 Examinations", type: "exam", icon: "📝" },
        { date: "Feb 24-28, 2025", event: "Mid-Term Break", type: "break", icon: "🏖️" },
        { date: "Mar 3-7, 2025", event: "Mid-Term Examinations", type: "exam", icon: "📊" },
        { date: "Mar 17-21, 2025", event: "Science Week", type: "academic", icon: "🔬" },
        { date: "Mar 31-Apr 4, 2025", event: "Cultural Week", type: "cultural", icon: "🎭" },
        { date: "Apr 7-11, 2025", event: "End-of-Term Examinations", type: "exam", icon: "🎯" },
        { date: "Apr 18, 2025", event: "Good Friday Holiday", type: "holiday", icon: "✝️" },
        { date: "Apr 25, 2025", event: "Term Ends", type: "academic", icon: "🎉" }
      ]
    },
    third: {
      name: "Third Term",
      period: "May - July 2025",
      color: "from-orange-500 to-red-600",
      weeks: 11,
      events: [
        { date: "May 5, 2025", event: "School Resumption", type: "academic", icon: "🏫" },
        { date: "May 1, 2025", event: "Workers' Day Holiday", type: "holiday", icon: "👷" },
        { date: "May 12-16, 2025", event: "CAT 3 Examinations", type: "exam", icon: "📝" },
        { date: "May 19-23, 2025", event: "WAEC Examinations Begin", type: "exam", icon: "🎓" },
        { date: "Jun 2-6, 2025", event: "NECO Examinations", type: "exam", icon: "📜" },
        { date: "Jun 12, 2025", event: "Democracy Day Holiday", type: "holiday", icon: "🗳️" },
        { date: "Jun 16-20, 2025", event: "Career Week", type: "career", icon: "💼" },
        { date: "Jun 23-27, 2025", event: "Graduation Ceremony", type: "graduation", icon: "🎓" },
        { date: "Jul 7-11, 2025", event: "End-of-Session Examinations", type: "exam", icon: "🎯" },
        { date: "Jul 25, 2025", event: "Session Ends", type: "academic", icon: "🏁" }
      ]
    }
  };

  const eventTypes = {
    academic: { color: "bg-blue-100 text-blue-800", border: "border-blue-200" },
    exam: { color: "bg-red-100 text-red-800", border: "border-red-200" },
    holiday: { color: "bg-green-100 text-green-800", border: "border-green-200" },
    break: { color: "bg-yellow-100 text-yellow-800", border: "border-yellow-200" },
    sports: { color: "bg-purple-100 text-purple-800", border: "border-purple-200" },
    cultural: { color: "bg-pink-100 text-pink-800", border: "border-pink-200" },
    orientation: { color: "bg-indigo-100 text-indigo-800", border: "border-indigo-200" },
    career: { color: "bg-orange-100 text-orange-800", border: "border-orange-200" },
    graduation: { color: "bg-emerald-100 text-emerald-800", border: "border-emerald-200" }
  };

  const importantDates = [
    { date: "September 9, 2024", event: "Academic Session Begins", icon: "🎓" },
    { date: "December 20, 2024", event: "First Term Ends", icon: "📅" },
    { date: "January 8, 2025", event: "Second Term Begins", icon: "📚" },
    { date: "April 25, 2025", event: "Second Term Ends", icon: "📅" },
    { date: "May 5, 2025", event: "Third Term Begins", icon: "📖" },
    { date: "July 25, 2025", event: "Academic Session Ends", icon: "🏁" }
  ];

  return (
    <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 min-h-screen -mt-[var(--header-height,90px)]">
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
                <span>📅</span>
                Academic Planning
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
              Academic <span className="text-yellow-300">Calendar</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-4xl mx-auto leading-relaxed">
              Stay informed with our comprehensive academic calendar featuring important dates,
              examinations, holidays, and school events for the {academicYear} session.
            </p>
          </div>
        </div>
      </section>

      {/* Academic Year Overview */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-6 text-gray-800">
              {academicYear} Academic Year
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our academic year is structured into three terms, each designed to maximize
              learning opportunities while providing adequate breaks for rest and reflection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {Object.entries(terms).map(([key, term]) => (
              <div
                key={key}
                className={`bg-gradient-to-br ${term.color} text-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300`}
              >
                <h3 className="text-2xl font-bold mb-2">{term.name}</h3>
                <p className="text-lg opacity-90 mb-4">{term.period}</p>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black">{term.weeks}</span>
                  <span className="text-sm opacity-75">weeks</span>
                </div>
              </div>
            ))}
          </div>

          {/* Important Dates Quick View */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 shadow-lg border border-gray-200">
            <h3 className="text-3xl font-bold text-gray-800 mb-8 text-center">Key Academic Dates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {importantDates.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100"
                >
                  <div className="text-3xl">{item.icon}</div>
                  <div>
                    <div className="font-semibold text-gray-800">{item.event}</div>
                    <div className="text-sm text-gray-600">{item.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Term Selection */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-center gap-4">
            {Object.entries(terms).map(([key, term]) => (
              <button
                key={key}
                onClick={() => setSelectedTerm(key)}
                className={`px-8 py-3 rounded-full font-semibold transition-all duration-300 ${
                  selectedTerm === key
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-white text-gray-700 hover:bg-gray-100 shadow-sm"
                }`}
              >
                {term.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Term Calendar */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className={`text-4xl md:text-5xl font-black mb-6 bg-gradient-to-r ${terms[selectedTerm].color} bg-clip-text text-transparent`}>
              {terms[selectedTerm].name} Calendar
            </h2>
            <p className="text-xl text-gray-600">
              {terms[selectedTerm].period} • {terms[selectedTerm].weeks} weeks
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200">
            <div className="space-y-6">
              {terms[selectedTerm].events.map((event, index) => (
                <div
                  key={index}
                  className={`flex items-start space-x-6 p-6 rounded-2xl border-2 ${eventTypes[event.type].border} ${eventTypes[event.type].color} hover:shadow-md transition-shadow duration-300`}
                >
                  <div className="text-4xl">{event.icon}</div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-xl font-bold text-gray-800 mb-2 sm:mb-0">
                        {event.event}
                      </h3>
                      <span className="text-sm font-semibold text-gray-600 bg-white px-3 py-1 rounded-full">
                        {event.date}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${eventTypes[event.type].color}`}>
                        {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* School Hours & Weekly Schedule */}
      <section className="py-20 bg-blue-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-6 text-gray-800">
              Daily Schedule
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our structured daily schedule ensures optimal learning time while
              maintaining a healthy balance of academic and extracurricular activities.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Daily Schedule */}
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Daily Timetable</h3>
              <div className="space-y-4">
                {[
                  { time: "7:30 - 8:00 AM", activity: "Assembly & Morning Devotion", icon: "🙏" },
                  { time: "8:00 - 8:40 AM", activity: "1st Period", icon: "📚" },
                  { time: "8:40 - 9:20 AM", activity: "2nd Period", icon: "📖" },
                  { time: "9:20 - 10:00 AM", activity: "3rd Period", icon: "✏️" },
                  { time: "10:00 - 10:20 AM", activity: "Short Break", icon: "☕" },
                  { time: "10:20 - 11:00 AM", activity: "4th Period", icon: "📝" },
                  { time: "11:00 - 11:40 AM", activity: "5th Period", icon: "🔬" },
                  { time: "11:40 AM - 12:20 PM", activity: "6th Period", icon: "🧮" },
                  { time: "12:20 - 1:00 PM", activity: "Lunch Break", icon: "🍽️" },
                  { time: "1:00 - 1:40 PM", activity: "7th Period", icon: "🌍" },
                  { time: "1:40 - 2:20 PM", activity: "8th Period", icon: "🎨" },
                  { time: "2:20 - 3:00 PM", activity: "9th Period", icon: "⚽" },
                  { time: "3:00 - 3:30 PM", activity: "Closing & Clean-up", icon: "🧹" }
                ].map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">{item.activity}</div>
                      <div className="text-sm text-gray-600">{item.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Activities */}
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Weekly Activities</h3>
              <div className="space-y-4">
                {[
                  { day: "Monday", activity: "General Assembly & Academic Focus", color: "bg-blue-100 text-blue-800" },
                  { day: "Tuesday", activity: "Science & Mathematics Emphasis", color: "bg-green-100 text-green-800" },
                  { day: "Wednesday", activity: "Languages & Literature", color: "bg-purple-100 text-purple-800" },
                  { day: "Thursday", activity: "Social Studies & Arts", color: "bg-orange-100 text-orange-800" },
                  { day: "Friday", activity: "Sports & Extracurricular Activities", color: "bg-red-100 text-red-800" }
                ].map((item, index) => (
                  <div key={index} className={`p-4 rounded-lg ${item.color}`}>
                    <div className="font-bold text-lg">{item.day}</div>
                    <div className="text-sm">{item.activity}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-bold text-yellow-800 mb-2">📋 Note:</h4>
                <p className="text-sm text-yellow-700">
                  Saturday classes are held for examination classes (JSS 3 & SSS 3)
                  from 8:00 AM - 12:00 PM during examination periods.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            Plan Your Academic Journey
          </h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            Download our complete academic calendar and stay updated with all
            important dates and school events throughout the year.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/academics/calendar/download"
              className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-8 py-4 rounded-lg font-semibold transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              Download Calendar
            </a>
            <a
              href="/admission"
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-lg font-semibold transition-colors duration-200 border border-white/20"
            >
              Apply for Admission
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AcademicCalendar;
