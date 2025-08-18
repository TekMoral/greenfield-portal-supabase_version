import React from 'react';
import Button from './Button';

// Edit Button
export const EditButton = ({ onClick, loading = false, disabled = false, size = 'sm', ...props }) => {
  const editIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );

  return (
    <Button
      variant="secondary"
      size={size}
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      loadingText="Updating..."
      icon={editIcon}
      {...props}
    >
      Edit
    </Button>
  );
};

// Delete Button
export const DeleteButton = ({ onClick, loading = false, disabled = false, size = 'sm', ...props }) => {
  const deleteIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );

  return (
    <Button
      variant="danger"
      size={size}
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      loadingText="Deleting..."
      icon={deleteIcon}
      {...props}
    >
      Delete
    </Button>
  );
};

// Create Button
export const CreateButton = ({ onClick, loading = false, disabled = false, size = 'md', children = 'Create', ...props }) => {
  const createIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );

  return (
    <Button
      variant="success"
      size={size}
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      loadingText="Creating..."
      icon={createIcon}
      {...props}
    >
      {children}
    </Button>
  );
};

// Save Button
export const SaveButton = ({ onClick, loading = false, disabled = false, size = 'md', ...props }) => {
  const saveIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );

  return (
    <Button
      variant="primary"
      size={size}
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      loadingText="Saving..."
      icon={saveIcon}
      {...props}
    >
      Save
    </Button>
  );
};

// Cancel Button
export const CancelButton = ({ onClick, disabled = false, size = 'md', ...props }) => {
  const cancelIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={onClick}
      disabled={disabled}
      icon={cancelIcon}
      {...props}
    >
      Cancel
    </Button>
  );
};

// Promote Button
export const PromoteButton = ({ onClick, loading = false, disabled = false, size = 'sm', ...props }) => {
  const promoteIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );

  return (
    <Button
      variant="primary"
      size={size}
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      loadingText="Promoting..."
      icon={promoteIcon}
      {...props}
    >
      Promote
    </Button>
  );
};

// Suspend Button
export const SuspendButton = ({ onClick, loading = false, disabled = false, size = 'sm', ...props }) => {
  const suspendIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18 12M6 6l6 6" />
    </svg>
  );

  return (
    <Button
      variant="warning"
      size={size}
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      loadingText="Suspending..."
      icon={suspendIcon}
      {...props}
    >
      Suspend
    </Button>
  );
};

// Reactivate Button
export const ReactivateButton = ({ onClick, loading = false, disabled = false, size = 'sm', ...props }) => {
  const reactivateIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  return (
    <Button
      variant="success"
      size={size}
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      loadingText="Reactivating..."
      icon={reactivateIcon}
      {...props}
    >
      Reactivate
    </Button>
  );
};