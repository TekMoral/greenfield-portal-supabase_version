import { supabase } from '../../lib/supabaseClient';
import { directStorageClient } from '../../utils/directStorageClient';
import { callFunction } from './edgeFunctions';

// Simple in-browser image compression (mirrors profile image approach)
async function compressImageFile(file, options = {}) {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    outputType = 'image/webp',
    skipIfSmallerThan = 200 * 1024
  } = options;

  try {
    if (!file || !file.type?.startsWith('image/')) return { blob: file, outMime: file?.type, outExt: file?.name?.split('.').pop() };
    if (file.type === 'image/gif') return { blob: file, outMime: file.type, outExt: 'gif' }; // keep animations
    if (file.size && file.size < skipIfSmallerThan) return { blob: file, outMime: file.type, outExt: (file.name?.split('.').pop() || 'jpg') };

    const img = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = (e) => reject(e);
        i.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Compute target dimensions (contain within max)
    const { width, height } = img;
    let targetW = width;
    let targetH = height;
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      targetW = Math.round(width * ratio);
      targetH = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return { blob: file, outMime: file.type, outExt: (file.name?.split('.').pop() || 'jpg') };
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const outType = outputType || 'image/webp';
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, outType, quality));
    if (!blob) return { blob: file, outMime: file.type, outExt: (file.name?.split('.').pop() || 'jpg') };

    const outMime = blob.type || outType;
    const outExt = outMime.includes('webp') ? 'webp' : outMime.includes('jpeg') ? 'jpg' : (file.name?.split('.').pop() || 'jpg');
    return { blob, outMime, outExt };
  } catch (_) {
    // Fallback to original on error
    return { blob: file, outMime: file?.type, outExt: (file?.name?.split('.').pop() || 'jpg') };
  }
}

/**
 * Upload carousel image to Supabase Storage and save metadata to Supabase
 */
export const uploadCarouselImage = async (file, imageData) => {
  try {
    // Prefer secure Edge Function path for upload + DB write
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify(imageData || {}));
      const edgeResult = await callFunction('upload-carousel', formData);
      if (edgeResult?.success) {
        return edgeResult;
      }
      // if function returns but not success, fall through to client fallback
      console.warn('upload-carousel edge function returned non-success, falling back:', edgeResult?.error);
    } catch (efErr) {
      console.warn('upload-carousel edge function failed, falling back to client path:', efErr?.userMessage || efErr?.message || efErr);
    }

    // Client-side validation for fallback path
    const maxSize = 2 * 1024 * 1024; // 2MB max for carousel images
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (file.size > maxSize) {
      return { success: false, error: `File size too large. Maximum size is ${maxSize / (1024 * 1024)}MB` };
    }
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` };
    }

    // Compress before upload (keep GIFs/very small images as-is)
    const { blob: uploadBlob, outExt } = await compressImageFile(file, {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.8,
      outputType: 'image/webp',
      skipIfSmallerThan: 200 * 1024
    });

    // Generate unique filename with correct extension
    const timestamp = Date.now();
    const safeExt = (outExt || file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `carousel/${timestamp}_${Math.random().toString(36).substring(7)}.${safeExt}`;

    // Upload to Supabase Storage (compressed blob)
    const { error: uploadError } = await supabase.storage.from('carousel-images').upload(fileName, uploadBlob, { upsert: false });
    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError);
      return { success: false, error: uploadError.message || String(uploadError) };
    }

    const { data: pub } = supabase.storage.from('carousel-images').getPublicUrl(fileName);
    const publicUrl = pub?.publicUrl || null;

    // Save image metadata to Supabase database using actual schema
    const carouselDoc = {
      title: imageData.title || '',
      description: imageData.caption || imageData.description || '',
      image_path: fileName,
      bucket_name: 'carousel-images',
      link_url: imageData.link_url || null,
      is_active: imageData.isActive !== undefined ? imageData.isActive : true,
      display_order: imageData.order || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('carousel_images').insert(carouselDoc).select().single();
    if (error) {
      console.error('Supabase error saving carousel image:', error);
      // cleanup
      try { await supabase.storage.from('carousel-images').remove([fileName]); } catch (_) {}
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        id: data.id,
        ...data,
        src: publicUrl,
        caption: data.description,
        alt: data.title || 'Carousel image',
        isActive: data.is_active
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