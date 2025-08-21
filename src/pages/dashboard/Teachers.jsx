import React, { useState, useEffect } from 'react';
import { getAllTeachers, createTeacher, deleteTeacher } from '../../services/supabase/migrationWrapper';
import edgeFunctionsService from '../../services/supabase/edgeFunctions';
import TeacherForm from '../../components/forms/TeacherForm';
import TeacherTable from '../../components/teachers/TeacherTable';
import { CreateButton } from '../../components/ui/ActionButtons';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import useAuditLog from '../../hooks/useAuditLog';
import { toast } from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const fetchTeachersQuery = async () => {
    const result = await getAllTeachers();
    if (!result.success) throw new Error(result.error || 'Failed to fetch teachers');
    return result.data || [];
  };
  const { data: teachersData, isLoading: teachersLoading, error: rqError } = useQuery({ queryKey: ['teachers'], queryFn: fetchTeachersQuery });
  useEffect(() => { if (teachersData) setTeachers(teachersData); }, [teachersData]);
  const [operationLoading, setOperationLoading] = useState({ create: false, update: false, suspend: false, delete: false });
  const [editTeacher, setEditTeacher] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, teacherId: null, teacherName: '' });

  const { logTeacherAction, AUDIT_ACTIONS } = useAuditLog();

  // Initial fetch handled by React Query

  const fetchTeachers = async () => {
    await queryClient.invalidateQueries({ queryKey: ['teachers'] });
  };

  const handleAddTeacher = () => {
    // Open the form and disable the create button to prevent multiple clicks
    setShowForm(true);
    setError('');
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditTeacher(null);
    setOperationLoading((prev) => ({ ...prev, create: false, update: false }));
    setError('');
  };

  const handleDelete = (teacherId) => {
    const teacherToDelete = teachers.find((t) => t.id === teacherId);
    setDeleteConfirm({ isOpen: true, teacherId, teacherName: teacherToDelete ? teacherToDelete.name : 'this teacher' });
  };

  const confirmDelete = async () => {
    setError('');
    setOperationLoading((prev) => ({ ...prev, delete: true }));
    const teacherId = deleteConfirm.teacherId;
    const teacherToDelete = teachers.find((t) => t.id === teacherId);
    try {
      await deleteTeacher(teacherId);
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

      setDeleteConfirm({ isOpen: false, teacherId: null, teacherName: '' });
      await fetchTeachers();
      toast.success('Teacher deleted successfully!');
    } catch (err) {
      setError(err.message || 'Failed to delete teacher');
      toast.error(err.message || 'Failed to delete teacher');
    } finally {
      setOperationLoading((prev) => ({ ...prev, delete: false }));
    }
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

  
  if (teachersLoading) return <div className="p-6">Loading...</div>;

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
      {(error || rqError) && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <div className="text-red-600 mr-2">❌</div>
            <div className="text-red-800 font-medium">Error:</div>
            <div className="text-red-700 ml-2">{error || rqError?.message}</div>
          </div>
        </div>
      )}

      {/* Teacher Form */}
      {showForm && (
        <div className="mb-6">
          <TeacherForm 
            mode={editTeacher ? 'edit' : 'add'}
            defaultValues={editTeacher ? {
              name: editTeacher.name,
              email: editTeacher.email,
              phoneNumber: editTeacher.phoneNumber,
              subject: editTeacher.subject,
              qualification: editTeacher.qualification,
              dateHired: editTeacher.dateHired ? editTeacher.dateHired.split('T')[0] : '',
              profileImageUrl: editTeacher.profileImageUrl,
            } : {}}
            onSubmit={async (formData) => {
              if (editTeacher) {
                setOperationLoading((p) => ({ ...p, update: true }));
                try {
                  const updatePayload = {
                    full_name: formData.name,
                    email: formData.email,
                    phone_number: formData.phoneNumber,
                    subject: formData.subject,
                    qualification: formData.qualification,
                    date_hired: formData.dateHired,
                  };
                  if (formData.profileImageUrl) {
                    updatePayload.profile_image = formData.profileImageUrl;
                  }
                  await edgeFunctionsService.updateUser(editTeacher.id, 'teacher', updatePayload);
                  toast.success('Teacher updated successfully');
                  setShowForm(false);
                  setEditTeacher(null);
                  await fetchTeachers();
                } catch (e) {
                  toast.error(e?.userMessage || e?.message || 'Failed to update teacher');
                } finally {
                  setOperationLoading((p) => ({ ...p, update: false }));
                }
              } else {
                await handleSubmit(formData);
              }
            }} 
            onCancel={handleCancelForm} 
            error={error} 
            loading={operationLoading.create || operationLoading.update} 
          />
        </div>
      )}

      {/* Teachers Table */}
      <div className="bg-white rounded-lg shadow">
        <TeacherTable 
          teachers={teachers} 
          onDelete={handleDelete}
          onEdit={(t) => { setEditTeacher(t); setShowForm(true); }}
          onSuspend={async (t) => {
            try {
              setOperationLoading((p) => ({ ...p, suspend: true }));
              if (t.isActive) {
                await edgeFunctionsService.suspendUser(t.id, 'teacher', 'Suspended via admin panel');
                toast.success('Teacher suspended');
              } else {
                await edgeFunctionsService.reactivateUser(t.id, 'teacher');
                toast.success('Teacher reactivated');
              }
              await fetchTeachers();
            } catch (e) {
              toast.error(e?.userMessage || e?.message || 'Operation failed');
            } finally {
              setOperationLoading((p) => ({ ...p, suspend: false }));
            }
          }}
        />
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, teacherId: null, teacherName: '' })}
        onConfirm={() => { if (!operationLoading.delete) confirmDelete(); }}
        title="Delete Teacher"
        message={`Are you sure you want to delete ${deleteConfirm.teacherName}? This action cannot be undone.`}
        confirmText={operationLoading.delete ? 'Deleting...' : 'Delete'}
        loading={operationLoading.delete}
        cancelText="Cancel"
        type="danger"
      />

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
