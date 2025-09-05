import React from 'react';
import AssignmentActions from './AssignmentActions';

const getStatusColor = (status) => {
  switch (status) {
    case 'published':
      return 'bg-green-100 text-green-800';
    case 'draft':
      return 'bg-yellow-100 text-yellow-800';
    case 'closed':
      return 'bg-slate-100 text-slate-800';
    case 'overdue':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
};

const getAssignmentStatus = (assignment) => {
  const now = new Date();
  const due = assignment?.dueDate ? new Date(assignment.dueDate) : null;
  if (assignment.status === 'draft') return 'draft';
  if (assignment.status === 'closed') return 'closed';
  if (due && due < now) return 'overdue';
  return assignment.status || 'draft';
};

const AssignmentCard = ({ assignment, onPublish, onClose, onDelete, onGrade, onSetQuestions }) => {
  const status = getAssignmentStatus(assignment);
  const now = new Date();
  const due = assignment?.dueDate ? new Date(assignment.dueDate) : null;

  return (
    <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-800">{assignment.title}</h3>
            <span className="text-xs text-slate-500">{assignment.subjectName}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(status)}`}>{status}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Due: {due ? new Date(assignment.dueDate).toLocaleDateString() : '—'} • Points: {assignment.maxPoints ?? '—'} • Submissions: {assignment.submissions?.length || 0}
          </div>
        </div>
        <AssignmentActions assignment={assignment} onPublish={onPublish} onClose={onClose} onDelete={onDelete} onGrade={onGrade} onSetQuestions={onSetQuestions} />
      </div>
      {assignment.description && (
        <p className="text-sm text-slate-600 mt-2">{assignment.description}</p>
      )}
    </div>
  );
};

export default AssignmentCard;
