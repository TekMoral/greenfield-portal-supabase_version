import React from 'react';
import AssignmentCard from './AssignmentCard';

const AssignmentList = ({ assignments = [], onPublish, onClose, onDelete, onGrade, onSetQuestions }) => {
  return (
    <div className="space-y-3 sm:space-y-4">
      {assignments.map((a) => (
        <AssignmentCard
          key={a.id}
          assignment={a}
          onPublish={onPublish}
          onClose={onClose}
          onDelete={onDelete}
          onGrade={onGrade}
          onSetQuestions={onSetQuestions}
        />
      ))}
    </div>
  );
};

export default AssignmentList;
