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

// ✅ Create news/event
export const createNews = async (newsData, imageFile = null) => {
  try {
    let imageUrl = null

    // Upload image if provided
    if (imageFile) {
      const fileName = `news-${Date.now()}-${imageFile.name}`
      const { data: uploadData, error: uploadError } = await directStorageClient.upload(
        'news-images',
        fileName,
        imageFile
      )

      if (uploadError) {
        throw new Error(`Image upload failed: ${uploadError}`)
      }

      imageUrl = directStorageClient.getPublicUrl('news-images', fileName)
    }

    const { data, error } = await supabase
      .from('news_events')
      .insert({
        title: newsData.title,
        content: newsData.content,
        type: newsData.type || 'news',
        status: newsData.status || 'draft',
        image_url: imageUrl,
        author_id: newsData.author_id,
        published_at: newsData.status === 'published' ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('[createNews] Error:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('[createNews] Error creating news:', error)
    throw error
  }
}

// ✅ Update news/event
export const updateNews = async (newsId, updates, imageFile = null) => {
  try {
    let imageUrl = updates.image_url

    // Upload new image if provided
    if (imageFile) {
      const fileName = `news-${Date.now()}-${imageFile.name}`
      const { data: uploadData, error: uploadError } = await directStorageClient.upload(
        'news-images',
        fileName,
        imageFile
      )

      if (uploadError) {
        throw new Error(`Image upload failed: ${uploadError}`)
      }

      imageUrl = directStorageClient.getPublicUrl('news-images', fileName)
    }

    const updateData = {
      ...updates,
      image_url: imageUrl,
      updated_at: new Date().toISOString()
    }

    // Set published_at if status is being changed to published
    if (updates.status === 'published' && !updates.published_at) {
      updateData.published_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('news_events')
      .update(updateData)
      .eq('id', newsId)
      .select()
      .single()

    if (error) {
      console.error('[updateNews] Error:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('[updateNews] Error updating news:', error)
    throw error
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

// ✅ Search news/events
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