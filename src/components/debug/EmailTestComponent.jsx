// src/components/debug/EmailTestComponent.jsx
import React, { useState } from 'react';
import emailService from '../../services/emailService';
import toast from 'react-hot-toast';

const EmailTestComponent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResults, setTestResults] = useState(null);

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      const result = await emailService.testConnection(testEmail || undefined);
      setTestResults(result);
      
      if (result.success) {
        toast.success('Email service is working correctly!');
      } else {
        toast.error(`Email test failed: ${result.error}`);
      }
    } catch (error) {
      toast.error(`Test failed: ${error.message}`);
      setTestResults({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestPasswordReset = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    setIsLoading(true);
    try {
      const result = await emailService.sendPasswordResetEmail({
        email: testEmail,
        resetLink: `${window.location.origin}/reset-password?token=TEST_TOKEN&email=${encodeURIComponent(testEmail)}`,
        userName: 'Test User'
      });

      setTestResults(result);
      
      if (result.success) {
        toast.success('Password reset email sent successfully!');
      } else {
        toast.error(`Failed to send password reset: ${result.error}`);
      }
    } catch (error) {
      toast.error(`Test failed: ${error.message}`);
      setTestResults({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestExamResult = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    setIsLoading(true);
    try {
      const result = await emailService.sendExamResultNotification({
        email: testEmail,
        userName: 'Test Parent',
        studentName: 'John Doe',
        examTitle: 'First Term Examination',
        term: 'First Term',
        academicYear: '2024-2025',
        resultsLink: `${window.location.origin}/student/results?exam=test`
      });

      setTestResults(result);
      
      if (result.success) {
        toast.success('Exam result notification sent successfully!');
      } else {
        toast.error(`Failed to send exam result: ${result.error}`);
      }
    } catch (error) {
      toast.error(`Test failed: ${error.message}`);
      setTestResults({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestReportCard = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    setIsLoading(true);
    try {
      const result = await emailService.sendReportCardNotification({
        email: testEmail,
        userName: 'Test Parent',
        studentName: 'Jane Smith',
        term: 'First Term',
        academicYear: '2024-2025',
        reportLink: `${window.location.origin}/reports/download?student=test`,
        reportType: 'Term Report'
      });

      setTestResults(result);
      
      if (result.success) {
        toast.success('Report card notification sent successfully!');
      } else {
        toast.error(`Failed to send report card: ${result.error}`);
      }
    } catch (error) {
      toast.error(`Test failed: ${error.message}`);
      setTestResults({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          📧 Email Service Test
        </h2>
        <p className="text-gray-600">
          Test the Brevo email integration for password resets, exam results, and report cards.
        </p>
      </div>

      {/* Test Email Input */}
      <div className="mb-6">
        <label htmlFor="testEmail" className="block text-sm font-medium text-gray-700 mb-2">
          Test Email Address
        </label>
        <input
          type="email"
          id="testEmail"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter your email to receive test emails"
        />
      </div>

      {/* Test Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <button
          onClick={handleTestConnection}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Testing...' : 'Test Connection'}
        </button>

        <button
          onClick={handleTestPasswordReset}
          disabled={isLoading || !testEmail}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Sending...' : 'Test Password Reset'}
        </button>

        <button
          onClick={handleTestExamResult}
          disabled={isLoading || !testEmail}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Sending...' : 'Test Exam Result'}
        </button>

        <button
          onClick={handleTestReportCard}
          disabled={isLoading || !testEmail}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Sending...' : 'Test Report Card'}
        </button>
      </div>

      {/* Test Results */}
      {testResults && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Test Results</h3>
          <div className={`p-3 rounded-lg ${testResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${testResults.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`font-medium ${testResults.success ? 'text-green-800' : 'text-red-800'}`}>
                {testResults.success ? 'Success' : 'Failed'}
              </span>
            </div>
            
            {testResults.error && (
              <p className="text-red-700 text-sm mt-2">
                Error: {testResults.error}
              </p>
            )}
            
            {testResults.data && (
              <div className="mt-2">
                <p className="text-sm text-gray-600">Response Data:</p>
                <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                  {JSON.stringify(testResults.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">📋 Instructions</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Enter your email address to receive test emails</li>
          <li>• Click "Test Connection" to verify Brevo API connectivity</li>
          <li>• Use other buttons to test specific email templates</li>
          <li>• Check your email inbox (and spam folder) for test emails</li>
          <li>• Ensure BREVO_API_KEY is properly configured in Supabase secrets</li>
        </ul>
      </div>

      {/* Configuration Info */}
      <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">⚙️ Configuration</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>Sender:</strong> admin@greenfieldcollege.name.ng</p>
          <p><strong>Service:</strong> Brevo (formerly Sendinblue)</p>
          <p><strong>Edge Function:</strong> send-email</p>
          <p><strong>Templates:</strong> Password Reset, Exam Results, Report Cards</p>
        </div>
      </div>
    </div>
  );
};

export default EmailTestComponent;