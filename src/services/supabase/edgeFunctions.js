
import { supabase } from "../../lib/supabaseClient";

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
      // Explicitly attach the current session JWT to ensure Authorization header is present
      let headers = { ...(options.headers || {}) };
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token && !headers['Authorization'] && !headers['authorization']) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      } catch (_) {
        // ignore issues obtaining session; function will handle missing auth
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
        
        // Try to extract more details from the error
        if (error.functionResponse) {
          try {
            const errorText = await error.functionResponse.text();
            console.error(`❌ Function response body:`, errorText);
          } catch (e) {
            console.error(`❌ Could not read function response:`, e);
          }
        }
        
        throw error;
      }

      console.log(`✅ Edge Function ${functionName} success:`, data);
      return data;
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
export const bulkOperation = edgeFunctionsService.bulkOperation.bind(edgeFunctionsService);
export const generateReport = edgeFunctionsService.generateReport.bind(edgeFunctionsService);
export const sendNotification = edgeFunctionsService.sendNotification.bind(edgeFunctionsService);
export const uploadFile = edgeFunctionsService.uploadFile.bind(edgeFunctionsService);
export const checkSystemHealth = edgeFunctionsService.checkSystemHealth.bind(edgeFunctionsService);
export const updateAdminStatus = edgeFunctionsService.updateAdminStatus.bind(edgeFunctionsService);

// Also export the class itself for advanced usage
export { EdgeFunctionsService };
