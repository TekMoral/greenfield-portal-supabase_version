import { useState, useEffect } from 'react';
import useToast from '../../hooks/useToast';
import NewsForm from '../../components/news/NewsForm';
import EventForm from '../../components/news/EventForm';
import NewsTable from '../../components/news/NewsTable';
import EventsTable from '../../components/news/EventsTable';
import FeaturedAnnouncementForm from '../../components/news/FeaturedAnnouncementForm';
import { newsService } from '../../services/supabase/newsService';
import { formatDMY } from '../../utils/dateUtils';

const NewsManagement = () => {
  const [activeTab, setActiveTab] = useState('news');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newsData, setNewsData] = useState([]);
  const [eventsData, setEventsData] = useState([]);
  const [featuredAnnouncement, setFeaturedAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [news, events] = await Promise.all([
        newsService.getNewsEvents(),
        newsService.getNewsByType('event') // Get events specifically
      ]);
      setNewsData(news || []);
      setEventsData(events || []);
      setFeaturedAnnouncement(news?.[0] || null); // Use first news as featured
    } catch (error) {
      showToast('Failed to load data', 'error');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      await newsService.deleteNews(id);
      
      if (type === 'news') {
        setNewsData(prev => prev.filter(item => item.id !== id));
        showToast('News article deleted successfully', 'success');
      } else {
        setEventsData(prev => prev.filter(item => item.id !== id));
        showToast('Event deleted successfully', 'success');
      }
    } catch (error) {
      showToast('Failed to delete item', 'error');
      console.error('Error deleting item:', error);
    }
  };

  const handleFormSubmit = async (data, type, imageFile = null) => {
    try {
      // Map form data to database schema
      const payload = {
        title: data.title,
        content: data.content,
        type: type === 'event' ? 'event' : 'news',
        status: 'published', // Default to published
        author_id: null, // Will be set by RLS policy
        summary: data.summary,
        category: data.category,
        author: data.author,
        tags: data.tags,
        featured: data.featured,
        date: data.date
      };

      if (editingItem) {
        // Update existing item
        const updated = await newsService.updateNews(editingItem.id, payload, imageFile);
        
        if (type === 'news') {
          setNewsData(prev => prev.map(item => item.id === editingItem.id ? updated : item));
          showToast('News article updated successfully', 'success');
        } else if (type === 'event') {
          setEventsData(prev => prev.map(item => item.id === editingItem.id ? updated : item));
          showToast('Event updated successfully', 'success');
        } else if (type === 'featured') {
          setFeaturedAnnouncement(updated);
          showToast('Featured announcement updated successfully', 'success');
        }
      } else {
        // Create new item
        const newItem = await newsService.createNews(payload, imageFile);
        
        if (type === 'news') {
          setNewsData(prev => [newItem, ...prev]);
          showToast('News article created successfully', 'success');
        } else if (type === 'event') {
          setEventsData(prev => [newItem, ...prev]);
          showToast('Event created successfully', 'success');
        } else if (type === 'featured') {
          setFeaturedAnnouncement(newItem);
          showToast('Featured announcement created successfully', 'success');
        }
      }
      setShowForm(false);
      setEditingItem(null);
    } catch (error) {
      showToast(`Failed to save item: ${error.message}`, 'error');
      console.error('Error saving item:', error);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">News & Events Management</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage school news, events, and announcements with Supabase Storage</p>
          </div>

          {!showForm && (
            <button
              onClick={handleAddNew}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add {activeTab === 'news' ? 'News' : activeTab === 'events' ? 'Event' : 'Announcement'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex flex-wrap gap-2 px-4 sm:px-6 py-1">
            {[
              { key: 'news', label: 'News Articles', count: newsData.length },
              { key: 'events', label: 'Events', count: eventsData.length },
              { key: 'featured', label: 'Featured Announcement', count: featuredAnnouncement ? 1 : 0 }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setShowForm(false);
                  setEditingItem(null);
                }}
                className={`whitespace-nowrap inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                title={tab.label}
              >
                {tab.label}
                <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 sm:p-6">
          {showForm ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingItem ? 'Edit' : 'Add New'} {
                    activeTab === 'news' ? 'News Article' :
                    activeTab === 'events' ? 'Event' :
                    'Featured Announcement'
                  }
                </h2>
                <button
                  onClick={handleFormCancel}
                  className="self-end sm:self-auto inline-flex text-gray-500 hover:text-gray-700 transition-colors duration-200"
                  aria-label="Close form"
                  title="Close form"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {activeTab === 'news' && (
                <NewsForm
                  initialData={editingItem}
                  onSubmit={(data, imageFile) => handleFormSubmit(data, 'news', imageFile)}
                  onCancel={handleFormCancel}
                />
              )}

              {activeTab === 'events' && (
                <EventForm
                  initialData={editingItem}
                  onSubmit={(data) => handleFormSubmit(data, 'event')}
                  onCancel={handleFormCancel}
                />
              )}

              {activeTab === 'featured' && (
                <FeaturedAnnouncementForm
                  initialData={editingItem || featuredAnnouncement}
                  onSubmit={(data, imageFile) => handleFormSubmit(data, 'featured', imageFile)}
                  onCancel={handleFormCancel}
                />
              )}
            </div>
          ) : (
            <>
              {activeTab === 'news' && (
                <>
                  {/* Mobile cards: no horizontal scroll */}
                  <div className="block md:hidden space-y-3">
                    {newsData.map((item) => (
                      <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 break-words">{item.title}</div>
                            <div className="mt-1 text-xs text-slate-600 break-words">{item.summary || item.content?.slice(0, 120)}</div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{item.category || 'General'}</span>
                              <span>{formatDMY(item.created_at || item.date)}</span>
                              <span className={`px-2 py-0.5 rounded-full ${item.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status || 'draft'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button onClick={() => handleEdit(item)} className="w-full inline-flex justify-center px-3 py-2 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700">Edit</button>
                          <button onClick={() => handleDelete(item.id, 'news')} className="w-full inline-flex justify-center px-3 py-2 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <NewsTable
                      data={newsData}
                      onEdit={handleEdit}
                      onDelete={(id) => handleDelete(id, 'news')}
                    />
                  </div>
                </>
              )}

              {activeTab === 'events' && (
                <>
                  {/* Mobile cards: no horizontal scroll */}
                  <div className="block md:hidden space-y-3">
                    {eventsData.map((item) => (
                      <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 break-words">{item.title}</div>
                            <div className="mt-1 text-xs text-slate-600 break-words">{item.summary || item.content?.slice(0, 120)}</div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{item.category || 'Event'}</span>
                              <span>{formatDMY(item.created_at || item.date)}</span>
                              <span className={`px-2 py-0.5 rounded-full ${item.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status || 'draft'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button onClick={() => handleEdit(item)} className="w-full inline-flex justify-center px-3 py-2 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700">Edit</button>
                          <button onClick={() => handleDelete(item.id, 'events')} className="w-full inline-flex justify-center px-3 py-2 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <EventsTable
                      data={eventsData}
                      onEdit={handleEdit}
                      onDelete={(id) => handleDelete(id, 'events')}
                    />
                  </div>
                </>
              )}

              {activeTab === 'featured' && (
                <div className="space-y-4">
                  {featuredAnnouncement ? (
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4 sm:p-6 overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-semibold">
                              FEATURED
                            </span>
                            <span className="text-xs sm:text-sm text-gray-500">
                              {formatDMY(featuredAnnouncement.created_at)}
                            </span>
                          </div>
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 break-words">
                            {featuredAnnouncement.title}
                          </h3>
                          <p className="text-gray-600 mb-4 text-sm sm:text-base break-words">
                            {featuredAnnouncement.content?.substring(0, 200)}...
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600">
                            <span>Type: {featuredAnnouncement.type}</span>
                            <span>Status: {featuredAnnouncement.status}</span>
                          </div>
                          {featuredAnnouncement.image_url && (
                            <div className="mt-4">
                              <img
                                src={featuredAnnouncement.image_url}
                                alt={featuredAnnouncement.title}
                                className="w-full sm:w-48 h-32 object-cover rounded-lg border border-gray-300"
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 sm:ml-4 w-full sm:w-auto">
                          <button
                            onClick={() => handleEdit(featuredAnnouncement)}
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <div className="text-gray-400 text-4xl mb-4">📢</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Featured Announcement</h3>
                      <p className="text-gray-500 mb-4">Create a featured announcement to display prominently on the news page.</p>
                      <button
                        onClick={handleAddNew}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                      >
                        Create Featured Announcement
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsManagement;