import React from 'react';

const RemarksSection = ({
  remarks,
  editingRemarks,
  savingRemarks,
  onRemarksChange,
  onEditingRemarksChange,
  onSaveRemarks
}) => {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h4 className="text-base sm:text-lg font-semibold text-slate-800">Teacher Remarks</h4>
        <div className="flex flex-col sm:flex-row gap-2">
          {!editingRemarks ? (
            <button
              onClick={() => onEditingRemarksChange(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              {remarks ? 'Edit Remarks' : 'Add Remarks'}
            </button>
          ) : (
            <>
              <button
                onClick={() => onEditingRemarksChange(false)}
                className="bg-slate-500 text-white px-4 py-2 rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => onSaveRemarks(remarks)}
                disabled={savingRemarks}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {savingRemarks ? 'Saving...' : 'Save Remarks'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-4 sm:p-6">
        {editingRemarks ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Remarks (Max 100 characters)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => onRemarksChange(e.target.value.slice(0, 100))}
              placeholder="Enter your remarks about this student's performance..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
              rows={3}
              maxLength={100}
            />
            <div className="text-right text-sm text-slate-500 mt-1">
              {remarks.length}/100 characters
            </div>
          </div>
        ) : (
          <div>
            {remarks ? (
              <div className="bg-white rounded-lg p-4 border">
                <div className="text-slate-800">{remarks}</div>
                <div className="text-sm text-slate-500 mt-2">
                  Last updated: {new Date().toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500">No remarks added yet. Click "Add Remarks" to add your observations about this student.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RemarksSection;