import React, { useState, useEffect } from 'react';
import { getAllTeachers, createTeacher, deleteTeacher } from '../../services/supabase/migrationWrapper';
import TeacherForm from '../../components/forms/TeacherForm';
import TeacherTable from '../../components/teachers/TeacherTable';
import EdgeFunctionTest from '../../components/debug/EdgeFunctionTest';
import DetailedEdgeFunctionTest from '../../components/debug/DetailedEdgeFunctionTest';
import DatabasePermissionsTest from '../../components/debug/DatabasePermissionsTest';
import RLSPolicyVerification from '../../components/debug/RLSPolicyVerification';
import SystemHealthMonitor from '../../components/debug/SystemHealthMonitor';
import CorsSecurityTest from '../../components/debug/CorsSecurityTest';
import ConfigurationTestSimple from '../../components/debug/ConfigurationTestSimple';
import ServiceCleanupTest from '../../components/debug/ServiceCleanupTest';
import DatabasePermissionTest from '../../components/debug/DatabasePermissionTest';
import TeacherCreationTest from '../../components/debug/TeacherCreationTest';
import SimpleTeacherTest from '../../components/debug/SimpleTeacherTest';
import useAuditLog from '../../hooks/useAuditLog';
import { toast } from 'react-hot-toast';

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDebugTools, setShowDebugTools] = useState(false);
  const [error, setError] = useState('');

  const { logTeacherAction, AUDIT_ACTIONS, isAdmin, canLog } = useAuditLog();

  useEffect(() => {
    console.log('Teachers component - audit log status:', { isAdmin, canLog });
    fetchTeachers();
  }, [isAdmin, canLog]);

  const fetchTeachers = async () => {
    try {
      const result = await getAllTeachers();
      if (result.success) {
        setTeachers(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch teachers');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = () => {
    console.log('🔄 Add Teacher button clicked');
    setShowForm(true);
    setError(''); // Clear any previous errors
  };

  const handleCancelForm = () => {
    console.log('🔄 Cancel form clicked');
    setShowForm(false);
    setError('');
  };

  const handleSubmit = async (formData) => {
    setError('');
    try {
      console.log('🔄 Creating teacher with data:', formData);
      const result = await createTeacher(formData);
      console.log('✅ Teacher creation result:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create teacher');
      }

      const newTeacher = result.data;

      // Log teacher creation
      console.log('🔄 Attempting to log teacher creation...', { isAdmin, canLog });
      try {
        const logResult = await logTeacherAction(
          AUDIT_ACTIONS.TEACHER_CREATE,
          newTeacher.uid || newTeacher.id || 'unknown',
          {
            teacherName: formData.name || `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            phone: formData.phoneNumber || formData.phone,
            subject: formData.subject,
            qualification: formData.qualification,
            dateHired: formData.dateHired
          },
          `Created new teacher: ${formData.name || `${formData.firstName} ${formData.lastName}`} (${formData.email})`
        );
        console.log('📝 Teacher creation log result:', logResult);
      } catch (logError) {
        console.error('❌ Failed to log teacher creation:', logError);
      }

      setShowForm(false);
      fetchTeachers();
      toast.success('Teacher created successfully!');
    } catch (err) {
      console.error('❌ Error creating teacher:', err);
      const errorMessage = err.message || 'Failed to create teacher';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (teacherId) => {
    // Get teacher details before deletion for logging
    const teacherToDelete = teachers.find(teacher => teacher.id === teacherId);
    console.log('🔄 Deleting teacher:', teacherToDelete);

    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        await deleteTeacher(teacherId);
        console.log('✅ Teacher deleted successfully');

        // Log teacher deletion
        console.log('🔄 Attempting to log teacher deletion...', { isAdmin, canLog });
        try {
          const logResult = await logTeacherAction(
            AUDIT_ACTIONS.TEACHER_DELETE,
            teacherId,
            {
              teacherName: teacherToDelete ? teacherToDelete.name : 'Unknown Teacher',
              email: teacherToDelete?.email,
              subject: teacherToDelete?.subject,
              qualification: teacherToDelete?.qualification,
              totalTeachersAfterDeletion: teachers.length - 1
            },
            `Deleted teacher: ${teacherToDelete ? teacherToDelete.name : 'Unknown Teacher'} (${teacherToDelete?.email || 'Unknown Email'})`
          );
          console.log('📝 Teacher deletion log result:', logResult);
        } catch (logError) {
          console.error('❌ Failed to log teacher deletion:', logError);
        }

        fetchTeachers();
        toast.success('Teacher deleted successfully!');
      } catch (err) {
        console.error('❌ Error deleting teacher:', err);
        setError(err.message);
        toast.error('Failed to delete teacher');
      }
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Teacher Management</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowDebugTools(!showDebugTools)}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
          >
            {showDebugTools ? 'Hide Debug Tools' : 'Show Debug Tools'}
          </button>
          <button
            onClick={handleAddTeacher}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
            type="button"
          >
            Add Teacher
          </button>
        </div>
      </div>

      {/* Debug Tools (Collapsible) */}
      {showDebugTools && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Debug & Testing Tools</h3>
          <div className="space-y-4">
            <DatabasePermissionTest />
            <TeacherCreationTest />
            <SimpleTeacherTest />
            <ConfigurationTestSimple />
            <ServiceCleanupTest />
            <SystemHealthMonitor />
            <CorsSecurityTest />
            <EdgeFunctionTest />
            <DetailedEdgeFunctionTest />
            <DatabasePermissionsTest />
            <RLSPolicyVerification />
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <div className="text-red-600 mr-2">❌</div>
            <div className="text-red-800 font-medium">Error:</div>
            <div className="text-red-700 ml-2">{error}</div>
          </div>
        </div>
      )}

      {/* Teacher Form */}
      {showForm && (
        <div className="mb-6">
          <TeacherForm
            onSubmit={handleSubmit}
            onCancel={handleCancelForm}
            error={error}
          />
        </div>
      )}

      {/* Teachers Table */}
      <div className="bg-white rounded-lg shadow">
        <TeacherTable teachers={teachers} onDelete={handleDelete} />
      </div>

      {/* Status Information */}
      <div className="mt-6 text-sm text-gray-600">
        <div className="flex justify-between items-center">
          <div>
            Total Teachers: {teachers.length}
          </div>
          <div>
            Last Updated: {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Teachers;
