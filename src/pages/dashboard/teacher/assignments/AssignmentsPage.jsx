import React, { useState } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useAssignmentsData, useAssignmentMutations, useAssignmentQuestions } from '@features/assignments/hooks';
import { CreateAssignmentModal } from '../components/StudentsUI';
import { AssignmentStats, AssignmentFilters, AssignmentList, GradingModal, QuestionsEditorModal } from '@features/assignments/components';
import ConfirmDialog from '../../../../components/ui/ConfirmDialog';
import useToast from '../../../../hooks/useToast';

const getAssignmentStatus = (assignment) => {
  const now = new Date();
  const due = new Date(assignment.dueDate);
  if (assignment.status === 'draft') return 'draft';
  if (assignment.status === 'closed') return 'closed';
  if (due < now) return 'overdue';
  return assignment.status || 'draft';
};

const AssignmentsPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const {
    loading,
    subjects,
    assignments,
    setAssignments,
    filteredAssignments,
    selectedSubject,
    setSelectedSubject,
    classOptions,
  } = useAssignmentsData(user?.id);

  const mutations = useAssignmentMutations(user?.id, setAssignments);

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', classId: '', dueDate: '', totalMarks: 100, description: '', type: 'theory' });
  const [showGrading, setShowGrading] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, assignmentId: null, assignmentTitle: '' });
  const [publishConfirm, setPublishConfirm] = useState({ isOpen: false, assignmentId: null });

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800">Assignments</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm sm:text-base w-full sm:w-auto"
        >
          + Create Assignment
        </button>
      </div>

      {/* Stats */}
      <AssignmentStats assignments={assignments} getStatus={getAssignmentStatus} />

      {/* Filter */}
      <AssignmentFilters subjects={subjects} selectedSubject={selectedSubject} onChange={setSelectedSubject} />

      {/* Assignments List */}
      <AssignmentList
        assignments={filteredAssignments}
        onPublish={(id) => setPublishConfirm({ isOpen: true, assignmentId: id })}
        onClose={(id) => mutations.close(id)}
        onDelete={(id, title) => setDeleteConfirm({ isOpen: true, assignmentId: id, assignmentTitle: title })}
        onGrade={(assignment) => { setSelectedAssignment(assignment); setShowGrading(true); }}
        onSetQuestions={(assignment) => { setSelectedAssignment(assignment); setShowQuestions(true); }}
      />

      {filteredAssignments.length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-400 text-4xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">No assignments found</h3>
            <p className="text-slate-600 mb-4">{selectedSubject === 'all' ? "You haven't created any assignments yet." : `No assignments found for ${selectedSubject}.`}</p>
            <button onClick={() => setShowCreate(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium">Create Your First Assignment</button>
          </div>
        )}

      {/* Create Assignment Modal */}
      <CreateAssignmentModal
        open={showCreate}
        subjectName={selectedSubject !== 'all' ? selectedSubject : undefined}
        subjects={subjects}
        classOptions={classOptions}
        defaultClassId={createForm.classId}
        form={createForm}
        onFormChange={setCreateForm}
        creating={mutations.creating}
        onCreate={async (payload) => {
          try {
            const formToCreate = payload || createForm;
            const created = await mutations.create(formToCreate);
            console.log('Assignment created successfully:', created);
            
            // If Objective, open Questions Editor immediately
            if ((createForm.type || 'theory') === 'objective' && created) {
              setShowCreate(false);
              setSelectedAssignment(created);
              setShowQuestions(true);
            } else {
              setShowCreate(false);
            }
            
            // Reset form
            setCreateForm({ title: '', classId: '', dueDate: '', totalMarks: 100, description: '', type: 'theory' });
            
            // Show success feedback
            showToast('Assignment created successfully!', 'success');
          } catch (error) {
            console.error('Failed to create assignment:', error);
            showToast(`Failed to create assignment: ${error.message || 'Unknown error'}`,'error');
          }
        }}
        onClose={() => setShowCreate(false)}
      />

      {/* Grading Modal */}
      {showGrading && selectedAssignment && (
        <GradingModal
          assignment={selectedAssignment}
          onClose={() => { setShowGrading(false); setSelectedAssignment(null); }}
          onSubmitGrade={(studentId, gradeData) => mutations.grade(selectedAssignment.id, studentId, gradeData)}
        />
      )}

      {/* Questions Editor Modal */}
      {showQuestions && selectedAssignment && (
        <QuestionsEditorWrapper
          assignment={selectedAssignment}
          onClose={() => { setShowQuestions(false); setSelectedAssignment(null); }}
        />
      )}

      {/* Publish Confirmation Dialog */}
      <ConfirmDialog
        isOpen={publishConfirm.isOpen}
        onClose={() => setPublishConfirm({ isOpen: false, assignmentId: null })}
        onConfirm={async () => {
          await mutations.publish(publishConfirm.assignmentId);
          setPublishConfirm({ isOpen: false, assignmentId: null });
          showToast('Assignment published. Note: Published assignments cannot be edited. You may still delete or close the assignment.', 'success');
        }}
        title="Publish Assignment"
        message={"Once published, this assignment cannot be edited. You will still be able to view questions and delete or close the assignment if needed. Do you wish to continue?"}
        confirmText={mutations.publishing ? 'Publishing...' : 'Publish'}
        cancelText="Cancel"
        type="warning"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, assignmentId: null, assignmentTitle: '' })}
        onConfirm={async () => {
          if (mutations.removing) return;
          await mutations.remove(deleteConfirm.assignmentId);
          setDeleteConfirm({ isOpen: false, assignmentId: null, assignmentTitle: '' });
        }}
        title="Delete Assignment"
        message={`Are you sure you want to delete "${deleteConfirm.assignmentTitle}"? This action cannot be undone.`}
        confirmText={mutations.removing ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

// Wrapper to connect hook to presentational modal
const QuestionsEditorWrapper = ({ assignment, onClose }) => {
  const state = useAssignmentQuestions(assignment);
  const readOnly = Boolean(assignment?.readOnly || assignment?.status === 'published' || assignment?.status === 'closed');
  return (
    <QuestionsEditorModal
      open={true}
      assignment={assignment}
      state={state}
      onAdd={readOnly ? () => {} : state.addQuestion}
      onUpdate={readOnly ? () => {} : state.updateQuestion}
      onRemove={readOnly ? () => {} : state.removeQuestion}
      onSave={readOnly ? () => {} : state.save}
      onClose={onClose}
      readOnly={readOnly}
    />
  );
};

export default AssignmentsPage;