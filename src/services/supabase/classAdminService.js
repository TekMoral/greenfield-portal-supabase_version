// src/services/supabase/classAdminService.js
import { supabase } from '../../lib/supabaseClient'

const extractFnError = (error) => {
  try {
    if (!error) return 'Unknown error';
    // Supabase Functions errors often include a context object with response/body
    const parts = [error.message].filter(Boolean);
    const ctx = error.context;
    if (ctx) {
      // Attempt to stringify context safely
      try {
        if (typeof ctx === 'string') {
          parts.push(ctx);
        } else if (typeof ctx === 'object') {
          // Common fields: status, body, response
          if (ctx.body) {
            if (typeof ctx.body === 'string') {
              parts.push(ctx.body);
            } else {
              parts.push(JSON.stringify(ctx.body));
            }
          } else if (ctx.response) {
            // Some environments expose response details
            const { status, statusText } = ctx.response;
            parts.push(`status=${status} ${statusText || ''}`.trim());
          } else {
            parts.push(JSON.stringify(ctx));
          }
        }
      } catch (_) { /* ignore context stringify issues */ }
    }
    return parts.join(' - ');
  } catch (_) {
    return error?.message || 'Unknown error';
  }
};

// Create class via Edge Function
export const createClass = async (classData) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-class', {
      body: JSON.stringify(classData)
    });
    if (error) {
      const msg = extractFnError(error);
      console.error('❌ [createClass] Edge Function error:', msg);
      return { success: false, error: msg };
    }
    const payload = data;
    if (payload?.success) {
      return { success: true, data: payload.data || null };
    }
    return { success: false, error: payload?.error || 'Unknown error creating class' };
  } catch (err) {
    console.error('❌ [createClass] Failed:', err.message);
    return { success: false, error: err.message };
  }
};

// Update class via Edge Function
export const updateClass = async (classId, updates) => {
  try {
    if (!classId) {
      return { success: false, error: 'Missing classId for update' };
    }
    // Prevent accidental id override in updates
    const { id: _ignore, ...rest } = updates || {};
    const payload = { id: classId, ...rest };
    const { data, error } = await supabase.functions.invoke('update-class', {
      body: JSON.stringify(payload)
    });
    if (error) {
      const msg = extractFnError(error);
      console.error('❌ [updateClass] Edge Function error:', msg);
      return { success: false, error: msg };
    }
    const payloadResp = data;
    if (payloadResp?.success) {
      return { success: true, data: payloadResp.data || null };
    }
    return { success: false, error: payloadResp?.error || 'Unknown error updating class' };
  } catch (err) {
    console.error('❌ [updateClass] Failed:', err.message);
    return { success: false, error: err.message };
  }
};

// Delete class via Edge Function (soft delete)
export const deleteClass = async (classId) => {
  try {
    const payload = { id: classId };
    const { data, error } = await supabase.functions.invoke('delete-class', {
      body: JSON.stringify(payload)
    });
    if (error) {
      const msg = extractFnError(error);
      console.error('❌ [deleteClass] Edge Function error:', msg);
      return { success: false, error: msg };
    }
    const payloadResp = data;
    if (payloadResp?.success) {
      return { success: true, data: payloadResp.data || null };
    }
    return { success: false, error: payloadResp?.error || 'Unknown error deleting class' };
  } catch (err) {
    console.error('❌ [deleteClass] Failed:', err.message);
    return { success: false, error: err.message };
  }
};

export const classAdminService = {
  createClass,
  updateClass,
  deleteClass
};
