import React from 'react';
import { useNavigate } from 'react-router-dom';

const ClassCard = ({ classItem, onViewSubjectStudents }) => {
  const navigate = useNavigate();

  const handleViewStudents = () => {
    if (classItem.isGrouped) {
      const classIds = classItem.individualClasses?.map(c => c.id).join(',') || '';
      navigate(`/teacher/students?classIds=${classIds}&className=${encodeURIComponent(classItem.name)}`);
    } else {
      navigate(`/teacher/students?classIds=${classItem.id}&className=${encodeURIComponent(classItem.name)}`);
    }
  };

  const getCategoryColor = (category, isGrouped) => {
    if (isGrouped) return 'bg-gradient-to-r from-slate-600 to-slate-700';
    
    switch (category) {
      case 'Science':
        return 'bg-gradient-to-r from-green-600 to-green-700';
      case 'Art':
        return 'bg-gradient-to-r from-green-500 to-green-600';
      case 'Commercial':
        return 'bg-gradient-to-r from-slate-500 to-slate-600';
      default:
        return 'bg-gradient-to-r from-green-600 to-green-700';
    }
  };

  const getBadgeColor = (category, isGrouped) => {
    if (isGrouped) return 'bg-slate-100 text-slate-800 border border-slate-200';
    
    switch (category) {
      case 'Science':
      case 'Art':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'Commercial':
        return 'bg-slate-100 text-slate-800 border border-slate-200';
      default:
        return 'bg-green-100 text-green-800 border border-green-200';
    }
  };

  return (
    <div className="group bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 hover:border-slate-300 overflow-hidden">
      {/* Card Header */}
      <div className={`h-1.5 sm:h-2 ${getCategoryColor(classItem.category, classItem.isGrouped)}`} />
      
      <div className="p-4 sm:p-6">
        {/* Class Title and Badge */}
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-slate-700 transition-colors truncate">
                {classItem.name}
              </h3>
              {classItem.isGrouped && (
                <div className="flex items-center flex-shrink-0">
                  <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              )}
            </div>
            
            {/* Subject Names */}
            {classItem.subjectsTaught && classItem.subjectsTaught.length > 0 ? (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1.5">
                  {classItem.subjectsTaught.slice(0, 3).map((subject, index) => (
                    <span 
                      key={index}
                      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-800 border border-green-300"
                    >
                      {subject.subjectName}
                    </span>
                  ))}
                  {classItem.subjectsTaught.length > 3 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                      +{classItem.subjectsTaught.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="mb-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700 border border-red-300">
                  No subjects assigned
                </span>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-sm font-medium text-slate-600">{classItem.level}</span>
              <span className="hidden sm:block text-slate-400">•</span>
              <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${getBadgeColor(classItem.category, classItem.isGrouped)}`}>
                {classItem.isGrouped ? 'Grouped Classes' : (classItem.category || 'General')}
              </span>
            </div>
            {classItem.isGrouped && (
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                <span className="font-medium">Includes:</span> {classItem.individualClasses?.map(c => c.name).join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="mb-4 sm:mb-6">
          <div className="bg-slate-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="w-6 sm:w-8 h-6 sm:h-8 bg-green-100 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-3 sm:w-4 h-3 sm:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-bold text-slate-900">{classItem.studentCount || 0}</div>
                <div className="text-xs text-slate-600 truncate">
                  Students{classItem.isGrouped && ` (${classItem.individualClasses?.length || 0} classes)`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subjects Section */}
        {classItem.subjectsTaught && classItem.subjectsTaught.length > 0 && (
          <div className="mb-4 sm:mb-6">
            <h4 className="text-sm font-semibold text-slate-700 mb-2 sm:mb-3 flex items-center">
              <svg className="w-3 sm:w-4 h-3 sm:h-4 mr-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Your Subjects
            </h4>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {classItem.subjectsTaught.map((subject, index) => (
                <button
                  key={index}
                  onClick={() => onViewSubjectStudents(subject.subjectName)}
                  className="group/subject bg-gradient-to-r from-slate-100 to-slate-50 hover:from-green-50 hover:to-green-50 text-slate-700 hover:text-green-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-xs font-medium transition-all duration-200 border border-slate-200 hover:border-green-200 hover:shadow-sm"
                >
                  <span className="flex items-center space-x-1">
                    <span className="truncate">{subject.subjectName}</span>
                    <svg className="w-2.5 sm:w-3 h-2.5 sm:h-3 opacity-0 group-hover/subject:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button 
            onClick={handleViewStudents}
            className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg sm:rounded-xl font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
          >
            <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <span>View Students</span>
          </button>
          <button 
            onClick={() => navigate('/teacher/assignments')}
            className="flex-1 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg sm:rounded-xl font-medium text-sm transition-all duration-200 border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
          >
            <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span>Assignments</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassCard;