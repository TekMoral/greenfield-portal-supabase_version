import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getAllClasses } from "../../services/supabase/classService";
import { createClass, updateClass, deleteClass } from "../../services/supabase/classAdminService";
import { getStudentsByClass } from "../../services/supabase/studentService";
import { supabase } from "../../lib/supabaseClient";
import { callFunction } from "../../services/supabase/edgeFunctions";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import useAuditLog from "../../hooks/useAuditLog";
import { SaveButton, CancelButton, DeleteButton, EditButton, CreateButton } from "../../components/ui/ActionButtons";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import ClassSubjectManager from "../../components/ClassSubjectManager";
import { formatClassName, sortClasses } from "../../utils/classNameFormatter";

const LEVELS = ["Junior", "Senior"];
const CATEGORIES = ["Science", "Art", "Commercial"];

// Utility function to generate slug from class name
const generateSlug = (name, level, category = null) => {
  const baseName = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .trim();

  const levelSlug = level.toUpperCase();
  const categorySlug = category ? category.toLowerCase() : "";

  return categorySlug
    ? `${baseName}-${levelSlug}-${categorySlug}`
    : `${baseName}-${levelSlug}`;
};

const getFriendlyError = (err) => {
  const t = String(err || '').toLowerCase();
  if (t.includes('already exists')) return 'A class with the same name, level, and category already exists.';
  if (t.includes('not authenticated') || t.includes('invalid user session')) return 'You are not authenticated. Please sign in again.';
  if (t.includes('only super_admin')) return 'Only super admins can perform this action.';
  if (t.includes('class not found')) return 'Class not found.';
  if (t.includes('capacity must be')) return 'Capacity must be a non-negative number.';
  if (t.includes('category is required')) return 'Category is required for Senior level classes.';
  return err || 'An unexpected error occurred';
};

export default function Classes() {
  // Using react-hot-toast for notifications
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const { logClassAction, AUDIT_ACTIONS } = useAuditLog();

  const [classes, setClasses] = useState([]);
  // Local loading for legacy fetch function is no longer used for initial load
  const [actionLoading, setActionLoading] = useState({ saving: false, deletingId: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, classId: null, className: "" });

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("add"); // 'add' or 'edit'
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    level: "",
    category: null,
    classTeacherId: "",
    slug: "",
    subjecte: [],
  });

  // Form validation state
  const [formErrors, setFormErrors] = useState({});

  // Subject management state
  const [subjectManagerOpen, setSubjectManagerOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const queryClient = useQueryClient();

  const fetchAdminClassesQuery = async () => {
    const result = await getAllClasses();
    let data = [];
    if (Array.isArray(result)) {
      data = result;
    } else if (result?.success) {
      data = result.data || [];
    } else {
      throw new Error(result?.error || 'Failed to fetch classes');
    }

    const classesWithCount = await Promise.all(
      data.map(async (cls) => {
        try {
          const studentsResult = await getStudentsByClass(cls.id);
          const studentCount = studentsResult.success ? (studentsResult.data || []).length : 0;
          return { ...cls, studentCount };
        } catch (error) {
          return { ...cls, studentCount: 0 };
        }
      })
    );

    return sortClasses(classesWithCount);
  };

  const { data: classesQueryData, isLoading: classesLoading, error: classesError } = useQuery({ queryKey: ['classes', 'withCounts'], queryFn: fetchAdminClassesQuery });

  useEffect(() => {
    if (classesQueryData) setClasses(classesQueryData);
  }, [classesQueryData]);

  const fetchClassesRQ = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['classes', 'withCounts'] });
  }, [queryClient]);

  const filteredClasses = useMemo(() => {
    let arr = Array.isArray(classes) ? [...classes] : [];
    const term = search.trim().toLowerCase();
    if (term) {
      arr = arr.filter((c) =>
        c.name?.toLowerCase().includes(term) ||
        c.slug?.toLowerCase().includes(term) ||
        c.level?.toLowerCase().includes(term) ||
        c.category?.toLowerCase().includes(term)
      );
    }
    if (levelFilter !== 'all') {
      arr = arr.filter((c) => c.level === levelFilter);
    }
    if (categoryFilter !== 'all') {
      arr = arr.filter((c) => (c.category || '') === categoryFilter);
    }
    return arr;
  }, [classes, search, levelFilter, categoryFilter]);

  // Legacy fetch function retained only for reference; React Query handles actual loads

  const navigateToClassStudents = (classItem) => {
    const slug =
      classItem.slug ||
      generateSlug(classItem.name, classItem.level, classItem.category);
    navigate(`/dashboard/classes/${slug}/students`);
  };

  const openSubjectManager = (classItem) => {
    setSelectedClass(classItem);
    setSubjectManagerOpen(true);
  };

  const closeSubjectManager = () => {
    setSubjectManagerOpen(false);
    setSelectedClass(null);
  };

  const handleSubjectsUpdate = async (subjects) => {
    try {
      console.log('🔄 Updating class subjects:', subjects);
      console.log('🔄 Selected class:', selectedClass);

      // Import the teacher service to create assignments
      const { assignSubjectToTeacher } = await import('../../services/supabase/teacherService');
      const { getSubjects } = await import('../../services/supabase/subjectService');

      // Get all subjects to map names to IDs
      const allSubjects = await getSubjects();
      console.log('📚 All subjects:', allSubjects);

      // First, deactivate existing assignments for this class
      // (We'll implement a proper cleanup later, for now just create new ones)
      
      // Create teacher_assignments records for each subject-teacher pair using Edge Function
      const assignmentPromises = subjects.map(async (subjectAssignment) => {
        try {
          // Find subject ID by name
          const subjectRecord = allSubjects.find(s => s.name === subjectAssignment.subjectName);
          if (!subjectRecord) {
            console.error(`❌ Subject not found: ${subjectAssignment.subjectName}`);
            return { success: false, error: `Subject not found: ${subjectAssignment.subjectName}` };
          }

          console.log(`🔄 Creating assignment via Edge Function: Teacher ${subjectAssignment.teacherId} -> Subject ${subjectRecord.id} (${subjectRecord.name}) -> Class ${selectedClass.id}`);

          // Use centralized wrapper to ensure Authorization header is attached
          const res = await callFunction('assign-teacher-subject', {
            teacherId: subjectAssignment.teacherId,
            subjectId: subjectRecord.id,
            classId: selectedClass.id,
            academicYear: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
            term: 1
          });

          if (!res || res.success === false) {
            const errMsg = res?.userMessage || res?.error || 'Edge Function call failed';
            console.error(`❌ Edge Function error for ${subjectAssignment.subjectName}:`, errMsg, res);
            return { success: false, error: errMsg };
          }

          console.log(`✅ Assignment result:`, res);
          return { success: true, data: res?.data || res };
        } catch (error) {
          console.error(`❌ Error creating assignment for ${subjectAssignment.subjectName}:`, error);
          return { success: false, error: error.message };
        }
      });

      // Wait for all assignments to complete
      const results = await Promise.all(assignmentPromises);
      console.log('📊 Assignment results:', results);

      const successes = results.filter(r => r.success);
      const failures = results.filter(r => !r.success);

      // If everything failed, surface an error and stop
      if (successes.length === 0) {
        console.error('❌ All assignments failed:', failures);
        toast.error('Failed to create assignments. Check console for details.');
        return;
      }

      // Proceed if we have at least one success. Treat partial failures as a warning, not a hard error.
      if (failures.length > 0) {
        console.warn('⚠️ Some assignments failed:', failures);
        toast(`Created ${successes.length} assignment(s). ${failures.length} skipped/failed.`);
      } else {
        toast.success(`Class subjects updated successfully! Created ${successes.length} teacher assignments.`);
      }

      // Also update the class record with subjects for backward compatibility
      const result = await updateClass(selectedClass.id, { subjects });
      if (!result?.success) {
        console.warn('⚠️ Failed to update class subjects field, but assignments were created');
      }

      // Log the class subjects update
      await logClassAction(
        AUDIT_ACTIONS.CLASS_UPDATE,
        selectedClass.id,
        {
          className: selectedClass.name,
          level: selectedClass.level,
          category: selectedClass.category,
          subjectsCount: subjects.length,
          subjects: subjects,
          assignmentsCreated: successes.length
        },
        `Updated subjects for class: ${selectedClass.name} (${subjects.length} subjects, ${successes.length} assignments created)`
      );

      await fetchClassesRQ();
      closeSubjectManager();
    } catch (error) {
      toast.error("Failed to update class subjects");
      console.error("Error updating class subjects:", error);
    }
  };

  // Data fetched via React Query

  const openAddForm = () => {
    setFormMode("add");
    setFormData({
      id: null,
      name: "",
      level: "Junior",
      category: null,
      classTeacherId: "",
      slug: "",
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const openEditForm = (classItem) => {
    setFormMode("edit");
    setFormData({
      id: classItem.id,
      name: classItem.name,
      level: classItem.level,
      category: classItem.category,
      classTeacherId: classItem.classTeacherId || "",
      slug:
        classItem.slug ||
        generateSlug(classItem.name, classItem.level, classItem.category),
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Class name is required";
    } else if (formData.name.length < 2) {
      errors.name = "Class name must be at least 2 characters long";
    }

    if (formData.level === "Senior" && !formData.category) {
      errors.category = "Category is required for Senior level classes";
    }

    // Check for duplicate class names (excluding current class when editing)
    const duplicateClass = classes.find(
      (cls) =>
        cls.name.toLowerCase() === formData.name.toLowerCase() &&
        cls.level === formData.level &&
        cls.category === formData.category &&
        cls.id !== formData.id
    );

    if (duplicateClass) {
      errors.name =
        "A class with this name, level, and category already exists";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      // Auto-generate slug when name, level, or category changes
      if (name === "name" || name === "level" || name === "category") {
        newData.slug = generateSlug(
          name === "name" ? value : prev.name,
          name === "level" ? value : prev.level,
          name === "category" ? value : prev.category
        );
      }

      return newData;
    });

    // Clear specific field error when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // When level changes, reset category if Junior
  const handleLevelChange = (e) => {
    const level = e.target.value;
    setFormData((prev) => {
      const newData = {
        ...prev,
        level,
        category: level === "Junior" ? null : prev.category || "Science",
      };

      // Regenerate slug with new level
      newData.slug = generateSlug(prev.name, level, newData.category);
      return newData;
    });

    // Clear category error when switching to Junior
    if (level === "Junior" && formErrors.category) {
      setFormErrors((prev) => ({ ...prev, category: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setActionLoading((s) => ({ ...s, saving: true }));
    try {
      const classData = {
        ...formData,
        slug:
          formData.slug ||
          generateSlug(formData.name, formData.level, formData.category),
      };

      if (formMode === "add") {
        const result = await createClass(classData);
        if (!result?.success) {
          const msg = getFriendlyError(result?.error || 'Failed to create class');
          toast.error(msg);
          console.error('Error creating class:', msg);
          return;
        }
        const newClassRef = result.data;

        // Log class creation
        await logClassAction(
          AUDIT_ACTIONS.CLASS_CREATE,
          newClassRef.id,
          {
            className: classData.name,
            level: classData.level,
            category: classData.category,
            slug: classData.slug,
            classTeacherId: classData.classTeacherId
          },
          `Created new class: ${classData.name} (${classData.level}${classData.category ? ` - ${classData.category}` : ''})`
        );

        toast.success("Class added successfully");
      } else {
        const result = await updateClass(formData.id, classData);
        if (!result?.success) {
          const msg = getFriendlyError(result?.error || 'Failed to update class');
          toast.error(msg);
          console.error('Error updating class:', msg);
          return;
        }

        // Log class update
        await logClassAction(
          AUDIT_ACTIONS.CLASS_UPDATE,
          formData.id,
          {
            className: classData.name,
            level: classData.level,
            category: classData.category,
            slug: classData.slug,
            classTeacherId: classData.classTeacherId
          },
          `Updated class: ${classData.name} (${classData.level}${classData.category ? ` - ${classData.category}` : ''})`
        );

        toast.success("Class updated successfully");
      }
      await fetchClassesRQ(); // Refresh class counts
      closeForm();
    } catch (error) {
      const msg = getFriendlyError(error?.message || 'Failed to save class');
      toast.error(msg);
      console.error('Error saving class:', msg);
    } finally {
      setActionLoading((s) => ({ ...s, saving: false }));
    }
  };

  const handleDelete = async (id, className) => {
    try {
      setActionLoading((s) => ({ ...s, deletingId: id }));
      // Get class details before deletion for logging
      const classToDelete = classes.find(cls => cls.id === id);

      const result = await deleteClass(id);
      if (!result?.success) {
        const msg = getFriendlyError(result?.error || 'Failed to delete class');
        toast.error(msg);
        console.error('Error deleting class:', msg);
        return;
      }

      // Log class deletion
      await logClassAction(
        AUDIT_ACTIONS.CLASS_DELETE,
        id,
        {
          className: className,
          level: classToDelete?.level,
          category: classToDelete?.category,
          studentCount: classToDelete?.studentCount || 0,
          slug: classToDelete?.slug
        },
        `Deleted class: ${className} (${classToDelete?.level}${classToDelete?.category ? ` - ${classToDelete.category}` : ''}) with ${classToDelete?.studentCount || 0} students`
      );

      toast.success('Class deleted successfully');
      fetchClassesRQ();
    } catch (error) {
      const msg = getFriendlyError(error?.message || 'Failed to delete class');
      toast.error(msg);
      console.error('Error deleting class:', msg);
    } finally {
      setActionLoading((s) => ({ ...s, deletingId: null }));
      setDeleteConfirm({ isOpen: false, classId: null, className: '' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Classes Management
            </h1>
            <p className="text-gray-600">
              Manage your school classes and track student enrollment
            </p>
          </div>
          {isSuperAdmin && (
            <CreateButton onClick={openAddForm} disabled={formOpen || actionLoading.saving}>
              Add New Class
            </CreateButton>
          )}
        </div>

        {/* Controls */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-100 p-4 sm:p-5 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, slug, level, or category..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder:text-gray-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400"
              >
                <option value="all">All</option>
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400"
              >
                <option value="all">All</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
            <div>
              <span className="font-semibold text-gray-800">{filteredClasses.length}</span> class{filteredClasses.length !== 1 ? 'es' : ''} shown
            </div>
            {(levelFilter !== 'all' || categoryFilter !== 'all' || search.trim()) && (
              <button
                onClick={() => { setSearch(''); setLevelFilter('all'); setCategoryFilter('all'); }}
                className="text-blue-700 hover:text-blue-900 font-medium"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {classesLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading classes...</span>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">
                  All Classes
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {filteredClasses.length} classes total
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Class Details
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Level & Category
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Teacher
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Enrollment
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredClasses.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
                              <svg
                                className="w-8 h-8 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                />
                              </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              No classes yet
                            </h3>
                            <p className="text-gray-500 mb-4">
                              Get started by creating your first class
                            </p>
                            <button
                              onClick={openAddForm}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Create Class
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredClasses.map((cls, index) => (
                        <tr
                          key={cls.id || `class-${index}`}
                          className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 border-b border-gray-100"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm mr-4">
                                {cls.name.charAt(0)}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {formatClassName(cls.name)}
                                </div>
                                <div className="text-xs text-gray-500 font-mono break-all">
                                  {cls.slug ||
                                    generateSlug(
                                      cls.name,
                                      cls.level,
                                      cls.category
                                    )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col gap-1">
                              <span
                                className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full w-fit ${
                                  cls.level === "Senior"
                                    ? "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800"
                                    : "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800"
                                }`}
                              >
                                {cls.level}
                              </span>
                              {cls.category && (
                                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md w-fit">
                                  {cls.category}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="text-sm text-gray-900">
                              {cls.classTeacherId ? (
                                <div className="flex items-center">
                                  <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 mr-2">
                                    T
                                  </div>
                                  {cls.classTeacherId}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">
                                  Not assigned
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <button
                              onClick={() => navigateToClassStudents(cls)}
                              className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 font-medium"
                            >
                              <svg
                                className="w-6 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                                />
                              </svg>
                              {cls.studentCount || 0} students
                            </button>
                          </td>
                          <td className="px-6 py-5">
                            {isSuperAdmin ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openSubjectManager(cls)}
                                  className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors duration-200"
                                  title="Manage subjects"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                    />
                                  </svg>
                                </button>
                                <EditButton onClick={() => openEditForm(cls)} />
                                <DeleteButton
                                  onClick={() => setDeleteConfirm({ isOpen: true, classId: cls.id, className: cls.name })}
                                  loading={actionLoading.deletingId === cls.id}
                                  disabled={actionLoading.deletingId !== null}
                                />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center">
                                <span className="text-gray-400 text-sm italic">
                                  View Only
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredClasses.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No classes yet
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Get started by creating your first class
                  </p>
                  <button
                    onClick={openAddForm}
                    className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                  >
                    Create Class
                  </button>
                </div>
              ) : (
                filteredClasses.map((cls, index) => (
                  <div
                    key={cls.id || `class-${index}`}
                    className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 hover:shadow-xl transition-all duration-200 overflow-hidden"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-4">
                      <div className="flex items-center min-w-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold mr-3">
                          {cls.name.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {formatClassName(cls.name)}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                cls.level === "Senior"
                                  ? "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800"
                                  : "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800"
                              }`}
                            >
                              {cls.level}
                            </span>
                            {cls.category && (
                              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                                {cls.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isSuperAdmin && (
                        <div className="w-full sm:w-auto flex flex-wrap gap-2 justify-end sm:justify-start">
                          <button
                            onClick={() => openSubjectManager(cls)}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-xl transition-colors duration-200"
                            title="Manage subjects"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                              />
                            </svg>
                          </button>
                          <EditButton onClick={() => openEditForm(cls)} />
                          <DeleteButton
                            onClick={() => setDeleteConfirm({ isOpen: true, classId: cls.id, className: cls.name })}
                            loading={actionLoading.deletingId === cls.id}
                            disabled={actionLoading.deletingId !== null}
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3">
                        <div className="text-gray-600 text-xs font-medium mb-1">
                          Students
                        </div>
                        <button
                          onClick={() => navigateToClassStudents(cls)}
                          className="text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                            />
                          </svg>
                          {cls.studentCount || 0}
                        </button>
                      </div>
                      {cls.classTeacherId && (
                        <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-3">
                          <div className="text-gray-600 text-xs font-medium mb-1">
                            Teacher
                          </div>
                          <div className="text-gray-900 font-medium truncate">
                            {cls.classTeacherId}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Add/Edit Form Modal - Only for Super Admin */}
        {formOpen && isSuperAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl">
                <h3 className="text-xl font-bold text-white">
                  {formMode === "add" ? "✨ Add New Class" : "📝 Edit Class"}
                </h3>
                <p className="text-blue-100 text-sm mt-1">
                  {formMode === "add"
                    ? "Create a new class for your students"
                    : "Update class information"}
                </p>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                  {formMode === "add" ? "Add New Class" : "Edit Class"}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Class Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.name ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Enter class name"
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-sm text-red-600">
                        {formErrors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Level *
                    </label>
                    <select
                      name="level"
                      value={formData.level}
                      onChange={handleLevelChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.level === "Senior" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category *
                      </label>
                      <select
                        name="category"
                        value={formData.category || ""}
                        onChange={handleInputChange}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          formErrors.category
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      >
                        <option value="" disabled>
                          Select Category
                        </option>
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      {formErrors.category && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.category}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Class Teacher ID
                    </label>
                    <input
                      type="text"
                      name="classTeacherId"
                      value={formData.classTeacherId}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter teacher ID (optional)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slug (Auto-generated)
                    </label>
                    <input
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      placeholder="Auto-generated from class name"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Used for URLs and unique identification
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                  <CancelButton onClick={closeForm} disabled={actionLoading.saving} />
                  <SaveButton type="submit" loading={actionLoading.saving} disabled={actionLoading.saving} />
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Subject Manager Modal */}
        {subjectManagerOpen && selectedClass && (
          <ClassSubjectManager
            classData={selectedClass}
            onSubjectsUpdate={handleSubjectsUpdate}
            onClose={closeSubjectManager}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, classId: null, className: '' })}
          onConfirm={() => {
            if (actionLoading.deletingId) return; // prevent double click
            handleDelete(deleteConfirm.classId, deleteConfirm.className);
          }}
          title="Delete Class"
          message={`Are you sure you want to delete "${deleteConfirm.className}"? This action cannot be undone.`}
          confirmText={actionLoading.deletingId ? 'Deleting...' : 'Delete'}
          type="danger"
        />
              </div>
    </div>
  );
}
