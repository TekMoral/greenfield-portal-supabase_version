import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import ProfileImage from "../common/ProfileImage";
import ImageModal from "../common/ImageModal";

const StudentTable = ({
  students = [],
  allStudents = [],
  onEdit,
  onDelete,
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
  startItem = 0,
  endItem = 0,
  totalItems = 0,
}) => {
  const { userRole, isSuperAdmin } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('auto');
  const [searchFocused, setSearchFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle image click - only for admins/super admins
  const handleImageClick = useCallback((student) => {
    if ((userRole === 'admin' || isSuperAdmin) && student?.profile_image) {
      setSelectedStudent(student);
      setIsModalOpen(true);
    }
  }, [userRole, isSuperAdmin]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedStudent(null);
  }, []);

  // Clear search with animation
  const clearSearch = useCallback(() => {
    setSearchTerm('');
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
          pages.push('...');
          pages.push(totalPages);
        }
      } else if (currentPage >= totalPages - Math.floor(maxVisiblePages / 2)) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - maxVisiblePages + 2; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  }, [currentPage, totalPages, isMobile]);

  // Determine actual view mode based on screen size and user preference
  const actualViewMode = useMemo(() => {
    if (viewMode === 'auto') {
      return isMobile ? 'cards' : 'table';
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
            sortBy === field && sortOrder === 'asc'
              ? 'text-green-600'
              : 'text-gray-400 group-hover:text-gray-600'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        <svg
          className={`w-3 h-3 -mt-1 transition-all ${
            sortBy === field && sortOrder === 'desc'
              ? 'text-green-600'
              : 'text-gray-400 group-hover:text-gray-600'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
    </button>
  );

  const MobileStudentCard = ({ student, index }) => (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Card Header */}
      <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div
            className={`flex-shrink-0 ${
              (userRole === 'admin' || isSuperAdmin) && student?.profile_image
                ? 'cursor-pointer hover:opacity-80 transition-opacity'
                : ''
            }`}
            onClick={() => handleImageClick(student)}
          >
            <ProfileImage
              src={student?.profile_image}
              alt={student?.full_name || "Student"}
              size="md"
              fallbackName={student?.full_name || ""}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {student?.full_name || "N/A"}
            </h3>
            <p className="text-sm text-gray-600 font-medium">
              ID: {student?.admission_number || "N/A"}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {student?.classes?.name || "N/A"}
              </span>
              {student?.gender && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  student.gender.toLowerCase() === "male"
                    ? "bg-blue-100 text-blue-800"
                    : student.gender.toLowerCase() === "female"
                    ? "bg-pink-100 text-pink-800"
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {student.gender}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4">
        <div className="space-y-3">
          {student?.email && (
            <div className="flex items-start space-x-2">
              <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                <p className="text-sm font-medium text-gray-900 truncate">{student.email}</p>
              </div>
            </div>
          )}

          {student?.date_of_birth && (
            <div className="flex items-start space-x-2">
              <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Date of Birth</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(student.date_of_birth).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {student?.guardian_name && (
            <div className="flex items-start space-x-2">
              <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Guardian</p>
                <p className="text-sm font-medium text-gray-900 truncate">{student.guardian_name}</p>
                {(student?.guardian_phone || student?.contact || student?.phone_number) && (
                  <p className="text-xs text-gray-500 mt-1">
                    📞 {student.guardian_phone || student.contact || student.phone_number}
                  </p>
                )}
              </div>
            </div>
          )}

          {(student?.contact || student?.phone_number) && !student?.guardian_name && (
            <div className="flex items-start space-x-2">
              <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Contact</p>
                <p className="text-sm font-medium text-gray-900">{student.contact || student.phone_number}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <ActionsCell student={student} onEdit={onEdit} onDelete={onDelete} isMobile={true} />
      </div>
    </div>
  );

  const DesktopStudentCard = ({ student, index }) => (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Card Header */}
      <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-100">
        <div className="flex flex-col items-center text-center space-y-3">
          <div
            className={`${
              (userRole === 'admin' || isSuperAdmin) && student?.profile_image
                ? 'cursor-pointer hover:opacity-80 transition-opacity'
                : ''
            }`}
            onClick={() => handleImageClick(student)}
          >
            <ProfileImage
              src={student?.profile_image}
              alt={student?.full_name || "Student"}
              size="lg"
              fallbackName={student?.full_name || ""}
            />
          </div>

          <div className="w-full">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {student?.full_name || "N/A"}
            </h3>
            <p className="text-sm text-gray-600 font-medium">
              ID: {student?.admission_number || "N/A"}
            </p>
            <div className="flex items-center justify-center space-x-2 mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {student?.classes?.name || "N/A"}
              </span>
              {student?.gender && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  student.gender.toLowerCase() === "male"
                    ? "bg-blue-100 text-blue-800"
                    : student.gender.toLowerCase() === "female"
                    ? "bg-pink-100 text-pink-800"
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {student.gender}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6">
        <div className="space-y-4">
          {student?.email && (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Email</p>
                <p className="text-sm font-medium text-gray-900 truncate">{student.email}</p>
              </div>
            </div>
          )}

          {student?.date_of_birth && (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Date of Birth</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(student.date_of_birth).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {student?.guardian_name && (
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Guardian</p>
                <p className="text-sm font-medium text-gray-900 truncate">{student.guardian_name}</p>
                {(student?.guardian_phone || student?.contact || student?.phone_number) && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {student.guardian_phone || student.contact || student.phone_number}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <ActionsCell student={student} onEdit={onEdit} onDelete={onDelete} isDesktopCard={true} />
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Enhanced Header with Search */}
      <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        {/* Search Section */}
        <div className="mb-4">
          <div className={`relative transition-all duration-200 ${
            searchFocused ? 'transform scale-[1.02]' : ''
          }`}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className={`h-5 w-5 transition-colors ${
                  searchFocused ? 'text-green-500' : 'text-gray-400'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={isMobile ? "Search students..." : "Search by name, admission number, email, or class..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className={`w-full pl-10 pr-12 py-3 border rounded-lg transition-all duration-200 text-sm ${
                searchFocused
                  ? 'border-green-500 ring-2 ring-green-200 shadow-md'
                  : 'border-gray-300 hover:border-gray-400'
              } focus:outline-none`}
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center group"
              >
                <div className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                  <svg className="h-4 w-4 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                <span className="font-semibold text-gray-900">{totalItems}</span> student{totalItems !== 1 ? 's' : ''}
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
            {/* Items per page */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap hidden sm:block">Show:</label>
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

            {/* View mode toggle - only show on desktop */}
            {!isMobile && (
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 text-sm transition-colors ${
                    viewMode === 'table'
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  title="Table view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1.5 text-sm transition-colors ${
                    viewMode === 'cards'
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  title="Card view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('auto')}
                  className={`px-3 py-1.5 text-sm transition-colors ${
                    viewMode === 'auto'
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  title="Auto view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {students.length === 0 ? (
        <div className="p-8 sm:p-12 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">
              {searchTerm ? 'No matching students' : 'No students found'}
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
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Search
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Table View - Desktop */}
          {actualViewMode === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Photo
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <SortButton field="name">Student</SortButton>
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <SortButton field="admission">Admission No.</SortButton>
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <SortButton field="class">Class</SortButton>
                    </th>
                    <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gender
                    </th>
                    <th className="hidden xl:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <SortButton field="date_of_birth">Date of Birth</SortButton>
                    </th>
                    <th className="hidden xl:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Guardian & Phone
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student, index) => (
                    <tr key={student?.id || index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div
                          className={`${
                            (userRole === 'admin' || isSuperAdmin) && student?.profile_image
                              ? 'cursor-pointer hover:opacity-80 transition-opacity'
                              : ''
                          }`}
                          onClick={() => handleImageClick(student)}
                          title={(userRole === 'admin' || isSuperAdmin) && student?.profile_image ? 'Click to view larger image' : ''}
                        >
                          <ProfileImage
                            src={student?.profile_image}
                            alt={student?.full_name || "Student"}
                            size="sm"
                            fallbackName={student?.full_name || ""}
                          />
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                            {student?.full_name || "N/A"}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-[200px]">
                            {student?.email || "No email"}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student?.admission_number || "N/A"}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {student?.classes?.name || "N/A"}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          student?.gender?.toLowerCase() === "male"
                            ? "bg-blue-100 text-blue-800"
                            : student?.gender?.toLowerCase() === "female"
                            ? "bg-pink-100 text-pink-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {student?.gender || "N/A"}
                        </span>
                      </td>
                      <td className="hidden xl:table-cell px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student?.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="hidden xl:table-cell px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <div className="truncate max-w-[150px]">
                            {student?.guardian_name || "N/A"}
                          </div>
                          {(student?.guardian_phone || student?.contact || student?.phone_number) && (
                            <div className="text-xs text-gray-500 flex items-center mt-1">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {student.guardian_phone || student.contact || student.phone_number}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <ActionsCell student={student} onEdit={onEdit} onDelete={onDelete} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Card Views */}
          {actualViewMode === 'cards' && (
            <div className="p-4">
              {isMobile ? (
                <div className="space-y-4">
                  {students.map((student, index) => (
                    <MobileStudentCard key={student?.id || index} student={student} index={index} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                  {students.map((student, index) => (
                    <DesktopStudentCard key={student?.id || index} student={student} index={index} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-gray-700 text-center sm:text-left">
              Page <span className="font-medium">{currentPage}</span> of{' '}
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
                <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Page numbers */}
              <div className="flex">
                {pageNumbers.map((page, index) => (
                  <button
                    key={index}
                    onClick={() => typeof page === 'number' && onPageChange(page)}
                    disabled={page === '...'}
                    className={`px-3 py-2 text-sm font-medium border-t border-b border-r border-gray-300 transition-colors ${
                      page === currentPage
                        ? 'bg-green-600 text-white border-green-600'
                        : page === '...'
                        ? 'bg-white text-gray-400 cursor-default'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
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
                <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      <ImageModal
        isOpen={isModalOpen}
        onClose={closeModal}
        student={selectedStudent}
      />
    </div>
  );
};

const ActionsCell = ({ student, onEdit, onDelete, isMobile = false, isDesktopCard = false }) => {
  const { userRole, isSuperAdmin } = useAuth();

  // Hide edit and delete buttons for admin and student users (only show for super admins)
  if ((userRole === 'admin' || userRole === 'student') && !isSuperAdmin) {
    return (
      <div className="text-center">
        <span className="text-gray-400 text-sm">No Permission</span>
      </div>
    );
  }

  if (isMobile || isDesktopCard) {
    return (
      <div className="flex space-x-2">
        <button
          onClick={() => onEdit(student)}
          className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-300 rounded-lg hover:bg-green-100 transition-colors"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔴 Delete button clicked for student:', student);
            console.log('🔴 onDelete function:', onDelete);
            onDelete(student);
          }}
          className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 transition-colors"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => onEdit(student)}
        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-300 rounded-lg hover:bg-green-100 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Edit
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🔴 Delete button clicked for student (table view):', student);
          console.log('🔴 onDelete function:', onDelete);
          onDelete(student);
        }}
        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete
      </button>
    </div>
  );
};

export default StudentTable;
