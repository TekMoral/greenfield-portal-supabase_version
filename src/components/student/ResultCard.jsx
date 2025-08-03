import React, { useState } from 'react';

const ResultCard = ({ result }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'text-green-600 bg-green-100';
      case 'B':
        return 'text-blue-600 bg-blue-100';
      case 'C':
        return 'text-yellow-600 bg-yellow-100';
      case 'D':
        return 'text-orange-600 bg-orange-100';
      case 'F':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status) => {
    return status === 'passed' 
      ? 'text-green-600 bg-green-100' 
      : 'text-red-600 bg-red-100';
  };

  const formatDate = (date) => {
    if (!date) return 'Not available';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4">
          <div className="flex-1 mb-3 sm:mb-0">
            <h2 className="text-2xl font-bold text-blue-600 mb-2">
              {result.subject}
            </h2>
            <p className="text-gray-600 text-sm">{result.examTitle || 'Exam Result'}</p>
            <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
              <span>{result.session}</span>
              <span>•</span>
              <span>{result.term}</span>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(result.status)}`}>
              {result.status === 'passed' ? 'Passed' : 'Failed'}
            </span>
            {result.position && (
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                {result.position}
              </span>
            )}
          </div>
        </div>

        {/* Score Summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xl font-bold text-gray-900">
              {result.totalScore}
            </div>
            <div className="text-xs text-gray-600">Score</div>
            <div className="text-xs text-gray-500">/{result.totalMarks}</div>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xl font-bold text-gray-900">
              {result.percentage}%
            </div>
            <div className="text-xs text-gray-600">Percentage</div>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className={`text-xl font-bold px-2 py-1 rounded ${getGradeColor(result.grade)}`}>
              {result.grade}
            </div>
            <div className="text-xs text-gray-600">Grade</div>
          </div>
        </div>

        {/* Performance Indicator */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Performance</span>
            <span className="text-sm text-gray-600">{result.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                result.percentage >= 90 ? 'bg-green-500' :
                result.percentage >= 80 ? 'bg-blue-500' :
                result.percentage >= 70 ? 'bg-yellow-500' :
                result.percentage >= 60 ? 'bg-orange-500' :
                'bg-red-500'
              }`}
              style={{ width: `${Math.min(result.percentage, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Remarks */}
        {result.remarks && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-1">Teacher's Remarks</h4>
            <p className="text-sm text-blue-800">{result.remarks}</p>
          </div>
        )}

        
        {/* Toggle Details Button */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
          <svg 
            className={`w-4 h-4 ml-2 transition-transform ${showDetails ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Detailed Information */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Passing Marks:</span>
                <span className="ml-2 text-gray-600">{result.passingMarks}%</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Date Published:</span>
                <span className="ml-2 text-gray-600">{formatDate(result.createdAt)}</span>
              </div>
            </div>

            {/* Detailed Score Analysis */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Detailed Score Analysis</h4>
              <div className="space-y-2 text-sm">
                {result.testScore !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Test Component:</span>
                    <div className="text-right">
                      <span className="font-medium">{result.testScore}/30</span>
                      <span className="text-gray-500 ml-2">({((result.testScore / 30) * 100).toFixed(1)}%)</span>
                    </div>
                  </div>
                )}
                {result.examScore !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Exam Component:</span>
                    <div className="text-right">
                      <span className="font-medium">{result.examScore}/50</span>
                      <span className="text-gray-500 ml-2">({((result.examScore / 50) * 100).toFixed(1)}%)</span>
                    </div>
                  </div>
                )}
                {result.adminScore !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Admin Assessment:</span>
                    <div className="text-right">
                      <span className="font-medium">{result.adminScore}/20</span>
                      <span className="text-gray-500 ml-2">({((result.adminScore / 20) * 100).toFixed(1)}%)</span>
                    </div>
                  </div>
                )}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center font-medium">
                    <span className="text-gray-800">Total Score:</span>
                    <div className="text-right">
                      <span className="text-lg">{result.totalScore}/100</span>
                      <span className="text-gray-600 ml-2">({result.percentage}%)</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-gray-600">Final Grade:</span>
                    <span className={`font-bold ${getGradeColor(result.grade)} px-2 py-1 rounded`}>
                      {result.grade}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Insights */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Performance Insights</h4>
              <div className="text-sm text-blue-800">
                {result.percentage >= 90 && (
                  <p>🎉 Excellent performance! You're in the top tier.</p>
                )}
                {result.percentage >= 80 && result.percentage < 90 && (
                  <p>👏 Very good performance! Keep up the great work.</p>
                )}
                {result.percentage >= 70 && result.percentage < 80 && (
                  <p>👍 Good performance! There's room for improvement.</p>
                )}
                {result.percentage >= 60 && result.percentage < 70 && (
                  <p>📚 Fair performance. Consider more study time.</p>
                )}
                {result.percentage >= 50 && result.percentage < 60 && (
                  <p>⚠️ You passed, but there's significant room for improvement.</p>
                )}
                {result.percentage < 50 && (
                  <p>📖 Focus on understanding the fundamentals and seek help if needed.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultCard;