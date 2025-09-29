import React, { useState, useEffect } from 'react';
import { calculateGrade } from '../../services/supabase/studentResultService';

const MobileAdminScoreForm = ({ result, onSubmit, isReadOnly = false }) => {
  const [formData, setFormData] = useState({
    adminScore: '',
    adminMaxScore: 20
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (result) {
      setFormData({
        adminScore: result.adminScore || '',
        adminMaxScore: result.adminMaxScore || 20
      });
    }
  }, [result]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const adminScoreVal = formData.adminScore;

    if (adminScoreVal === '' || adminScoreVal === null || adminScoreVal === undefined) {
      newErrors.adminScore = 'Admin score is required';
    } else {
      const score = parseFloat(adminScoreVal);
      const maxScore = parseFloat(formData.adminMaxScore);

      if (isNaN(score) || score < 0) {
        newErrors.adminScore = 'Score must be a valid number';
      }
      if (score > maxScore) {
        newErrors.adminScore = `Score cannot exceed ${maxScore}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly || isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Calculate teacher subtotal (out of 80) with robust fallbacks
      const teacherScore = Number(result.totalScore ?? result.score ?? ((result.testScore || 0) + (result.examScore || 0))) || 0;
      
      await onSubmit({
        adminScore: parseFloat(formData.adminScore),
        adminMaxScore: parseFloat(formData.adminMaxScore),
        teacherScore: teacherScore,
        result: result // Pass the result object so the parent knows which result to update
      });
    } catch (error) {
      setErrors({ adminScore: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate teacher subtotal (out of 80) with robust fallbacks
  const teacherScore = Number(result.totalScore ?? result.score ?? ((result.testScore || 0) + (result.examScore || 0))) || 0;
  const originalScore = teacherScore; // out of 80
  const originalMaxScore = 80;

  // Calculate projected final scores
  const projectedAdminScore = parseFloat(formData.adminScore) || 0;
  const projectedTotalScore = originalScore + projectedAdminScore;
  const projectedGrade = calculateGrade(projectedTotalScore, 100);

  return (
    <div className="pt-2 border-t border-emerald-300">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Admin Assessment Header */}
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-emerald-800">Admin Assessment (20%)</h4>
          {isReadOnly && <span className="text-xs text-emerald-600">Read Only</span>}
        </div>
        
        {/* Admin Score Input */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-emerald-700 mb-1">
              Admin Score *
            </label>
            <input
              type="number"
              name="adminScore"
              value={formData.adminScore}
              onChange={handleChange}
              min="0"
              max={formData.adminMaxScore}
              step="0.5"
              disabled={isReadOnly || isSubmitting}
              className={`w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                errors.adminScore ? 'border-red-500' : 'border-emerald-300'
              } ${isReadOnly || isSubmitting ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder="0-20"
            />
            {errors.adminScore && <p className="text-red-500 text-xs mt-1">{errors.adminScore}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-emerald-700 mb-1">
              Max Score
            </label>
            <input
              type="number"
              name="adminMaxScore"
              value={formData.adminMaxScore}
              onChange={handleChange}
              min="1"
              disabled={isReadOnly || isSubmitting}
              className={`w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                isReadOnly || isSubmitting ? 'bg-gray-100 cursor-not-allowed border-emerald-200' : 'border-emerald-300'
              }`}
              placeholder="20"
            />
          </div>
        </div>

        {/* Score Summary */}
        {(formData.adminScore || formData.adminScore === 0) && (
          <div className="bg-green-50 rounded p-2 border border-green-200">
            <h5 className="text-xs font-medium text-green-900 mb-2">Final Score Preview</h5>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-green-700">Teacher:</span>
                <span className="font-medium ml-1">{originalScore}/80</span>
              </div>
              <div>
                <span className="text-green-700">Admin:</span>
                <span className="font-medium ml-1">{formData.adminScore || 0}/20</span>
              </div>
              <div>
                <span className="text-green-700">Total:</span>
                <span className="font-medium ml-1">{projectedTotalScore}/100</span>
              </div>
              <div>
                <span className="text-green-700">Grade:</span>
                <span className="font-medium ml-1">{projectedGrade.grade}</span>
              </div>
            </div>
            <div className="mt-2 text-center">
              <div className="text-lg font-bold text-green-800">{((projectedTotalScore / 100) * 100).toFixed(1)}%</div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        {!isReadOnly && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !formData.adminScore}
              className="px-3 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save Score'}
            </button>
          </div>
        )}

        {/* Notice */}
        {!isReadOnly && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
            <p className="text-xs text-yellow-700">
              💡 Score will be saved and can be published later with other results.
            </p>
          </div>
        )}
      </form>
    </div>
  );
};

export default MobileAdminScoreForm;