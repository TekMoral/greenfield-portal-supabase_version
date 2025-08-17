import React, { useState, useEffect } from 'react';
import edgeFunctionsService from '../../services/supabase/edgeFunctions';

const SystemHealthMonitor = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    // Initial health check
    checkSystemHealth();
  }, []);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        checkSystemHealth();
      }, refreshInterval * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  const checkSystemHealth = async () => {
    setLoading(true);
    try {
      const result = await edgeFunctionsService.callFunction('health-check');
      setHealthData(result);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Health check failed:', error);
      setHealthData({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'unhealthy': return 'text-red-600 bg-red-50 border-red-200';
      case 'pass': return 'text-green-600';
      case 'warn': return 'text-yellow-600';
      case 'fail': return 'text-red-600';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return '✅';
      case 'degraded':
      case 'warn':
        return '⚠️';
      case 'unhealthy':
      case 'fail':
        return '❌';
      default:
        return '❓';
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return 'N/A';
    return `${ms}ms`;
  };

  const formatUptime = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">🏥 System Health Monitor</h2>
        
        <div className="flex items-center gap-4">
          {/* Auto Refresh Toggle */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh
            </label>
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="text-sm border rounded px-2 py-1"
              >
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>1m</option>
                <option value={300}>5m</option>
              </select>
            )}
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={checkSystemHealth}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Checking...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <div className="mb-4 text-sm text-gray-600">
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}

      {/* Overall Status */}
      {healthData && (
        <div className={`mb-6 p-4 border rounded-lg ${getStatusColor(healthData.status)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getStatusIcon(healthData.status)}</span>
              <div>
                <h3 className="text-lg font-semibold capitalize">
                  System Status: {healthData.status}
                </h3>
                {healthData.summary && (
                  <p className="text-sm">
                    {healthData.summary.passed}/{healthData.summary.total} checks passed
                    {healthData.summary.warnings > 0 && `, ${healthData.summary.warnings} warnings`}
                    {healthData.summary.failed > 0 && `, ${healthData.summary.failed} failed`}
                  </p>
                )}
              </div>
            </div>
            
            <div className="text-right text-sm">
              <div>Version: {healthData.version || 'N/A'}</div>
              <div>Environment: {healthData.environment || 'Unknown'}</div>
              {healthData.uptime && <div>Uptime: {formatUptime(healthData.uptime)}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {healthData?.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-semibold text-red-800 mb-2">Health Check Error</h4>
          <p className="text-red-700 text-sm">{healthData.error}</p>
        </div>
      )}

      {/* Detailed Checks */}
      {healthData?.checks && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Detailed Health Checks</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(healthData.checks).map(([checkName, check]) => (
              <div key={checkName} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>{getStatusIcon(check.status)}</span>
                    <h4 className="font-medium capitalize">
                      {checkName.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(check.status)}`}>
                    {check.status}
                  </span>
                </div>
                
                <p className={`text-sm mb-2 ${getStatusColor(check.status).split(' ')[0]}`}>
                  {check.message}
                </p>
                
                <div className="text-xs text-gray-600 space-y-1">
                  {check.duration && (
                    <div>Duration: {formatDuration(check.duration)}</div>
                  )}
                  
                  {check.details && (
                    <div className="mt-2">
                      <details className="cursor-pointer">
                        <summary className="font-medium">Details</summary>
                        <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto">
                          {JSON.stringify(check.details, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !healthData && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Running system health check...</p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">Health Monitor Guide</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Healthy:</strong> All systems operational</li>
          <li>• <strong>Degraded:</strong> Some warnings but system functional</li>
          <li>• <strong>Unhealthy:</strong> Critical issues detected</li>
          <li>• <strong>Auto-refresh:</strong> Automatically checks system health at intervals</li>
          <li>• <strong>Details:</strong> Click on details to see technical information</li>
        </ul>
      </div>

      {/* System Information */}
      {healthData && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-2">System Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
            <div>
              <strong>Timestamp:</strong><br />
              {new Date(healthData.timestamp).toLocaleString()}
            </div>
            <div>
              <strong>Environment:</strong><br />
              {healthData.environment || 'Unknown'}
            </div>
            <div>
              <strong>Version:</strong><br />
              {healthData.version || 'N/A'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemHealthMonitor;