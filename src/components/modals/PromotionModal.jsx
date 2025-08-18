import React, { useState, useEffect } from 'react';
import { SaveButton, CancelButton } from '../ui/ActionButtons';

const PromotionModal = ({ 
  isOpen, 
  onClose, 
  onPromote, 
  student, 
  classes = [], 
  loading = false,
  currentAcademicYear = '2024-2025'
}) => {
  const [promotionData, setPromotionData] = useState({
    toClassId: '',
    academicYear: currentAcademicYear,
    reason: 'End of academic year promotion',
    performance: 'satisfactory',
    attendance: 95,
    specialNotes: ''
  });

  const [errors, setErrors] = useState({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPromotionData({
        toClassId: '',
        academicYear: currentAcademicYear,
        reason: 'End of academic year promotion',
        performance: 'satisfactory',
        attendance: 95,
        specialNotes: ''
      });
      setErrors({});
    }
  }, [isOpen, currentAcademicYear]);

  const validateForm = () => {
    const newErrors = {};

    if (!promotionData.toClassId) {
      newErrors.toClassId = 'Please select a target class';
    }

    if (!promotionData.academicYear) {
      newErrors.academicYear = 'Academic year is required';
    }

    if (!promotionData.reason.trim()) {
      newErrors.reason = 'Promotion reason is required';
    }

    if (promotionData.attendance < 0 || promotionData.attendance > 100) {
      newErrors.attendance = 'Attendance must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const promotionPayload = {
      studentId: student.id,
      fromClassId: student.class_id,
      toClassId: promotionData.toClassId,
      academicYear: promotionData.academicYear,
      promotionReason: promotionData.reason,
      promotionData: {
        performance: promotionData.performance,
        attendance: promotionData.attendance,
        specialNotes: promotionData.specialNotes
      }
    };

    onPromote(promotionPayload);
  };

  // Get available classes (exclude current class)
  const availableClasses = classes.filter(cls => cls.id !== student?.class_id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Promote Student
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Student Info */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{student?.full_name}</h4>
              <p className="text-sm text-gray-600">
                Current Class: {student?.classes?.name || 'Unknown'}
              </p>
              <p className="text-sm text-gray-600">
                Admission Number: {student?.admission_number || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-6">
            {/* Basic Promotion Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Class *
                </label>
                <select
                  value={promotionData.toClassId}
                  onChange={(e) => setPromotionData(prev => ({ ...prev, toClassId: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.toClassId ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select target class</option>
                  {availableClasses.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} - {cls.level} {cls.category && `(${cls.category})`}
                    </option>
                  ))}
                </select>
                {errors.toClassId && (
                  <p className="text-red-500 text-sm mt-1">{errors.toClassId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academic Year *
                </label>
                <input
                  type="text"
                  value={promotionData.academicYear}
                  onChange={(e) => setPromotionData(prev => ({ ...prev, academicYear: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.academicYear ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="2024-2025"
                />
                {errors.academicYear && (
                  <p className="text-red-500 text-sm mt-1">{errors.academicYear}</p>
                )}
              </div>
            </div>

            {/* Performance & Attendance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overall Performance
                </label>
                <select
                  value={promotionData.performance}
                  onChange={(e) => setPromotionData(prev => ({ ...prev, performance: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="satisfactory">Satisfactory</option>
                  <option value="needs_improvement">Needs Improvement</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attendance (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={promotionData.attendance}
                  onChange={(e) => setPromotionData(prev => ({ ...prev, attendance: parseInt(e.target.value) || 0 }))}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.attendance ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.attendance && (
                  <p className="text-red-500 text-sm mt-1">{errors.attendance}</p>
                )}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Promotion Reason *
              </label>
              <input
                type="text"
                value={promotionData.reason}
                onChange={(e) => setPromotionData(prev => ({ ...prev, reason: e.target.value }))}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.reason ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="End of academic year promotion"
              />
              {errors.reason && (
                <p className="text-red-500 text-sm mt-1">{errors.reason}</p>
              )}
            </div>

            {/* Special Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Notes
              </label>
              <textarea
                value={promotionData.specialNotes}
                onChange={(e) => setPromotionData(prev => ({ ...prev, specialNotes: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any additional notes about the promotion..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <CancelButton onClick={onClose} disabled={loading} />
            <SaveButton 
              type="submit" 
              loading={loading} 
              disabled={loading}
              loadingText="Promoting..."
            >
              Promote Student
            </SaveButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PromotionModal;