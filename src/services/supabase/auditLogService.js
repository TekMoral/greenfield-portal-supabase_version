import { supabase } from '../../lib/supabaseClient';

// Action types for categorizing admin activities
export const AUDIT_ACTIONS = {
  // User Management
  USER_CREATE: 'user_create',
  USER_UPDATE: 'user_update',
  USER_DELETE: 'user_delete',
  USER_STATUS_CHANGE: 'user_status_change',
  USER_ROLE_CHANGE: 'user_role_change',
  
  // Student Management
  STUDENT_CREATE: 'student_create',
  STUDENT_UPDATE: 'student_update',
  STUDENT_DELETE: 'student_delete',
  STUDENT_ENROLL: 'student_enroll',
  STUDENT_TRANSFER: 'student_transfer',
  
  // Teacher Management
  TEACHER_CREATE: 'teacher_create',
  TEACHER_UPDATE: 'teacher_update',
  TEACHER_DELETE: 'teacher_delete',
  TEACHER_ASSIGN: 'teacher_assign',
  TEACHER_UNASSIGN: 'teacher_unassign',
  
  // Class Management
  CLASS_CREATE: 'class_create',
  CLASS_UPDATE: 'class_update',
  CLASS_DELETE: 'class_delete',
  CLASS_ASSIGN_TEACHER: 'class_assign_teacher',
  CLASS_ASSIGN_STUDENTS: 'class_assign_students',
  
  // Subject Management
  SUBJECT_CREATE: 'subject_create',
  SUBJECT_UPDATE: 'subject_update',
  SUBJECT_DELETE: 'subject_delete',
  SUBJECT_ASSIGN: 'subject_assign',
  SUBJECT_UNASSIGN: 'subject_unassign',
  
  // Grade Management
  GRADE_CREATE: 'grade_create',
  GRADE_UPDATE: 'grade_update',
  GRADE_DELETE: 'grade_delete',
  GRADE_PUBLISH: 'grade_publish',
  GRADE_UNPUBLISH: 'grade_unpublish',
  
  // Report Management
  REPORT_APPROVE: 'report_approve',
  REPORT_REJECT: 'report_reject',
  REPORT_UPDATE: 'report_update',
  
  // System Configuration
  SYSTEM_CONFIG_UPDATE: 'system_config_update',
  SYSTEM_VIEW_CHANGE: 'system_view_change',
  CAROUSEL_UPDATE: 'carousel_update',
  NEWS_CREATE: 'news_create',
  NEWS_UPDATE: 'news_update',
  NEWS_DELETE: 'news_delete',
  
  // Security Actions
  LOGIN: 'login',
  LOGOUT: 'logout',
  PASSWORD_RESET: 'password_reset',
  PERMISSION_CHANGE: 'permission_change',
  
  // Data Export/Import
  DATA_EXPORT: 'data_export',
  DATA_IMPORT: 'data_import',
  BULK_OPERATION: 'bulk_operation'
};

// Risk levels for different actions
export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Map actions to risk levels
const ACTION_RISK_MAP = {
  [AUDIT_ACTIONS.USER_DELETE]: RISK_LEVELS.CRITICAL,
  [AUDIT_ACTIONS.STUDENT_DELETE]: RISK_LEVELS.CRITICAL,
  [AUDIT_ACTIONS.TEACHER_DELETE]: RISK_LEVELS.CRITICAL,
  [AUDIT_ACTIONS.CLASS_DELETE]: RISK_LEVELS.HIGH,
  [AUDIT_ACTIONS.SUBJECT_DELETE]: RISK_LEVELS.MEDIUM,
  [AUDIT_ACTIONS.GRADE_DELETE]: RISK_LEVELS.HIGH,
  [AUDIT_ACTIONS.USER_ROLE_CHANGE]: RISK_LEVELS.HIGH,
  [AUDIT_ACTIONS.PERMISSION_CHANGE]: RISK_LEVELS.HIGH,
  [AUDIT_ACTIONS.SYSTEM_CONFIG_UPDATE]: RISK_LEVELS.HIGH,
  [AUDIT_ACTIONS.DATA_EXPORT]: RISK_LEVELS.MEDIUM,
  [AUDIT_ACTIONS.BULK_OPERATION]: RISK_LEVELS.MEDIUM,
  [AUDIT_ACTIONS.PASSWORD_RESET]: RISK_LEVELS.MEDIUM,
  [AUDIT_ACTIONS.SUBJECT_CREATE]: RISK_LEVELS.LOW,
  [AUDIT_ACTIONS.SUBJECT_UPDATE]: RISK_LEVELS.LOW,
  [AUDIT_ACTIONS.SYSTEM_VIEW_CHANGE]: RISK_LEVELS.LOW,
};

// First, we need to create the audit_logs table in Supabase
// This should be run in Supabase SQL Editor:
/*
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  description TEXT,
  risk_level TEXT DEFAULT 'low',
  is_sensitive BOOLEAN DEFAULT FALSE,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read their own logs
CREATE POLICY "Users can view audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create policy for admins to insert logs
CREATE POLICY "Admins can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_level ON public.audit_logs(risk_level);
*/

/**
 * Log an admin activity to the audit trail
 * @param {Object} logData - The audit log data
 */
export const logAdminActivity = async (logData) => {
  try {
    const {
      adminId,
      adminEmail,
      action,
      resource,
      resourceId,
      details = {},
      metadata = {},
      description
    } = logData;

    // Validate required fields
    if (!adminId || !action || !resource) {
      console.warn('Missing required fields for audit log:', { adminId, action, resource });
      return null;
    }

    // Determine risk level
    const riskLevel = ACTION_RISK_MAP[action] || RISK_LEVELS.LOW;

    // Create audit log entry
    const auditEntry = {
      user_id: adminId,
      action,
      resource_type: resource,
      resource_id: resourceId || null,
      details: {
        ...details,
        created_by: adminEmail || null,
        description: description || `${action} performed on ${resource}`,
      },
      ip_address: (metadata && metadata.ip) || null,
      user_agent: (metadata && metadata.userAgent) || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
      created_at: new Date().toISOString()
    };

    // Store in Supabase
    const { data, error } = await supabase
      .from('audit_logs')
      .insert(auditEntry)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to log admin activity:', error);
      return null;
    }

    console.log('✅ Audit log created:', data.id);
    return data.id;
  } catch (error) {
    console.error('❌ Failed to log admin activity:', error);
    // Don't throw error to avoid breaking the main operation
    return null;
  }
};

/**
 * Get audit logs with filtering and pagination
 */
export const getAuditLogs = async (filters = {}) => {
  try {
    const {
      adminId,
      action,
      resource,
      riskLevel,
      startDate,
      endDate,
      limit: queryLimit = 50,
      offset = 0
    } = filters;

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (adminId) {
      query = query.eq('user_id', adminId);
    }
    if (action) {
      query = query.eq('action', action);
    }
    if (resource) {
      query = query.eq('resource_type', resource);
    }
    if (riskLevel) {
      query = query.eq('risk_level', riskLevel);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Apply pagination
    query = query.range(offset, offset + queryLimit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      success: true,
      data: {
        logs: data || [],
        total: count,
        hasMore: (data?.length || 0) === queryLimit
      }
    };
  } catch (error) {
    console.error('❌ Failed to fetch audit logs:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get audit log statistics
 */
export const getAuditLogStats = async (filters = {}) => {
  try {
    // Get recent logs for stats calculation
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    const stats = {
      total: logs?.length || 0,
      byAction: {},
      byResource: {},
      byRiskLevel: {},
      byAdmin: {},
      recentActivity: logs?.slice(0, 10) || []
    };

    logs?.forEach(log => {
      // Count by action
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
      
      // Count by resource (resource_type)
      stats.byResource[log.resource_type] = (stats.byResource[log.resource_type] || 0) + 1;
      
      // Risk level may not exist in current schema; keep if present
      if (log.risk_level) {
        stats.byRiskLevel[log.risk_level] = (stats.byRiskLevel[log.risk_level] || 0) + 1;
      }
      
      // Count by admin (by user_id)
      stats.byAdmin[log.user_id] = (stats.byAdmin[log.user_id] || 0) + 1;
    });

    return { success: true, data: stats };
  } catch (error) {
    console.error('❌ Failed to get audit log stats:', error);
    return {
      success: false,
      error: error.message,
      data: {
        total: 0,
        byAction: {},
        byResource: {},
        byRiskLevel: {},
        byAdmin: {},
        recentActivity: []
      }
    };
  }
};

/**
 * Get a specific audit log entry
 */
export const getAuditLog = async (logId) => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('id', logId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('❌ Failed to get audit log:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Export audit logs to CSV format
 */
export const exportAuditLogs = async (filters = {}) => {
  try {
    const result = await getAuditLogs({ ...filters, limit: 10000 });
    
    if (!result.success) {
      throw new Error(result.error);
    }

    const logs = result.data.logs;
    
    const csvHeaders = [
      'Timestamp',
      'Actor',
      'Action',
      'Resource Type',
      'Resource ID',
      'Description',
      'IP Address',
      'User Agent'
    ];
    
    const csvRows = logs.map(log => [
      log.created_at || '',
      (log.details?.created_by || log.user_id || ''),
      log.action || '',
      log.resource_type || '',
      log.resource_id || '',
      (log.details?.description || ''),
      (log.ip_address || ''),
      (log.user_agent || '')
    ]);
    
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');
    
    return { success: true, data: csvContent };
  } catch (error) {
    console.error('❌ Failed to export audit logs:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Clean up old audit logs (for data retention)
 */
export const cleanupOldAuditLogs = async (retentionDays = 365) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const { data, error } = await supabase
      .from('audit_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString());
    
    if (error) throw error;
    
    console.log(`Cleaned up old audit logs older than ${retentionDays} days`);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Failed to cleanup old audit logs:', error);
    return { success: false, error: error.message };
  }
};