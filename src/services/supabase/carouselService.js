import { supabase } from '../../lib/supabaseClient';
import { directStorageClient } from '../../utils/directStorageClient';

/**
 * Upload carousel image to Supabase Storage and save metadata to Supabase
 */
export const uploadCarouselImage = async (file, imageData) => {
  try {
    // Validate the image file
    const maxSize = 10 * 1024 * 1024; // 10MB max for carousel images
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (file.size > maxSize) {
      return { 
        success: false, 
        error: `File size too large. Maximum size is ${maxSize / (1024 * 1024)}MB` 
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return { 
        success: false, 
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` 
      };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `carousel/${timestamp}_${Math.random().toString(36).substring(7)}.${fileExtension}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await directStorageClient.upload(
      'carousel-images', 
      fileName, 
      file
    );

    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError);
      return { success: false, error: uploadError };
    }

    // Get public URL
    const publicUrl = directStorageClient.getPublicUrl('carousel-images', fileName);

    // Save image metadata to Supabase database using actual schema
    const carouselDoc = {
      title: imageData.title || '',
      description: imageData.caption || imageData.description || '',
      image_path: fileName, // Store the file path for deletion
      bucket_name: 'carousel-images',
      link_url: imageData.link_url || null,
      is_active: imageData.isActive !== undefined ? imageData.isActive : true,
      display_order: imageData.order || 0,
      created_by: null, // Will be set by RLS policy if auth is working
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
      // Try to clean up uploaded file if database save fails
      await directStorageClient.remove('carousel-images', fileName);
      return { success: false, error: error.message };
    }

    console.log('Carousel image uploaded and saved:', publicUrl);
    return {
      success: true,
      data: {
        id: data.id,
        ...data,
        src: publicUrl, // Add src for compatibility
        caption: data.description, // Map description to caption for UI compatibility
        alt: data.title || 'Carousel image', // Use title as alt
        isActive: data.is_active // Map snake_case to camelCase
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
      return [];
    }

    // Map database fields to UI-compatible format
    const imagesWithCompatibility = (data || []).map(image => ({
      ...image,
      src: directStorageClient.getPublicUrl(image.bucket_name || 'carousel-images', image.image_path),
      caption: image.description || '',
      alt: image.title || 'Carousel image',
      isActive: image.is_active
    }));

    return imagesWithCompatibility;
  } catch (error) {
    console.error('Error fetching carousel images:', error);
    return [];
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
      return [];
    }

    // Map database fields to UI-compatible format
    const imagesWithCompatibility = (data || []).map(image => ({
      ...image,
      src: directStorageClient.getPublicUrl(image.bucket_name || 'carousel-images', image.image_path),
      caption: image.description || '',
      alt: image.title || 'Carousel image',
      isActive: image.is_active
    }));

    return imagesWithCompatibility;
  } catch (error) {
    console.error('Error fetching active carousel images:', error);
    return [];
  }
};

/**
 * Update carousel image metadata
 */
export const updateCarouselImage = async (imageId, updateData) => {
  try {
    // Map UI fields to database fields
    const dbUpdateData = {
      title: updateData.title,
      description: updateData.caption || updateData.description,
      link_url: updateData.link_url,
      is_active: updateData.isActive !== undefined ? updateData.isActive : updateData.is_active,
      display_order: updateData.order !== undefined ? updateData.order : updateData.display_order,
      updated_at: new Date().toISOString()
    };

    // Remove undefined values
    Object.keys(dbUpdateData).forEach(key => {
      if (dbUpdateData[key] === undefined) {
        delete dbUpdateData[key];
      }
    });

    const { data, error } = await supabase
      .from('carousel_images')
      .update(dbUpdateData)
      .eq('id', imageId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating carousel image:', error);
      return { success: false, error: error.message };
    }

    console.log('Carousel image updated:', imageId);
    return { 
      success: true, 
      data: {
        ...data,
        src: directStorageClient.getPublicUrl(data.bucket_name || 'carousel-images', data.image_path),
        caption: data.description || '',
        alt: data.title || 'Carousel image',
        isActive: data.is_active
      }
    };
  } catch (error) {
    console.error('Error updating carousel image:', error);
    return { 
      success: false, 
      error: `Failed to update carousel image: ${error.message}` 
    };
  }
};

/**
 * Delete carousel image from both Supabase Storage and database
 */
export const deleteCarouselImage = async (imageId) => {
  try {
    // First get the image data to get the storage path
    const { data: imageData, error: fetchError } = await supabase
      .from('carousel_images')
      .select('image_path, bucket_name')
      .eq('id', imageId)
      .single();

    if (fetchError) {
      console.error('Supabase error fetching carousel image for deletion:', fetchError);
      return { success: false, error: fetchError.message };
    }

    // Delete from Supabase Storage
    if (imageData.image_path) {
      const { error: storageError } = await directStorageClient.remove(
        imageData.bucket_name || 'carousel-images', 
        imageData.image_path
      );
      
      if (storageError) {
        console.warn('Warning: Failed to delete image from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete from database
    const { error } = await supabase
      .from('carousel_images')
      .delete()
      .eq('id', imageId);

    if (error) {
      console.error('Supabase error deleting carousel image:', error);
      return { success: false, error: error.message };
    }

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

    return { 
      success: true, 
      data: {
        ...data,
        src: directStorageClient.getPublicUrl(data.bucket_name || 'carousel-images', data.image_path),
        caption: data.description || '',
        alt: data.title || 'Carousel image',
        isActive: data.is_active
      }
    };
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

    return { 
      success: true, 
      data: {
        ...data,
        src: directStorageClient.getPublicUrl(data.bucket_name || 'carousel-images', data.image_path),
        caption: data.description || '',
        alt: data.title || 'Carousel image',
        isActive: data.is_active
      }
    };
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
      // Map UI fields to database fields
      const dbUpdateData = {
        title: updateData.title,
        description: updateData.caption || updateData.description,
        link_url: updateData.link_url,
        is_active: updateData.isActive !== undefined ? updateData.isActive : updateData.is_active,
        display_order: updateData.order !== undefined ? updateData.order : updateData.display_order,
        updated_at: new Date().toISOString()
      };

      // Remove undefined values
      Object.keys(dbUpdateData).forEach(key => {
        if (dbUpdateData[key] === undefined) {
          delete dbUpdateData[key];
        }
      });

      return supabase
        .from('carousel_images')
        .update(dbUpdateData)
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
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Supabase error searching carousel images:', error);
      return { success: false, error: error.message };
    }

    // Map database fields to UI-compatible format
    const imagesWithCompatibility = (data || []).map(image => ({
      ...image,
      src: directStorageClient.getPublicUrl(image.bucket_name || 'carousel-images', image.image_path),
      caption: image.description || '',
      alt: image.title || 'Carousel image',
      isActive: image.is_active
    }));

    return { success: true, data: imagesWithCompatibility };
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