import { supabase } from '../../lib/supabaseClient';
import { uploadToCloudinary, validateFile } from '../../utils/cloudinaryUpload';

/**
 * Upload carousel image to Cloudinary and save metadata to Supabase
 */
export const uploadCarouselImage = async (file, imageData) => {
  try {
    // Validate the image file
    const validation = validateFile(file, {
      maxSize: 10 * 1024 * 1024, // 10MB max for carousel images
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    });

    if (!validation.isValid) {
      return { 
        success: false, 
        error: `Invalid file: ${validation.errors.join(', ')}` 
      };
    }

    // Upload to Cloudinary with carousel-specific folder
    const uploadOptions = {
      folder: 'school/carousel',
      tags: ['carousel', 'homepage', 'school']
    };

    const result = await uploadToCloudinary(file, uploadOptions);

    // Save image metadata to Supabase
    const carouselDoc = {
      src: result.url,
      public_id: result.publicId,
      alt: imageData.alt || '',
      title: imageData.title || '',
      caption: imageData.caption || '',
      is_active: imageData.isActive !== undefined ? imageData.isActive : true,
      display_order: imageData.order || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('carousel_images')
      .insert(carouselDoc)
      .select()
      .single();

    if (error) {
      console.error('Supabase error saving carousel image:', error);
      return { success: false, error: error.message };
    }

    console.log('Carousel image uploaded and saved:', result.url);
    return {
      success: true,
      data: {
        id: data.id,
        ...data,
        src: result.url
      }
    };
  } catch (error) {
    console.error('Error uploading carousel image:', error);
    return { 
      success: false, 
      error: `Failed to upload carousel image: ${error.message}` 
    };
  }
};

/**
 * Get all carousel images
 */
export const getCarouselImages = async () => {
  try {
    const { data, error } = await supabase
      .from('carousel_images')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching carousel images:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching carousel images:', error);
    return { 
      success: false, 
      error: `Failed to fetch carousel images: ${error.message}` 
    };
  }
};

/**
 * Get only active carousel images for public display
 */
export const getActiveCarouselImages = async () => {
  try {
    const { data, error } = await supabase
      .from('carousel_images')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching active carousel images:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching active carousel images:', error);
    return { 
      success: false, 
      error: `Failed to fetch active carousel images: ${error.message}` 
    };
  }
};

/**
 * Update carousel image metadata
 */
export const updateCarouselImage = async (imageId, updateData) => {
  try {
    const { data, error } = await supabase
      .from('carousel_images')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', imageId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating carousel image:', error);
      return { success: false, error: error.message };
    }

    console.log('Carousel image updated:', imageId);
    return { success: true, data };
  } catch (error) {
    console.error('Error updating carousel image:', error);
    return { 
      success: false, 
      error: `Failed to update carousel image: ${error.message}` 
    };
  }
};

/**
 * Delete carousel image from Supabase
 * Note: This doesn't delete from Cloudinary - you might want to implement that separately
 */
export const deleteCarouselImage = async (imageId) => {
  try {
    // First get the image data to potentially delete from Cloudinary
    const { data: imageData, error: fetchError } = await supabase
      .from('carousel_images')
      .select('public_id')
      .eq('id', imageId)
      .single();

    if (fetchError) {
      console.error('Supabase error fetching carousel image for deletion:', fetchError);
      return { success: false, error: fetchError.message };
    }

    // Delete from Supabase
    const { error } = await supabase
      .from('carousel_images')
      .delete()
      .eq('id', imageId);

    if (error) {
      console.error('Supabase error deleting carousel image:', error);
      return { success: false, error: error.message };
    }

    // TODO: Optionally delete from Cloudinary using imageData.public_id
    // This would require implementing a Cloudinary delete function

    console.log('Carousel image deleted:', imageId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting carousel image:', error);
    return { 
      success: false, 
      error: `Failed to delete carousel image: ${error.message}` 
    };
  }
};

/**
 * Reorder carousel images
 */
export const reorderCarouselImages = async (imageUpdates) => {
  try {
    const updatePromises = imageUpdates.map(({ id, order }) => {
      return supabase
        .from('carousel_images')
        .update({
          display_order: order,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
    });

    const results = await Promise.all(updatePromises);

    // Check if any updates failed
    const failedUpdates = results.filter(result => result.error);
    if (failedUpdates.length > 0) {
      console.error('Some carousel image reorder updates failed:', failedUpdates);
      return { 
        success: false, 
        error: `Failed to reorder ${failedUpdates.length} images` 
      };
    }

    console.log('Carousel images reordered');
    return { success: true };
  } catch (error) {
    console.error('Error reordering carousel images:', error);
    return { 
      success: false, 
      error: `Failed to reorder carousel images: ${error.message}` 
    };
  }
};

/**
 * Toggle carousel image active status
 */
export const toggleCarouselImageStatus = async (imageId, isActive) => {
  try {
    const { data, error } = await supabase
      .from('carousel_images')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', imageId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error toggling carousel image status:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error toggling carousel image status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get carousel image by ID
 */
export const getCarouselImageById = async (imageId) => {
  try {
    const { data, error } = await supabase
      .from('carousel_images')
      .select('*')
      .eq('id', imageId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Carousel image not found' };
      }
      console.error('Supabase error fetching carousel image:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching carousel image:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get carousel statistics
 */
export const getCarouselStatistics = async () => {
  try {
    const { data, error } = await supabase
      .from('carousel_images')
      .select('is_active, created_at');

    if (error) {
      console.error('Supabase error fetching carousel statistics:', error);
      return { success: false, error: error.message };
    }

    const stats = {
      totalImages: data.length,
      activeImages: data.filter(img => img.is_active).length,
      inactiveImages: data.filter(img => !img.is_active).length,
      recentImages: data.filter(img => {
        const createdDate = new Date(img.created_at);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return createdDate > sevenDaysAgo;
      }).length
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error fetching carousel statistics:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Bulk update carousel images
 */
export const bulkUpdateCarouselImages = async (updates) => {
  try {
    const updatePromises = updates.map(({ id, ...updateData }) => {
      return supabase
        .from('carousel_images')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();
    });

    const results = await Promise.all(updatePromises);

    const successful = results.filter(result => !result.error);
    const failed = results.filter(result => result.error);

    return {
      success: true,
      data: {
        successful: successful.length,
        failed: failed.length,
        results: results.map((result, index) => ({
          id: updates[index].id,
          success: !result.error,
          data: result.data,
          error: result.error?.message
        }))
      }
    };
  } catch (error) {
    console.error('Error bulk updating carousel images:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Search carousel images
 */
export const searchCarouselImages = async (searchTerm) => {
  try {
    const { data, error } = await supabase
      .from('carousel_images')
      .select('*')
      .or(`title.ilike.%${searchTerm}%,alt.ilike.%${searchTerm}%,caption.ilike.%${searchTerm}%`)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Supabase error searching carousel images:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error searching carousel images:', error);
    return { success: false, error: error.message };
  }
};

// Export as service object for easier usage
export const carouselService = {
  uploadCarouselImage,
  getCarouselImages,
  getActiveCarouselImages,
  updateCarouselImage,
  deleteCarouselImage,
  reorderCarouselImages,
  toggleCarouselImageStatus,
  getCarouselImageById,
  getCarouselStatistics,
  bulkUpdateCarouselImages,
  searchCarouselImages
};