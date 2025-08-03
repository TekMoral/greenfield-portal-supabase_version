import React from 'react';
import LogCleanup from '../../components/admin/LogCleanup';

const LogCleanupPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Audit Log Management</h1>
          <p className="text-gray-600">
            Manage audit log retention, cleanup old entries, and maintain system performance
          </p>
        </div>
        
        <LogCleanup />
      </div>
    </div>
  );
};

export default LogCleanupPage;