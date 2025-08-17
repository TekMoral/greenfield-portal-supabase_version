/**
 * Clean Service Exports - Step 10: Service Hygiene
 * 
 * This file provides a clean, secure, and maintainable service interface.
 * All services are properly organized and only necessary exports are exposed.
 */

// Core Services (Migration-ready)
export { 
  teacherService,
  studentService, 
  adminService,
  migrationControl,
  // Individual functions for backward compatibility
  createTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin
} from './supabase/migrationWrapper.js';

// Essential Services (Direct exports)
export { classService } from './supabase/classService.js';
export { subjectService } from './supabase/subjectService.js';
export { dashboardService } from './supabase/dashboardService.js';
export { newsService } from './supabase/newsService.js';
export { userService } from './supabase/userService.js';

// Specialized Services (Controlled exports)
export { uploadService } from './supabase/uploadService.js';
export { timetableService } from './supabase/timetableService.js';
export { reportService } from './supabase/reportService.js';
export { resultService } from './supabase/resultService.js';
export { gradeService } from './supabase/gradeService.js';

// Utility Services
export { classDisplayService } from './supabase/classDisplayService.js';
export { teacherStudentService } from './supabase/teacherStudentService.js';
export { studentManagementService } from './supabase/studentManagementService.js';

// Edge Functions Service
export { default as edgeFunctionsService } from './supabase/edgeFunctions.js';

// Audit and Security
export { 
  AUDIT_ACTIONS,
  RISK_LEVELS,
  logAdminActivity,
  getAuditLogs,
  getAuditLogStats
} from './supabase/auditLogService.js';

/**
 * Service Categories for Better Organization
 */

// Core User Management
export const userManagement = {
  teachers: teacherService,
  students: studentService,
  admins: adminService,
  users: userService
};

// Academic Management
export const academicServices = {
  classes: classService,
  subjects: subjectService,
  timetables: timetableService,
  reports: reportService,
  results: resultService,
  grades: gradeService
};

// System Services
export const systemServices = {
  dashboard: dashboardService,
  news: newsService,
  uploads: uploadService,
  migration: migrationControl,
  edgeFunctions: edgeFunctionsService
};

// Utility Services
export const utilityServices = {
  classDisplay: classDisplayService,
  teacherStudent: teacherStudentService,
  studentManagement: studentManagementService
};

/**
 * Service Health Check
 */
export const serviceHealth = {
  async checkCoreServices() {
    const results = {
      timestamp: new Date().toISOString(),
      services: {}
    };

    // Test core services
    try {
      results.services.migration = await migrationControl.getMigrationStats();
    } catch (error) {
      results.services.migration = { error: error.message };
    }

    try {
      results.services.edgeFunctions = await edgeFunctionsService.checkSystemHealth();
    } catch (error) {
      results.services.edgeFunctions = { error: error.message };
    }

    return results;
  },

  async testServiceConnectivity() {
    const services = [
      'teachers', 'students', 'admins', 'classes', 
      'subjects', 'dashboard', 'news', 'users'
    ];

    const results = {};
    
    for (const service of services) {
      try {
        // Test if service is accessible
        const serviceObj = eval(`${service}Service`);
        results[service] = {
          available: !!serviceObj,
          methods: Object.keys(serviceObj || {}).length
        };
      } catch (error) {
        results[service] = { error: error.message };
      }
    }

    return results;
  }
};

/**
 * Deprecated Services (For cleanup tracking)
 * These should be removed in future versions
 */
export const deprecatedServices = {
  // Legacy exam services (use resultService instead)
  examService: () => console.warn('⚠️ examService is deprecated, use resultService'),
  examResultService: () => console.warn('⚠️ examResultService is deprecated, use resultService'),
  
  // Legacy student result service (use resultService instead)
  studentResultService: () => console.warn('⚠️ studentResultService is deprecated, use resultService'),
  
  // Legacy carousel service (use newsService instead)
  carouselService: () => console.warn('⚠️ carouselService is deprecated, use newsService for media content')
};

/**
 * Service Configuration
 */
export const serviceConfig = {
  version: '2.0.0',
  migrationStatus: 'active',
  edgeFunctionsEnabled: true,
  securityLevel: 'high',
  
  // Feature flags
  features: {
    edgeFunctions: true,
    auditLogging: true,
    rateLimiting: false,
    caching: false
  },
  
  // Service limits
  limits: {
    maxBatchSize: 100,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    requestTimeout: 30000, // 30 seconds
    maxRetries: 3
  }
};