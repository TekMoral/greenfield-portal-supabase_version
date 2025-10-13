// src/services/supabase/newsService.js
import { supabase } from '../../lib/supabaseClient'
import { directStorageClient } from '../../utils/directStorageClient'

// ✅ Get all news/events
export const getNewsEvents = async (limit = null) => {
  try {
    let query = supabase
      .from('news_events')
      .select('*')
      .order('created_at', { ascending: false })

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('[getNewsEvents] Error:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('[getNewsEvents] Error fetching news:', error)
    throw error
  }
}

// ✅ Get published news/events only
export const getPublishedNews = async (limit = null) => {
  try {
    let query = supabase
      .from('news_events')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('[getPublishedNews] Error:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('[getPublishedNews] Error fetching published news:', error)
    throw error
  }
}

// ✅ Get news/event by ID
export const getNewsById = async (newsId) => {
  try {
    const { data, error } = await supabase
      .from('news_events')
      .select('*')
      .eq('id', newsId)
      .single()

    if (error) {
      console.error('[getNewsById] Error:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('[getNewsById] Error fetching news:', error)
    throw error
  }
}

// ✅ Create news/event - with image upload
export const createNews = async (newsData, imageFile = null) => {
  try {
    let imageUrl = null;

    // Upload image if provided
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `news/${fileName}`;

      // Try standard Supabase client upload first
      let uploadError = null;
      try {
        const { error } = await supabase.storage
          .from('news-images')
          .upload(filePath, imageFile, {
            cacheControl: 'public, max-age=31536000, immutable',
            upsert: false,
            contentType: imageFile.type || 'application/octet-stream'
          });
        uploadError = error || null;
      } catch (e) {
        uploadError = e;
      }

      // Fallback to direct client if regular upload failed
      if (uploadError) {
        console.warn('[createNews] Supabase upload failed, attempting direct upload fallback:', uploadError);
        const { data: altData, error: altErr } = await directStorageClient.upload('news-images', filePath, imageFile);
        if (altErr) {
          console.error('[createNews] Direct upload fallback failed:', altErr);
          throw new Error(`Failed to upload image: ${altErr}`);
        }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('news-images')
        .getPublicUrl(filePath);

      imageUrl = publicUrl;
    }

    const insertData = {
      title: newsData.title,
      content: newsData.content,
      type: newsData.type || 'news',
      status: newsData.status || 'draft',
      author_id: newsData.author_id,
      published_at: newsData.status === 'published' ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add optional fields if they exist
    if (imageUrl) insertData.image_url = imageUrl;
    if (newsData.category) insertData.category = newsData.category;
    if (newsData.author) insertData.author = newsData.author;
    if (newsData.tags) insertData.tags = newsData.tags;
    if (newsData.featured !== undefined) insertData.featured = newsData.featured;
    if (newsData.date) insertData.date = newsData.date;

    const { data, error } = await supabase
      .from('news_events')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[createNews] Error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[createNews] Error creating news:', error);
    throw error;
  }
}

// ✅ Update news/event - with image upload
export const updateNews = async (newsId, updates, imageFile = null) => {
  try {
    let imageUrl = updates.image_url;

    // Upload new image if provided
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `news/${fileName}`;

      // Try standard Supabase client upload first
      let uploadError = null;
      try {
        const { error } = await supabase.storage
          .from('news-images')
          .upload(filePath, imageFile, {
            cacheControl: 'public, max-age=31536000, immutable',
            upsert: false,
            contentType: imageFile.type || 'application/octet-stream'
          });
        uploadError = error || null;
      } catch (e) {
        uploadError = e;
      }

      // Fallback to direct client if regular upload failed
      if (uploadError) {
        console.warn('[updateNews] Supabase upload failed, attempting direct upload fallback:', uploadError);
        const { data: altData, error: altErr } = await directStorageClient.upload('news-images', filePath, imageFile);
        if (altErr) {
          console.error('[updateNews] Direct upload fallback failed:', altErr);
          throw new Error(`Failed to upload image: ${altErr}`);
        }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('news-images')
        .getPublicUrl(filePath);

      imageUrl = publicUrl;

      // TODO: Delete old image from storage if exists
    }

    const updateData = {
      title: updates.title,
      content: updates.content,
      type: updates.type,
      status: updates.status,
      updated_at: new Date().toISOString()
    };

    // Add optional fields if they exist
    if (imageUrl) updateData.image_url = imageUrl;
    if (updates.category) updateData.category = updates.category;
    if (updates.author) updateData.author = updates.author;
    if (updates.tags) updateData.tags = updates.tags;
    if (updates.featured !== undefined) updateData.featured = updates.featured;
    if (updates.date) updateData.date = updates.date;

    // Set published_at if status is being changed to published
    if (updates.status === 'published' && !updates.published_at) {
      updateData.published_at = new Date().toISOString();
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const { data, error } = await supabase
      .from('news_events')
      .update(updateData)
      .eq('id', newsId)
      .select()
      .single();

    if (error) {
      console.error('[updateNews] Error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[updateNews] Error updating news:', error);
    throw error;
  }
}

// ✅ Delete news/event
export const deleteNews = async (newsId) => {
  try {
    const { data, error } = await supabase
      .from('news_events')
      .delete()
      .eq('id', newsId)
      .select()
      .single()

    if (error) {
      console.error('[deleteNews] Error:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('[deleteNews] Error deleting news:', error)
    throw error
  }
}

// ✅ Get news by type
export const getNewsByType = async (type, limit = null) => {
  try {
    let query = supabase
      .from('news_events')
      .select('*')
      .eq('type', type)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('[getNewsByType] Error:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('[getNewsByType] Error fetching news by type:', error)
    throw error
  }
}

// ✅ Search news/events - using only existing columns
export const searchNews = async (searchTerm) => {
  try {
    const { data, error } = await supabase
      .from('news_events')
      .select('*')
      .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[searchNews] Error:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('[searchNews] Error searching news:', error)
    throw error
  }
}

// ✅ Export service object for easier usage
export const newsService = {
  getNewsEvents,
  getPublishedNews,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
  getNewsByType,
  searchNews
}