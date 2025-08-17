import React, { useState } from 'react';
import { 
  serviceAnalysis, 
  securityAudit, 
  performanceAnalysis, 
  migrationStatus,
  cleanupUtils 
} from '../../utils/serviceCleanup';

const ServiceCleanupTest = () => {
  const [cleanupReport, setCleanupReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const runCleanupAnalysis = async () => {
    setLoading(true);
    try {
      const report = cleanupUtils.generateReport();
      setCleanupReport(report);
    } catch (error) {
      console.error('Cleanup analysis error:', error);
      setCleanupReport({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'pass':
      case 'high': return 'text-green-600 bg-green-50 border-green-200';
      case 'in-progress':
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'pending':
      case 'low':
      case 'fail': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'analysis', label: 'Service Analysis' },
    { id: 'security', label: 'Security Audit' },
    { id: 'performance', label: 'Performance' },
    { id: 'cleanup', label: 'Cleanup Plan' }
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">🧹 Service Cleanup & Hygiene Analysis</h2>

      {/* Action Button */}
      <div className="mb-6 text-center">
        <button
          onClick={runCleanupAnalysis}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Analyzing Services...' : 'Run Service Cleanup Analysis'}
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing service structure and security...</p>
        </div>
      )}

      {/* Results */}
      {cleanupReport && !loading && (
        <div>
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Migration Progress */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Migration Progress</h3>
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {cleanupReport.migration?.percentage || 0}%
                  </div>
                  <div className="text-sm text-blue-600">
                    Status: {cleanupReport.migration?.status || 'Unknown'}
                  </div>
                </div>

                {/* Security Score */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">Security Score</h3>
                  <div className={`text-3xl font-bold mb-1 ${getScoreColor(cleanupReport.security?.score || 0)}`}>
                    {cleanupReport.security?.score || 0}/100
                  </div>
                  <div className="text-sm text-green-600">
                    {cleanupReport.security?.vulnerabilities?.length || 0} vulnerabilities
                  </div>
                </div>

                {/* Bundle Size */}
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h3 className="font-semibold text-purple-800 mb-2">Bundle Impact</h3>
                  <div className="text-lg font-bold text-purple-600 mb-1">
                    {cleanupReport.performance?.bundleSize?.afterCleanup || '~350KB'}
                  </div>
                  <div className="text-sm text-purple-600">
                    After cleanup
                  </div>
                </div>
              </div>

              {/* Quick Summary */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">Quick Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Services to Remove:</strong> {cleanupReport.analysis?.unused?.length || 0}
                  </div>
                  <div>
                    <strong>Security Issues:</strong> {cleanupReport.security?.vulnerabilities?.length || 0}
                  </div>
                  <div>
                    <strong>Duplicates Found:</strong> {cleanupReport.analysis?.duplicates?.length || 0}
                  </div>
                  <div>
                    <strong>Recommendations:</strong> {cleanupReport.analysis?.recommendations?.length || 0}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Service Analysis Tab */}
          {activeTab === 'analysis' && cleanupReport.analysis && (
            <div className="space-y-6">
              {/* Unused Services */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-semibold text-yellow-800 mb-3">Unused Services</h3>
                {cleanupReport.analysis.unused.length > 0 ? (
                  <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                    {cleanupReport.analysis.unused.map((service, index) => (
                      <li key={index}>{service}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-yellow-700">No unused services found.</p>
                )}
              </div>

              {/* Recommendations */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-3">Recommendations</h3>
                <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                  {cleanupReport.analysis.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && cleanupReport.security && (
            <div className="space-y-6">
              {/* Security Score */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">Security Assessment</h3>
                <div className="flex items-center gap-4">
                  <div className={`text-4xl font-bold ${getScoreColor(cleanupReport.security.score)}`}>
                    {cleanupReport.security.score}/100
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>Vulnerabilities: {cleanupReport.security.vulnerabilities.length}</div>
                    <div>Recommendations: {cleanupReport.security.recommendations.length}</div>
                  </div>
                </div>
              </div>

              {/* Vulnerabilities */}
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-3">Security Vulnerabilities</h3>
                <div className="space-y-3">
                  {cleanupReport.security.vulnerabilities.map((vuln, index) => (
                    <div key={index} className="p-3 bg-white border border-red-200 rounded">
                      <div className="font-medium text-red-800">{vuln.description}</div>
                      <div className="text-sm text-red-600 mt-1">
                        Severity: {vuln.severity} | Recommendation: {vuln.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Recommendations */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-3">Security Recommendations</h3>
                <ul className="list-disc list-inside text-sm text-green-700 space-y-1">
                  {cleanupReport.security.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && cleanupReport.performance && (
            <div className="space-y-6">
              {/* Bundle Size Analysis */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-3">Bundle Size Impact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {cleanupReport.performance.bundleSize.estimated}
                    </div>
                    <div className="text-sm text-purple-600">Current (Est.)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {cleanupReport.performance.bundleSize.afterCleanup}
                    </div>
                    <div className="text-sm text-green-600">After Cleanup</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">~30%</div>
                    <div className="text-sm text-blue-600">Reduction</div>
                  </div>
                </div>
              </div>

              {/* Performance Recommendations */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-3">Performance Recommendations</h3>
                <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                  {cleanupReport.performance.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Cleanup Plan Tab */}
          {activeTab === 'cleanup' && cleanupReport.cleanupPlan && (
            <div className="space-y-6">
              {Object.entries(cleanupReport.cleanupPlan).map(([phase, details]) => (
                <div key={phase} className={`p-4 border rounded-lg ${getStatusColor(details.risk)}`}>
                  <h3 className="font-semibold mb-3">{details.title}</h3>
                  <div className="mb-3">
                    <span className="text-sm font-medium">Risk Level: </span>
                    <span className={`text-sm px-2 py-1 rounded ${getStatusColor(details.risk)}`}>
                      {details.risk.toUpperCase()}
                    </span>
                  </div>
                  <div className="mb-3">
                    <span className="text-sm font-medium">Impact: </span>
                    <span className="text-sm">{details.impact}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Actions:</span>
                    <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                      {details.actions.map((action, index) => (
                        <li key={index}>{action}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <div className="mt-6 text-xs text-gray-500 text-center">
            Analysis completed: {new Date(cleanupReport.timestamp).toLocaleString()}
          </div>
        </div>
      )}

      {/* Error Display */}
      {cleanupReport && cleanupReport.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-semibold text-red-800 mb-2">Analysis Error</h4>
          <p className="text-red-700 text-sm">{cleanupReport.error}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">Service Cleanup Analysis</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Overview:</strong> High-level summary of cleanup status</li>
          <li>• <strong>Service Analysis:</strong> Identifies unused and duplicate services</li>
          <li>• <strong>Security Audit:</strong> Checks for security vulnerabilities</li>
          <li>• <strong>Performance:</strong> Analyzes bundle size and performance impact</li>
          <li>• <strong>Cleanup Plan:</strong> Phased approach to service cleanup</li>
        </ul>
      </div>
    </div>
  );
};

export default ServiceCleanupTest;