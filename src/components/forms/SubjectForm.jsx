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
    setValue
  } = useForm({
    defaultValues: {
      name: subject?.name || '',
      code: subject?.code || '',
      description: subject?.description || '',
      department: subject?.department || 'junior',
      credit_hours: subject?.credit_hours || 1,
      is_core: subject?.is_core || false
    }
  });

  const watchDepartment = watch('department');
  const watchIsCore = watch('is_core');

  // Auto-generate code when name or department changes
  const handleNameChange = (e) => {
    const name = e.target.value;
    if (!subject && name) {
      // Auto-generate code for new subjects
      const baseCode = name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 6);
      
      const deptPrefix = watchDepartment ? watchDepartment.toUpperCase().substring(0, 3) : '';
      const generatedCode = deptPrefix ? `${deptPrefix}_${baseCode}` : baseCode;
      
      setValue('code', generatedCode.substring(0, 10));
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    
    try {
      console.log('🔄 Submitting subject data:', data);
      
      let result;
      if (subject) {
        // Update existing subject
        result = await updateSubject(subject.id, data);
      } else {
        // Create new subject
        result = await createSubject(data);
      }
      
      console.log('✅ Subject operation successful:', result);
      
      showToast(
        `Subject ${subject ? 'updated' : 'created'} successfully!`,
        'success'
      );
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      console.error('❌ Error with subject operation:', error);
      showToast(
        `Failed to ${subject ? 'update' : 'create'} subject: ${error.message}`,
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {subject ? 'Edit Subject' : 'Create New Subject'}
        </h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Subject Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject Name *
          </label>
          <input
            type="text"
            {...register('name', {
              required: 'Subject name is required',
              minLength: {
                value: 2,
                message: 'Subject name must be at least 2 characters'
              }
            })}
            onChange={(e) => {
              register('name').onChange(e);
              handleNameChange(e);
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter subject name (e.g., Mathematics, English Language)"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* Subject Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject Code *
          </label>
          <input
            type="text"
            {...register('code', {
              required: 'Subject code is required',
              pattern: {
                value: /^[A-Z0-9_]+$/,
                message: 'Subject code must contain only uppercase letters, numbers, and underscores'
              },
              maxLength: {
                value: 10,
                message: 'Subject code must be 10 characters or less'
              }
            })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter subject code (e.g., MATH101, ENG_LIT)"
            style={{ textTransform: 'uppercase' }}
          />
          {errors.code && (
            <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Auto-generated from name and department. You can modify it if needed.
          </p>
        </div>

        {/* Department */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Department *
          </label>
          <select
            {...register('department', {
              required: 'Department is required'
            })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <option value="junior">Junior Secondary</option>
            <option value="science">Science Department</option>
            <option value="art">Arts Department</option>
            <option value="commercial">Commercial Department</option>
            <option value="core">Core Subjects (All Students)</option>
          </select>
          {errors.department && (
            <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>
          )}
        </div>

        {/* Core Subject Toggle */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Core Subject
              </label>
              <p className="text-xs text-gray-500">
                Core subjects are mandatory for all students regardless of their class category
              </p>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                {...register('is_core')}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label className="ml-2 text-sm font-medium text-gray-700">
                {watchIsCore ? 'Yes, this is a core subject' : 'No, this is not a core subject'}
              </label>
            </div>
          </div>
          
          {watchIsCore && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-800">
                  This subject will be available to all students regardless of their class category (Science, Arts, Commercial).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Credit Hours */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Credit Hours
          </label>
          <input
            type="number"
            min="1"
            max="10"
            {...register('credit_hours', {
              required: 'Credit hours is required',
              min: {
                value: 1,
                message: 'Credit hours must be at least 1'
              },
              max: {
                value: 10,
                message: 'Credit hours cannot exceed 10'
              }
            })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter credit hours (1-10)"
          />
          {errors.credit_hours && (
            <p className="mt-1 text-sm text-red-600">{errors.credit_hours.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            {...register('description')}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter subject description (optional)"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isSubmitting && (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            <span>
              {isSubmitting 
                ? (subject ? 'Updating...' : 'Creating...') 
                : (subject ? 'Update Subject' : 'Create Subject')
              }
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubjectForm;