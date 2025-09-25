import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createSubject, updateSubject } from '../../services/supabase/subjectService';
import useToast from '../../hooks/useToast';

const SubjectForm = ({ subject = null, onSuccess, onCancel }) => {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      name: subject?.name || '',
      code: subject?.code || '',
      description: subject?.description || '',
      department: subject?.department || 'junior',
      is_core: subject?.is_core || false,
    },
  });

  const watchDepartment = watch('department');
  const watchIsCore = watch('is_core');
  const descValue = watch('description') ?? '';

  // Auto-generate code when name or department changes
  const generateSubjectCode = (name, department) => {
    if (!name) return '';

    const baseCode = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 6);

    const deptPrefixMap = {
      junior: 'JUN',
      science: 'SCI',
      art: 'ART',
      commercial: 'COM',
      core: 'COR',
    };

    const selectedDept = department?.trim().toLowerCase();
    const deptPrefix = deptPrefixMap[selectedDept] || '';

    const generatedCode = deptPrefix ? `${deptPrefix}_${baseCode}` : baseCode;
    return generatedCode.substring(0, 10);
  };

  const handleNameChange = (e) => {
    const name = e.target.value;

    if (!subject && name) {
      const generatedCode = generateSubjectCode(name, watchDepartment);
      setValue('code', generatedCode);
    }
  };

  const handleDepartmentChange = (e) => {
    const department = e.target.value;
    const currentName = watch('name');

    if (!subject && currentName) {
      const generatedCode = generateSubjectCode(currentName, department);
      setValue('code', generatedCode);
    }
  };

  const onSubmit = async (data) => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      let result;
      if (subject) {
        result = await updateSubject(subject.id, data);
      } else {
        result = await createSubject(data);
      }

      showToast(`Subject ${subject ? 'updated' : 'created'} successfully!`, 'success');

      // Make the callback non-blocking to prevent race conditions
      if (onSuccess && typeof onSuccess === 'function') {
        setTimeout(() => {
          try {
            onSuccess(result);
          } catch (callbackError) {
            console.error('Error in onSuccess callback:', callbackError);
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error with subject operation:', error);

      let errorMessage = error.message;
      if (error.code === '23505') {
        errorMessage = 'A subject with this code already exists. Please use a different code.';
      }

      showToast(`Failed to ${subject ? 'update' : 'create'} subject: ${errorMessage}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl ring-1 ring-gray-100 p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
              {subject ? 'Edit Subject' : 'Create New Subject'}
            </h2>
            <p className="text-sm text-gray-500">Manage core details for academic subjects</p>
          </div>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close form"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Top grid: Name & Department */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Subject Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject Name *</label>
            <input
              type="text"
              maxLength={50}
              {...register('name', {
                required: 'Subject name is required',
                minLength: {
                  value: 2,
                  message: 'Subject name must be at least 2 characters',
                },
                maxLength: {
                  value: 50,
                  message: 'Subject name cannot exceed 50 characters',
                },
              })}
              onChange={(e) => {
                register('name').onChange(e);
                handleNameChange(e);
              }}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder:text-gray-400"
              placeholder="Enter subject name (e.g., Mathematics, English Language)"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Department *</label>
            <div className="relative">
              <select
                {...register('department', { required: 'Department is required' })}
                onChange={(e) => {
                  register('department').onChange(e);
                  handleDepartmentChange(e);
                }}
                className="w-full appearance-none px-4 py-3 pr-12 rounded-xl border border-gray-300 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all"
              >
                <option value="junior">Junior Secondary</option>
                <option value="science">Science Department</option>
                <option value="art">Arts Department</option>
                <option value="commercial">Commercial Department</option>
                <option value="core">Core Subjects (All Students)</option>
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {errors.department && <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>}
          </div>
        </div>

        {/* Second grid: Code & Core toggle */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Subject Code */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Subject Code</label>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                Auto-generated
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                {...register('code', {
                  required: 'Subject code is required',
                  pattern: {
                    value: /^[A-Z0-9_]+$/,
                    message: 'Subject code must contain only uppercase letters, numbers, and underscores',
                  },
                  maxLength: {
                    value: 10,
                    message: 'Subject code must be 10 characters or less',
                  },
                })}
                className="w-56 md:w-64 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all"
                placeholder="AUTO_CODE"
                style={{ textTransform: 'uppercase' }}
              />
            </div>
            {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>}
            <p className="mt-1 text-xs text-gray-500">Auto-generated from name and department. You can modify it if needed.</p>
          </div>

          {/* Core Subject Toggle - modern switch */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Core Subject</label>
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div>
                <p className="text-sm text-gray-700 font-medium">Is this a core subject?</p>
                <p className="text-xs text-gray-500">Core subjects are mandatory for all students</p>
              </div>
              <div className="flex items-center gap-3">
                <input id="is_core_toggle" type="checkbox" {...register('is_core')} className="sr-only peer" />
                <label htmlFor="is_core_toggle" className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 transition-colors peer-checked:bg-blue-600 cursor-pointer">
                  <span className="inline-block h-5 w-5 translate-x-0 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                </label>
                <span className="text-sm font-medium text-gray-700">{watchIsCore ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <span className={`text-xs ${descValue.length > 200 ? 'text-red-600' : 'text-gray-500'}`}>
              {descValue.length}/250
            </span>
          </div>
          <textarea
            {...register('description', {
              maxLength: {
                value: 250,
                message: 'Description cannot exceed 250 characters',
              },
            })}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder:text-gray-400"
            placeholder="Enter subject description (optional, max 250 characters)"
          />
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium shadow-sm hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isSubmitting && (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            <span>{isSubmitting ? (subject ? 'Updating...' : 'Creating...') : subject ? 'Update Subject' : 'Create Subject'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubjectForm;
