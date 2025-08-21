import React, { useEffect, useState, useCallback } from 'react';
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

  const queryClient = useQueryClient();

  const subjectsQueryFn = async () => {
    if (selectedDept === 'all') return await getSubjects();
    return await getSubjectsByDepartment(selectedDept);
  };

  const { data: subjectsData, isLoading: subjectsLoading, error: subjectsError } = useQuery({ queryKey: ['subjects', selectedDept], queryFn: subjectsQueryFn });

  useEffect(() => { if (subjectsData) setSubjects(subjectsData); }, [subjectsData]);

  const refetchSubjects = async () => {
    await queryClient.invalidateQueries({ queryKey: ['subjects', selectedDept] });
  };

  useEffect(() => {
    // React Query handles fetching via selectedDept key
  }, [selectedDept]);

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

  const handleFormSuccess = async (subjectData) => {
    // Reset form state
    setShowForm(false);
    setEditingSubject(null);
    
    // Invalidate query so server data is the source of truth
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

  const getDepartmentColor = (dept) => {
    const colors = {
      all: 'bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800',
      core: 'bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800',
      junior: 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700',
      science: 'bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700',
      art: 'bg-gradient-to-br from-purple-500 via-pink-600 to-rose-700',
      commercial: 'bg-gradient-to-br from-amber-500 via-orange-600 to-red-700'
    };
    return colors[dept] || 'bg-gradient-to-br from-gray-500 to-gray-700';
  };

  const getDepartmentAccent = (dept) => {
    const accents = {
      all: 'from-gray-50 to-gray-100 border-gray-200',
      core: 'from-slate-50 to-slate-100 border-slate-200',
      junior: 'from-blue-50 to-indigo-50 border-blue-200',
      science: 'from-emerald-50 to-teal-50 border-emerald-200',
      art: 'from-purple-50 to-pink-50 border-purple-200',
      commercial: 'from-amber-50 to-orange-50 border-amber-200'
    };
    return accents[dept] || 'from-gray-50 to-gray-100 border-gray-200';
  };

  const getDepartmentIcon = (dept) => {
    const icons = {
      all: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      core: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      junior: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      science: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      art: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM7 3H5a2 2 0 00-2 2v12a4 4 0 004 4h2m6-16v9a2 2 0 01-2 2H9m8-11V9a2 2 0 01-2 2H9" />
        </svg>
      ),
      commercial: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    };
    return icons[dept] || icons.junior;
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

  if (showForm) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <SubjectForm
          subject={editingSubject}
          onSuccess={handleFormSuccess}
          onCancel={handleCancelForm}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden backdrop-blur-sm">
        {/* Enhanced Header with Gradient */}
        <div className={`relative ${getDepartmentColor(selectedDept)} overflow-hidden`}>
          {/* Decorative Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]"></div>
            <div className="absolute top-4 right-4 w-32 h-32 bg-white bg-opacity-5 rounded-full blur-2xl"></div>
            <div className="absolute bottom-4 left-4 w-24 h-24 bg-white bg-opacity-5 rounded-full blur-xl"></div>
          </div>
          
          <div className="relative px-8 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                  <div className="text-white">
                    {getDepartmentIcon(selectedDept)}
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-1">
                    {getDepartmentName(selectedDept)}
                  </h2>
                  <p className="text-white text-opacity-90 text-sm font-medium">
                    Enhanced Subject Management Portal
                  </p>
                </div>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur-sm px-6 py-3 rounded-xl border border-white border-opacity-30">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-white font-semibold text-lg">
                    {subjects.length}
                  </span>
                  <span className="text-white text-opacity-90 text-sm">
                    subject{subjects.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Enhanced Department Selector */}
          {!department && (
            <div className={`bg-gradient-to-r ${getDepartmentAccent(selectedDept)} rounded-xl p-6 border-2 border-dashed`}>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <label className="text-lg font-semibold text-gray-800">
                    Select Department
                  </label>
                </div>
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-white border-2 border-gray-200 rounded-xl px-6 py-4 pr-12 text-gray-700 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-300 hover:border-gray-300 text-lg font-medium shadow-lg"
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
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add New Subject Button */}
          {isSuperAdmin && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create New Subject
              </button>
            </div>
          )}

          {/* Enhanced Subject List */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <label className="text-lg font-semibold text-gray-800">
                Current Subjects
              </label>
            </div>
            
            {subjectsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-l-blue-400 rounded-full animate-spin animation-delay-150"></div>
                  </div>
                  <span className="text-gray-600 font-medium text-lg">Loading subjects...</span>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                {subjects.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-6 text-gray-300">
                      <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <p className="text-gray-600 text-xl font-semibold mb-2">No subjects found</p>
                    <p className="text-gray-500 text-base">
                      {isSuperAdmin ? 'Create your first subject to get started' : 'No subjects available for this department'}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {subjects.map((subject, i) => (
                      <div key={subject.id || i} className="bg-white p-6 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 group transform hover:-translate-y-1">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-lg"></div>
                                <span className="text-lg font-semibold text-gray-800">{subject.name}</span>
                              </div>
                              <div className="bg-gray-100 px-3 py-1 rounded-full">
                                <span className="text-sm font-medium text-gray-600">{subject.code}</span>
                              </div>
                              {subject.is_core && (
                                <div className="bg-blue-100 px-3 py-1 rounded-full">
                                  <span className="text-sm font-medium text-blue-800">Core Subject</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Department:</span>
                                <p className="text-gray-800">{getDepartmentName(subject.department)}</p>
                              </div>
                              <div>
                                <span className="font-medium">Credit Hours:</span>
                                <p className="text-gray-800">{subject.credit_hours || 1}</p>
                              </div>
                              <div>
                                <span className="font-medium">Type:</span>
                                <p className="text-gray-800">{subject.is_core ? 'Core' : 'Elective'}</p>
                              </div>
                              <div>
                                <span className="font-medium">Status:</span>
                                <p className="text-gray-800">{subject.status || 'Active'}</p>
                              </div>
                            </div>
                            
                            {subject.description && (
                              <div className="mt-3">
                                <span className="text-sm font-medium text-gray-600">Description:</span>
                                <p className="text-sm text-gray-700 mt-1">{subject.description}</p>
                              </div>
                            )}
                          </div>
                          
                          {isSuperAdmin && (
                            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <button
                                onClick={() => handleEdit(subject)}
                                className="px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 flex items-center gap-2 font-medium"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteClick(subject)}
                                className="px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-300 flex items-center gap-2 font-medium"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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