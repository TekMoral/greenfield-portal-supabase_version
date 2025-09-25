import React, { useEffect, useMemo, useState } from 'react';
import useToast from '../../hooks/useToast';

import {
  getSubjects,
  getSubjectsByDepartment,
  deleteSubject
} from '../../services/supabase/subjectService';
import { useAuth } from '../../hooks/useAuth';
import ConfirmDialog from '../ui/ConfirmDialog';
import SubjectForm from '../forms/SubjectForm';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function SubjectsEnhanced({ department = null }) {
  const { isSuperAdmin } = useAuth();
  const { showToast } = useToast();
  
  const [subjects, setSubjects] = useState([]);
  const [selectedDept, setSelectedDept] = useState(department || 'all');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, subject: null });
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState({ key: 'name', dir: 'asc' });
  const [expandedRows, setExpandedRows] = useState({});

  const queryClient = useQueryClient();

  const subjectsQueryFn = async () => {
    if (selectedDept === 'all') return await getSubjects();
    return await getSubjectsByDepartment(selectedDept);
  };

  const { data: subjectsData, isLoading: subjectsLoading } = useQuery({ queryKey: ['subjects', selectedDept], queryFn: subjectsQueryFn });

  useEffect(() => { if (subjectsData) setSubjects(subjectsData); }, [subjectsData]);

  const refetchSubjects = async () => {
    await queryClient.invalidateQueries({ queryKey: ['subjects', selectedDept] });
  };

  const handleDeleteClick = (subject) => {
    setConfirmDialog({ isOpen: true, subject });
  };

  const handleConfirmDelete = async () => {
    const subjectToDelete = confirmDialog.subject;

    if (subjectToDelete) {
      try {
        await deleteSubject(subjectToDelete.id);
        await refetchSubjects();
        showToast(`${subjectToDelete.name} deleted successfully`, 'success');
      } catch (error) {
        console.error('Error deleting subject:', error);
        showToast('Failed to delete subject. Try again.', 'error');
      }
    }

    setConfirmDialog({ isOpen: false, subject: null });
  };

  const handleCancelDelete = () => {
    setConfirmDialog({ isOpen: false, subject: null });
  };

  const handleDepartmentChange = async (newDept) => {
    setSelectedDept(newDept);
  };

  const handleFormSuccess = async () => {
    setShowForm(false);
    setEditingSubject(null);
    await refetchSubjects();
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingSubject(null);
  };

  const getDepartmentName = (dept) => {
    const names = {
      all: 'All Subjects',
      core: 'Core Subjects (All Students)',
      junior: 'Junior Secondary',
      science: 'Science Department',
      art: 'Arts Department',
      commercial: 'Commercial Department'
    };
    if (dept == null || dept === '') return 'Unassigned';
    return names[dept] || (typeof dept === 'string' ? dept.toUpperCase() : String(dept).toUpperCase());
  };

  const deptBadgeClasses = (dept) => {
    const map = {
      core: 'bg-slate-100 text-slate-700 border-slate-200',
      junior: 'bg-blue-50 text-blue-700 border-blue-200',
      science: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      art: 'bg-purple-50 text-purple-700 border-purple-200',
      commercial: 'bg-amber-50 text-amber-800 border-amber-200',
      default: 'bg-gray-50 text-gray-700 border-gray-200'
    };
    return map[dept] || map.default;
  };

  const toggleSort = (key) => {
    setSortBy((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { key, dir: 'asc' };
    });
  };

  const filteredSortedSubjects = useMemo(() => {
    const term = search.trim().toLowerCase();
    let arr = Array.isArray(subjects) ? [...subjects] : [];

    if (term) {
      arr = arr.filter(s =>
        s.name?.toLowerCase().includes(term) ||
        s.code?.toLowerCase().includes(term) ||
        s.department?.toLowerCase().includes(term) ||
        s.description?.toLowerCase().includes(term)
      );
    }

    arr.sort((a, b) => {
      const dir = sortBy.dir === 'asc' ? 1 : -1;
      const key = sortBy.key;

      let va = a[key];
      let vb = b[key];

      if (key === 'is_core') {
        va = a.is_core ? 1 : 0;
        vb = b.is_core ? 1 : 0;
      }

      if (va == null && vb == null) return 0;
      if (va == null) return -1 * dir;
      if (vb == null) return 1 * dir;

      return String(va).localeCompare(String(vb)) * dir;
    });

    return arr;
  }, [subjects, search, sortBy]);

  if (showForm) {
    return (
      <div className="w-full px-2 md:px-3 lg:px-4 py-4">
        <SubjectForm
          subject={editingSubject}
          onSuccess={handleFormSuccess}
          onCancel={handleCancelForm}
        />
      </div>
    );
  }

  return (
    <div className="w-full px-2 md:px-3 lg:px-4 py-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden backdrop-blur-sm">
        {/* Header with Gradient */}
        <div className={`relative bg-gradient-to-br from-gray-700 via-gray-800 to-black overflow-hidden`}>
          {/* Decorative */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.12),transparent_70%)]"></div>
            <div className="absolute top-6 right-6 w-32 h-32 bg-white bg-opacity-10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-6 left-6 w-24 h-24 bg-white bg-opacity-10 rounded-full blur-xl"></div>
          </div>

          <div className="relative px-6 md:px-8 py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white">Subjects</h2>
                  <p className="text-white/80 text-sm">Subjects Management Table</p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm px-5 py-2.5 rounded-xl border border-white/20 inline-flex items-center gap-2 self-start md:self-auto">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-white font-semibold text-base">{filteredSortedSubjects.length}</span>
                <span className="text-white/80 text-sm">item{filteredSortedSubjects.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 md:p-8 space-y-6">
          {!department && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-white border-2 border-gray-200 rounded-xl px-4 py-3 pr-12 text-gray-700 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all"
                    value={selectedDept}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                  >
                    <option value="all">All Subjects</option>
                    <option value="core">Core Subjects (All Students)</option>
                    <option value="junior">Junior Secondary</option>
                    <option value="science">Science Department</option>
                    <option value="art">Arts Department</option>
                    <option value="commercial">Commercial Department</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
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
                    placeholder="Search by name, code, or department..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="lg:col-span-1 flex items-end justify-start lg:justify-end">
                {isSuperAdmin && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all font-semibold shadow-lg hover:shadow-xl"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create New Subject
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Mobile Cards (sm) */}
          <div className="block md:hidden">
            {subjectsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 ring-1 ring-gray-100 p-4 animate-pulse">
                    <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-24 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-40 mb-3" />
                    <div className="h-3 bg-gray-100 rounded w-full mb-1" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : filteredSortedSubjects.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 ring-1 ring-gray-100 p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <p className="text-gray-700 font-medium mb-1">No subjects found</p>
                <p className="text-gray-500 text-sm">{isSuperAdmin ? 'Create your first subject to get started' : 'No subjects available for this department'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredSortedSubjects.map((subject) => (
                  <div key={subject.id || subject.code} className="bg-white rounded-xl border border-gray-200 ring-1 ring-gray-100 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-base font-semibold text-gray-900">{subject.name}</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-gray-100 text-gray-800 border border-gray-200">{subject.code}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${deptBadgeClasses(subject.department)}`}>{getDepartmentName(subject.department)}</span>
                          {subject.is_core ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">Core</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-50 text-gray-700 border border-gray-200">Elective</span>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${subject.status === 'inactive' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                        {subject.status || 'active'}
                      </span>
                    </div>

                    {subject.description ? (
                      <div className="mt-3 space-y-1">
                        <div className={`text-sm text-gray-700 ${expandedRows[subject.id || subject.code] ? '' : 'line-clamp-2'}`}>{subject.description}</div>
                        {subject.description.length > 80 && (
                          <button
                            type="button"
                            onClick={() => setExpandedRows(prev => ({ ...prev, [subject.id || subject.code]: !prev[subject.id || subject.code] }))}
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
                            aria-expanded={expandedRows[subject.id || subject.code] ? 'true' : 'false'}
                          >
                            {expandedRows[subject.id || subject.code] ? 'Show less' : 'Show more'}
                            <svg className={`w-3.5 h-3.5 transition-transform ${expandedRows[subject.id || subject.code] ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.085l3.71-3.855a.75.75 0 111.08 1.04l-4.24 4.405a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ) : null}

                    {isSuperAdmin && (
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(subject)}
                          className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(subject)}
                          className="px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg border border-red-200 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <button className="inline-flex items-center gap-1" onClick={() => toggleSort('name')}>
                        Subject
                        <SortIcon active={sortBy.key === 'name'} dir={sortBy.dir} />
                      </button>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <button className="inline-flex items-center gap-1" onClick={() => toggleSort('code')}>
                        Code
                        <SortIcon active={sortBy.key === 'code'} dir={sortBy.dir} />
                      </button>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <button className="inline-flex items-center gap-1" onClick={() => toggleSort('department')}>
                        Department
                        <SortIcon active={sortBy.key === 'department'} dir={sortBy.dir} />
                      </button>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <button className="inline-flex items-center gap-1" onClick={() => toggleSort('is_core')}>
                        Type
                        <SortIcon active={sortBy.key === 'is_core'} dir={sortBy.dir} />
                      </button>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <button className="inline-flex items-center gap-1" onClick={() => toggleSort('description')}>
                        Description
                        <SortIcon active={sortBy.key === 'description'} dir={sortBy.dir} />
                      </button>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    {isSuperAdmin && (
                      <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {subjectsLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-48" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-40" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-64" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                        {isSuperAdmin && <td className="px-6 py-4 text-right"><div className="h-8 bg-gray-100 rounded w-24 ml-auto" /></td>}
                      </tr>
                    ))
                  ) : filteredSortedSubjects.length === 0 ? (
                    <tr>
                      <td colSpan={isSuperAdmin ? 7 : 6} className="px-6 py-16">
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200 mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                          <p className="text-gray-700 font-medium text-lg mb-1">No subjects found</p>
                          <p className="text-gray-500 text-sm">{isSuperAdmin ? 'Create your first subject to get started' : 'No subjects available for this department'}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSortedSubjects.map((subject) => (
                      <tr key={subject.id || subject.code} className="hover:bg-gray-50/60">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{subject.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-gray-100 text-gray-800 border border-gray-200">
                            {subject.code}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${deptBadgeClasses(subject.department)}`}>
                            {getDepartmentName(subject.department)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {subject.is_core ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">Core</span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">Elective</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {subject.description ? (
                            <div className="space-y-1">
                              <div className={`text-sm text-gray-700 ${expandedRows[subject.id || subject.code] ? '' : 'line-clamp-2'}`}>
                                {subject.description}
                              </div>
                              {subject.description.length > 80 && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedRows(prev => ({ ...prev, [subject.id || subject.code]: !prev[subject.id || subject.code] }))}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
                                  aria-expanded={expandedRows[subject.id || subject.code] ? 'true' : 'false'}
                                >
                                  {expandedRows[subject.id || subject.code] ? 'Show less' : 'Show more'}
                                  <svg className={`w-3.5 h-3.5 transition-transform ${expandedRows[subject.id || subject.code] ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.085l3.71-3.855a.75.75 0 111.08 1.04l-4.24 4.405a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${subject.status === 'inactive' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                            {subject.status || 'active'}
                          </span>
                        </td>
                        {isSuperAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => handleEdit(subject)}
                                className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteClick(subject)}
                                className="px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg border border-red-200 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Subject"
        message={`Are you sure you want to delete "${confirmDialog.subject?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}

function SortIcon({ active, dir }) {
  return (
    <span className={`inline-flex flex-col leading-none ml-0.5 ${active ? 'text-gray-700' : 'text-gray-300'}`}>
      <svg className={`w-3 h-3 ${active && dir === 'asc' ? 'opacity-100' : 'opacity-40'}`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 14l5-5 5 5H7z" />
      </svg>
      <svg className={`w-3 h-3 -mt-1 ${active && dir === 'desc' ? 'opacity-100' : 'opacity-40'}`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 10l5 5 5-5H7z" />
      </svg>
    </span>
  );
}