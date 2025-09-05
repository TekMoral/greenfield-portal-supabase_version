import React from 'react';

const AssignmentStats = ({ assignments = [], getStatus = () => 'draft' }) => {
  const total = assignments.length;
  const active = assignments.filter((a) => getStatus(a) === 'published').length;
  const overdue = assignments.filter((a) => getStatus(a) === 'overdue').length;
  const closedDraft = assignments.filter((a) => getStatus(a) === 'closed' || a.status === 'draft').length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow border-l-4 border-green-500">
        <div className="text-lg sm:text-2xl font-bold text-slate-800">{total}</div>
        <div className="text-xs sm:text-sm text-slate-600">Total</div>
      </div>
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow border-l-4 border-green-500">
        <div className="text-lg sm:text-2xl font-bold text-slate-800">{active}</div>
        <div className="text-xs sm:text-sm text-slate-600">Active</div>
      </div>
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow border-l-4 border-red-500">
        <div className="text-lg sm:text-2xl font-bold text-slate-800">{overdue}</div>
        <div className="text-xs sm:text-sm text-slate-600">Overdue</div>
      </div>
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow border-l-4 border-slate-500">
        <div className="text-lg sm:text-2xl font-bold text-slate-800">{closedDraft}</div>
        <div className="text-xs sm:text-sm text-slate-600">Closed/Draft</div>
      </div>
    </div>
  );
};

export default AssignmentStats;
