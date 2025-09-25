import { supabase } from '../../lib/supabaseClient';
import edgeFunctionsService from './edgeFunctions';

// Simple validation (moved here to remove Cloudinary dependency)
function validateFile(file, { maxSize, allowedTypes }) {
  const errors = [];
  if (!file) {
    errors.push('No file provided');
  } else {
    if (maxSize && file.size > maxSize) errors.push(`File too large (max ${Math.round(maxSize / (1024 * 1024))}MB)`);
    if (allowedTypes && !allowedTypes.includes(file.type)) errors.push(`Unsupported type ${file.type}`);
  }
  return { isValid: errors.length === 0, errors };
}

// Simple in-browser image compression using Canvas (no extra deps)
// - Resizes to fit within maxWidth/maxHeight
// - Converts to WebP (default) or JPEG
// - Skips compression for GIFs or unsupported types
async function compressImageFile(file, options = {}) {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.7,
    outputType = 'image/webp', // 'image/webp' or 'image/jpeg'
    skipIfSmallerThan = 200 * 1024 // skip compression for small files (<200KB)
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

    // Compute target dimensions
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
    // On any failure, return original
    return { blob: file, outMime: file?.type, outExt: (file?.name?.split('.').pop() || 'jpg') };
  }
}

/**
 * Upload student profile image to Cloudinary and update user profile
 */
export const uploadStudentImage = async (file, admissionNumber, studentId = null) => {
  try {
    // Validate the image file
    const validation = validateFile(file, {
      maxSize: 5 * 1024 * 1024, // 5MB max for profile images
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    });

    if (!validation.isValid) {
      return null; // Caller expects a URL-like value; return null on invalid
    }

    // Compress before upload
    const { blob: compressedBlob, outExt } = await compressImageFile(file, {
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.7,
      outputType: 'image/webp'
    });

    // Prepare storage path: profile-images/student-profiles/<admissionNumber>-<timestamp>.<ext>
    const safeAdm = String(admissionNumber || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = (outExt || (file?.name || 'jpg').split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${safeAdm}-${Date.now()}.${ext}`;
    const filePath = studentId ? `student-profiles/${studentId}/${fileName}` : `student-profiles/${fileName}`;

    // Upload to Supabase Storage (compressed)
    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(filePath, compressedBlob, { upsert: false });

    if (uploadError) {
      console.error('❌ Storage upload failed:', uploadError);
      return null;
    }

    // Get a public URL (bucket configured as public)
    const { data: publicData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath);

    const publicUrl = publicData?.publicUrl || null;
    if (!publicUrl) {
      console.error('❌ Failed to obtain public URL for profile image');
      return null;
    }

    // Optionally update the student's profile if studentId is provided
    if (studentId) {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          profile_image: publicUrl,
          profile_image_public_id: filePath, // store storage path as public_id analogue
          updated_at: new Date().toISOString()
        })
        .eq('id', studentId)
        .eq('role', 'student');

      if (updateError) {
        console.error('❌ Error updating student profile with image URL:', updateError);
        // Still return the URL so caller can use it in subsequent update flows
      }
    }

    // Return the URL string directly (callers expect a string)
    return publicUrl;
  } catch (error) {
    console.error('Error uploading student image to storage:', error);
    return null;
  }
};

/**
 * Upload student document to Cloudinary and save metadata
 */
export const uploadStudentDocument = async (file, admissionNumber, documentType, studentId = null) => {
  try {
    const validation = validateFile(file, {
      maxSize: 10 * 1024 * 1024, // 10MB max for documents
      allowedTypes: ['image/jpeg', 'image/png', 'application/pdf', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    });

    if (!validation.isValid) {
      return { 
        success: false, 
        error: `Invalid file: ${validation.errors.join(', ')}` 
      };
    }

    const bucket = 'student-documents';
    const safeAdm = String(admissionNumber || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = (file?.name || 'bin').split('.').pop();
    const fileName = `${safeAdm}_${documentType}_${Date.now()}.${ext}`;
    const storagePath = `${safeAdm}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, file, { contentType: file.type || 'application/octet-stream' });

    if (uploadError) {
      console.error('❌ Storage upload failed:', uploadError);
      return { success: false, error: uploadError.message };
    }

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    const publicUrl = pub?.publicUrl || null;

    // Save document metadata to database
    const documentData = {
      student_id: studentId,
      admission_number: admissionNumber,
      document_type: documentType,
      file_name: file.name,
      file_url: publicUrl,
      public_id: storagePath, // storage object path
      file_size: file.size,
      mime_type: file.type,
      bucket_name: bucket,
      storage_path: storagePath,
      file_path: storagePath,
      uploaded_at: new Date().toISOString()
    };

    const { data: docRecord, error: docError } = await supabase
      .from('student_documents')
      .insert(documentData)
      .select()
      .single();

    if (docError) {
      console.error('Error saving document metadata:', docError);
      return { 
        success: false, 
        error: `Document uploaded but metadata save failed: ${docError.message}` 
      };
    }

    return { 
      success: true, 
      data: {
        url: publicUrl,
        publicId: storagePath,
        document: docRecord
      }
    };
  } catch (error) {
    console.error(`Error uploading student ${documentType}:`, error);
    return { 
      success: false, 
      error: `Failed to upload ${documentType}: ${error.message}` 
    };
  }
};

/**
 * Upload teacher profile image
 */
export const uploadTeacherImage = async (file, teacherId) => {
  try {
    const validation = validateFile(file, {
      maxSize: 5 * 1024 * 1024, // 5MB max for profile images
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    });

    if (!validation.isValid) {
      return { 
        success: false, 
        error: `Invalid file: ${validation.errors.join(', ')}` 
      };
    }

    // Compress before upload (match student pattern)
    const { blob: compressedBlob, outExt } = await compressImageFile(file, {
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.7,
      outputType: 'image/webp'
    });

    const bucket = 'profile-images';
    const ext = (outExt || (file?.name || 'jpg').split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${teacherId}-${Date.now()}.${ext}`;
    const storagePath = `teacher-profiles/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, compressedBlob, { upsert: false });

    if (uploadError) {
      console.error('❌ Storage upload failed:', uploadError);
      return { success: false, error: uploadError.message };
    }

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    const publicUrl = pub?.publicUrl || null;

    // Update teacher profile using Edge Function to avoid RLS issues
    try {
      await edgeFunctionsService.updateUser(teacherId, 'teacher', {
        profile_image: publicUrl,
        profile_image_public_id: storagePath
      });
    } catch (e) {
      console.error('Error updating teacher profile via Edge Function:', e);
      return { 
        success: false, 
        error: `Image uploaded but profile update failed: ${e?.message || 'Unknown error'}` 
      };
    }

    return { 
      success: true, 
      data: {
        url: publicUrl,
        publicId: storagePath,
        profile: { id: teacherId, profile_image: publicUrl }
      }
    };
  } catch (error) {
    console.error('Error uploading teacher image:', error);
    return { 
      success: false, 
      error: `Failed to upload image: ${error.message}` 
    };
  }
};

/**
 * Upload general file to Cloudinary
 */
export const uploadFile = async (file, folder = 'general', tags = []) => {
  try {
    const validation = validateFile(file, {
      maxSize: 50 * 1024 * 1024, // 50MB max for general files
      allowedTypes: [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv'
      ]
    });

    if (!validation.isValid) {
      return { 
        success: false, 
        error: `Invalid file: ${validation.errors.join(', ')}` 
      };
    }

    const bucket = 'uploads';
    const ext = (file?.name || 'bin').split('.').pop();
    const fileName = `${folder}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const storagePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, file, { contentType: file.type || 'application/octet-stream' });

    if (uploadError) {
      console.error('❌ Storage upload failed:', uploadError);
      return { success: false, error: uploadError.message };
    }

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(storagePath);

    return { 
      success: true, 
      data: {
        url: pub?.publicUrl || null,
        publicId: storagePath,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type
      }
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return { 
      success: false, 
      error: `Failed to upload file: ${error.message}` 
    };
  }
};

/**
 * Get student documents
 */
export const getStudentDocuments = async (studentId) => {
  try {
    const { data, error } = await supabase
      .from('student_documents')
      .select('*')
      .eq('student_id', studentId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching student documents:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching student documents:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete student document
 */
export const deleteStudentDocument = async (documentId) => {
  try {
    // Get document info first
    const { data: document, error: fetchError } = await supabase
      .from('student_documents')
      .select('public_id')
      .eq('id', documentId)
      .single();

    if (fetchError) {
      console.error('Error fetching document for deletion:', fetchError);
      return { success: false, error: fetchError.message };
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('student_documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      console.error('Error deleting document from database:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // TODO: Optionally delete from Cloudinary using document.public_id
    // This would require implementing a Cloudinary delete function

    return { success: true };
  } catch (error) {
    console.error('Error deleting student document:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update document metadata
 */
export const updateDocumentMetadata = async (documentId, updateData) => {
  try {
    const { data, error } = await supabase
      .from('student_documents')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating document metadata:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error updating document metadata:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get upload statistics
 */
export const getUploadStatistics = async () => {
  try {
    const { data, error } = await supabase
      .from('student_documents')
      .select('document_type, file_size, uploaded_at');

    if (error) {
      console.error('Error fetching upload statistics:', error);
      return { success: false, error: error.message };
    }

    const stats = {
      totalDocuments: data.length,
      totalSize: data.reduce((sum, doc) => sum + (doc.file_size || 0), 0),
      byType: {},
      recentUploads: data.filter(doc => {
        const uploadDate = new Date(doc.uploaded_at);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return uploadDate > sevenDaysAgo;
      }).length
    };

    // Group by document type
    data.forEach(doc => {
      if (!stats.byType[doc.document_type]) {
        stats.byType[doc.document_type] = {
          count: 0,
          totalSize: 0
        };
      }
      stats.byType[doc.document_type].count++;
      stats.byType[doc.document_type].totalSize += doc.file_size || 0;
    });

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error fetching upload statistics:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Bulk upload files
 */
export const bulkUploadFiles = async (files, folder = 'bulk', tags = []) => {
  try {
    const results = [];
    
    for (const file of files) {
      const result = await uploadFile(file, folder, tags);
      results.push({
        fileName: file.name,
        success: result.success,
        data: result.data,
        error: result.error
      });
    }

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return {
      success: true,
      data: {
        successful: successful.length,
        failed: failed.length,
        results
      }
    };
  } catch (error) {
    console.error('Error bulk uploading files:', error);
    return { success: false, error: error.message };
  }
};

// Export as service object for easier usage
export const uploadService = {
  uploadStudentImage,
  uploadStudentDocument,
  uploadTeacherImage,
  uploadFile,
  getStudentDocuments,
  deleteStudentDocument,
  updateDocumentMetadata,
  getUploadStatistics,
  bulkUploadFiles
};