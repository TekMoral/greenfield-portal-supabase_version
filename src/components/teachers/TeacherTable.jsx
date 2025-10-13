import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import ProfileImage from "../common/ProfileImage";
import { EditButton, DeleteButton, SuspendButton, ReactivateButton } from "../ui/ActionButtons";
import { getTeacherSubjects } from "../../services/supabase/teacherService";

const TeacherTable = ({
  teachers = [],
  allTeachers = [],
  onEdit,
  onDelete,
  onSuspend,
  onReactivate,
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
  operationLoading = { create: false, update: false, delete: false, suspend: false, reactivate: false },
  rowLoading = { suspend: {}, reactivate: {} },
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
  const [viewMode, setViewMode] = useState("auto");
  const [searchFocused, setSearchFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [assignedSubjectsMap, setAssignedSubjectsMap] = useState({}); // { [teacherId]: [{ name, classes: [] }] }
  const [expandedTeachers, setExpandedTeachers] = useState({}); // { [teacherId]: true|false }
  const toggleExpand = useCallback((id) => {
    if (!id) return;
    setExpandedTeachers((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Selection helpers
  const selectedSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);
  const allSelectedOnPage = useMemo(
    () => showSelection && teachers.length > 0 && teachers.every((t) => selectedSet.has(t.id)),
    [showSelection, teachers, selectedSet]
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

  // Fetch assigned subjects for current page teachers
  useEffect(() => {
    const ids = (teachers || []).map(t => t?.id).filter(Boolean);
    if (!ids.length) return;
    let cancelled = false;

    (async () => {
      const updates = {};
      await Promise.all(ids.map(async (id) => {
        try {
          // Skip if already loaded for this teacher id
          if (assignedSubjectsMap[id]) return;
          const res = await getTeacherSubjects(id);
          const rows = res?.success ? (res.data || []) : [];
          const normalize = (s) => String(s || '').trim().replace(/\s+/g, ' ');
          const keyify = (s) => normalize(s).toUpperCase();
          const subjMap = new Map(); // key -> { name, classes: Map<classKey, classDisplay> }
          rows.forEach((r) => {
            const subjRaw = r?.subjects?.name || r?.subject?.name || r?.subject_name;
            const classRaw = r?.classes?.name || r?.class?.name;
            const subjKey = keyify(subjRaw);
            if (!subjKey) return;
            if (!subjMap.has(subjKey)) {
              subjMap.set(subjKey, { name: normalize(subjRaw), classes: new Map() });
            }
            const classKey = keyify(classRaw);
            const classDisplay = normalize(classRaw);
            if (classKey) {
              const entry = subjMap.get(subjKey);
              if (!entry.classes.has(classKey)) entry.classes.set(classKey, classDisplay);
            }
          });
          updates[id] = Array.from(subjMap.values()).map(({ name, classes }) => ({ name, classes: Array.from(classes.values()) }));
        } catch (_) {
          updates[id] = [];
        }
      }));
      if (!cancelled && Object.keys(updates).length) {
        setAssignedSubjectsMap((prev) => ({ ...prev, ...updates }));
      }
    })();

    return () => { cancelled = true; };
  }, [teachers]);

  // Handle image click - only for admins/super admins
  const openImage = useCallback((src, alt) => {
    setImagePreviewModal({ open: true, src: src || '', alt: alt || 'Teacher' });
  }, []);
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
      className={`flex items-center space-x-1 text-left font-semibold text-gray-900 hover:text-blue-600 transition-colors group ${className}`}
    >
      <span>{children}</span>
      <div className="flex flex-col">
        <svg
          className={`w-3 h-3 transition-all ${
            sortBy === field && sortOrder === "asc"
              ? "text-blue-600"
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
              ? "text-blue-600"
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
    teacher,
    onEdit,
    onDelete,
    onSuspend,
    onReactivate,
    isMobile = false,
    isDesktopCard = false,
    operationLoading = { create: false, update: false, delete: false, suspend: false, reactivate: false },
    rowLoading = { suspend: {}, reactivate: {} },
  }) => {
    const { userRole, isSuperAdmin } = useAuth();

    // Check permissions
    const canEdit = userRole === "super_admin" || isSuperAdmin;
    const canDelete = userRole === "super_admin" || isSuperAdmin;
    const canSuspend = ["super_admin", "admin"].includes(userRole) || isSuperAdmin;

    if (!canEdit && !canDelete && !canSuspend) {
      return (
        <div className="text-center">
          <span className="text-gray-400 text-sm">No Permission</span>
        </div>
      );
    }

    const teacherStatus = teacher?.isActive ? 'active' : 'inactive';

    if (isMobile || isDesktopCard) {
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {canEdit && (
              <EditButton
                onClick={() => onEdit(teacher)}
                loading={operationLoading?.update}
                disabled={operationLoading?.update}
                className="w-full"
                size="xs"
              />
            )}
            {canSuspend && teacherStatus === 'active' && onSuspend && (
              <SuspendButton
                onClick={() => onSuspend(teacher)}
                loading={rowLoading?.suspend?.[teacher.id] ?? operationLoading?.suspend}
                disabled={rowLoading?.suspend?.[teacher.id] ?? operationLoading?.suspend}
                className="w-full"
                size="xs"
              />
            )}
            {canSuspend && teacherStatus === 'inactive' && onReactivate && (
              <ReactivateButton
                onClick={() => onReactivate(teacher)}
                loading={rowLoading?.reactivate?.[teacher.id] ?? operationLoading?.reactivate}
                disabled={rowLoading?.reactivate?.[teacher.id] ?? operationLoading?.reactivate}
                className="w-full"
                size="xs"
              />
            )}
          </div>
          {canDelete && (
            <div className="flex justify-center">
              <DeleteButton
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(teacher);
                }}
                loading={operationLoading?.delete}
                disabled={operationLoading?.delete}
                className="w-2/3 max-w-xs"
                size="xs"
              />
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-1">
        {canEdit && (
          <EditButton
            onClick={() => onEdit(teacher)}
            loading={operationLoading?.update}
            disabled={operationLoading?.update}
          />
        )}
                
        {canSuspend && teacherStatus === 'active' && onSuspend && (
          <SuspendButton
            onClick={() => onSuspend(teacher)}
            loading={rowLoading?.suspend?.[teacher.id] ?? operationLoading?.suspend}
            disabled={rowLoading?.suspend?.[teacher.id] ?? operationLoading?.suspend}
          />
        )}
        
        {canSuspend && teacherStatus === 'inactive' && onReactivate && (
          <ReactivateButton
            onClick={() => onReactivate(teacher)}
            loading={rowLoading?.reactivate?.[teacher.id] ?? operationLoading?.reactivate}
            disabled={rowLoading?.reactivate?.[teacher.id] ?? operationLoading?.reactivate}
          />
        )}
        
        {canDelete && (
          <DeleteButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(teacher);
            }}
            loading={operationLoading?.delete}
            disabled={operationLoading?.delete}
          />
        )}
      </div>
    );
  };

  const StatusBadge = ({ isActive }) => {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        isActive 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const TeacherCard = ({ teacher, index }) => (
    <div className="bg-white border border-emerald-200 ring-1 ring-emerald-50 rounded-lg shadow-sm hover:shadow-md hover:border-emerald-300 transition-colors duration-200 overflow-hidden">
      {/* Card Header */}
      <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
        <div className="flex flex-col items-center sm:flex-row sm:items-center sm:space-x-3 space-y-3 sm:space-y-0">
          <div
            className={`flex-shrink-0 ${teacher?.profileImageUrl ? 'cursor-zoom-in hover:opacity-90 transition' : ''} mx-auto sm:mx-0`}
            onClick={() => openImage(teacher?.profileImageUrl || '', teacher?.name || 'Teacher')}
          >
            <ProfileImage
            src={teacher?.profileImageUrl}
            alt={teacher?.name || "Teacher"}
            size="lg"
            className="hover:ring-2 hover:ring-emerald-400"
            fallbackName={teacher?.name || ""}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 sm:truncate break-words text-center sm:text-left">
              {teacher?.name || "N/A"}
            </h3>
                        <div className="flex items-center justify-center sm:justify-start space-x-2 mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                {teacher?.subject || "N/A"}
              </span>
              <StatusBadge isActive={teacher?.isActive} />
            </div>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4">
        <div className="space-y-3">
          {/* Assigned Subjects */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Assigned Subjects</p>
              <button
                type="button"
                onClick={() => toggleExpand(teacher?.id)}
                className="text-xs font-medium text-sky-600 hover:text-sky-700"
              >
                {expandedTeachers[teacher?.id] ? 'Hide' : 'View'}
              </button>
            </div>
            {expandedTeachers[teacher?.id] ? (
              Array.isArray(assignedSubjectsMap[teacher?.id]) && assignedSubjectsMap[teacher?.id].length > 0 ? (
                <div className="space-y-2">
                  {assignedSubjectsMap[teacher?.id].map((s) => (
                    <div key={s.name}>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs bg-indigo-50 border-indigo-200 text-indigo-700">
                        {s.name}
                      </span>
                      {Array.isArray(s.classes) && s.classes.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {s.classes.map((cls) => (
                            <span
                              key={cls}
                              className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs bg-slate-100 border-slate-200 text-slate-700"
                            >
                              {cls}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-gray-500">No classes assigned</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">None</div>
              )
            ) : null}
          </div>
          {teacher?.email && (
            <div className="flex items-start space-x-2">
              <svg
                className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0"
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
                  {teacher.email}
                </p>
              </div>
            </div>
          )}

          {teacher?.phoneNumber && (
            <div className="flex items-start space-x-2">
              <svg
                className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Phone
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {teacher.phoneNumber}
                </p>
              </div>
            </div>
          )}

          {teacher?.qualification && (
            <div className="flex items-start space-x-2">
              <svg
                className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Qualification
                </p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {teacher.qualification}
                </p>
              </div>
            </div>
          )}

          {teacher?.dateHired && (
            <div className="flex items-start space-x-2">
              <svg
                className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0"
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
                  Date Hired
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(teacher.dateHired).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-4 py-3 bg-emerald-50/40 border-t border-emerald-100">
        <ActionsCell
          teacher={teacher}
          onEdit={onEdit}
          onDelete={onDelete}
          onSuspend={onSuspend}
          onReactivate={onReactivate}
          isMobile={true}
          operationLoading={operationLoading}
          rowLoading={rowLoading}
        />
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Enhanced Header with Search */}
      <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
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
                  searchFocused ? "text-blue-500" : "text-gray-400"
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
                  ? "Search teachers..."
                  : "Search by name, email, subject, or qualification..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className={`w-full pl-10 pr-12 py-3 border rounded-lg transition-all duration-200 text-sm ${
                searchFocused
                  ? "border-blue-500 ring-2 ring-blue-200 shadow-md"
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
                teacher{totalItems !== 1 ? "s" : ""}
                {searchTerm && (
                  <span className="ml-2 text-blue-600 font-medium">
                    (filtered from {allTeachers.length} total)
                  </span>
                )}
              </>
            ) : (
              <span>No teachers found</span>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Items per page */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap hidden sm:block">
                Show:
              </label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
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
      {teachers.length === 0 ? (
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
              {searchTerm ? "No matching teachers" : "No teachers found"}
            </h3>
            <p className="text-gray-500 max-w-sm text-sm sm:text-base mb-4 text-center">
              {searchTerm
                ? "Try adjusting your search criteria or clear the search to see all teachers."
                : "No teachers have been added yet. Click 'Add Teacher' to get started."}
            </p>
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
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
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={allSelectedOnPage}
                          onChange={(e) => onToggleAll((teachers || []).map(t => t?.id).filter(Boolean), e.target.checked)}
                        />
                      </th>
                    )}
                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky ${showSelection ? 'left-14' : 'left-0'} z-10 bg-gray-50`}>
                      <SortButton field="name">Teacher</SortButton>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <SortButton field="email">Email</SortButton>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <SortButton field="subject">Subject</SortButton>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Subjects</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <SortButton field="dateHired">Date Hired</SortButton>
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teachers.map((teacher, index) => {
                    const name = teacher?.name || 'N/A';
                    const email = teacher?.email || '';
                    const subject = teacher?.subject || 'N/A';
                    const phone = teacher?.phoneNumber || '';
                    const dateHired = teacher?.dateHired ? new Date(teacher.dateHired).toLocaleDateString() : '';
                    return (
                      <tr key={teacher?.id || index} className="hover:bg-gray-50">
                        {showSelection && (
                          <td className="px-4 py-3 whitespace-nowrap sticky left-0 z-10 bg-white w-14 min-w-[3.5rem]">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedSet.has(teacher?.id)}
                              onChange={(e) => { e.stopPropagation(); onToggleRow(teacher?.id); }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                        )}
                        <td className={`px-6 py-4 whitespace-nowrap sticky ${showSelection ? 'left-14' : 'left-0'} z-10 bg-white`}>
                          <div className="flex items-center">
                            <div
                              className={`flex-shrink-0 ${teacher?.profileImageUrl ? 'cursor-zoom-in hover:opacity-90 transition' : ''}`}
                              onClick={() => openImage(teacher?.profileImageUrl || '', name)}
                            >
                              <ProfileImage
                                src={teacher?.profileImageUrl}
                                alt={name}
                                size="sm"
                                className="hover:ring-2 hover:ring-blue-400"
                                fallbackName={name}
                              />
                            </div>
                            <div className="ml-3 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate max-w-[220px]" title={name}>{name}</div>
                              {email && <div className="text-xs text-gray-500 truncate max-w-[220px]" title={email}>{email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{subject}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="max-w-[420px]">
                            {!expandedTeachers[teacher?.id] ? (
                              <button
                                type="button"
                                onClick={() => toggleExpand(teacher?.id)}
                                className="text-xs font-medium text-sky-600 hover:text-sky-700"
                              >
                                View{Array.isArray(assignedSubjectsMap[teacher?.id]) && assignedSubjectsMap[teacher?.id].length ? ` (${assignedSubjectsMap[teacher?.id].length})` : ''}
                              </button>
                            ) : (
                              <div className="space-y-1">
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(teacher?.id)}
                                  className="text-xs font-medium text-sky-600 hover:text-sky-700"
                                >
                                  Hide
                                </button>
                                <div className="space-y-2">
                                  {Array.isArray(assignedSubjectsMap[teacher?.id]) && assignedSubjectsMap[teacher?.id].length > 0 ? (
                                    assignedSubjectsMap[teacher?.id].map((s) => (
                                      <div key={s.name}>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs bg-indigo-50 border-indigo-200 text-indigo-700">
                                          {s.name}
                                        </span>
                                        {Array.isArray(s.classes) && s.classes.length > 0 ? (
                                          <div className="mt-1 flex flex-wrap gap-1">
                                            {s.classes.map((cls) => (
                                              <span
                                                key={cls}
                                                className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs bg-slate-100 border-slate-200 text-slate-700"
                                              >
                                                {cls}
                                              </span>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="mt-1 text-xs text-gray-400">No classes</div>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{phone}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <StatusBadge isActive={teacher?.isActive} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dateHired}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <ActionsCell
                            teacher={teacher}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onSuspend={onSuspend}
                            onReactivate={onReactivate}
                            isMobile={false}
                            operationLoading={operationLoading}
                            rowLoading={rowLoading}
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
            <div className="px-0 py-4">
              <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'}`}>
                {teachers.map((teacher, index) => (
                  <TeacherCard
                    key={teacher?.id || index}
                    teacher={teacher}
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
                        ? "bg-blue-600 text-white border-blue-600"
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
              src={imagePreviewModal.src || `https://ui-avatars.com/api/?name=${encodeURIComponent(imagePreviewModal.alt || 'Teacher')}&size=512&background=random&color=fff&bold=true&format=png`}
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

export default TeacherTable;