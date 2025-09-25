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
    isActive: true,
    order: 0
  });
  const [filePreview, setFilePreview] = useState(null);
  const [fileInfo, setFileInfo] = useState({ size: 0, width: 0, height: 0 });
  const [fileError, setFileError] = useState(null);

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

  const handleSelectedFile = (file) => {
    if (!file) return;
    setUploadForm(prev => ({ ...prev, file }));
    setFileError(null);
    // Create preview URL
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    const size = file.size || 0;
    // Read dimensions
    const img = new Image();
    img.onload = () => {
      setFileInfo({ size, width: img.width, height: img.height });
      if (size > 2 * 1024 * 1024) {
        setFileError('File exceeds 2MB maximum size.');
      }
      URL.revokeObjectURL(img.src);
    };
    img.src = url;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleSelectedFile(file);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    
    if (images.length >= 20) {
      showToast('Maximum of 20 carousel images reached. Delete an existing image first.', 'error');
      return;
    }

    if (!uploadForm.file) {
      showToast('Please select an image file', 'error');
      return;
    }

    if (fileError) {
      showToast(fileError, 'error');
      return;
    }

    try {
      setUploading(true);
      
      const imageData = {
        title: uploadForm.title,
        caption: uploadForm.caption,
        isActive: uploadForm.isActive,
        order: uploadForm.order || images.length
      };

      const result = await uploadCarouselImage(uploadForm.file, imageData);
      if (!result?.success) {
        throw new Error(result?.error || 'Upload failed');
      }
      
      showToast('Image uploaded successfully!', 'success');
      setShowUploadForm(false);
      setUploadForm({
        file: null,
        title: '',
        caption: '',
        isActive: true,
        order: 0
      });
      setFilePreview(null);
      setFileInfo({ size: 0, width: 0, height: 0 });
      setFileError(null);
      
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
          disabled={images.length >= 20}
          className={`px-4 py-2 rounded-lg transition-colors ${images.length >= 20 ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
        >
          {images.length >= 20 ? 'Limit Reached (20)' : 'Add New Image'}
        </button>
      </div>

      {/* Upload Form Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Upload New Carousel Image</h3>
            
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image File (max 2MB)</label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleSelectedFile(f); }}
                  className="w-full border-2 border-dashed border-gray-300 hover:border-emerald-400 rounded-md px-3 py-6 text-center cursor-pointer"
                  onClick={() => document.getElementById('carousel-file-input')?.click()}
                >
                  <p className="text-sm text-gray-600">Drag & drop an image here, or click to browse</p>
                  <p className="text-xs text-gray-500">JPG, PNG, GIF, WEBP up to 2MB</p>
                  <input
                    id="carousel-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                {filePreview && (
                  <div className="mt-3">
                    <img src={filePreview} alt="Preview" className="w-full h-40 object-cover rounded border" />
                    <div className="mt-2 text-xs text-gray-600">
                      <span>Size: {(fileInfo.size / (1024 * 1024)).toFixed(2)} MB</span>
                      {fileInfo.width > 0 && (
                        <span className="ml-3">Dimensions: {fileInfo.width} x {fileInfo.height}</span>
                      )}
                    </div>
                    {fileError && (
                      <p className="mt-1 text-xs text-red-600">{fileError}</p>
                    )}
                    <button
                      type="button"
                      className="mt-2 text-xs text-red-700 hover:underline"
                      onClick={() => { setUploadForm(prev => ({ ...prev, file: null })); setFilePreview(null); setFileInfo({ size: 0, width: 0, height: 0 }); setFileError(null); }}
                    >
                      Remove selected file
                    </button>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">Recommended dimensions up to 1920x1080. Larger images will be optimized.</p>
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
                  onClick={() => { setShowUploadForm(false); setUploadForm(prev => ({ ...prev, file: null })); setFilePreview(null); setFileInfo({ size: 0, width: 0, height: 0 }); setFileError(null); }}
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
      {images.length >= 20 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
          Maximum of 20 carousel images reached. Delete older images to upload new ones.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image, index) => (
          <div key={image.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="relative">
              <img
                src={image.src}
                alt={image.title || 'Carousel image'}
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