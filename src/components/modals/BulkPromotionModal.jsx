import React, { useEffect, useMemo, useState } from 'react';
import { SaveButton, CancelButton } from '../ui/ActionButtons';

/**
 * BulkPromotionModal
 * Collects required inputs for bulk promotion:
 * - toClassId (required)
 * - academicYear (required)
 * - reason (required)
 * - optional promotionData (performance, attendance, notes)
 */
const BulkPromotionModal = ({
  isOpen,
  onClose,
  onConfirm,
  selectedCount = 0,
  classes = [],
  currentAcademicYear = '2024-2025',
  loading = false,
  selectedStudents = [],
}) => {
  const [form, setForm] = useState({
    toClassId: '',
    academicYear: currentAcademicYear,
    reason: 'End of academic year promotion',
    performance: 'satisfactory',
    attendance: 95,
    specialNotes: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setForm({
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

  const validate = () => {
    const e = {};
    if (!form.toClassId) e.toClassId = 'Please select a target class';
    if (!form.academicYear || !String(form.academicYear).trim()) e.academicYear = 'Academic year is required';
    if (!form.reason || !String(form.reason).trim()) e.reason = 'Reason is required';
    if (form.attendance < 0 || form.attendance > 100) e.attendance = 'Attendance must be between 0 and 100';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onConfirm({
      toClassId: form.toClassId,
      academicYear: form.academicYear,
      promotionReason: form.reason,
      promotionData: {
        performance: form.performance,
        attendance: form.attendance,
        specialNotes: form.specialNotes
      }
    });
  };

  // Get unique list of class_ids of selected students
  const selectedFromClassIds = useMemo(() => {
    const ids = new Set();
    (selectedStudents || []).forEach(s => { if (s && s.class_id) ids.add(s.class_id); });
    return ids;
  }, [selectedStudents]);

  // Only allow target classes that aren't a current from class for selection
  const sortedClasses = useMemo(() => {
    return [...(classes || [])]
      .filter(cls => !selectedFromClassIds.has(cls.id))
      .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
  }, [classes, selectedFromClassIds]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Bulk Promote Students</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">Selected students: <span className="font-medium">{selectedCount}</span></p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* To Class */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Class *</label>
                <select
                  value={form.toClassId}
                  onChange={(e) => setForm((prev) => ({ ...prev, toClassId: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.toClassId ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Select target class</option>
                  {sortedClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} {cls.level ? `- ${cls.level}` : ''} {cls.category ? `(${cls.category})` : ''}
                    </option>
                  ))}
                </select>
                {errors.toClassId && <p className="text-red-500 text-sm mt-1">{errors.toClassId}</p>}
              </div>

              {/* Academic Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year *</label>
                <input
                  type="text"
                  value={form.academicYear}
                  onChange={(e) => setForm((prev) => ({ ...prev, academicYear: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.academicYear ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="2024-2025"
                />
                {errors.academicYear && <p className="text-red-500 text-sm mt-1">{errors.academicYear}</p>}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
              <input
                type="text"
                value={form.reason}
                onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.reason ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="End of academic year promotion"
              />
              {errors.reason && <p className="text-red-500 text-sm mt-1">{errors.reason}</p>}
            </div>

            {/* Optional Data */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Performance</label>
                <select
                  value={form.performance}
                  onChange={(e) => setForm((prev) => ({ ...prev, performance: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="satisfactory">Satisfactory</option>
                  <option value="needs_improvement">Needs Improvement</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attendance (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.attendance}
                  onChange={(e) => setForm((prev) => ({ ...prev, attendance: parseInt(e.target.value) || 0 }))}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.attendance ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.attendance && <p className="text-red-500 text-sm mt-1">{errors.attendance}</p>}
              </div>

              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <input
                  type="text"
                  value={form.specialNotes}
                  onChange={(e) => setForm((prev) => ({ ...prev, specialNotes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional notes"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <CancelButton onClick={onClose} disabled={loading} />
            <SaveButton type="submit" loading={loading} disabled={loading} loadingText="Promoting...">
              Promote {selectedCount > 0 ? `(${selectedCount})` : ''}
            </SaveButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkPromotionModal;
