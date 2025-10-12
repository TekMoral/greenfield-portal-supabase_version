import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStudentsInClass, getClasses } from '../../services/supabase/classService';
import StudentTable from '../../components/students/StudentTable';
import StudentForm from '../../components/forms/StudentForm';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import edgeFunctionsService from '../../services/supabase/edgeFunctions';

// Generate a stable slug for class matching (mirrors logic used when navigating)
const generateSlug = (name, level, category = null) => {
  const baseName = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();

  const levelSlug = String(level || '').toUpperCase();
  const categorySlug = category ? String(category).toLowerCase() : '';

  return categorySlug
    ? `${baseName}-${levelSlug}-${categorySlug}`
    : `${baseName}-${levelSlug}`;
};

const ClassStudents = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [classInfo, setClassInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit/Delete state
  const [formOpen, setFormOpen] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [operationLoading, setOperationLoading] = useState({ update: false, delete: false });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, studentId: null, studentName: '' });



  const fetchClassStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const classesRes = await getClasses();
      if (!classesRes?.success) {
        setError(classesRes?.error || 'Failed to load classes');
        return;
      }
      const classes = Array.isArray(classesRes.data) ? classesRes.data : [];

      const currentClass =
        classes.find((cls) => {
          const clsSlug = cls.slug || generateSlug(cls.name, cls.level, cls.category);
          return clsSlug === slug;
        }) ||
        classes.find((cls) => String(cls.id) === String(slug));

      if (!currentClass) {
        setError('Class not found');
        return;
      }

      const studentsRes = await getStudentsInClass(currentClass.id);
      if (!studentsRes?.success) {
        setError(studentsRes?.error || 'Failed to load students');
        return;
      }
      const rows = Array.isArray(studentsRes.data) ? studentsRes.data : [];
      const enriched = rows.map((s) => ({
        ...s,
        classes: {
          id: currentClass.id,
          name: currentClass.name,
          level: currentClass.level,
          category: currentClass.category,
        },
      }));
      setClassInfo(currentClass);
      setStudents(enriched);
    } catch (err) {
      setError('Failed to load class students');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  // Handlers: Edit/Delete
  const handleEditClick = useCallback((student) => {
    const mapped = {
      first_name: student.full_name ? student.full_name.split(' ')[0] : '',
      surname: student.full_name ? student.full_name.split(' ').slice(1).join(' ') : '',
      admission_number: student.admission_number || '',
      class_id: student.class_id || classInfo?.id || '',
      gender: student.gender || '',
      date_of_birth: student.date_of_birth || '',
      email: student.email || '',
      contact: student.phone_number || student.guardian_phone || student.contact || '',
      guardian_name: student.guardian_name || '',
      profileImageUrl: student.profile_image || null,
      id: student.id,
    };
    setEditStudent(mapped);
    setImagePreview(student.profile_image || null);
    setFormOpen(true);
  }, [classInfo]);

  const handleFormCancel = useCallback(() => {
    setFormOpen(false);
    setEditStudent(null);
    setImagePreview(null);
  }, []);

  const handleFormSubmit = useCallback(async (formData) => {
    if (!editStudent?.id) return;
    setOperationLoading((s) => ({ ...s, update: true }));
    const loadingToast = toast.loading(`Updating ${formData.first_name} ${formData.surname}...`);
    try {
      const updateData = {
        full_name: `${formData.first_name} ${formData.surname}`.trim(),
        email: formData.email,
        phone_number: formData.contact,
        admission_number: formData.admission_number,
        class_id: formData.class_id || classInfo?.id || null,
        guardian_name: formData.guardian_name,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        profile_image: formData.profileImageUrl || editStudent.profileImageUrl || null,
      };

      const result = await edgeFunctionsService.updateUser(editStudent.id, 'student', updateData);
      if (result?.success) {
        // Update local list
        setStudents((prev) => prev.map((s) => (s.id === editStudent.id ? { ...s, ...updateData } : s)));
        toast.success('Student updated successfully');
        setFormOpen(false);
        setEditStudent(null);
        setImagePreview(null);
      } else {
        throw new Error(result?.error || 'Failed to update student');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to update student');
      console.error('Update student error:', err);
    } finally {
      toast.dismiss(loadingToast);
      setOperationLoading((s) => ({ ...s, update: false }));
    }
  }, [editStudent, classInfo]);

  const handleDeleteClick = useCallback((student) => {
    const studentId = student?.id;
    const name = student?.full_name || student?.fullName || 'this student';
    if (!studentId) {
      toast.error('No valid student ID');
      return;
    }
    setDeleteConfirm({ isOpen: true, studentId, studentName: name });
  }, []);

  const cancelDelete = useCallback(() => {
    setDeleteConfirm({ isOpen: false, studentId: null, studentName: '' });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirm.studentId) return;
    setOperationLoading((s) => ({ ...s, delete: true }));
    const loadingToast = toast.loading(`Deleting ${deleteConfirm.studentName}...`);
    try {
      const result = await edgeFunctionsService.deleteStudent(deleteConfirm.studentId);
      if (result && result.success !== false) {
        setStudents((prev) => prev.filter((s) => s.id !== deleteConfirm.studentId));
        toast.success(result?.message || `${deleteConfirm.studentName} deleted successfully`);
        setDeleteConfirm({ isOpen: false, studentId: null, studentName: '' });
      } else {
        throw new Error(result?.error || 'Failed to delete');
      }
    } catch (err) {
      console.error('Delete student error:', err);
      const msg = err?.userMessage || err?.responseJson?.error || err?.message || 'Failed to delete student';
      toast.error(msg);
      setDeleteConfirm({ isOpen: false, studentId: null, studentName: '' });
    } finally {
      toast.dismiss(loadingToast);
      setOperationLoading((s) => ({ ...s, delete: false }));
    }
  }, [deleteConfirm]);

   useEffect(() => {
    fetchClassStudents();
  }, [fetchClassStudents]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading students...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="px-0 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => navigate('/dashboard/classes')}
            className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
          >
            ← Back to Classes
          </button>
          <h1 className="text-2xl font-bold">
            {classInfo?.name} Students
          </h1>
          <p className="text-gray-600">
            {classInfo?.level} {classInfo?.category && `- ${classInfo.category}`} | {students.length} students
          </p>
        </div>
      </div>

      <StudentTable
        students={students}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        operationLoading={operationLoading}
      />

      {formOpen && (
        <StudentForm
          mode={editStudent ? 'edit' : 'add'}
          defaultValues={editStudent}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          imagePreview={imagePreview}
        />
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Student"
        message={`Are you sure you want to delete ${deleteConfirm.studentName}? This action cannot be undone.`}
        confirmText={operationLoading.delete ? 'Deleting...' : 'Delete'}
        loading={operationLoading.delete}
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default ClassStudents;
