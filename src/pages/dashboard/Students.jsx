import React, { useEffect, useState, useMemo, useCallback } from "react";
import StudentTable from "../../components/students/StudentTable";
import StudentForm from "../../components/forms/StudentForm";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import toast, { Toaster } from "react-hot-toast";
import { getAllStudents } from "../../services/supabase/migrationWrapper";
import edgeFunctionsService from "../../services/supabase/edgeFunctions";
import { getAllClasses } from "../../services/supabase/classService";
import { uploadService } from "../../services/supabase/uploadService";
import { useAuditLog } from "../../hooks/useAuditLog";
import { EditButton, DeleteButton } from "../../components/ui/ActionButtons";

const Students = () => {
  // Audit logging hook
  const { logStudentAction, AUDIT_ACTIONS, isAdmin } = useAuditLog();

  // Core state
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add this state to track operations
  const [operationLoading, setOperationLoading] = useState({
    create: false,
    update: false,
    delete: false,
  });

  // Filter and search state
  const [selectedClassId, setSelectedClassId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    studentId: null,
    studentName: "",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Memoized enriched students with class data
  const enrichedStudents = useMemo(() => {
    return students.map((student) => {
      // Use the joined class data from Supabase if available, otherwise find from classes array
      const classData =
        student.classes || classes.find((cls) => cls.id === student.class_id);
      return {
        ...student,
        // Keep the original classes object for StudentTable
        classes: classData,
        // Also provide legacy field names for backward compatibility
        className: classData?.name || "N/A",
        classLevel: classData?.level || "",
        classCategory: classData?.category || "",
        fullName:
          student.full_name ||
          `${student?.first_name || ""} ${student?.surname || ""}`.trim() ||
          "N/A",
      };
    });
  }, [students, classes]);

  // Memoized filtered and sorted students
  const filteredAndSortedStudents = useMemo(() => {
    let filtered = enrichedStudents;

    // Apply class filter
    if (selectedClassId) {
      filtered = filtered.filter(
        (student) => student.class_id === selectedClassId
      );
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((student) => {
        const fullName = student.fullName.toLowerCase();
        const admission = (student.admission_number || "").toLowerCase();
        const className = (student.className || "").toLowerCase();
        const email = (student.email || "").toLowerCase();

        return (
          fullName.includes(term) ||
          admission.includes(term) ||
          className.includes(term) ||
          email.includes(term)
        );
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "name":
          aValue = a.fullName;
          bValue = b.fullName;
          break;
        case "admission":
          aValue = a.admission_number || "";
          bValue = b.admission_number || "";
          break;
        case "class":
          aValue = a.className;
          bValue = b.className;
          break;
        case "date_of_birth":
          aValue = new Date(a.date_of_birth || 0);
          bValue = new Date(b.date_of_birth || 0);
          break;
        default:
          aValue = a.fullName;
          bValue = b.fullName;
      }

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [enrichedStudents, selectedClassId, searchTerm, sortBy, sortOrder]);

  // Memoized paginated students
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedStudents.slice(startIndex, endIndex);
  }, [filteredAndSortedStudents, currentPage, itemsPerPage]);

  // Calculate pagination info
  const totalPages = Math.ceil(filteredAndSortedStudents.length / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(
    currentPage * itemsPerPage,
    filteredAndSortedStudents.length
  );

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClassId, searchTerm, sortBy, sortOrder, itemsPerPage]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("🔄 Fetching students and classes...");
      const [studentsResult, classesResult] = await Promise.all([
        getAllStudents(),
        getAllClasses(),
      ]);

      // Handle different response formats
      // studentService returns { success, data } format
      // classService returns data directly
      if (studentsResult.success) {
        console.log("✅ Students fetched:", studentsResult.data?.length || 0);
        setStudents(studentsResult.data || []);
      } else {
        throw new Error(studentsResult.error || "Failed to fetch students");
      }

      // classService returns data directly (array)
      if (Array.isArray(classesResult)) {
        console.log("✅ Classes fetched (array format):", classesResult.length);
        setClasses(classesResult);
      } else if (classesResult.success) {
        console.log(
          "✅ Classes fetched (object format):",
          classesResult.data?.length || 0
        );
        setClasses(classesResult.data || []);
      } else {
        throw new Error("Failed to fetch classes");
      }
    } catch (err) {
      setError("Failed to load data. Please try again.");
      console.error("❌ Error fetching data:", err);
      toast.error("Failed to load students data");
    } finally {
      setLoading(false);
    }
  };

  // Event handlers
  const handleImageSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }, []);

  const handleAddClick = useCallback(() => {
    setEditStudent(null);
    setFormOpen(true);
    setSelectedImage(null);
    setImagePreview(null);
  }, []);

  const handleEditClick = useCallback((student) => {
    // Map database fields to form field names
    const mappedData = {
      // Split full_name into first_name and surname
      first_name: student.full_name ? student.full_name.split(" ")[0] : "",
      surname: student.full_name
        ? student.full_name.split(" ").slice(1).join(" ")
        : "",

      // Map other fields
      admission_number: student.admission_number || "",
      class_id: student.class_id || "",
      gender: student.gender || "",
      date_of_birth: student.date_of_birth || "",
      email: student.email || "",
      contact: student.phone_number || student.contact || "",
      guardian_name: student.guardian_name || "",
      profileImageUrl: student.profile_image || null,

      id: student.id,
    };
    setEditStudent(mappedData);
    setFormOpen(true);
    setSelectedImage(null);
    setImagePreview(student.profile_image || null);
  }, []);

  const handleDeleteClick = useCallback((student) => {
    const studentId = student.id || student.uid;
    const studentName =
      student.full_name ||
      student.fullName ||
      student.first_name ||
      "this student";

    if (!studentId) {
      console.error("No valid student ID found!");
      toast.error("Cannot delete student: No valid ID found");
      return;
    }

    setDeleteConfirm({
      isOpen: true,
      studentId: studentId,
      studentName: studentName,
    });
  }, []);

  // const confirmDelete = async () => {
  //   try { 

  //     console.log("🔄 Deleting stude:", deleteConfirm.studentId);

  //     const result = await edgeFunctionsService.deleteStudent(
  //       deleteConfirm.studentId
  //     );

  //     console.log("✅ Delete result:", result);

  //     // Check if the result indicates success
  //     if (result && result.success !== false) {
  //       // Log admin activity
  //       if (isAdmin) {
  //         await logStudentAction(
  //           AUDIT_ACTIONS.STUDENT_DELETE,
  //           deleteConfirm.studentId,
  //           {
  //             studentName: deleteConfirm.studentName,
  //             deletedAt: new Date().toISOString(),
  //           },
  //           `Deleted student: ${deleteConfirm.studentName}`
  //         );
  //       }

  //       // Remove from local state
  //       setStudents((prev) =>
  //         prev.filter((stu) => (stu.id || stu.uid) !== deleteConfirm.studentId)
  //       );
  //       setDeleteConfirm({ isOpen: false, studentId: null, studentName: "" });
  //       toast.success(result?.message || "Student deleted successfully!");
  //     } else {
  //       throw new Error(result?.error || "Failed to delete student");
  //     }
  //   } catch (err) {
  //     console.error("❌ Delete error:", err);
  //     // Log enriched error details if available (from edgeFunctionsService)
  //     console.error("❌ Edge Function error details:", {
  //       name: err.name,
  //       message: err.message,
  //       status: err.status,
  //       statusText: err.statusText,
  //       functionName: err.functionName,
  //       responseJson: err.responseJson,
  //       responseBody: err.responseBody,
  //       originalError: err.originalError,
  //     });

  //     let errorMessage = "Failed to delete student";

  //     // Prefer structured JSON returned by the Edge Function
  //     if (
  //       err.responseJson &&
  //       (err.responseJson.error || err.responseJson.message)
  //     ) {
  //       errorMessage = err.responseJson.error || err.responseJson.message;
  //     } else if (
  //       err.responseBody &&
  //       typeof err.responseBody === "string" &&
  //       err.responseBody.trim().length > 0
  //     ) {
  //       errorMessage = err.responseBody;
  //     } else if (err.functionResponse && err.functionResponse.error) {
  //       // Legacy fallback from older SDK error shape
  //       errorMessage = err.functionResponse.error;
  //     } else if (err.message) {
  //       errorMessage = err.message;
  //     }

  //     // Map specific status codes to clearer messages
  //     if (err.status === 401) {
  //       errorMessage = "Authentication required to delete students";
  //     } else if (err.status === 403) {
  //       errorMessage =
  //         "You don't have permission to delete students. Only administrators can delete students.";
  //     } else if (err.status === 404) {
  //       errorMessage = "Student not found";
  //     }

  //     // Keyword-based refinement
  //     if (errorMessage) {
  //       const msg = String(errorMessage).toLowerCase();
  //       if (
  //         msg.includes("cannot delete themselves") ||
  //         msg.includes("delete themselves")
  //       ) {
  //         errorMessage = "You cannot delete yourself";
  //       } else if (
  //         msg.includes("permission") ||
  //         msg.includes("only super") ||
  //         msg.includes("unauthorized")
  //       ) {
  //         errorMessage =
  //           "You don't have permission to delete students. Only administrators can delete students.";
  //       } else if (
  //         msg.includes("not found") ||
  //         msg.includes("user not found") ||
  //         msg.includes("student not found")
  //       ) {
  //         errorMessage = "Student not found";
  //       } else if (msg.includes("missing authorization")) {
  //         errorMessage = "Authentication required to delete students";
  //       }
  //     }

  //     toast.error(errorMessage);
  //     setDeleteConfirm({ isOpen: false, studentId: null, studentName: "" });
  //   }
  // };







const confirmDelete = async () => {
  // Set delete loading to true when operation starts
  setOperationLoading((prev) => ({ ...prev, delete: true }));

  // Show loading toast
  const loadingToast = toast.loading(`Deleting ${deleteConfirm.studentName}...`);

  try {
    console.log("🔄 Deleting student:", deleteConfirm.studentId);

    const result = await edgeFunctionsService.deleteStudent(deleteConfirm.studentId);

    console.log("✅ Delete result:", result);

    if (result && result.success !== false) {
      // Log admin activity
      if (isAdmin) {
        await logStudentAction(
          AUDIT_ACTIONS.STUDENT_DELETE,
          deleteConfirm.studentId,
          {
            studentName: deleteConfirm.studentName,
            deletedAt: new Date().toISOString(),
          },
          `Deleted student: ${deleteConfirm.studentName}`
        );
      }

      // Remove from local state
      setStudents((prev) =>
        prev.filter((stu) => (stu.id || stu.uid) !== deleteConfirm.studentId)
      );
      setDeleteConfirm({ isOpen: false, studentId: null, studentName: "" });

      // Success toast
      toast.dismiss(loadingToast);
      toast.success(result?.message || `${deleteConfirm.studentName} deleted successfully!`);
    } else {
      throw new Error(result?.error || "Failed to delete student");
    }
  } catch (err) {
    console.error("❌ Delete error:", err);
    console.error("❌ Edge Function error details:", {
      name: err.name,
      message: err.message,
      status: err.status,
      statusText: err.statusText,
      functionName: err.functionName,
      responseJson: err.responseJson,
      responseBody: err.responseBody,
      originalError: err.originalError,
    });

    let errorMessage = "Failed to delete student";

    // Prefer structured JSON returned by the Edge Function
    if (err.responseJson && (err.responseJson.error || err.responseJson.message)) {
      errorMessage = err.responseJson.error || err.responseJson.message;
    } else if (err.responseBody && typeof err.responseBody === "string" && err.responseBody.trim().length > 0) {
      errorMessage = err.responseBody;
    } else if (err.functionResponse && err.functionResponse.error) {
      errorMessage = err.functionResponse.error;
    } else if (err.message) {
      errorMessage = err.message;
    }

    if (err.status === 401) {
      errorMessage = "Authentication required to delete students";
    } else if (err.status === 403) {
      errorMessage = "You don't have permission to delete students. Only administrators can delete students.";
    } else if (err.status === 404) {
      errorMessage = "Student not found";
    }

    const msg = String(errorMessage).toLowerCase();
    if (msg.includes("cannot delete themselves") || msg.includes("delete themselves")) {
      errorMessage = "You cannot delete yourself";
    } else if (msg.includes("permission") || msg.includes("only super") || msg.includes("unauthorized")) {
      errorMessage = "You don't have permission to delete students. Only administrators can delete students.";
    } else if (msg.includes("not found") || msg.includes("user not found") || msg.includes("student not found")) {
      errorMessage = "Student not found";
    } else if (msg.includes("missing authorization")) {
      errorMessage = "Authentication required to delete students";
    }

    toast.dismiss(loadingToast);
    toast.error(errorMessage);

    setDeleteConfirm({ isOpen: false, studentId: null, studentName: "" });
  } finally {
    // Always reset loading state
    setOperationLoading((prev) => ({ ...prev, delete: false }));
  }
};






  const cancelDelete = useCallback(() => {
    setDeleteConfirm({ isOpen: false, studentId: null, studentName: "" });
  }, []);

  const handleFormSubmit = async (formData) => {
    try {
      console.log("🔄 Starting form submission with data:", formData);
      let imageUrl = null;

      if (selectedImage && formData.admission_number) {
        const loadingToast = toast.loading("Uploading image...");
        try {
          imageUrl = await uploadService.uploadStudentImage(
            selectedImage,
            formData.admission_number
          );
          toast.dismiss(loadingToast);
          console.log("✅ Image uploaded successfully:", imageUrl);
        } catch (uploadError) {
          toast.dismiss(loadingToast);
          toast.error("Failed to upload image, but student data will be saved");
          console.error("❌ Image upload error:", uploadError);
        }
      }

      const studentData = {
        ...formData,
        profileImageUrl:
          imageUrl || editStudent?.profile_image || editStudent?.image || null,
      };

      console.log("📝 Final student data to save:", studentData);

      if (editStudent) {
        console.log("🔄 Updating existing student:", editStudent.id);

        // Prepare update data for the edge function
        const updateData = {
          full_name: `${formData.first_name} ${formData.surname}`,
          email: formData.email,
          phone_number: formData.contact,
          admission_number: formData.admission_number,
          class_id: formData.class_id,
          guardian_name: formData.guardian_name,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          profile_image: studentData.profileImageUrl,
        };

        const result = await edgeFunctionsService.updateUser(
          editStudent.id,
          "student",
          updateData
        );

        if (result.success) {
          console.log("✅ Student updated successfully");

          // Log admin activity for update
          if (isAdmin) {
            await logStudentAction(
              AUDIT_ACTIONS.STUDENT_UPDATE,
              editStudent.id,
              {
                studentName: `${formData.first_name} ${formData.surname}`,
                admission_number: editStudent.admission_number,
                changes: studentData,
                updatedAt: new Date().toISOString(),
              },
              `Updated student: ${formData.first_name} ${formData.surname} (${editStudent.admission_number})`
            );
          }

          setStudents((prev) =>
            prev.map((stu) =>
              stu.id === editStudent.id ? { ...stu, ...studentData } : stu
            )
          );
          toast.success("Student updated successfully!");
        } else {
          throw new Error(result.error || "Failed to update student");
        }
      } else {
        console.log("🔄 Creating new student...");
        const result = await edgeFunctionsService.createStudent(studentData);

        if (result.success) {
          console.log("✅ Student created successfully:", result.data);

          // Log admin activity for create
          if (isAdmin) {
            await logStudentAction(
              AUDIT_ACTIONS.STUDENT_CREATE,
              result.data?.id || "unknown",
              {
                studentName: `${formData.first_name} ${formData.surname}`,
                admission_number: formData.admission_number,
                class_id: formData.class_id,
                studentData: studentData,
                createdAt: new Date().toISOString(),
              },
              `Created new student: ${formData.first_name} ${formData.surname} (${formData.admission_number})`
            );
          }

          // Refresh data to get the new student
          await fetchData();
          toast.success("Student added successfully!");
        } else {
          console.error("❌ Failed to create student:", result.error);
          throw new Error(result.error || "Failed to create student");
        }
      }

      handleFormCancel();
    } catch (err) {
      console.error("❌ Form submission error:", err);
      toast.error(`Failed to save student: ${err.message}`);
    }
  };

  const handleFormCancel = useCallback(() => {
    setFormOpen(false);
    setEditStudent(null);
    setSelectedImage(null);
    setImagePreview(null);

    // Clean up image preview URL
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
  }, [imagePreview]);

  const handleSort = useCallback(
    (field) => {
      if (sortBy === field) {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      } else {
        setSortBy(field);
        setSortOrder("asc");
      }
    },
    [sortBy, sortOrder]
  );

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="h-8 bg-gray-200 rounded w-64"></div>
              <div className="flex gap-4">
                <div className="h-10 bg-gray-200 rounded w-32"></div>
                <div className="h-10 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Error Loading Data
              </h3>
              <p className="text-gray-500 mb-4">{error}</p>
              <button
                onClick={fetchData}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Student Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage student records and information
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-sm"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} - {cls.level} {cls.category && `(${cls.category})`}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddClick}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Student
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-green-600"
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
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Students
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {students.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Classes
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {classes.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Filtered Results
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredAndSortedStudents.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Current Page
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentPage} of {totalPages || 1}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Student Form Modal */}
        {formOpen && (
          <StudentForm
            mode={editStudent ? "edit" : "add"}
            defaultValues={editStudent}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            onImageSelect={handleImageSelect}
            imagePreview={imagePreview}
            classes={classes}
          />
        )}

        {/* Student Table */}
        <StudentTable
          students={paginatedStudents}
          allStudents={filteredAndSortedStudents}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
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
          startItem={startItem}
          endItem={endItem}
          totalItems={filteredAndSortedStudents.length}
          operationLoading={operationLoading} 
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          title="Delete Student"
          message={`Are you sure you want to delete ${deleteConfirm.studentName}? This action cannot be undone.`}
          //confirmText="Delete"
            confirmText={operationLoading.delete ? "Deleting..." : "Delete"} 
              loading={operationLoading.delete}  
          cancelText="Cancel"
          type="danger"
        />

        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#363636",
              color: "#fff",
            },
            success: {
              duration: 3000,
              theme: {
                primary: "green",
                secondary: "black",
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default Students;
