import React, { useState, useEffect, useMemo } from 'react';
import { getAllTeachers, createTeacher, deleteTeacher } from '../../services/supabase/migrationWrapper';
import edgeFunctionsService from '../../services/supabase/edgeFunctions';
import { uploadService } from '../../services/supabase/uploadService';
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
  
  // Search and filtering state
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchTeachersQuery = async () => {
    const result = await getAllTeachers();
    if (!result.success) throw new Error(result.error || 'Failed to fetch teachers');
    return result.data || [];
  };
  
  const { data: teachersData, isLoading: teachersLoading, error: rqError } = useQuery({ 
    queryKey: ['teachers'], 
    queryFn: fetchTeachersQuery 
  });
  
  useEffect(() => { 
    if (teachersData) setTeachers(teachersData); 
  }, [teachersData]);

    const [editTeacher, setEditTeacher] = useState(null);
  const formRef = React.useRef(null);
  // When form opens or switching to edit, scroll to the form, accounting for fixed header
  useEffect(() => {
    if (showForm) {
      const scrollToForm = () => {
        try {
          const el = formRef.current;
          if (el) {
            const rect = el.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
            const cssVar = getComputedStyle(document.documentElement).getPropertyValue('--appbar-height') || '64px';
            const headerH = parseInt(String(cssVar).replace('px','').trim()) || 64;
            const target = rect.top + scrollTop - headerH - 12; // small margin
            window.scrollTo({ top: Math.max(target, 0), behavior: 'smooth' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } catch (_) {}
      };
      requestAnimationFrame(() => setTimeout(scrollToForm, 0));
    }
  }, [showForm, editTeacher]);

  const [operationLoading, setOperationLoading] = useState({ 
    create: false, 
    update: false, 
    suspend: false, 
    delete: false,
    reactivate: false
  });
  const [rowLoading, setRowLoading] = useState({ suspend: {}, reactivate: {} });
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, teacherId: null, teacherName: '' });

  const { logTeacherAction, AUDIT_ACTIONS } = useAuditLog();

  // Filter and sort teachers
  const filteredAndSortedTeachers = useMemo(() => {
    let filtered = teachers.filter((teacher) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        teacher?.name?.toLowerCase().includes(searchLower) ||
        teacher?.email?.toLowerCase().includes(searchLower) ||
        teacher?.subject?.toLowerCase().includes(searchLower) ||
        teacher?.qualification?.toLowerCase().includes(searchLower) ||
        teacher?.phoneNumber?.toLowerCase().includes(searchLower)
      );
    });

    // Sort teachers
    filtered.sort((a, b) => {
      let aValue = "";
      let bValue = "";

      switch (sortBy) {
        case "name":
          aValue = a?.name || "";
          bValue = b?.name || "";
          break;
        case "email":
          aValue = a?.email || "";
          bValue = b?.email || "";
          break;
        case "subject":
          aValue = a?.subject || "";
          bValue = b?.subject || "";
          break;
        case "dateHired":
          aValue = a?.dateHired || "";
          bValue = b?.dateHired || "";
          break;
        default:
          aValue = a?.name || "";
          bValue = b?.name || "";
      }

      if (sortOrder === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

    return filtered;
  }, [teachers, searchTerm, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedTeachers.length / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage;
  const endItem = Math.min(startItem + itemsPerPage, filteredAndSortedTeachers.length);
  const paginatedTeachers = filteredAndSortedTeachers.slice(startItem, endItem);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortOrder, itemsPerPage]);

  const fetchTeachers = async () => {
    await queryClient.invalidateQueries({ queryKey: ['teachers'] });
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleAddTeacher = () => {
    setShowForm(true);
    setError('');
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditTeacher(null);
    setOperationLoading((prev) => ({ ...prev, create: false, update: false }));
    setError('');
  };

  const handleDelete = (teacher) => {
    setDeleteConfirm({ 
      isOpen: true, 
      teacherId: teacher.id, 
      teacherName: teacher.name || 'this teacher' 
    });
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

  const handleSuspend = async (teacher) => {
    const id = teacher.id;
    try {
      setRowLoading(prev => ({ ...prev, suspend: { ...prev.suspend, [id]: true } }));
      if (teacher.isActive) {
        await edgeFunctionsService.suspendUser(id, 'teacher', 'Suspended via admin panel');
        toast.success('Teacher suspended');
      } else {
        await edgeFunctionsService.reactivateUser(id, 'teacher');
        toast.success('Teacher reactivated');
      }
      await fetchTeachers();
    } catch (e) {
      toast.error(e?.userMessage || e?.message || 'Operation failed');
    } finally {
      setRowLoading(prev => ({ ...prev, suspend: { ...prev.suspend, [id]: false } }));
    }
  };

  const handleReactivate = async (teacher) => {
    const id = teacher.id;
    try {
      setRowLoading(prev => ({ ...prev, reactivate: { ...prev.reactivate, [id]: true } }));
      await edgeFunctionsService.reactivateUser(id, 'teacher');
      toast.success('Teacher reactivated');
      await fetchTeachers();
    } catch (e) {
      toast.error(e?.userMessage || e?.message || 'Failed to reactivate teacher');
    } finally {
      setRowLoading(prev => ({ ...prev, reactivate: { ...prev.reactivate, [id]: false } }));
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

      // If a profile image was provided, upload it and set profile_image via Edge Function
      if (formData.profileImage && newTeacher?.id) {
        try {
          const res = await uploadService.uploadTeacherImage(formData.profileImage, newTeacher.id);
          if (!(res?.success)) {
            console.warn('Teacher image upload failed on create:', res?.error);
          }
        } catch (imgErr) {
          console.warn('Teacher image upload exception on create:', imgErr);
        }
      }

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

  const handleEdit = (teacher) => {
    setEditTeacher(teacher);
    setShowForm(true);
    // Defer scroll until after the form mounts
    setTimeout(() => {
      try {
        const el = formRef.current;
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Adjust for fixed header after the smooth scroll starts
          setTimeout(() => {
            const cssVar = getComputedStyle(document.documentElement).getPropertyValue('--appbar-height') || '64px';
            const headerH = parseInt(String(cssVar).replace('px','').trim()) || 64;
            const y = window.pageYOffset || document.documentElement.scrollTop || 0;
            window.scrollTo({ top: Math.max(y - headerH - 12, 0), behavior: 'auto' });
          }, 200);
        }
      } catch (_) {}
    }, 0);
  };

  const handleEditSubmit = async (formData) => {
    setOperationLoading((p) => ({ ...p, update: true }));
    try {
      // Upload a newly selected image file first to get a fresh URL
      let newImageUrl = null;
      if (formData.profileImage && typeof formData.profileImage !== 'string') {
        try {
          const res = await uploadService.uploadTeacherImage(formData.profileImage, editTeacher.id);
          if (res?.success && res.data?.url) {
            newImageUrl = res.data.url;
          } else if (res?.error) {
            console.warn('Teacher image upload failed:', res.error);
          }
        } catch (imgErr) {
          console.warn('Teacher image upload exception:', imgErr);
        }
      }

      const updatePayload = {
        full_name: formData.name,
        email: formData.email,
        phone_number: formData.phoneNumber,
        subject: formData.subject,
        qualification: formData.qualification,
        date_hired: formData.dateHired,
      };

      // Prefer the newly uploaded URL; else use existing profileImageUrl if present
      if (newImageUrl) {
        updatePayload.profile_image = newImageUrl;
      } else if (formData.profileImageUrl) {
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
  };

  if (teachersLoading) {
    return (
      <div className="px-0 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-0 sm:px-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Teacher Management</h1>
          <p className="text-gray-600 mt-1">Manage your school's teaching staff</p>
        </div>
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
        <div className="mx-0 sm:mx-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <div className="text-red-600 mr-2">❌</div>
            <div className="text-red-800 font-medium">Error:</div>
            <div className="text-red-700 ml-2">{error || rqError?.message}</div>
          </div>
        </div>
      )}

      {/* Teacher Form */}
      {showForm && (
        <div ref={formRef} className="mx-0 sm:mx-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-0 py-6 sm:p-6">
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
              onSubmit={editTeacher ? handleEditSubmit : handleSubmit}
              onCancel={handleCancelForm} 
              error={error} 
              loading={operationLoading.create || operationLoading.update} 
            />
          </div>
        </div>
      )}

      {/* Teachers Table */}
      <TeacherTable 
        teachers={paginatedTeachers}
        allTeachers={teachers}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSuspend={handleSuspend}
        onReactivate={handleReactivate}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        onPageChange={handlePageChange}
        operationLoading={operationLoading}
        rowLoading={rowLoading}
        startItem={startItem}
        endItem={endItem}
        totalItems={filteredAndSortedTeachers.length}
      />

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
    </div>
  );
};

export default Teachers;