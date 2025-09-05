import { supabase } from '../../lib/supabaseClient';
import { uploadToCloudinary, validateFile } from '../../utils/cloudinaryUpload';

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
      return { 
        success: false, 
        error: `Invalid file: ${validation.errors.join(', ')}` 
      };
    }

    // Upload to Cloudinary with student-specific folder and public ID
    const uploadOptions = {
      folder: 'students/profiles',
      publicId: `student_${admissionNumber}_profile`,
      tags: ['student', 'profile', admissionNumber]
    };

    const result = await uploadToCloudinary(file, uploadOptions);
    
    console.log('Student image uploaded to Cloudinary:', result.url);

    // If studentId is provided, update the user profile with the image URL
    if (studentId) {
      const { data: updateData, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          profile_image: result.url,
          profile_image_public_id: result.publicId,
          updated_at: new Date().toISOString()
        })
        .eq('id', studentId)
        .eq('role', 'student')
        .select()
        .single();

      if (updateError) {
        console.error('Error updating student profile with image:', updateError);
        return { 
          success: false, 
          error: `Image uploaded but profile update failed: ${updateError.message}` 
        };
      }

      return { 
        success: true, 
        data: {
          url: result.url,
          publicId: result.publicId,
          profile: updateData
        }
      };
    }

    return { 
      success: true, 
      data: {
        url: result.url,
        publicId: result.publicId
      }
    };
  } catch (error) {
    console.error('Error uploading student image:', error);
    return { 
      success: false, 
      error: `Failed to upload image: ${error.message}` 
    };
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

    const uploadOptions = {
      folder: `students/documents/${documentType}`,
      publicId: `student_${admissionNumber}_${documentType}_${Date.now()}`,
      tags: ['student', 'document', documentType, admissionNumber]
    };

    const result = await uploadToCloudinary(file, uploadOptions);
    
    console.log(`Student ${documentType} uploaded to Cloudinary:`, result.url);

    // Save document metadata to database
    const documentData = {
      student_id: studentId,
      admission_number: admissionNumber,
      document_type: documentType,
      file_name: file.name,
      file_url: result.url,
      public_id: result.publicId,
      file_size: file.size,
      mime_type: file.type,
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
        url: result.url,
        publicId: result.publicId,
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

    const uploadOptions = {
      folder: 'teachers/profiles',
      publicId: `teacher_${teacherId}_profile`,
      tags: ['teacher', 'profile', teacherId]
    };

    const result = await uploadToCloudinary(file, uploadOptions);
    
    // Update teacher profile with image URL
    const { data: updateData, error: updateError } = await supabase
      .from('user_profiles')
      .update({
        profile_image: result.url,
        profile_image_public_id: result.publicId,
        updated_at: new Date().toISOString()
      })
      .eq('id', teacherId)
      .eq('role', 'teacher')
      .select()
      .single();

    if (updateError) {
      console.error('Error updating teacher profile with image:', updateError);
      return { 
        success: false, 
        error: `Image uploaded but profile update failed: ${updateError.message}` 
      };
    }

    return { 
      success: true, 
      data: {
        url: result.url,
        publicId: result.publicId,
        profile: updateData
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

    const uploadOptions = {
      folder: `school/${folder}`,
      publicId: `${folder}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tags: ['school', folder, ...tags]
    };

    const result = await uploadToCloudinary(file, uploadOptions);
    
    return { 
      success: true, 
      data: {
        url: result.url,
        publicId: result.publicId,
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