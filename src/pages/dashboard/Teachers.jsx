import React, { useState, useEffect } from 'react';
import { getAllTeachers, createTeacher, deleteTeacher } from '../../services/supabase/migrationWrapper';
import TeacherForm from '../../components/forms/TeacherForm';
import TeacherTable from '../../components/teachers/TeacherTable';
import { CreateButton } from '../../components/ui/ActionButtons';
import useAuditLog from '../../hooks/useAuditLog';
import { toast } from 'react-hot-toast';

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [operationLoading, setOperationLoading] = useState({ create: false });

  const { logTeacherAction, AUDIT_ACTIONS } = useAuditLog();

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getAllTeachers();
      if (result.success) {
        setTeachers(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch teachers');
      }
    } catch (err) {
      setError(err.message || 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = () => {
    // Open the form and disable the create button to prevent multiple clicks
    setShowForm(true);
    setError('');
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setOperationLoading((prev) => ({ ...prev, create: false }));
    setError('');
  };

  const handleSubmit = async (formData) => {
    setError('');
    setOperationLoading((prev) => ({ ...prev, create: true }));
    try {
      const result = await createTeacher(formData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create teacher');
      }

      const newTeacher = result.data;

      // Best-effort audit log (ignore failures silently)
      try {
        await logTeacherAction(
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
      } catch (_) {}

      setShowForm(false);
      await fetchTeachers();
      toast.success('Teacher created successfully!');
    } catch (err) {
      const errorMessage = err.message || 'Failed to create teacher';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setOperationLoading((prev) => ({ ...prev, create: false }));
    }
  };

  const handleDelete = async (teacherId) => {
    const teacherToDelete = teachers.find((t) => t.id === teacherId);
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        await deleteTeacher(teacherId);

        // Best-effort audit log (ignore failures silently)
        try {
          await logTeacherAction(
            AUDIT_ACTIONS.TEACHER_DELETE,
            teacherId,
            {
              teacherName: teacherToDelete ? teacherToDelete.name : 'Unknown Teacher',
              email: teacherToDelete?.email,
              subject: teacherToDelete?.subject,
              qualification: teacherToDelete?.qualification,
              totalTeachersAfterDeletion: Math.max(teachers.length - 1, 0)
            },
            `Deleted teacher: ${teacherToDelete ? teacherToDelete.name : 'Unknown Teacher'} (${teacherToDelete?.email || 'Unknown Email'})`
          );
        } catch (_) {}

        await fetchTeachers();
        toast.success('Teacher deleted successfully!');
      } catch (err) {
        setError(err.message || 'Failed to delete teacher');
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
          <CreateButton
            onClick={handleAddTeacher}
            loading={operationLoading.create}
            disabled={showForm || operationLoading.create}
          >
            Add Teacher
          </CreateButton>
        </div>
      </div>

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
          <TeacherForm onSubmit={handleSubmit} onCancel={handleCancelForm} error={error} loading={operationLoading.create} />
        </div>
      )}

      {/* Teachers Table */}
      <div className="bg-white rounded-lg shadow">
        <TeacherTable teachers={teachers} onDelete={handleDelete} />
      </div>

      {/* Status Information */}
      <div className="mt-6 text-sm text-gray-600">
        <div className="flex justify-between items-center">
          <div> Total Teachers: {teachers.length} </div>
          <div> Last Updated: {new Date().toLocaleString()} </div>
        </div>
      </div>
    </div>
  );
};

export default Teachers;
