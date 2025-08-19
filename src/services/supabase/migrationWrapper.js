/**
 * Migration Wrapper Service
 * Provides a gradual migration path from direct client calls to Edge Functions
 * Allows switching between old and new implementations with feature flags
 */

import edgeFunctionsService from './edgeFunctions.js';

// Import legacy services synchronously to avoid binding issues
import { teacherService as legacyTeacherService } from './teacherService.js';
import { studentService as legacyStudentService } from './studentService.js';
import { adminService as legacyAdminService } from './adminService.js';

// Feature flags for gradual migration
const FEATURE_FLAGS = {
  USE_EDGE_FUNCTIONS_FOR_TEACHERS: true,
  USE_EDGE_FUNCTIONS_FOR_STUDENTS: true,
  USE_EDGE_FUNCTIONS_FOR_ADMINS: true,
  USE_EDGE_FUNCTIONS_FOR_REPORTS: false,
  USE_EDGE_FUNCTIONS_FOR_BULK_OPS: false,
};

// Get feature flag value with environment override
function getFeatureFlag(flagName) {
  // Check environment variable first
  const envFlag = import.meta.env[`VITE_${flagName}`];
  if (envFlag !== undefined) {
    return envFlag === 'true';
  }
  
  // Fall back to default
  return FEATURE_FLAGS[flagName] || false;
}

/**
 * Teacher Service with Migration Support
 */
export const teacherService = {
  async createTeacher(teacherData) {
    if (getFeatureFlag('USE_EDGE_FUNCTIONS_FOR_TEACHERS')) {
      console.log('🚀 Using Edge Function for teacher creation');
      try {
        return await edgeFunctionsService.createTeacher(teacherData);
      } catch (error) {
        console.warn('⚠️ Edge Function failed, falling back to legacy method');
        return await legacyTeacherService.createTeacher(teacherData);
      }
    } else {
      console.log('🔄 Using legacy method for teacher creation');
      return await legacyTeacherService.createTeacher(teacherData);
    }
  },

  // Delegate other methods to legacy service for now
  getAllTeachers: legacyTeacherService?.getAllTeachers?.bind(legacyTeacherService) || (() => Promise.resolve({ success: false, error: 'Method not available' })),
  getTeacherById: legacyTeacherService?.getTeacherById?.bind(legacyTeacherService) || (() => Promise.resolve({ success: false, error: 'Method not available' })),
  updateTeacher: legacyTeacherService?.updateTeacher?.bind(legacyTeacherService) || (() => Promise.resolve({ success: false, error: 'Method not available' })),
  deleteTeacher: legacyTeacherService?.deleteTeacher?.bind(legacyTeacherService) || (() => Promise.resolve({ success: false, error: 'Method not available' })),
  getTeacherSubjects: legacyTeacherService?.getTeacherSubjects?.bind(legacyTeacherService) || (() => Promise.resolve({ success: false, error: 'Method not available' })),
  assignSubjectToTeacher: legacyTeacherService?.assignSubjectToTeacher?.bind(legacyTeacherService) || (() => Promise.resolve({ success: false, error: 'Method not available' })),
  removeSubjectFromTeacher: legacyTeacherService?.removeSubjectFromTeacher?.bind(legacyTeacherService) || (() => Promise.resolve({ success: false, error: 'Method not available' })),
  getTeacherStats: legacyTeacherService?.getTeacherStats?.bind(legacyTeacherService) || (() => Promise.resolve({ success: false, error: 'Method not available' })),
};

/**
 * Student Service with Migration Support
 */
export const studentService = {
  async createStudent(studentData) {
    if (getFeatureFlag('USE_EDGE_FUNCTIONS_FOR_STUDENTS')) {
      console.log('🚀 Using Edge Function for student creation');
      try {
        return await edgeFunctionsService.createStudent(studentData);
      } catch (error) {
        console.warn('⚠️ Edge Function failed, falling back to legacy method');
        return await legacyStudentService.createStudent(studentData);
      }
    } else {
      console.log('🔄 Using legacy method for student creation');
      return await legacyStudentService.createStudent(studentData);
    }
  },

  // Delegate other methods to legacy service for now
  getAllStudents: legacyStudentService?.getAllStudents?.bind(legacyStudentService) || (() => Promise.resolve({ success: false, error: 'Method not available' })),
  getStudentById: legacyStudentService?.getStudentById?.bind(legacyStudentService) || (() => Promise.resolve({ success: false, error: 'Method not available' })),
  updateStudent: legacyStudentService?.updateStudent?.bind(legacyStudentService) || (() => Promise.resolve({ success: false, error: 'Method not available' })),
  deleteStudent: legacyStudentService?.deleteStudent?.bind(legacyStudentService) || (() => Promise.resolve({ success: false, error: 'Method not available' })),
  getStudentsByClass: legacyStudentService?.getStudentsByClass?.bind(legacyStudentService) || (() => Promise.resolve({ success: false, error: 'Method not available' })),
  getStudentStats: legacyStudentService?.getStudentStats?.bind(legacyStudentService) || (() => Promise.resolve({ success: false, error: 'Method not available' })),
  checkAdmissionNumberExists: legacyStudentService?.checkAdmissionNumberExists?.bind(legacyStudentService) || (() => Promise.resolve(false)),
  getNextAdmissionNumber: legacyStudentService?.getNextAdmissionNumber?.bind(legacyStudentService) || (() => Promise.resolve(1)),
};

/**
 * Admin Service with Migration Support
 */
export const adminService = {
  async createAdmin(adminData) {
    if (getFeatureFlag('USE_EDGE_FUNCTIONS_FOR_ADMINS')) {
      console.log('🚀 Using Edge Function for admin creation');
      // Do not fallback to client-side admin API to avoid not_admin errors
      return await edgeFunctionsService.createAdmin(adminData);
    } else {
      console.log('🔄 Using legacy method for admin creation');
      return await legacyAdminService.createAdmin(adminData);
    }
  },

  async updateAdminStatus(adminId, isActive) {
    if (getFeatureFlag('USE_EDGE_FUNCTIONS_FOR_ADMINS')) {
      console.log('🚀 Using Edge Function for admin status update');
      return await edgeFunctionsService.updateAdminStatus(adminId, isActive);
    } else {
      console.log('🔄 Using legacy method for admin status update');
      return await legacyAdminService.updateAdminStatus(adminId, isActive);
    }
  },

  async deleteAdmin(adminId) {
    if (getFeatureFlag('USE_EDGE_FUNCTIONS_FOR_ADMINS')) {
      console.log('🚀 Using Edge Function for admin deletion');
      return await edgeFunctionsService.deleteAdmin(adminId);
    } else {
      console.log('🔄 Using legacy method for admin deletion');
      return await legacyAdminService.deleteAdmin(adminId);
    }
  },

  async updateAdmin(adminId, updateData) {
    if (getFeatureFlag('USE_EDGE_FUNCTIONS_FOR_ADMINS')) {
      console.log('🚀 Using Edge Function for admin update');
      return await edgeFunctionsService.updateUser(adminId, 'admin', updateData);
    } else {
      console.log('🔄 Using legacy method for admin update');
      return await legacyAdminService.updateAdmin(adminId, updateData);
    }
  },

  // Delegate remaining methods to legacy service for now
  getAllAdmins: legacyAdminService?.getAllAdmins?.bind(legacyAdminService) || (() => Promise.resolve({ success: false, error: 'Method not available' })),
  getAdminById: legacyAdminService?.getAdminById?.bind(legacyAdminService) || (() => Promise.resolve({ success: false, error: 'Method not available' })),
  updateAdminRole: legacyAdminService?.updateAdminRole?.bind(legacyAdminService) || (() => Promise.resolve({ success: false, error: 'Method not available' })),
  updateAdminProfile: legacyAdminService?.updateAdminProfile?.bind(legacyAdminService) || (() => Promise.resolve({ success: false, error: 'Method not available' })),
};

/**
 * Migration Status and Control
 */
export const migrationControl = {
  // Get current feature flag status
  getFeatureFlags() {
    return Object.keys(FEATURE_FLAGS).reduce((flags, key) => {
      flags[key] = getFeatureFlag(key);
      return flags;
    }, {});
  },

  // Test Edge Function connectivity
  async testEdgeFunctions() {
    const results = {};
    
    try {
      // Test teacher creation endpoint
      results.teacherEndpoint = await edgeFunctionsService.callFunction('create-teacher', {
        test: true
      });
    } catch (error) {
      results.teacherEndpoint = { error: error.message };
    }

    try {
      // Test student creation endpoint
      results.studentEndpoint = await edgeFunctionsService.callFunction('create-student', {
        test: true
      });
    } catch (error) {
      results.studentEndpoint = { error: error.message };
    }

    return results;
  },

  // Get migration statistics
  getMigrationStats() {
    const flags = this.getFeatureFlags();
    const total = Object.keys(flags).length;
    const enabled = Object.values(flags).filter(Boolean).length;
    
    return {
      total,
      enabled,
      disabled: total - enabled,
      percentage: Math.round((enabled / total) * 100),
      flags
    };
  }
};

// Export individual functions for backward compatibility
export const {
  createTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
} = teacherService;

export const {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
} = studentService;

export const {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  updateAdminStatus,
  deleteAdmin,
} = adminService;