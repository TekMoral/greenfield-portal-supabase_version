import { useState, useEffect } from 'react';

const FeaturedAnnouncementForm = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    image: '',
    category: 'announcement',
    urgent: false,
    link: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const categories = [
    'announcement',
    'academic',
    'admission',
    'events',
    'infrastructure',
    'achievement'
  ];

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        date: initialData.date || new Date().toISOString().split('T')[0]
      });
      setImagePreview(initialData.image || '');
    }
  }, [initialData]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      
      // Clear image URL if file is selected
      setFormData(prev => ({ ...prev, image: '' }));
      
      // Clear error
      if (errors.image) {
        setErrors(prev => ({ ...prev, image: '' }));
      }
    }
  };

  const handleImageUrlChange = (e) => {
    const url = e.target.value;
    setFormData(prev => ({ ...prev, image: url }));
    setImagePreview(url);
    setImageFile(null); // Clear file if URL is entered
    
    if (errors.image) {
      setErrors(prev => ({ ...prev, image: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.summary.trim()) {
      newErrors.summary = 'Summary is required';
    }

    if (!imageFile && !formData.image.trim()) {
      newErrors.image = 'Image is required (either upload a file or provide a URL)';
    }

    if (formData.image.trim() && !imageFile) {
      // Basic URL validation
      try {
        new URL(formData.image);
      } catch {
        newErrors.image = 'Please enter a valid image URL';
      }
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (formData.link && formData.link.trim()) {
      // Basic URL validation for link
      if (!formData.link.startsWith('/') && !formData.link.startsWith('http')) {
        newErrors.link = 'Link must be a valid URL or start with /';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData, imageFile);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="text-orange-500 text-xl">📢</div>
          <div>
            <h3 className="text-orange-800 font-semibold mb-1">Featured Announcement</h3>
            <p className="text-orange-700 text-sm">
              This announcement will be displayed prominently at the top of the news page. 
              Use this for important school-wide announcements that need immediate attention.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Title */}
        <div className="lg:col-span-2">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter announcement title"
          />
          {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
        </div>

        {/* Summary */}
        <div className="lg:col-span-2">
          <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-2">
            Summary *
          </label>
          <textarea
            id="summary"
            name="summary"
            value={formData.summary}
            onChange={handleInputChange}
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.summary ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter announcement summary"
          />
          {errors.summary && <p className="text-red-500 text-sm mt-1">{errors.summary}</p>}
        </div>

        {/* Image Upload/URL */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image * (Upload file or provide URL)
          </label>
          
          <div className="space-y-4">
            {/* File Upload */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Upload Image File</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: JPEG, PNG, GIF, WebP. Max size: 10MB
              </p>
            </div>

            {/* OR Divider */}
            <div className="flex items-center">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-3 text-sm text-gray-500">OR</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* URL Input */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Image URL</label>
              <input
                type="url"
                value={formData.image}
                onChange={handleImageUrlChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>

          {errors.image && <p className="text-red-500 text-sm mt-1">{errors.image}</p>}
          
          {/* Image Preview */}
          {imagePreview && (
            <div className="mt-3">
              <label className="block text-sm text-gray-600 mb-1">Preview</label>
              <img
                src={imagePreview}
                alt="Preview"
                className="w-32 h-20 object-cover rounded-lg border border-gray-300"
                onError={(e) => {
                  e.target.style.display = 'none';
                  setErrors(prev => ({ ...prev, image: 'Invalid image URL or file' }));
                }}
              />
            </div>
          )}
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
            Date *
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.date ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
        </div>

        {/* Link */}
        <div className="lg:col-span-2">
          <label htmlFor="link" className="block text-sm font-medium text-gray-700 mb-2">
            Link (Optional)
          </label>
          <input
            type="text"
            id="link"
            name="link"
            value={formData.link}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.link ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="/admission or https://example.com"
          />
          {errors.link && <p className="text-red-500 text-sm mt-1">{errors.link}</p>}
          <p className="text-xs text-gray-500 mt-1">
            Link for "Learn More" button. Use relative paths (e.g., /admission) or full URLs.
          </p>
        </div>

        {/* Urgent */}
        <div className="lg:col-span-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="urgent"
              checked={formData.urgent}
              onChange={handleInputChange}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <span className="text-sm font-medium text-gray-700">Mark as Urgent</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Urgent announcements will have additional visual emphasis
          </p>
        </div>
      </div>

      {/* Preview */}
      {formData.title && formData.summary && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg p-6">
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
                    {formData.urgent && (
                      <span className="bg-red-600 px-2 py-1 rounded-full text-xs font-semibold">
                        URGENT
                      </span>
                    )}
                    <span className="text-sm opacity-90">
                      {new Date(formData.date).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold mb-2">{formData.title}</h2>
                  <p className="text-orange-100">{formData.summary}</p>
                </div>
              </div>
              {formData.link && (
                <div className="flex-shrink-0 self-center">
                  <span className="bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold shadow-lg whitespace-nowrap inline-block">
                    Learn More
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors duration-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
        >
          {isSubmitting && (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
          )}
          {initialData ? 'Update' : 'Create'} Announcement
        </button>
      </div>
    </form>
  );
};

export default FeaturedAnnouncementForm;