import React, { useState, useRef } from 'react';
import { uploadToCloudinary, validateFile } from '../../utils/cloudinaryUpload';

const CloudinaryUpload = ({
  onUploadSuccess,
  onUploadError,
  multiple = false,
  accept = "image/*",
  maxSize = 10 * 1024 * 1024, // 10MB
  allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  folder = null,
  className = "",
  children,
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Validate files
    for (const file of fileArray) {
      const validation = validateFile(file, { maxSize, allowedTypes });
      if (!validation.isValid) {
        onUploadError?.(new Error(validation.errors.join(', ')));
        return;
      }
    }

    setUploading(true);
    setProgress(0);

    try {
      if (multiple) {
        // Handle multiple files
        const uploadPromises = fileArray.map((file, index) => {
          return uploadToCloudinary(
            file,
            { folder },
            (fileProgress) => {
              // Update overall progress (average of all files)
              const overallProgress = ((index * 100) + fileProgress) / fileArray.length;
              setProgress(Math.round(overallProgress));
            }
          );
        });

        const results = await Promise.all(uploadPromises);
        onUploadSuccess?.(results);
      } else {
        // Handle single file
        const result = await uploadToCloudinary(
          fileArray[0],
          { folder },
          setProgress
        );
        onUploadSuccess?.(result);
      }
    } catch (error) {
      onUploadError?.(error);
    } finally {
      setUploading(false);
      setProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleInputChange = (event) => {
    handleFileSelect(event.target.files);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    
    if (disabled || uploading) return;
    
    const files = event.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    if (!disabled && !uploading) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragOver(false);
  };

  const openFileDialog = () => {
    if (!disabled && !uploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const defaultClassName = `
    relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
    transition-colors duration-200 ease-in-out
    ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
    ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `;

  return (
    <div
      className={defaultClassName}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={openFileDialog}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {uploading ? (
        <div className="space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Uploading...</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">{progress}%</p>
          </div>
        </div>
      ) : (
        children || (
          <div className="space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="text-sm text-gray-600">
              <p className="font-medium">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-500 mt-1">
                {multiple ? 'Multiple files supported' : 'Single file only'} • Max {(maxSize / 1024 / 1024).toFixed(0)}MB
              </p>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default CloudinaryUpload;