import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import ProfileImage from "../common/ProfileImage";
import { EditButton, DeleteButton, PromoteButton, SuspendButton, ReactivateButton, ResetPasswordButton } from "../ui/ActionButtons";
import { formatClassName } from "../../utils/classNameFormatter";

const StudentTable = ({
  students = [],
  allStudents = [],
  onEdit,
  onDelete,
  onPromote,
  onSuspend,
  onReactivate,
  onResetPassword,
  searchTerm = "",
  setSearchTerm,
  sortBy = "name",
  sortOrder = "asc",
  onSort,
  currentPage = 1,
  totalPages = 1,
  itemsPerPage = 10,
  setItemsPerPage,
  onPageChange,
  operationLoading = { create: false, update: false, delete: false, promote: false, suspend: false, reactivate: false, resetPassword: false },
  startItem = 0,
  endItem = 0,
  totalItems = 0,
  // Bulk selection props
  showSelection = false,
  selectedIds = [],
  onToggleRow = () => {},
  onToggleAll = () => {},
}) => {
  const { userRole, isSuperAdmin } = useAuth();
  const [imagePreviewModal, setImagePreviewModal] = useState({ open: false, src: '', alt: '' });
  // Sticky offsets depend on whether selection column is rendered
  const stickyNameLeft = showSelection ? 'left-14' : 'left-0';
  const [viewMode, setViewMode] = useState("auto");
  const [searchFocused, setSearchFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Selection helpers
  const selectedSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);
  const pageIds = useMemo(() => (students || []).map(s => s?.id).filter(Boolean), [students]);
  const allSelectedOnPage = useMemo(
    () => showSelection && pageIds.length > 0 && pageIds.every((id) => selectedSet.has(id)),
    [showSelection, pageIds, selectedSet]
  );

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle image click - only for admins/super admins
  const handleImageClick = useCallback(
    (student) => {
      if (student?.profile_image) {
        setImagePreviewModal({ open: true, src: student.profile_image, alt: student.full_name || 'Student' });
      }
    },
    []
  );

  const closeImage = useCallback(() => {
    setImagePreviewModal({ open: false, src: '', alt: '' });
  }, []);

  // Clear search with animation
  const clearSearch = useCallback(() => {
    setSearchTerm("");
  }, [setSearchTerm]);

  // Generate page numbers for pagination
  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisiblePages = isMobile ? 3 : 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= Math.floor(maxVisiblePages / 2) + 1) {
        for (let i = 1; i <= maxVisiblePages - 1; i++) {
          pages.push(i);
        }
        if (totalPages > maxVisiblePages - 1) {
          pages.push("...");
          pages.push(totalPages);
        }
      } else if (currentPage >= totalPages - Math.floor(maxVisiblePages / 2)) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - maxVisiblePages + 2; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  }, [currentPage, totalPages, isMobile]);

  // Determine actual view mode based on screen size and user preference
  const actualViewMode = useMemo(() => {
    if (viewMode === "auto") {
      return isMobile ? "cards" : "table"; // Cards on mobile, table on desktop
    }
    return viewMode;
  }, [viewMode, isMobile]);

  const SortButton = ({ field, children, className = "" }) => (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center space-x-1 text-left font-semibold text-gray-900 hover:text-green-600 transition-colors group ${className}`}
    >
      <span>{children}</span>
      <div className="flex flex-col">
        <svg
          className={`w-3 h-3 transition-all ${
            sortBy === field && sortOrder === "asc"
              ? "text-green-600"
              : "text-gray-400 group-hover:text-gray-600"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
            clipRule="evenodd"
          />
        </svg>
        <svg
          className={`w-3 h-3 -mt-1 transition-all ${
            sortBy === field && sortOrder === "desc"
              ? "text-green-600"
              : "text-gray-400 group-hover:text-gray-600"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </button>
  );

  const ActionsCell = ({
    student,
    onEdit,
    onDelete,
    onPromote,
    onSuspend,
    onReactivate,
    onResetPassword,
    isMobile = false,
    isDesktopCard = false,
    operationLoading = { create: false, update: false, delete: false, promote: false, suspend: false, reactivate: false, resetPassword: false },
  }) => {
    const { userRole, isSuperAdmin } = useAuth();

    // Check permissions
    const canEdit = userRole === "super_admin" || isSuperAdmin;
    const canDelete = userRole === "super_admin" || isSuperAdmin;
    const canPromote = ["super_admin", "admin"].includes(userRole) || isSuperAdmin;
    const canSuspend = ["super_admin", "admin"].includes(userRole) || isSuperAdmin;

    if (!canEdit && !canDelete && !canPromote && !canSuspend) {
      return (
        <div className="text-center">
          <span className="text-gray-400 text-sm">No Permission</span>
        </div>
      );
    }

    const studentStatus = student?.status || 'active';

    if (isMobile || isDesktopCard) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {canEdit && (
            <EditButton
              onClick={() => onEdit(student)}
              loading={operationLoading?.update}
              disabled={operationLoading?.update}
              className="w-full"
              size="xs"
            />
          )}
          
                              
          {canSuspend && studentStatus === 'active' && onSuspend && (
            <SuspendButton
              onClick={() => onSuspend(student)}
              loading={operationLoading?.suspendId === student.id}
              disabled={operationLoading?.suspendId === student.id}
              className="w-full"
              size="xs"
            />
          )}
          
          {canSuspend && studentStatus === 'suspended' && onReactivate && (
            <ReactivateButton
              onClick={() => onReactivate(student)}
              loading={operationLoading?.reactivateId === student.id}
              disabled={operationLoading?.reactivateId === student.id}
              className="w-full"
              size="xs"
            />
          )}
          
          {canSuspend && onResetPassword && (
            <ResetPasswordButton
              variant="success"
              onClick={() => onResetPassword(student)}
              loading={operationLoading?.resetPassword}
              disabled={operationLoading?.resetPassword}
              className="w-full"
              size="xs"
            />
          )}
          
          {canDelete && (
            <DeleteButton
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(student);
              }}
              loading={operationLoading?.delete}
              disabled={operationLoading?.delete}
              className="w-full"
              size="xs"
            />
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-1">
        {canEdit && (
          <EditButton
            onClick={() => onEdit(student)}
            loading={operationLoading?.update}
            disabled={operationLoading?.update}
          />
        )}
        
                        
        {canSuspend && studentStatus === 'active' && onSuspend && (
          <SuspendButton
            onClick={() => onSuspend(student)}
            loading={operationLoading?.suspendId === student.id}
            disabled={operationLoading?.suspendId === student.id}
          />
        )}
        
        {canSuspend && studentStatus === 'suspended' && onReactivate && (
          <ReactivateButton
            onClick={() => onReactivate(student)}
            loading={operationLoading?.reactivateId === student.id}
            disabled={operationLoading?.reactivateId === student.id}
          />
        )}
        
        {canSuspend && onResetPassword && (
          <ResetPasswordButton
            variant="success"
            onClick={() => onResetPassword(student)}
            loading={operationLoading?.resetPassword}
            disabled={operationLoading?.resetPassword}
          />
        )}
        
        {canDelete && (
          <DeleteButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(student);
            }}
            loading={operationLoading?.delete}
            disabled={operationLoading?.delete}
          />
        )}
      </div>
    );
  };

  const StatusBadge = ({ status }) => {
    const statusConfig = {
      active: { color: 'green', text: 'Active' },
      suspended: { color: 'red', text: 'Suspended' },
      graduated: { color: 'blue', text: 'Graduated' },
      deleted: { color: 'gray', text: 'Deleted' }
    };

    const config = statusConfig[status] || statusConfig.active;

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-800`}>
        {config.text}
      </span>
    );
  };

  
  const StudentCard = ({ student, index }) => (
    <div className="relative bg-white border border-emerald-200 hover:border-emerald-300 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden h-full flex flex-col">
      {showSelection && (
        <div className="absolute top-2 left-2 z-10 bg-white bg-opacity-90 rounded px-1.5 py-0.5 shadow-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            checked={selectedSet.has(student?.id)}
            onChange={(e) => { e.stopPropagation(); onToggleRow(student?.id); }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {/* Card Header */}
      <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-100">
        <div className="flex flex-col items-center sm:flex-row sm:items-center sm:space-x-3 space-y-3 sm:space-y-0">
          <div
            className={`flex-shrink-0 ${student?.profile_image ? 'cursor-zoom-in hover:opacity-90 transition' : ''} mx-auto sm:mx-0`}
            onClick={() => handleImageClick(student)}
          >
            <ProfileImage
            src={student?.profile_image}
            alt={student?.full_name || "Student"}
            size="lg"
            className="hover:ring-2 hover:ring-emerald-400"
            fallbackName={student?.full_name || ""}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 sm:truncate break-words text-center sm:text-left">
              {student?.full_name || "N/A"}
            </h3>
            <p className="text-xs text-gray-500 font-medium text-center sm:text-left">
              ID: {student?.admission_number || "N/A"}
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {formatClassName(student?.classes?.name) || "N/A"}
              </span>
              {(() => {
                const raw = student?.classes?.category || student?.classCategory || (/JSS/i.test(student?.classes?.name || '') ? 'Junior' : null);
                if (!raw) return null;
                const c = String(raw);
                const lower = c.toLowerCase();
                const cls = lower === 'science'
                  ? 'bg-emerald-100 text-emerald-800'
                  : lower === 'arts'
                  ? 'bg-purple-100 text-purple-800'
                  : lower === 'commercial'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-teal-100 text-teal-800'; // Junior or others
                return (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
                    {c}
                  </span>
                );
              })()}
              <StatusBadge status={student?.status || 'active'} />
              {student?.status === 'graduated' && student?.graduated_at && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Graduated: {new Date(student.graduated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              )}
              {student?.gender && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    student.gender.toLowerCase() === "male"
                      ? "bg-blue-100 text-blue-800"
                      : student.gender.toLowerCase() === "female"
                      ? "bg-pink-100 text-pink-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {student.gender}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="px-4 py-3">
        <div className="space-y-2">
          {student?.email && (
            <div className="flex items-start space-x-2">
              <svg
                className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Email
                </p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {student.email}
                </p>
              </div>
            </div>
          )}

          {student?.date_of_birth && (
            <div className="flex items-start space-x-2">
              <svg
                className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Date of Birth
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(student.date_of_birth).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {student?.guardian_name && (
            <div className="flex items-start space-x-2">
              <svg
                className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Guardian
                </p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {student.guardian_name}
                </p>
                {(student?.guardian_phone ||
                  student?.contact ||
                  student?.phone_number) && (
                  <p className="text-xs text-gray-500 mt-1">
                    📞{" "}
                    {student.guardian_phone ||
                      student.contact ||
                      student.phone_number}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <ActionsCell
          student={student}
          onEdit={onEdit}
          onDelete={onDelete}
          onPromote={onPromote}
          onSuspend={onSuspend}
          onReactivate={onReactivate}
          onResetPassword={onResetPassword}
          isMobile={true}
          operationLoading={operationLoading}
        />
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Enhanced Header with Search */}
      <div className="p-0 sm:py-6 sm:pr-6 sm:pl-0 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        {/* Search Section */}
        <div className="mb-4">
          <div
            className={`relative transition-all duration-200 ${
              searchFocused ? "transform scale-[1.02]" : ""
            }`}
          >
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className={`h-5 w-5 transition-colors ${
                  searchFocused ? "text-green-500" : "text-gray-400"
                }`}
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
            <input
              type="text"
              placeholder={
                isMobile
                  ? "Search students..."
                  : "Search by name, admission number, email, or class..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className={`w-full pl-10 pr-12 py-3 border rounded-lg transition-all duration-200 text-sm ${
                searchFocused
                  ? "border-green-500 ring-2 ring-green-200 shadow-md"
                  : "border-gray-300 hover:border-gray-400"
              } focus:outline-none`}
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center group"
              >
                <div className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                  <svg
                    className="h-4 w-4 text-gray-400 group-hover:text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Results info */}
          <div className="text-sm text-gray-600">
            {totalItems > 0 ? (
              <>
                <span className="font-semibold text-gray-900">
                  {totalItems}
                </span>{" "}
                student{totalItems !== 1 ? "s" : ""}
                {searchTerm && (
                  <span className="ml-2 text-green-600 font-medium">
                    (filtered from {allStudents.length} total)
                  </span>
                )}
              </>
            ) : (
              <span>No students found</span>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {showSelection && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  checked={allSelectedOnPage}
                  onChange={(e) => onToggleAll(pageIds, e.target.checked)}
                />
                <span>Select all</span>
              </label>
            )}
            {/* Items per page */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap hidden sm:block">
                Show:
              </label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {students.length === 0 ? (
        <div className="p-8 sm:p-12 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">
              {searchTerm ? "No matching students" : "No students found"}
            </h3>
            <p className="text-gray-500 max-w-sm text-sm sm:text-base mb-4 text-center">
              {searchTerm
                ? "Try adjusting your search criteria or clear the search to see all students."
                : "No students have been added yet. Click 'Add Student' to get started."}
            </p>
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          {actualViewMode === "table" && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {showSelection && (
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 z-20 bg-gray-50 w-14 min-w-[3.5rem]">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          checked={allSelectedOnPage}
                          onChange={(e) => onToggleAll(pageIds, e.target.checked)}
                        />
                      </th>
                    )}
                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky ${stickyNameLeft} z-10 bg-gray-50`}>
                      <SortButton field="name">Student</SortButton>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <SortButton field="admission">Admission No</SortButton>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <SortButton field="class">Class</SortButton>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <SortButton field="date_of_birth">Date of Birth</SortButton>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guardian</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student, index) => {
                    const name = student?.full_name || student?.fullName || "N/A";
                    const admission = student?.admission_number || "N/A";
                    const className = formatClassName(student?.classes?.name) || "N/A";
                    const email = student?.email || "";
                    const dob = student?.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : "";
                    const guardian = student?.guardian_name || "";
                    const gender = student?.gender || "";
                    return (
                      <tr key={student?.id || index} className="hover:bg-gray-50">
                        {showSelection && (
                          <td className="px-4 py-3 whitespace-nowrap sticky left-0 z-10 bg-white w-14 min-w-[3.5rem]">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                              checked={selectedSet.has(student?.id)}
                              onChange={(e) => { e.stopPropagation(); onToggleRow(student?.id); }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                        )}
                        <td className={`px-6 py-4 whitespace-nowrap sticky ${stickyNameLeft} z-10 bg-white`}>
                          <div className="flex items-center">
                            <div
                              className={`flex-shrink-0 ${student?.profile_image ? 'cursor-zoom-in hover:opacity-90 transition' : ''}`}
                              onClick={() => handleImageClick(student)}
                            >
                              <ProfileImage
                                src={student?.profile_image}
                                alt={name}
                                size="sm"
                                className="hover:ring-2 hover:ring-emerald-400"
                                fallbackName={name}
                              />
                            </div>
                            <div className="ml-3 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{name}</div>
                              {admission && <div className="text-xs text-gray-500">ID: {admission}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{admission}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{className}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{gender}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-col">
                            <StatusBadge status={student?.status || 'active'} />
                            {student?.status === 'graduated' && student?.graduated_at && (
                              <span className="text-xs text-gray-500 mt-1">
                                Graduated {new Date(student.graduated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dob}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{guardian}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <ActionsCell
                            student={student}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onPromote={onPromote}
                            onSuspend={onSuspend}
                            onReactivate={onReactivate}
                            onResetPassword={onResetPassword}
                            isMobile={false}
                            operationLoading={operationLoading}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Card Views */}
          {actualViewMode === "cards" && (
            <div className="p-4">
the              <div className="mb-3 -mt-1 flex items-center gap-2 overflow-x-auto whitespace-nowrap sm:hidden">
                <span className="text-xs text-gray-500 mr-1 flex-shrink-0">Sort:</span>
                <button
                  onClick={() => onSort('name')}
                  className={`px-3 py-1.5 text-xs rounded-full border flex-shrink-0 transition-colors ${
                    sortBy === 'name' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Name
                </button>
                <button
                  onClick={() => onSort('admission')}
                  className={`px-3 py-1.5 text-xs rounded-full border flex-shrink-0 transition-colors ${
                    sortBy === 'admission' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Admission
                </button>
                <button
                  onClick={() => onSort('class')}
                  className={`px-3 py-1.5 text-xs rounded-full border flex-shrink-0 transition-colors ${
                    sortBy === 'class' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Class
                </button>
                <button
                  onClick={() => onSort('date_of_birth')}
                  className={`px-3 py-1.5 text-xs rounded-full border flex-shrink-0 transition-colors ${
                    sortBy === 'date_of_birth' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  DOB
                </button>
                <button
                  onClick={() => onSort(sortBy)}
                  title="Toggle sort order"
                  className="ml-1 px-2 py-1.5 text-xs rounded-full border bg-white text-gray-700 border-gray-300 hover:border-gray-400 flex items-center gap-1 flex-shrink-0"
                >
                  {sortOrder === 'asc' ? 'Asc' : 'Desc'}
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'}`}>
                {students.map((student, index) => (
                  <StudentCard
                    key={student?.id || index}
                    student={student}
                    index={index}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-gray-700 text-center sm:text-left">
              Page <span className="font-medium">{currentPage}</span> of{" "}
              <span className="font-medium">{totalPages}</span>
            </div>

            <div className="flex items-center justify-center space-x-1">
              {/* Previous button */}
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden sm:inline">Previous</span>
                <svg
                  className="w-4 h-4 sm:hidden"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              {/* Page numbers */}
              <div className="flex">
                {pageNumbers.map((page, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      typeof page === "number" && onPageChange(page)
                    }
                    disabled={page === "..."}
                    className={`px-3 py-2 text-sm font-medium border-t border-b border-r border-gray-300 transition-colors ${
                      page === currentPage
                        ? "bg-green-600 text-white border-green-600"
                        : page === "..."
                        ? "bg-white text-gray-400 cursor-default"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              {/* Next button */}
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden sm:inline">Next</span>
                <svg
                  className="w-4 h-4 sm:hidden"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Overlay */}
      {imagePreviewModal.open && (
        <div className="fixed inset-0 bg-black/70 z-[2000] flex items-center justify-center p-4" onClick={closeImage}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={imagePreviewModal.src || `https://ui-avatars.com/api/?name=${encodeURIComponent(imagePreviewModal.alt || 'Student')}&size=512&background=random&color=fff&bold=true&format=png`}
              alt={imagePreviewModal.alt}
              className="max-h-[80vh] max-w-[90vw] rounded-xl shadow-2xl"
            />
            <button
              onClick={closeImage}
              className="absolute -top-3 -right-3 bg-white text-gray-700 rounded-full p-2 shadow-lg hover:bg-gray-100"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentTable;