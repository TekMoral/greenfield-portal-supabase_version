import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getAuditLogs, 
  getAuditLogStats, 
  exportAuditLogs,
  AUDIT_ACTIONS,
  RISK_LEVELS 
} from '../../services/supabase/auditLogService';
import { useAuth } from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';

const ActivityLogger = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasInitialized = useRef(false);
  const [filters, setFilters] = useState({
    limit: 50,
    riskLevel: '',
    action: '',
    resource: '',
    startDate: '',
    endDate: ''
  });
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'

  const { user, userRole, isSuperAdmin } = useAuth();
  const { showToast } = useToast();

  // Check if user has admin privileges
  const isAdmin = userRole === 'admin' || userRole === 'super_admin' || isSuperAdmin;

  // Load audit logs
  const loadLogs = async (reset = false) => {
    try {
      setLoading(true);
      
      const filterParams = {
        ...filters,
        offset: reset ? 0 : logs.length // Use offset instead of lastDoc for Supabase
      };

      // Convert date strings to Date objects
      if (filterParams.startDate) {
        filterParams.startDate = new Date(filterParams.startDate);
      }
      if (filterParams.endDate) {
        filterParams.endDate = new Date(filterParams.endDate);
      }

      const result = await getAuditLogs(filterParams);
      
      // Handle both success and error cases from Supabase service
      if (result.success) {
        if (reset) {
          setLogs(result.data.logs || []);
        } else {
          setLogs(prev => [...prev, ...(result.data.logs || [])]);
        }
        setHasMore(result.data.hasMore || false);
      } else {
        console.error('Failed to load logs:', result.error);
        showToast('Failed to load activity logs: ' + result.error, 'error');
        setLogs([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      showToast('Failed to load activity logs: ' + error.message, 'error');
      setLogs([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStats = async () => {
    try {
      const result = await getAuditLogStats(filters);
      
      // Handle both success and error cases from Supabase service
      if (result.success) {
        setStats(result.data);
      } else {
        console.error('Failed to load stats:', result.error);
        // Set default empty stats
        setStats({
          total: 0,
          byAction: {},
          byResource: {},
          byRiskLevel: {},
          byAdmin: {},
          recentActivity: []
        });
        showToast('Failed to load statistics: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Failed to load audit stats:', error);
      // Set default empty stats
      setStats({
        total: 0,
        byAction: {},
        byResource: {},
        byRiskLevel: {},
        byAdmin: {},
        recentActivity: []
      });
      showToast('Failed to load statistics: ' + error.message, 'error');
    }
  };

  // Export logs
  const handleExport = async () => {
    try {
      setExporting(true);
      const result = await exportAuditLogs(filters);
      
      if (result.success) {
        // Create and download file
        const blob = new Blob([result.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast('Audit logs exported successfully', 'success');
      } else {
        showToast('Failed to export logs: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Failed to export logs:', error);
      showToast('Failed to export logs: ' + error.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Apply filters
  const applyFilters = () => {
    setLastDoc(null);
    loadLogs(true);
    loadStats();
    setShowFilters(false); // Hide filters on mobile after applying
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      limit: 50,
      riskLevel: '',
      action: '',
      resource: '',
      startDate: '',
      endDate: ''
    });
    setLastDoc(null);
    loadLogs(true);
    loadStats();
  };

  // Load more logs
  const loadMore = () => {
    if (hasMore && !loading) {
      loadLogs(false);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return {
      full: date.toLocaleString(),
      short: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Get risk level color
  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case RISK_LEVELS.CRITICAL:
        return 'text-red-600 bg-red-100 border-red-200';
      case RISK_LEVELS.HIGH:
        return 'text-orange-600 bg-orange-100 border-orange-200';
      case RISK_LEVELS.MEDIUM:
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case RISK_LEVELS.LOW:
        return 'text-green-600 bg-green-100 border-green-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  // Initial load
  useEffect(() => {
    if (isAdmin && user && !hasInitialized.current) {
      hasInitialized.current = true;
      loadLogs(true);
      loadStats();
    }
  }, [user?.uid, userRole, isSuperAdmin]); // Only depend on stable values

  // Loading state
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="animate-pulse text-center">
          <div className="w-8 h-8 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user information...</p>
        </div>
      </div>
    );
  }

  // Access denied state
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6 max-w-md w-full">
          <div className="text-red-500 text-3xl sm:text-4xl mb-4 text-center">🚫</div>
          <h3 className="text-lg font-medium text-red-800 mb-2 text-center">Access Denied</h3>
          <p className="text-red-600 mb-4 text-center text-sm sm:text-base">
            Admin privileges required to view activity logs.
          </p>
          <div className="text-xs sm:text-sm text-red-500 space-y-1">
            <p><strong>Current role:</strong> {userRole || 'Unknown'}</p>
            <p><strong>Is Super Admin:</strong> {isSuperAdmin ? 'Yes' : 'No'}</p>
            <p><strong>User ID:</strong> {user?.uid || 'Unknown'}</p>
            <p><strong>Email:</strong> {user?.email || 'Unknown'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Admin Activity Logs</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Logged in as: {user?.email} ({userRole}{isSuperAdmin ? ' - Super Admin' : ''})
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {/* View Mode Toggle - Mobile Only */}
              <div className="flex sm:hidden bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                    viewMode === 'cards' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                    viewMode === 'table' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Table
                </button>
              </div>
              
              {/* Filter Toggle - Mobile */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="sm:hidden flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                </svg>
                Filters
              </button>
              
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center justify-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {exporting ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Total Activities</h3>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Critical Actions</h3>
              <p className="text-lg sm:text-2xl font-bold text-red-600">
                {stats.byRiskLevel[RISK_LEVELS.CRITICAL] || 0}
              </p>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">High Risk Actions</h3>
              <p className="text-lg sm:text-2xl font-bold text-orange-600">
                {stats.byRiskLevel[RISK_LEVELS.HIGH] || 0}
              </p>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Active Admins</h3>
              <p className="text-lg sm:text-2xl font-bold text-blue-600">
                {Object.keys(stats.byAdmin).length}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={`bg-white rounded-lg shadow-sm border transition-all duration-300 ${
          showFilters || window.innerWidth >= 640 ? 'block' : 'hidden'
        }`}>
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="sm:hidden text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Risk Level
                </label>
                <select
                  value={filters.riskLevel}
                  onChange={(e) => handleFilterChange('riskLevel', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Levels</option>
                  {Object.values(RISK_LEVELS).map(level => (
                    <option key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action
                </label>
                <select
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Actions</option>
                  {Object.values(AUDIT_ACTIONS).map(action => (
                    <option key={action} value={action}>
                      {action.replace(/_/g, ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resource
                </label>
                <select
                  value={filters.resource}
                  onChange={(e) => handleFilterChange('resource', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Resources</option>
                  <option value="user">User</option>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="class">Class</option>
                  <option value="grade">Grade</option>
                  <option value="report">Report</option>
                  <option value="system">System</option>
                  <option value="news">News</option>
                  <option value="data">Data</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col justify-end">
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={applyFilters}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Apply
                  </button>
                  <button
                    onClick={resetFilters}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Logs */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Level
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => {
                  const timestamp = formatTimestamp(log.createdAt);
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="hidden lg:block">{timestamp.full}</div>
                        <div className="lg:hidden">
                          <div>{timestamp.short}</div>
                          <div className="text-xs text-gray-500">{timestamp.time}</div>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="truncate max-w-32 lg:max-w-none" title={log.adminEmail}>
                          {log.adminEmail}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="truncate max-w-24 lg:max-w-none" title={log.action.replace(/_/g, ' ').toUpperCase()}>
                          {log.action.replace(/_/g, ' ').toUpperCase()}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{log.resource}</div>
                        {log.resourceId && (
                          <div className="text-xs text-gray-500 truncate max-w-20 lg:max-w-none" title={`ID: ${log.resourceId}`}>
                            ID: {log.resourceId}
                          </div>
                        )}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRiskLevelColor(log.riskLevel)}`}>
                          {log.riskLevel?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-gray-900">
                        <div className="truncate max-w-48 lg:max-w-xs xl:max-w-md" title={log.description}>
                          {log.description}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="sm:hidden">
            {logs.map((log) => {
              const timestamp = formatTimestamp(log.createdAt);
              return (
                <div key={log.id} className="border-b border-gray-200 p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {log.action.replace(/_/g, ' ').toUpperCase()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {timestamp.short} at {timestamp.time}
                      </div>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRiskLevelColor(log.riskLevel)}`}>
                      {log.riskLevel?.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Admin:</span>
                      <span className="ml-1 text-gray-900">{log.adminEmail}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Resource:</span>
                      <span className="ml-1 text-gray-900">{log.resource}</span>
                      {log.resourceId && (
                        <span className="ml-1 text-xs text-gray-500">({log.resourceId})</span>
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Description:</span>
                      <span className="ml-1 text-gray-900">{log.description}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 text-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Loading...
                  </div>
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}

          {/* Empty State */}
          {logs.length === 0 && !loading && (
            <div className="px-4 sm:px-6 py-8 sm:py-12 text-center">
              <div className="text-gray-400 text-3xl sm:text-4xl mb-4">📋</div>
              <p className="text-gray-500 text-base sm:text-lg mb-2">No activity logs found</p>
              <p className="text-gray-400 text-sm">
                Activity logs will appear here as admin actions are performed.
              </p>
            </div>
          )}

          {/* Loading State */}
          {loading && logs.length === 0 && (
            <div className="px-4 sm:px-6 py-8 sm:py-12 text-center">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500 text-sm sm:text-base">Loading activity logs...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityLogger;