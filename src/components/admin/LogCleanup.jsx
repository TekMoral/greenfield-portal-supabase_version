import React, { useState } from 'react';
import { cleanupOldAuditLogs } from '../../services/supabase/auditLogService';
import useAuditLog from '../../hooks/useAuditLog';
import useToast from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';

const LogCleanup = () => {
  const [loading, setLoading] = useState(false);
  const [retentionDays, setRetentionDays] = useState(365);
  const [cleanupStats, setCleanupStats] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const { logSystemAction, AUDIT_ACTIONS } = useAuditLog();
  const { showToast } = useToast();
  const { user, userRole } = useAuth();

  // STRICT: Only technical consultants and system admins (NOT super_admin)
  const isTechnicalConsultant = userRole === 'technical_consultant' || 
                                userRole === 'system_admin';

  const handleCleanup = async () => {
    if (!isTechnicalConsultant) {
      showToast('Access denied. Technical consultant privileges required.', 'error');
      return;
    }

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setLoading(true);
    try {
      console.log(`🧹 Starting cleanup of logs older than ${retentionDays} days...`);
      
      const deletedCount = await cleanupOldAuditLogs(retentionDays);
      
      // Log the cleanup operation
      await logSystemAction(
        AUDIT_ACTIONS.SYSTEM_CONFIG_UPDATE,
        {
          operation: 'audit_log_cleanup',
          retentionDays,
          deletedCount,
          cleanupDate: new Date().toISOString(),
          performedBy: user?.email,
          userRole: userRole,
          technicalConsultantOnly: true
        },
        `Technical consultant ${user?.email} cleaned up ${deletedCount} audit logs older than ${retentionDays} days`
      );

      setCleanupStats({
        deletedCount,
        retentionDays,
        cleanupDate: new Date()
      });

      showToast(`Successfully cleaned up ${deletedCount} old audit logs`, 'success');
      setShowConfirm(false);
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      showToast('Failed to cleanup logs: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Access denied for ALL non-technical consultants (including super_admin)
  if (!isTechnicalConsultant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
          <div className="text-red-500 text-4xl mb-4 text-center">🚫</div>
          <h3 className="text-lg font-medium text-red-800 mb-2 text-center">Access Restricted</h3>
          <p className="text-red-600 mb-4 text-center">
            Log cleanup operations require technical consultant privileges only.
          </p>
          <div className="text-sm text-red-500 space-y-1 bg-red-100 p-3 rounded">
            <p><strong>Current role:</strong> {userRole || 'Unknown'}</p>
            <p><strong>Required roles:</strong> technical_consultant, system_admin</p>
            <p><strong>User:</strong> {user?.email || 'Unknown'}</p>
            <p><strong>Note:</strong> Super admins are excluded for security compliance</p>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <h4 className="text-sm font-medium text-yellow-800 mb-1">🔒 Security Principle: Separation of Duties</h4>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• Super admins manage business operations</li>
              <li>• Technical consultants handle system maintenance</li>
              <li>• Prevents conflicts of interest in audit trails</li>
              <li>• Ensures independent oversight and compliance</li>
              <li>• Reduces insider threat and privilege escalation risks</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const presetRetentions = [
    { label: '30 Days', days: 30, description: 'Keep only last month', risk: 'HIGH' },
    { label: '90 Days', days: 90, description: 'Keep last quarter', risk: 'MEDIUM' },
    { label: '180 Days', days: 180, description: 'Keep last 6 months', risk: 'MEDIUM' },
    { label: '365 Days', days: 365, description: 'Keep last year (recommended)', risk: 'LOW' },
    { label: '730 Days', days: 730, description: 'Keep last 2 years', risk: 'LOW' },
  ];

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'HIGH': return 'border-red-300 bg-red-50 text-red-700';
      case 'MEDIUM': return 'border-yellow-300 bg-yellow-50 text-yellow-700';
      case 'LOW': return 'border-green-300 bg-green-50 text-green-700';
      default: return 'border-gray-300 bg-gray-50 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      {/* Technical Consultant Header */}
      <div className="flex items-center mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="p-3 bg-blue-100 rounded-lg mr-4">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-blue-900">Technical Consultant Access</h3>
          <p className="text-blue-700">Logged in as: {user?.email} ({userRole})</p>
          <p className="text-sm text-blue-600">Independent system maintenance privileges - Separation of duties enforced</p>
        </div>
      </div>

      <div className="flex items-center mb-6">
        <div className="p-3 bg-orange-100 rounded-lg mr-4">
          <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Audit Log Cleanup</h3>
          <p className="text-gray-600">Manage audit log retention and cleanup old entries</p>
        </div>
      </div>

      {/* Retention Period Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Retention Period
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {presetRetentions.map((preset) => (
            <button
              key={preset.days}
              onClick={() => setRetentionDays(preset.days)}
              className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                retentionDays === preset.days
                  ? 'border-blue-500 bg-blue-50'
                  : `border-gray-200 hover:border-gray-300 ${getRiskColor(preset.risk)}`
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="font-medium text-gray-900">{preset.label}</div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  preset.risk === 'HIGH' ? 'bg-red-100 text-red-700' :
                  preset.risk === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {preset.risk}
                </span>
              </div>
              <div className="text-sm text-gray-600">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Retention */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Custom Retention (Days)
        </label>
        <input
          type="number"
          min="1"
          max="3650"
          value={retentionDays}
          onChange={(e) => setRetentionDays(parseInt(e.target.value) || 365)}
          className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-sm text-gray-500 mt-1">
          Logs older than {retentionDays} days will be permanently deleted
        </p>
      </div>

      {/* Critical Warning Box */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-red-800">⚠️ CRITICAL SYSTEM OPERATION</h4>
            <div className="text-sm text-red-700 mt-1">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>IRREVERSIBLE:</strong> This action permanently deletes audit logs</li>
                <li><strong>COMPLIANCE RISK:</strong> May impact regulatory compliance requirements</li>
                <li><strong>SECURITY IMPACT:</strong> Deleted logs cannot be used for incident investigation</li>
                <li><strong>AUDIT TRAIL:</strong> This cleanup operation will be logged</li>
                <li><strong>SEPARATION OF DUTIES:</strong> Only technical consultants can perform this operation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Cleanup Stats */}
      {cleanupStats && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-green-800">✅ Cleanup Completed Successfully</h4>
              <div className="text-sm text-green-700 mt-1">
                <p><strong>Deleted:</strong> {cleanupStats.deletedCount} logs older than {cleanupStats.retentionDays} days</p>
                <p><strong>Performed by:</strong> {user?.email} (Technical Consultant)</p>
                <p><strong>Timestamp:</strong> {cleanupStats.cleanupDate.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {!showConfirm ? (
          <button
            onClick={handleCleanup}
            disabled={loading}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Initiate Cleanup Process
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCleanup}
              disabled={loading}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing Cleanup...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  CONFIRM PERMANENT DELETION
                </>
              )}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={loading}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors font-medium"
            >
              Cancel Operation
            </button>
          </div>
        )}
      </div>

      {/* Compliance Guidelines */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h4 className="text-lg font-medium text-gray-900 mb-3">📋 Compliance & Security Guidelines</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h5 className="font-medium text-gray-800 mb-2">Industry Standards</h5>
            <ul className="space-y-1">
              <li>• <strong>Financial:</strong> 7+ years (SOX, GDPR)</li>
              <li>• <strong>Healthcare:</strong> 6+ years (HIPAA)</li>
              <li>• <strong>Education:</strong> 3-5 years (FERPA)</li>
              <li>• <strong>General:</strong> 1-2 years minimum</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-gray-800 mb-2">Security Principles</h5>
            <ul className="space-y-1">
              <li>• <strong>Separation of duties:</strong> Technical vs operational roles</li>
              <li>• <strong>Independent oversight:</strong> Technical consultants only</li>
              <li>• <strong>Audit integrity:</strong> Operators cannot delete their own logs</li>
              <li>• <strong>Compliance:</strong> Meets SOX, GDPR, ISO 27001 requirements</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogCleanup;