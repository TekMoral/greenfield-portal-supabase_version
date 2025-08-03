import React, { useState, useEffect } from 'react';
import { getAllTeachers, createTeacher, deleteTeacher } from '../../services/supabase/teacherService';
import TeacherForm from '../../components/forms/TeacherForm';
import TeacherTable from '../../components/teachers/TeacherTable';
import useAuditLog from '../../hooks/useAuditLog';
import { toast } from 'react-hot-toast';

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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

  const handleSubmit = async (formData) => {
    setError('');
    try {
      console.log('🔄 Creating teacher with data:', formData);
      const newTeacher = await createTeacher(formData);
      console.log('✅ Teacher created:', newTeacher);
      
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
      setError(err.message);
      toast.error('Failed to create teacher');
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Teacher Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Add Teacher
        </button>
      </div>

      {/* Debug info */}
      <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
        Debug: isAdmin={isAdmin ? 'true' : 'false'}, canLog={canLog ? 'true' : 'false'}
      </div>

      {showForm && (
        <TeacherForm
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
          error={error}
        />
      )}

      <TeacherTable teachers={teachers} onDelete={handleDelete} />
    </div>
  );
};

export default Teachers;