import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAllClasses,
  createClass,
  updateClass,
  deleteClass,
} from "../../services/supabase/classService";
import { getStudentsByClass } from "../../services/supabase/studentService";
import useToast from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import useAuditLog from "../../hooks/useAuditLog";
import ClassSubjectManager from "../../components/ClassSubjectManager";

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

export default function Classes() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const { logClassAction, AUDIT_ACTIONS } = useAuditLog();

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAllClasses();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch classes');
      }

      const data = result.data || [];

      // Calculate student count for each class
      const classesWithCount = await Promise.all(
        data.map(async (cls) => {
          try {
            const studentsResult = await getStudentsByClass(cls.id);
            const studentCount = studentsResult.success ? (studentsResult.data || []).length : 0;
            return { ...cls, studentCount };
          } catch (error) {
            console.error(`❌ Error fetching students for ${cls.name}:`, error);
            return { ...cls, studentCount: 0 };
          }
        })
      );

      // Sort classes naturally
      const sortedClasses = classesWithCount.sort((a, b) => {
        // First sort by level (Junior before Senior)
        if (a.level !== b.level) {
          return a.level === "Junior" ? -1 : 1;
        }

        // Then sort by name using natural sort
        return a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });

      setClasses(sortedClasses);
    } catch (error) {
      showToast("Failed to fetch classes", "error");
      console.error("Error fetching classes:", error.message || error);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

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
      await updateClass(selectedClass.id, { ...selectedClass, subjects });

      // Log the class subjects update
      await logClassAction(
        AUDIT_ACTIONS.CLASS_UPDATE,
        selectedClass.id,
        {
          className: selectedClass.name,
          level: selectedClass.level,
          category: selectedClass.category,
          subjectsCount: subjects.length,
          subjects: subjects
        },
        `Updated subjects for class: ${selectedClass.name} (${subjects.length} subjects)`
      );

      showToast("Class subjects updated successfully", "success");
      await fetchClasses();
      closeSubjectManager();
    } catch (error) {
      showToast("Failed to update class subjects", "error");
      console.error("Error updating class subjects:", error);
    }
  };

  // Fetch classes on mount
  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

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

    try {
      const classData = {
        ...formData,
        slug:
          formData.slug ||
          generateSlug(formData.name, formData.level, formData.category),
      };

      if (formMode === "add") {
        const newClassRef = await createClass(classData);

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

        showToast("Class added successfully", "success");
      } else {
        await updateClass(formData.id, classData);

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

        showToast("Class updated successfully", "success");
      }
      await fetchClasses(); // Refresh class counts
      closeForm();
    } catch (error) {
      showToast("Failed to save class", "error");
      console.error("Error saving class:", error.message || error);
    }
  };

  const handleDelete = async (id, className) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${className}" class? This action cannot be undone.`
      )
    ) {
      try {
        // Get class details before deletion for logging
        const classToDelete = classes.find(cls => cls.id === id);

        await deleteClass(id);

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

        showToast("Class deleted successfully", "success");
        fetchClasses();
      } catch (error) {
        showToast("Failed to delete class", "error");
        console.error("Error deleting class:", error.message || error);
      }
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
            <button
              onClick={openAddForm}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2 font-medium"
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
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Add New Class
            </button>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading classes...</span>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">
                  All Classes
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {classes.length} classes total
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
                    {classes.length === 0 ? (
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
                      classes.map((cls, index) => (
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
                                  {cls.name}
                                </div>
                                <div className="text-xs text-gray-500 font-mono">
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
                                <button
                                  onClick={() => openEditForm(cls)}
                                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                                  title="Edit class"
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
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(cls.id, cls.name)}
                                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                                  title="Delete class"
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
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
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
            <div className="lg:hidden space-y-4">
              {classes.length === 0 ? (
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
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                  >
                    Create Class
                  </button>
                </div>
              ) : (
                classes.map((cls, index) => (
                  <div
                    key={cls.id || `class-${index}`}
                    className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 hover:shadow-xl transition-all duration-200"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold mr-3">
                          {cls.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {cls.name}
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
                        <div className="flex space-x-2">
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
                          <button
                            onClick={() => openEditForm(cls)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors duration-200"
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
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(cls.id, cls.name)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-xl transition-colors duration-200"
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
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
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
                  >
                    {formMode === "add" ? "✨ Create Class" : "💾 Save Changes"}
                  </button>
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
      </div>
    </div>
  );
}
