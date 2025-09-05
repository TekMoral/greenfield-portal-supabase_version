import React from 'react';

const AssignmentActions = ({ assignment, onPublish, onClose, onDelete, onGrade, onSetQuestions }) => {
  const now = new Date();
  const dueDate = assignment?.dueDate ? new Date(assignment.dueDate) : null;
  const isOverdue = dueDate && dueDate < now && assignment.status === 'published';

  const readOnly = assignment.status === 'published' || assignment.status === 'closed';
  return (
    <div className="flex flex-wrap gap-2">
      {(assignment.status === 'published' || isOverdue) && (
        <button onClick={() => onGrade?.(assignment)} className="bg-green-600 text-white px-3 py-1.5 rounded text-xs hover:bg-green-700 transition-colors">
          Grade ({assignment.submissions?.length || 0})
        </button>
      )}
      {assignment.status === 'draft' && (
        <button onClick={() => onPublish?.(assignment.id)} className="bg-green-600 text-white px-3 py-1.5 rounded text-xs hover:bg-green-700 transition-colors">
          Publish
        </button>
      )}
      {assignment.status === 'published' && !isOverdue && (
        <button onClick={() => onClose?.(assignment.id)} className="bg-orange-600 text-white px-3 py-1.5 rounded text-xs hover:bg-orange-700 transition-colors">
          Close
        </button>
      )}
      <button onClick={() => onDelete?.(assignment.id, assignment.title)} className="border border-red-300 text-red-700 px-3 py-1.5 rounded text-xs hover:bg-red-50 transition-colors">
        Delete
      </button>
      <button onClick={() => onSetQuestions?.({ ...assignment, readOnly })} className="border border-emerald-300 text-emerald-700 px-3 py-1.5 rounded text-xs hover:bg-emerald-50 transition-colors">
        {readOnly ? 'View Questions' : 'Set Questions'}
      </button>
    </div>
  );
};

export default AssignmentActions;
