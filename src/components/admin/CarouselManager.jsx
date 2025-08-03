import { useState, useEffect } from 'react';
import { 
  getCarouselImages, 
  uploadCarouselImage, 
  deleteCarouselImage, 
  updateCarouselImage,
  reorderCarouselImages 
} from '../../services/supabase/carouselService';
import useToast from '../../hooks/useToast';

const CarouselManager = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const { showToast } = useToast();

  // Form state for new image upload
  const [uploadForm, setUploadForm] = useState({
    file: null,
    title: '',
    caption: '',
    alt: '',
    isActive: true,
    order: 0
  });

  // Load carousel images on component mount
  useEffect(() => {
    loadCarouselImages();
  }, []);

  const loadCarouselImages = async () => {
    try {
      setLoading(true);
      const carouselImages = await getCarouselImages();
      setImages(carouselImages);
    } catch (error) {
      showToast('Failed to load carousel images', 'error');
      console.error('Error loading carousel images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm(prev => ({ ...prev, file }));
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    
    if (!uploadForm.file) {
      showToast('Please select an image file', 'error');
      return;
    }

    try {
      setUploading(true);
      
      const imageData = {
        title: uploadForm.title,
        caption: uploadForm.caption,
        alt: uploadForm.alt || uploadForm.title,
        isActive: uploadForm.isActive,
        order: uploadForm.order || images.length
      };

      await uploadCarouselImage(uploadForm.file, imageData);
      
      showToast('Image uploaded successfully!', 'success');
      setShowUploadForm(false);
      setUploadForm({
        file: null,
        title: '',
        caption: '',
        alt: '',
        isActive: true,
        order: 0
      });
      
      // Reload images
      await loadCarouselImages();
    } catch (error) {
      showToast(`Upload failed: ${error.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!window.confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      await deleteCarouselImage(imageId);
      showToast('Image deleted successfully!', 'success');
      await loadCarouselImages();
    } catch (error) {
      showToast(`Delete failed: ${error.message}`, 'error');
    }
  };

  const handleToggleActive = async (imageId, currentStatus) => {
    try {
      await updateCarouselImage(imageId, { isActive: !currentStatus });
      showToast(`Image ${!currentStatus ? 'activated' : 'deactivated'} successfully!`, 'success');
      await loadCarouselImages();
    } catch (error) {
      showToast(`Update failed: ${error.message}`, 'error');
    }
  };

  const handleEditImage = (image) => {
    setEditingImage({
      ...image,
      originalOrder: image.order
    });
  };

  const handleSaveEdit = async () => {
    try {
      const { id, originalOrder, ...updateData } = editingImage;
      await updateCarouselImage(id, updateData);
      showToast('Image updated successfully!', 'success');
      setEditingImage(null);
      await loadCarouselImages();
    } catch (error) {
      showToast(`Update failed: ${error.message}`, 'error');
    }
  };

  const moveImage = async (imageId, direction) => {
    const currentIndex = images.findIndex(img => img.id === imageId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= images.length) return;

    const reorderedImages = [...images];
    [reorderedImages[currentIndex], reorderedImages[newIndex]] = 
    [reorderedImages[newIndex], reorderedImages[currentIndex]];

    // Update order values
    const updates = reorderedImages.map((img, index) => ({
      id: img.id,
      order: index
    }));

    try {
      await reorderCarouselImages(updates);
      showToast('Images reordered successfully!', 'success');
      await loadCarouselImages();
    } catch (error) {
      showToast(`Reorder failed: ${error.message}`, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Carousel Management</h2>
          <p className="text-gray-600">Manage homepage carousel images</p>
        </div>
        <button
          onClick={() => setShowUploadForm(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          Add New Image
        </button>
      </div>

      {/* Upload Form Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Upload New Carousel Image</h3>
            
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image File
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Caption
                </label>
                <textarea
                  value={uploadForm.caption}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, caption: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alt Text
                </label>
                <input
                  type="text"
                  value={uploadForm.alt}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, alt: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Descriptive text for accessibility"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={uploadForm.isActive}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active (show in carousel)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Image Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editingImage.title}
                  onChange={(e) => setEditingImage(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caption</label>
                <textarea
                  value={editingImage.caption}
                  onChange={(e) => setEditingImage(prev => ({ ...prev, caption: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alt Text</label>
                <input
                  type="text"
                  value={editingImage.alt}
                  onChange={(e) => setEditingImage(prev => ({ ...prev, alt: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingImage(null)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Images Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image, index) => (
          <div key={image.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="relative">
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-48 object-cover"
              />
              <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
                image.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {image.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>
            
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-1">{image.title}</h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{image.caption}</p>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleEditImage(image)}
                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
                >
                  Edit
                </button>
                
                <button
                  onClick={() => handleToggleActive(image.id, image.isActive)}
                  className={`text-xs px-2 py-1 rounded ${
                    image.isActive 
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}
                >
                  {image.isActive ? 'Deactivate' : 'Activate'}
                </button>
                
                <button
                  onClick={() => moveImage(image.id, 'up')}
                  disabled={index === 0}
                  className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  ↑
                </button>
                
                <button
                  onClick={() => moveImage(image.id, 'down')}
                  disabled={index === images.length - 1}
                  className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  ↓
                </button>
                
                <button
                  onClick={() => handleDeleteImage(image.id)}
                  className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {images.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📸</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No carousel images</h3>
          <p className="text-gray-600 mb-4">Upload your first image to get started</p>
          <button
            onClick={() => setShowUploadForm(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Upload Image
          </button>
        </div>
      )}
    </div>
  );
};

export default CarouselManager;