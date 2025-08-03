import React from 'react';
import CarouselManager from '../../components/admin/CarouselManager';

const CarouselManagement = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-xl p-6 border border-gray-200/50">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Homepage Carousel Management
          </h1>
          <p className="text-gray-600">
            Manage the images displayed in the homepage carousel. Upload new images, 
            edit existing ones, and control their order and visibility.
          </p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-800 mb-1">
                Image Guidelines
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Recommended size: 2000x1200 pixels (16:9 aspect ratio)</li>
                <li>• Maximum file size: 10MB</li>
                <li>• Supported formats: JPEG, PNG, WebP, GIF</li>
                <li>• Use high-quality images that represent your school well</li>
                <li>• Include descriptive titles and captions for better accessibility</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <CarouselManager />
    </div>
  );
};

export default CarouselManagement;