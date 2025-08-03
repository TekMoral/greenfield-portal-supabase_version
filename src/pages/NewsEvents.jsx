import { useState, useEffect } from "react";
import { getNewsEvents, getNewsByType, getPublishedNews } from "../services/supabase/newsService";
import {
  newsCategories,
  eventCategories,
  formatDate,
  formatTime,
  getStatusColor,
  getCategoryColor
} from "../data/newsEventsData";

const NewsEvents = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newsData, setNewsData] = useState([]);
  const [eventsData, setEventsData] = useState([]);
  const [featuredAnnouncement, setFeaturedAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsVisible(true);
    loadData();

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [news, events] = await Promise.all([
        getPublishedNews(),
        getNewsByType('event')
      ]);
      setNewsData(news || []);
      setEventsData(events || []);
      // For now, set featured announcement to first news item
      setFeaturedAnnouncement(news?.[0] || null);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter functions using dynamic data
  const filteredNews = selectedCategory === 'all' 
    ? newsData 
    : newsData.filter(news => news.category === selectedCategory);
  
  const upcomingEvents = eventsData.filter(event => event.status === 'upcoming');
  const pastEvents = eventsData.filter(event => event.status === 'past');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 overflow-hidden relative -mt-[var(--header-height,90px)]">
      {/* Hero Section */}
      <section
        className="min-h-screen flex flex-col justify-center items-center text-center px-6 relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600"
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
            <span className="inline-flex items-center gap-2 px-6 py-3 bg-white/90 border border-blue-200 rounded-full text-gray-700 text-sm font-semibold backdrop-blur-sm shadow-lg">
              <span className="animate-pulse">📰</span>
              Stay Updated
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-8 leading-tight text-white">
            <span className="block">News &</span>
            <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              Events
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-white max-w-4xl mx-auto mb-12 leading-relaxed font-medium">
            Stay connected with the latest happenings at Greenfield College.
            Discover our achievements, upcoming events, and community news.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#featured"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:bg-blue-50"
            >
              Latest News
            </a>
            <a
              href="#events"
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-lg font-semibold transition-colors duration-200 border border-white/20 backdrop-blur-sm"
            >
              Upcoming Events
            </a>
          </div>
        </div>
      </section>

      {/* Featured Announcement Banner */}
      {featuredAnnouncement && (
        <section id="featured" className="py-12 bg-gradient-to-r from-orange-500 to-red-500 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="bg-white/20 p-3 rounded-full flex-shrink-0">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="bg-white/20 px-2 py-1 rounded-full text-xs font-semibold">
                      FEATURED ANNOUNCEMENT
                    </span>
                    <span className="text-sm opacity-90">{formatDate(featuredAnnouncement.date)}</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold mb-2">{featuredAnnouncement.title}</h2>
                  <p className="text-orange-100 md:text-lg mb-4 sm:mb-0">{featuredAnnouncement.summary}</p>
                </div>
              </div>
              <div className="flex-shrink-0 self-center">
                <a
                  href={featuredAnnouncement.link}
                  className="bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors duration-200 shadow-lg whitespace-nowrap inline-block"
                >
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* News Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="mb-6">
              <span className="inline-block px-4 py-2 bg-blue-100 border border-blue-200 rounded-full text-blue-700 text-sm font-semibold">
                📰 Latest Updates
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className="bg-gradient-to-r from-gray-800 to-slate-700 bg-clip-text text-transparent">
                School News
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Stay informed about our latest achievements, developments, and important announcements.
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {newsCategories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>

          {/* News Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredNews.map((news, index) => (
              <article
                key={news.id}
                className="group bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={news.image}
                    alt={news.title}
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(news.category)}`}>
                      {news.category.charAt(0).toUpperCase() + news.category.slice(1)}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg">
                    <span className="text-xs font-medium text-gray-600">{formatDate(news.date)}</span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-blue-600 transition-colors duration-300 line-clamp-2">
                    {news.title}
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-3 leading-relaxed">
                    {news.summary}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>By {news.author}</span>
                    </div>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 shadow-md hover:shadow-lg">
                      Read More
                    </button>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {news.tags.map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section id="events" className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="mb-6">
              <span className="inline-block px-4 py-2 bg-purple-100 border border-purple-200 rounded-full text-purple-700 text-sm font-semibold">
                📅 What's Happening
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className="bg-gradient-to-r from-gray-800 to-slate-700 bg-clip-text text-transparent">
                Upcoming Events
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Mark your calendar for these exciting events and activities happening at our school.
            </p>
          </div>

          {/* Event Tabs */}
          <div className="flex justify-center mb-12">
            <div className="bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  activeTab === 'upcoming'
                    ? 'bg-white text-purple-600 shadow-md'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Upcoming Events ({upcomingEvents.length})
              </button>
              <button
                onClick={() => setActiveTab('past')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  activeTab === 'past'
                    ? 'bg-white text-purple-600 shadow-md'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Past Events ({pastEvents.length})
              </button>
            </div>
          </div>

          {/* Events List */}
          <div className="space-y-6">
            {(activeTab === 'upcoming' ? upcomingEvents : pastEvents).map((event, index) => (
              <div
                key={event.id}
                className="group bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.02]"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  {/* Date & Time */}
                  <div className="flex-shrink-0 text-center lg:text-left">
                    <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white p-4 rounded-xl shadow-lg">
                      <div className="text-2xl font-black">
                        {new Date(event.date).getDate()}
                      </div>
                      <div className="text-sm font-semibold opacity-90">
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                      <div className="text-xs opacity-75">
                        {new Date(event.date).getFullYear()}
                      </div>
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="flex-grow">
                    <div className="flex flex-wrap items-start gap-3 mb-3">
                      <h3 className="text-2xl font-bold text-gray-800 group-hover:text-purple-600 transition-colors duration-300">
                        {event.title}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(event.status)}`}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(event.category)}`}>
                        {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
                      </span>
                    </div>

                    <p className="text-gray-600 mb-4 leading-relaxed">
                      {event.description}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-500">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <span><strong>Time:</strong> {formatTime(event.time)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <span><strong>Venue:</strong> {event.venue}</span>
                      </div>
                      {event.capacity && (
                        <div className="flex items-center gap-2 text-gray-500">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                          </svg>
                          <span><strong>Capacity:</strong> {event.capacity} people</span>
                        </div>
                      )}
                    </div>

                    {event.registrationRequired && event.status === 'upcoming' && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm font-semibold">Registration Required</span>
                        </div>
                        <p className="text-sm text-yellow-700 mt-1">
                          Contact: <a href={`mailto:${event.contact}`} className="underline hover:text-yellow-800">{event.contact}</a>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  {event.status === 'upcoming' && (
                    <div className="flex-shrink-0">
                      <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200 shadow-lg hover:shadow-xl">
                        {event.registrationRequired ? 'Register' : 'Learn More'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* No Events Message */}
          {(activeTab === 'upcoming' ? upcomingEvents : pastEvents).length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No {activeTab} events found
              </h3>
              <p className="text-gray-500">
                {activeTab === 'upcoming'
                  ? 'Check back soon for upcoming events and activities.'
                  : 'Past events will be displayed here once available.'
                }
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter Subscription */}
      <section className="py-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            Stay in the Loop
          </h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            Subscribe to our newsletter to receive the latest news, events, and important announcements
            directly in your inbox.
          </p>

          <div className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                placeholder="Enter your email address"
                className="flex-1 px-4 py-3 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors duration-200 shadow-lg">
                Subscribe
              </button>
            </div>
            <p className="text-sm text-blue-200 mt-3">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-gradient-to-br from-gray-900 to-slate-800 text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-6">
              Have News to Share?
            </h2>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              We'd love to hear about your achievements, events, or stories.
              Get in touch with our communications team.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="text-4xl mb-4">📧</div>
              <h3 className="text-xl font-bold mb-2">Email Us</h3>
              <p className="text-gray-300 mb-3">Send us your news and stories</p>
              <a href="mailto:news@greenfield.edu.ng" className="text-white font-semibold hover:text-blue-200 transition-colors">
                news@greenfield.edu.ng
              </a>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="text-4xl mb-4">📞</div>
              <h3 className="text-xl font-bold mb-2">Call Us</h3>
              <p className="text-gray-300 mb-3">Speak with our communications team</p>
              <a href="tel:+2348034543622" className="text-white font-semibold hover:text-blue-200 transition-colors">
                +234 803 454 3622
              </a>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="text-4xl mb-4">🏫</div>
              <h3 className="text-xl font-bold mb-2">Visit Us</h3>
              <p className="text-gray-300 mb-3">Communications Office</p>
              <p className="text-white font-semibold">
                Mon - Fri: 8:00 AM - 4:00 PM
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default NewsEvents;
