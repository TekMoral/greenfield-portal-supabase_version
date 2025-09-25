import { supabase } from "../../lib/supabaseClient";
import { getAccessToken } from "../../lib/cookieAuthClient";

/**
 * Edge Functions Service
 * Centralized service for calling Supabase Edge Functions
 */

class EdgeFunctionsService {
  constructor() {
    this.baseUrl = import.meta.env.VITE_SUPABASE_URL;
  }

  /**
   * Generic method to call any Edge Function
   * @param {string} functionName - Name of the Edge Function
   * @param {Object|FormData} payload - Data to send to the function
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response from the Edge Function
   */
  async callFunction(functionName, payload = {}, options = {}) {
    try {
      console.log(`🔄 Calling Edge Function: ${functionName}`, payload);

      // Supabase client handles JSON stringification internally
      // We just need to pass the payload directly as body
      // Explicitly attach the current session JWT (from in-memory cookie-based flow)
      let headers = { ...(options.headers || {}) };
      try {
        const token = typeof getAccessToken === 'function' ? getAccessToken() : null;
        if (token && !headers['Authorization'] && !headers['authorization']) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (_) {
        // ignore issues obtaining token; function will handle missing auth
      }

      const invokeOptions = {
        body: payload,
        headers,
        ...options
      };

      const { data, error } = await supabase.functions.invoke(functionName, invokeOptions);

      if (error) {
        console.error(`❌ Edge Function ${functionName} error:`, error);
        console.error(`❌ Error details:`, {
          name: error.name,
          message: error.message,
          functionResponse: error.functionResponse,
          originalError: error.originalError
        });

        // Enrich the error with parsed response data for better UX in callers
        const enriched = error instanceof Error ? error : new Error(String(error?.message || error));
        try {
          // Tag the function name for higher-level handlers
          enriched.functionName = functionName;

          // Try to extract more details from the function response
          if (error.functionResponse) {
            const fr = error.functionResponse;
            enriched.status = fr.status;
            enriched.statusText = fr.statusText;

            let bodyText = null;
            try {
              // Read the body once, then attempt JSON parse
              bodyText = await fr.text();
              enriched.responseBody = bodyText;

              try {
                const json = JSON.parse(bodyText);
                enriched.responseJson = json;

                // Common shape: { error: string } or { message: string }
                if (json && (json.error || json.message)) {
                  // Provide a user-friendly message while preserving original error
                  enriched.userMessage = json.error || json.message;
                }
              } catch (_) {
                // Not JSON; keep raw body
              }
            } catch (e) {
              console.error(`❌ Could not read function response body:`, e);
            }
          }
        } catch (e) {
          console.error(`❌ Failed enriching error for ${functionName}:`, e);
        }

        throw enriched;
      }

      console.log(`✅ Edge Function ${functionName} success:`, data);
      // Ensure JSON parsing even if function forgot Content-Type header
      let result = data;
      if (typeof result === 'string') {
        try {
          result = JSON.parse(result);
        } catch (_) {
          // leave as string if not JSON
        }
      }
      return result;
    } catch (error) {
      console.error(`💥 Edge Function ${functionName} exception:`, error);
      throw error;
    }
  }

  async createTeacher(teacherData) {
    return this.callFunction('create-teacher', teacherData);
  }

  /**
   * Create a new student using Edge Function
   * @param {Object} studentData - Student data
   * @returns {Promise<Object>} Created student data
   */
  async createStudent(studentData) {
    return this.callFunction('create-student', studentData);
  }

  /**
   * Create a new admin using Edge Function
   * @param {Object} adminData - Admin data
   * @returns {Promise<Object>} Created admin data
   */
  async createAdmin(adminData) {
    return this.callFunction('create-admin', adminData);
  }

  /**
   * Update user profile using Edge Function
   * @param {string} userId - User ID
   * @param {string} userType - Type of user (teacher, student, admin)
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user data
   */
  async updateUser(userId, userType, updateData) {
    return this.callFunction('update-user', { userId, userType, updateData });
  }

  /**
   * Delete user using role-specific Edge Functions
   * @param {string} userId - User ID
   * @param {string} userType - Type of user (teacher, student, admin)
   * @param {string} deleteMethod - 'soft' or 'hard' delete (default: 'soft')
   * @returns {Promise<Object>} Deletion result
   */
  async deleteUser(userId, userType, deleteMethod = 'soft') {
    // Map userType to specific delete function
    const functionMap = {
      'student': 'delete-student',
      'teacher': 'delete-teacher',
      'admin': 'delete-admin'
    };

    const functionName = functionMap[userType];
    if (!functionName) {
      throw new Error(`Invalid userType: ${userType}. Must be student, teacher, or admin`);
    }

    // Call the role-specific delete function
    return this.callFunction(functionName, { 
      [`${userType}Id`]: userId,
      deleteMethod 
    });
  }

  /**
   * Delete student using Edge Function
   * @param {string} studentId - Student ID
   * @param {string} deleteMethod - 'soft' or 'hard' delete (default: 'soft')
   * @returns {Promise<Object>} Deletion result
   */
  async deleteStudent(studentId, deleteMethod = 'soft') {
    return this.callFunction('delete-student', { studentId, deleteMethod });
  }

  /**
   * Delete teacher using Edge Function
   * @param {string} teacherId - Teacher ID
   * @param {string} deleteMethod - 'soft' or 'hard' delete (default: 'soft')
   * @returns {Promise<Object>} Deletion result
   */
  async deleteTeacher(teacherId, deleteMethod = 'soft') {
    return this.callFunction('delete-teacher', { teacherId, deleteMethod });
  }

  /**
   * Update admin status using Edge Function
   * @param {string} adminId - Admin user ID
   * @param {boolean} isActive - New active status
   * @returns {Promise<Object>} Updated admin data
   */
  async updateAdminStatus(adminId, isActive) {
    return this.callFunction('update-admin-status', { adminId, isActive });
  }

  /**
   * Suspend a user using Edge Function
   * @param {string} userId - User ID to suspend
   * @param {string} userType - Type of user (teacher, student, admin)
   * @param {string} reason - Reason for suspension (optional)
   * @param {string} suspendedBy - ID of user performing the suspension (optional)
   * @param {Date|string} suspendedUntil - Suspension end date (optional, null for indefinite)
   * @returns {Promise<Object>} Suspension result
   */
  async suspendUser(userId, userType, reason = null, suspendedBy = null, suspendedUntil = null) {
    return this.callFunction('suspend-user', { 
      userId, 
      userType, 
      reason, 
      suspendedBy, 
      suspendedUntil 
    });
  }

  /**
   * Reactivate a suspended user using Edge Function
   * @param {string} userId - User ID to reactivate
   * @param {string} userType - Type of user (teacher, student, admin)
   * @param {string} reactivatedBy - ID of user performing the reactivation (optional)
   * @param {string} reactivationReason - Reason for reactivation (optional)
   * @returns {Promise<Object>} Reactivation result
   */
  async reactivateUser(userId, userType, reactivatedBy = null, reactivationReason = null) {
    return this.callFunction('reactivate-user', { 
      userId, 
      userType, 
      reactivatedBy, 
      reactivationReason 
    });
  }

  /**
   * Promote a student to next class/level using Edge Function
   * @param {string} studentId - Student ID to promote
   * @param {string} fromClassId - Current class ID
   * @param {string} toClassId - Target class ID
   * @param {string} academicYear - Academic year for the promotion
   * @param {string} promotedBy - ID of user performing the promotion (optional)
   * @param {string} promotionReason - Reason for promotion (optional)
   * @param {Object} promotionData - Additional promotion data (grades, performance, etc.)
   * @returns {Promise<Object>} Promotion result
   */
  async promoteStudent(studentId, fromClassId, toClassId, academicYear, promotedBy = null, promotionReason = null, promotionData = {}) {
    return this.callFunction('promote-student', { 
      studentId, 
      fromClassId, 
      toClassId, 
      academicYear,
      promotedBy, 
      promotionReason,
      promotionData
    });
  }

  /**
   * Bulk promote students using Edge Function
   * @param {Array} promotions - Array of promotion objects with studentId, fromClassId, toClassId
   * @param {string} academicYear - Academic year for the promotions
   * @param {string} promotedBy - ID of user performing the promotions
   * @param {string} promotionReason - Reason for bulk promotion
   * @returns {Promise<Object>} Bulk promotion result
   */
  async bulkPromoteStudents(promotions, academicYear, promotedBy, promotionReason) {
    return this.callFunction('bulk-promote-students', { 
      promotions, 
      academicYear,
      promotedBy, 
      promotionReason
    });
  }

  /**
   * Demote a student to previous class/level using Edge Function
   * @param {string} studentId - Student ID to demote
   * @param {string} fromClassId - Current class ID
   * @param {string} toClassId - Target class ID
   * @param {string} academicYear - Academic year for the demotion
   * @param {string} demotedBy - ID of user performing the demotion (optional)
   * @param {string} demotionReason - Reason for demotion
   * @param {Object} demotionData - Additional demotion data
   * @returns {Promise<Object>} Demotion result
   */
  async demoteStudent(studentId, fromClassId, toClassId, academicYear, demotedBy = null, demotionReason, demotionData = {}) {
    return this.callFunction('demote-student', { 
      studentId, 
      fromClassId, 
      toClassId, 
      academicYear,
      demotedBy, 
      demotionReason,
      demotionData
    });
  }

  /**
   * Get student promotion history using Edge Function
   * @param {string} studentId - Student ID
   * @returns {Promise<Object>} Student promotion history
   */
  async getStudentPromotionHistory(studentId) {
    return this.callFunction('get-student-promotion-history', { studentId });
  }

  /**
   * Get promotion eligibility for students using Edge Function
   * @param {string} classId - Current class ID
   * @param {string} academicYear - Academic year
   * @returns {Promise<Object>} Promotion eligibility data
   */
  async getPromotionEligibility(classId, academicYear) {
    return this.callFunction('get-promotion-eligibility', { classId, academicYear });
  }

  /**
   * Graduate a student using Edge Function
   * @param {string} studentId - Student ID to graduate
   * @param {Date|string} graduationDate - Graduation date (optional, defaults to current date)
   * @param {string} graduationReason - Reason/notes for graduation (optional)
   * @returns {Promise<Object>} Graduation result
   */
  async graduateStudent(studentId, graduationDate = null, graduationReason = null) {
    return this.callFunction('graduate-student', { 
      studentId, 
      graduationDate, 
      graduationReason 
    });
  }

  /**
   * Get user status history using Edge Function
   * @param {string} userId - User ID
   * @param {string} userType - Type of user (teacher, student, admin)
   * @returns {Promise<Object>} User status history
   */
  async getUserStatusHistory(userId, userType) {
    return this.callFunction('get-user-status-history', { userId, userType });
  }

  /**
   * Bulk suspend users using Edge Function
   * @param {Array} userIds - Array of user IDs to suspend
   * @param {string} userType - Type of users (teacher, student, admin)
   * @param {string} reason - Reason for suspension
   * @param {string} suspendedBy - ID of user performing the suspension
   * @param {Date|string} suspendedUntil - Suspension end date (optional)
   * @returns {Promise<Object>} Bulk suspension result
   */
  async bulkSuspendUsers(userIds, userType, reason, suspendedBy, suspendedUntil = null) {
    return this.callFunction('bulk-suspend-users', { 
      userIds, 
      userType, 
      reason, 
      suspendedBy, 
      suspendedUntil 
    });
  }

  /**
   * Bulk reactivate users using Edge Function
   * @param {Array} userIds - Array of user IDs to reactivate
   * @param {string} userType - Type of users (teacher, student, admin)
   * @param {string} reactivatedBy - ID of user performing the reactivation
   * @param {string} reactivationReason - Reason for reactivation
   * @returns {Promise<Object>} Bulk reactivation result
   */
  async bulkReactivateUsers(userIds, userType, reactivatedBy, reactivationReason) {
    return this.callFunction('bulk-reactivate-users', { 
      userIds, 
      userType, 
      reactivatedBy, 
      reactivationReason 
    });
  }

  /**
   * Delete admin using Edge Function
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteAdmin(adminId) {
    return this.callFunction('delete-admin', { adminId });
  }

  /**
   * Bulk operations using Edge Function
   * @param {string} operation - Operation type
   * @param {Array} items - Items to process
   * @returns {Promise<Object>} Bulk operation result
   */
  async bulkOperation(operation, items) {
    return this.callFunction('bulk-operations', { operation, items });
  }

  /**
   * Generate reports using Edge Function
   * @param {Object} reportConfig - Report configuration
   * @returns {Promise<Object>} Generated report data
   */
  async generateReport(reportConfig) {
    return this.callFunction('generate-report', reportConfig);
  }

  /**
   * Finalize (publish) a generated report by stamping branding and signature.
   * @param {Object} payload - { document_id, verified_by, bucket?, source_path?, destination_path?, overrides?, debug? }
   * @returns {Promise<Object>} Finalization result { success, url, path, bucket }
   */
  async finalizeReport(payload) {
    return this.callFunction('finalize-report', payload);
  }

  /**
   * Send notifications using Edge Function
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Notification result
   */
  async sendNotification(notificationData) {
    return this.callFunction('send-notification', notificationData);
  }

  /**
   * Process file uploads using Edge Function
   * @param {File} file - File to upload
   * @param {Object} metadata - File metadata
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(file, metadata = {}) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));
    // Don't set Content-Type manually - let the browser set the correct boundary
    return this.callFunction('upload-file', formData);
  }

  /**
   * Check system health using Edge Function
   * @returns {Promise<Object>} System health status
   */
  async checkSystemHealth() {
    return this.callFunction('health-check');
  }
}

// Create singleton instance
const edgeFunctionsService = new EdgeFunctionsService();

// Export the service instance and individual methods
export default edgeFunctionsService;

export const callFunction = edgeFunctionsService.callFunction.bind(edgeFunctionsService);
export const createTeacher = edgeFunctionsService.createTeacher.bind(edgeFunctionsService);
export const createStudent = edgeFunctionsService.createStudent.bind(edgeFunctionsService);
export const createAdmin = edgeFunctionsService.createAdmin.bind(edgeFunctionsService);
export const updateUser = edgeFunctionsService.updateUser.bind(edgeFunctionsService);
export const deleteUser = edgeFunctionsService.deleteUser.bind(edgeFunctionsService);
export const deleteStudent = edgeFunctionsService.deleteStudent.bind(edgeFunctionsService);
export const deleteTeacher = edgeFunctionsService.deleteTeacher.bind(edgeFunctionsService);
export const deleteAdmin = edgeFunctionsService.deleteAdmin.bind(edgeFunctionsService);
export const updateAdminStatus = edgeFunctionsService.updateAdminStatus.bind(edgeFunctionsService);

// User status management exports
export const suspendUser = edgeFunctionsService.suspendUser.bind(edgeFunctionsService);
export const reactivateUser = edgeFunctionsService.reactivateUser.bind(edgeFunctionsService);
export const graduateStudent = edgeFunctionsService.graduateStudent.bind(edgeFunctionsService);
export const getUserStatusHistory = edgeFunctionsService.getUserStatusHistory.bind(edgeFunctionsService);
export const bulkSuspendUsers = edgeFunctionsService.bulkSuspendUsers.bind(edgeFunctionsService);
export const bulkReactivateUsers = edgeFunctionsService.bulkReactivateUsers.bind(edgeFunctionsService);

// Student promotion management exports
export const promoteStudent = edgeFunctionsService.promoteStudent.bind(edgeFunctionsService);
export const bulkPromoteStudents = edgeFunctionsService.bulkPromoteStudents.bind(edgeFunctionsService);
export const demoteStudent = edgeFunctionsService.demoteStudent.bind(edgeFunctionsService);
export const getStudentPromotionHistory = edgeFunctionsService.getStudentPromotionHistory.bind(edgeFunctionsService);
export const getPromotionEligibility = edgeFunctionsService.getPromotionEligibility.bind(edgeFunctionsService);

// Other operations exports
export const bulkOperation = edgeFunctionsService.bulkOperation.bind(edgeFunctionsService);
export const generateReport = edgeFunctionsService.generateReport.bind(edgeFunctionsService);
export const finalizeReport = edgeFunctionsService.finalizeReport.bind(edgeFunctionsService);
export const sendNotification = edgeFunctionsService.sendNotification.bind(edgeFunctionsService);
export const uploadFile = edgeFunctionsService.uploadFile.bind(edgeFunctionsService);
export const checkSystemHealth = edgeFunctionsService.checkSystemHealth.bind(edgeFunctionsService);

// Also export the class itself for advanced usage
export { EdgeFunctionsService };