import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { logAdminActivity, AUDIT_ACTIONS, RISK_LEVELS } from '../services/supabase/auditLogService';

/**
 * Custom hook for logging admin activities
 * Provides easy-to-use functions for logging various admin actions
 */
export const useAuditLog = () => {
  const { user, userRole, isSuperAdmin } = useAuth();

  // Check if user has admin privileges
  const isAdmin = userRole === 'admin' || userRole === 'super_admin' || isSuperAdmin;
  
  // Check if user can log activities (admins + teachers for their own actions)
  const canLog = isAdmin || userRole === 'teacher';

  // Get client metadata for logging
  const getClientMetadata = useCallback(() => {
    return {
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      sessionId: sessionStorage.getItem('sessionId') || 'unknown'
    };
  }, []);

  // Generic log function
  const logActivity = useCallback(async (action, resource, options = {}) => {
    if (!user || !canLog) {
      console.warn('Audit logging attempted by unauthorized user', { userRole, isSuperAdmin, isAdmin, canLog });
      return null;
    }

    const {
      resourceId,
      details = {},
      description,
      customMetadata = {}
    } = options;

    const logData = {
      adminId: user.uid,
      adminEmail: user.email,
      action,
      resource,
      resourceId,
      details,
      metadata: {
        ...getClientMetadata(),
        ...customMetadata
      },
      description
    };

    try {
      console.log('🔄 Attempting to log activity:', { action, resource, userRole, isAdmin });
      const logId = await logAdminActivity(logData);
      console.log(`✅ Activity logged: ${action} on ${resource}`, logId);
      return logId;
    } catch (error) {
      console.error('❌ Failed to log activity:', error);
      return null;
    }
  }, [user, userRole, isSuperAdmin, isAdmin, canLog, getClientMetadata]);

  // Specific logging functions for common admin actions
  const logUserAction = useCallback((action, userId, details = {}, description) => {
    return logActivity(action, 'user', {
      resourceId: userId,
      details,
      description
    });
  }, [logActivity]);

  const logStudentAction = useCallback((action, studentId, details = {}, description) => {
    return logActivity(action, 'student', {
      resourceId: studentId,
      details,
      description
    });
  }, [logActivity]);

  const logTeacherAction = useCallback((action, teacherId, details = {}, description) => {
    return logActivity(action, 'teacher', {
      resourceId: teacherId,
      details,
      description
    });
  }, [logActivity]);

  const logClassAction = useCallback((action, classId, details = {}, description) => {
    return logActivity(action, 'class', {
      resourceId: classId,
      details,
      description
    });
  }, [logActivity]);

  const logGradeAction = useCallback((action, gradeId, details = {}, description) => {
    return logActivity(action, 'grade', {
      resourceId: gradeId,
      details,
      description
    });
  }, [logActivity]);

  const logReportAction = useCallback((action, reportId, details = {}, description) => {
    return logActivity(action, 'report', {
      resourceId: reportId,
      details,
      description
    });
  }, [logActivity]);

  const logSystemAction = useCallback((action, details = {}, description) => {
    return logActivity(action, 'system', {
      details,
      description
    });
  }, [logActivity]);

  const logNewsAction = useCallback((action, newsId, details = {}, description) => {
    return logActivity(action, 'news', {
      resourceId: newsId,
      details,
      description
    });
  }, [logActivity]);

  const logDataAction = useCallback((action, details = {}, description) => {
    return logActivity(action, 'data', {
      details,
      description
    });
  }, [logActivity]);

  // Convenience functions for specific actions
  const logLogin = useCallback(() => {
    return logActivity(AUDIT_ACTIONS.LOGIN, 'auth', {
      description: `${userRole === 'teacher' ? 'Teacher' : 'Admin'} ${user?.email} logged in`
    });
  }, [logActivity, user, userRole]);

  const logLogout = useCallback(() => {
    return logActivity(AUDIT_ACTIONS.LOGOUT, 'auth', {
      description: `${userRole === 'teacher' ? 'Teacher' : 'Admin'} ${user?.email} logged out`
    });
  }, [logActivity, user, userRole]);

  const logBulkOperation = useCallback((operationType, affectedCount, details = {}) => {
    return logActivity(AUDIT_ACTIONS.BULK_OPERATION, 'bulk', {
      details: {
        operationType,
        affectedCount,
        ...details
      },
      description: `Bulk ${operationType} operation affecting ${affectedCount} records`
    });
  }, [logActivity]);

  const logDataExport = useCallback((exportType, recordCount, details = {}) => {
    return logActivity(AUDIT_ACTIONS.DATA_EXPORT, 'data', {
      details: {
        exportType,
        recordCount,
        ...details
      },
      description: `Exported ${recordCount} ${exportType} records`
    });
  }, [logActivity]);

  const logConfigUpdate = useCallback((configType, changes = {}, description) => {
    return logActivity(AUDIT_ACTIONS.SYSTEM_CONFIG_UPDATE, 'config', {
      details: {
        configType,
        changes
      },
      description: description || `Updated ${configType} configuration`
    });
  }, [logActivity]);

  return {
    // Generic logging
    logActivity,
    
    // Resource-specific logging
    logUserAction,
    logStudentAction,
    logTeacherAction,
    logClassAction,
    logGradeAction,
    logReportAction,
    logSystemAction,
    logNewsAction,
    logDataAction,
    
    // Convenience functions
    logLogin,
    logLogout,
    logBulkOperation,
    logDataExport,
    logConfigUpdate,
    
    // Constants for use in components
    AUDIT_ACTIONS,
    RISK_LEVELS,
    
    // User info
    isAdmin,
    canLog
  };
};

export default useAuditLog;