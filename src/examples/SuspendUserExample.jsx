import React, { useState } from 'react';
import edgeFunctionsService from '../services/supabase/edgeFunctions';
import toast from 'react-hot-toast';

/**
 * Example component showing how to use the suspend user functionality
 */
const SuspendUserExample = () => {
  const [loading, setLoading] = useState({
    suspend: false,
    reactivate: false,
    updateStatus: false,
    graduate: false
  });

  // Example: Suspend a user
  const handleSuspendUser = async (userId, userType) => {
    setLoading(prev => ({ ...prev, suspend: true }));
    
    try {
      const result = await edgeFunctionsService.suspendUser(
        userId,
        userType,
        'Violation of school policies', // reason
        null, // suspendedBy (will use current user)
        '2024-12-31' // suspendedUntil (optional)
      );

      if (result.success) {
        toast.success(result.message);
        console.log('Suspension result:', result.data);
      } else {
        toast.error(result.error || 'Failed to suspend user');
      }
    } catch (error) {
      console.error('Suspend user error:', error);
      toast.error('Failed to suspend user');
    } finally {
      setLoading(prev => ({ ...prev, suspend: false }));
    }
  };

  // Example: Reactivate a suspended user
  const handleReactivateUser = async (userId, userType) => {
    setLoading(prev => ({ ...prev, reactivate: true }));
    
    try {
      const result = await edgeFunctionsService.reactivateUser(
        userId,
        userType,
        null, // reactivatedBy (will use current user)
        'Appeal approved' // reactivationReason
      );

      if (result.success) {
        toast.success(result.message);
        console.log('Reactivation result:', result.data);
      } else {
        toast.error(result.error || 'Failed to reactivate user');
      }
    } catch (error) {
      console.error('Reactivate user error:', error);
      toast.error('Failed to reactivate user');
    } finally {
      setLoading(prev => ({ ...prev, reactivate: false }));
    }
  };

  // Example: Update user status with metadata
  const handleUpdateUserStatus = async (userId, userType, newStatus) => {
    setLoading(prev => ({ ...prev, updateStatus: true }));
    
    try {
      const result = await edgeFunctionsService.updateUserStatus(
        userId,
        userType,
        newStatus,
        {
          reason: 'Administrative decision',
          notes: 'Status updated via admin panel',
          effectiveDate: new Date().toISOString()
        }
      );

      if (result.success) {
        toast.success(result.message);
        console.log('Status update result:', result.data);
      } else {
        toast.error(result.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Update status error:', error);
      toast.error('Failed to update user status');
    } finally {
      setLoading(prev => ({ ...prev, updateStatus: false }));
    }
  };

  // Example: Graduate a student
  const handleGraduateStudent = async (studentId) => {
    setLoading(prev => ({ ...prev, graduate: true }));
    
    try {
      const result = await edgeFunctionsService.graduateStudent(
        studentId,
        null, // graduatedBy (will use current user)
        new Date().toISOString(), // graduationDate
        'Completed all requirements' // graduationReason
      );

      if (result.success) {
        toast.success(result.message);
        console.log('Graduation result:', result.data);
      } else {
        toast.error(result.error || 'Failed to graduate student');
      }
    } catch (error) {
      console.error('Graduate student error:', error);
      toast.error('Failed to graduate student');
    } finally {
      setLoading(prev => ({ ...prev, graduate: false }));
    }
  };

  // Example: Bulk suspend users
  const handleBulkSuspendUsers = async (userIds, userType) => {
    try {
      const result = await edgeFunctionsService.bulkSuspendUsers(
        userIds,
        userType,
        'Bulk suspension for policy violation',
        null, // suspendedBy (will use current user)
        '2024-12-31' // suspendedUntil
      );

      if (result.success) {
        toast.success(`Successfully suspended ${result.data.successCount} users`);
        console.log('Bulk suspension result:', result.data);
      } else {
        toast.error(result.error || 'Failed to bulk suspend users');
      }
    } catch (error) {
      console.error('Bulk suspend error:', error);
      toast.error('Failed to bulk suspend users');
    }
  };

  // Example: Get user status history
  const handleGetStatusHistory = async (userId, userType) => {
    try {
      const result = await edgeFunctionsService.getUserStatusHistory(userId, userType);

      if (result.success) {
        console.log('User status history:', result.data);
        // Display history in UI
      } else {
        toast.error(result.error || 'Failed to get status history');
      }
    } catch (error) {
      console.error('Get status history error:', error);
      toast.error('Failed to get status history');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">User Status Management Examples</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Suspend User */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Suspend User</h3>
          <button
            onClick={() => handleSuspendUser('user-id-123', 'student')}
            disabled={loading.suspend}
            className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {loading.suspend ? 'Suspending...' : 'Suspend Student'}
          </button>
        </div>

        {/* Reactivate User */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Reactivate User</h3>
          <button
            onClick={() => handleReactivateUser('user-id-123', 'student')}
            disabled={loading.reactivate}
            className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading.reactivate ? 'Reactivating...' : 'Reactivate Student'}
          </button>
        </div>

        {/* Update Status */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Update Status</h3>
          <div className="space-y-2">
            <button
              onClick={() => handleUpdateUserStatus('user-id-123', 'student', 'suspended')}
              disabled={loading.updateStatus}
              className="w-full bg-orange-600 text-white py-2 px-4 rounded hover:bg-orange-700 disabled:opacity-50"
            >
              {loading.updateStatus ? 'Updating...' : 'Set to Suspended'}
            </button>
            <button
              onClick={() => handleUpdateUserStatus('user-id-123', 'student', 'active')}
              disabled={loading.updateStatus}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading.updateStatus ? 'Updating...' : 'Set to Active'}
            </button>
          </div>
        </div>

        {/* Graduate Student */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Graduate Student</h3>
          <button
            onClick={() => handleGraduateStudent('student-id-123')}
            disabled={loading.graduate}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {loading.graduate ? 'Graduating...' : 'Graduate Student'}
          </button>
        </div>

        {/* Bulk Operations */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Bulk Operations</h3>
          <button
            onClick={() => handleBulkSuspendUsers(['user1', 'user2', 'user3'], 'student')}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700"
          >
            Bulk Suspend Students
          </button>
        </div>

        {/* Status History */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Status History</h3>
          <button
            onClick={() => handleGetStatusHistory('user-id-123', 'student')}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700"
          >
            Get Status History
          </button>
        </div>
      </div>

      {/* Usage Examples */}
      <div className="mt-8 bg-gray-100 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Usage Examples</h3>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium">Basic Suspension:</h4>
            <code className="block bg-white p-2 rounded mt-1">
              {`await edgeFunctionsService.suspendUser(userId, 'student', 'Policy violation')`}
            </code>
          </div>
          
          <div>
            <h4 className="font-medium">Temporary Suspension:</h4>
            <code className="block bg-white p-2 rounded mt-1">
              {`await edgeFunctionsService.suspendUser(userId, 'student', 'Temporary', null, '2024-12-31')`}
            </code>
          </div>
          
          <div>
            <h4 className="font-medium">Status Update with Metadata:</h4>
            <code className="block bg-white p-2 rounded mt-1">
              {`await edgeFunctionsService.updateUserStatus(userId, 'student', 'graduated', {
  reason: 'Completed requirements',
  notes: 'Honor roll graduate',
  effectiveDate: '2024-06-15'
})`}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuspendUserExample;