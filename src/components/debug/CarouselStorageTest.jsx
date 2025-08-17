import React, { useState } from 'react';
import { directStorageClient } from '../../utils/directStorageClient';
import { carouselService } from '../../services/supabase/carouselService';

const CarouselStorageTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const addResult = (test, success, message, data = null) => {
    setTestResults(prev => [...prev, {
      test,
      success,
      message,
      data,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testStorageConnection = async () => {
    setLoading(true);
    addResult('Storage Connection', null, 'Testing storage connection...');

    try {
      const { data, error } = await directStorageClient.list('carousel-images', '');
      
      if (error) {
        addResult('Storage Connection', false, `Failed: ${error}`);
      } else {
        addResult('Storage Connection', true, 'Successfully connected to storage', data);
      }
    } catch (error) {
      addResult('Storage Connection', false, `Error: ${error.message}`);
    }
    
    setLoading(false);
  };

  const testImageUpload = async () => {
    if (!selectedFile) {
      addResult('Image Upload', false, 'No file selected');
      return;
    }

    setLoading(true);
    addResult('Image Upload', null, 'Uploading test image...');

    try {
      const imageData = {
        title: 'Test Image',
        caption: 'This is a test upload',
        alt: 'Test image for carousel',
        isActive: true,
        order: 0
      };

      const result = await carouselService.uploadCarouselImage(selectedFile, imageData);
      
      if (result.success) {
        addResult('Image Upload', true, 'Image uploaded successfully', result.data);
      } else {
        addResult('Image Upload', false, `Upload failed: ${result.error}`);
      }
    } catch (error) {
      addResult('Image Upload', false, `Error: ${error.message}`);
    }
    
    setLoading(false);
  };

  const testGetImages = async () => {
    setLoading(true);
    addResult('Get Images', null, 'Fetching carousel images...');

    try {
      const images = await carouselService.getCarouselImages();
      addResult('Get Images', true, `Found ${images.length} images`, images);
    } catch (error) {
      addResult('Get Images', false, `Error: ${error.message}`);
    }
    
    setLoading(false);
  };

  const testGetActiveImages = async () => {
    setLoading(true);
    addResult('Get Active Images', null, 'Fetching active carousel images...');

    try {
      const images = await carouselService.getActiveCarouselImages();
      addResult('Get Active Images', true, `Found ${images.length} active images`, images);
    } catch (error) {
      addResult('Get Active Images', false, `Error: ${error.message}`);
    }
    
    setLoading(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      addResult('File Selection', true, `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Carousel Storage Test</h2>
        <p className="text-gray-600">Test Supabase Storage integration for carousel images</p>
      </div>

      {/* File Selection */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Select Test Image</h3>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="w-full p-2 border border-gray-300 rounded"
        />
        {selectedFile && (
          <div className="mt-2 text-sm text-gray-600">
            Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)}MB)
          </div>
        )}
      </div>

      {/* Test Buttons */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={testStorageConnection}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Test Storage Connection
        </button>
        
        <button
          onClick={testImageUpload}
          disabled={loading || !selectedFile}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          Test Image Upload
        </button>
        
        <button
          onClick={testGetImages}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          Test Get Images
        </button>
        
        <button
          onClick={testGetActiveImages}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          Test Get Active Images
        </button>
        
        <button
          onClick={clearResults}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Clear Results
        </button>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="mb-4 flex items-center gap-2 text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Running test...</span>
        </div>
      )}

      {/* Test Results */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Test Results</h3>
        {testResults.length === 0 ? (
          <p className="text-gray-500">No tests run yet</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded border-l-4 ${
                  result.success === null
                    ? 'bg-blue-50 border-blue-400'
                    : result.success
                    ? 'bg-green-50 border-green-400'
                    : 'bg-red-50 border-red-400'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">
                      {result.test}
                      {result.success === null && (
                        <span className="ml-2 text-blue-600">⏳</span>
                      )}
                      {result.success === true && (
                        <span className="ml-2 text-green-600">✅</span>
                      )}
                      {result.success === false && (
                        <span className="ml-2 text-red-600">❌</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {result.message}
                    </div>
                    {result.data && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer">
                          View Data
                        </summary>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{result.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Setup Instructions */}
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-semibold text-yellow-800 mb-2">Setup Instructions</h4>
        <div className="text-sm text-yellow-700 space-y-1">
          <p>1. Go to your Supabase Dashboard → Storage</p>
          <p>2. Create a new bucket called 'carousel-images'</p>
          <p>3. Set the bucket to be public</p>
          <p>4. Add the storage policies from carouselStorageSetup.js</p>
          <p>5. Run the database schema updates</p>
        </div>
      </div>
    </div>
  );
};

export default CarouselStorageTest;