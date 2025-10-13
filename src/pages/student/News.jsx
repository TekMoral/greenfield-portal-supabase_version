import { useState, useEffect } from 'react';
import { newsService } from '../../services/supabase/newsService';
import { formatDMY } from '../../utils/dateUtils';
import useToast from '../../hooks/useToast';

const StudentNews = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [newsData, setNewsData] = useState([]);
  const [eventsData, setEventsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const { showToast } = useToast();

  const toArrayTags = (tags) => {
    if (Array.isArray(tags)) return tags;
    if (typeof tags === 'string') {
      return tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    return [];
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [news, events] = await Promise.all([
        newsService.getPublishedNews(),
        newsService.getNewsByType('event')
      ]);
      
      // Filter only published items
      const publishedNews = (news || []).filter(item => item.status === 'published');
      const publishedEvents = (events || []).filter(item => item.status === 'published');
      
      setNewsData(publishedNews);
      setEventsData(publishedEvents);
    } catch (error) {
      showToast('Failed to load news and events', 'error');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const allItems = [...newsData, ...eventsData].sort((a, b) => 
    new Date(b.created_at || b.date) - new Date(a.created_at || a.date)
  );

  const displayItems = activeTab === 'all' ? allItems : 
                       activeTab === 'news' ? newsData : eventsData;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-2xl sm:text-3xl font-bold">News & Events</h1>
        <p className="mt-2 text-green-50">Stay updated with the latest school news and upcoming events</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex flex-wrap gap-2 px-4 sm:px-6 py-1">
            {[
              { key: 'all', label: 'All', count: allItems.length },
              { key: 'news', label: 'News', count: newsData.length },
              { key: 'events', label: 'Events', count: eventsData.length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.key
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {displayItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-5xl mb-4">📰</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No {activeTab === 'all' ? 'items' : activeTab} available</h3>
              <p className="text-gray-500">Check back later for updates</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  {item.image_url && (
                    <div className="h-48 overflow-hidden">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        item.type === 'event' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {item.type === 'event' ? '📅 Event' : '📰 News'}
                      </span>
                      {item.category && (
                        <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {item.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
                      <span>{formatDMY(item.created_at || item.date)}</span>
                      {item.author && <span>By {item.author}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedItem.image_url && (
              <div className="h-64 overflow-hidden">
                <img
                  src={selectedItem.image_url}
                  alt={selectedItem.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  selectedItem.type === 'event' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {selectedItem.type === 'event' ? '📅 Event' : '📰 News'}
                </span>
                {selectedItem.category && (
                  <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                    {selectedItem.category}
                  </span>
                )}
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                {selectedItem.title}
              </h2>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-6 pb-6 border-b border-gray-200">
                <span>📅 {formatDMY(selectedItem.created_at || selectedItem.date)}</span>
                {selectedItem.author && <span>✍️ {selectedItem.author}</span>}
              </div>
              
              <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                {selectedItem.content}
              </div>
              
              {toArrayTags(selectedItem.tags).length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {toArrayTags(selectedItem.tags).map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentNews;
