import React from 'react';

const SubjectFilter = ({ 
  availableSubjects, 
  selectedSubject, 
  onSubjectChange, 
  coreSubjectNames = [] 
}) => {
  if (availableSubjects.length <= 1) return null;

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-md">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Filter by Subject
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => onSubjectChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">All Subjects</option>
            {availableSubjects.map(subject => (
              <option 
                key={subject.subjectId || subject.subjectName} 
                value={subject.subjectName}
              >
                {subject.subjectName}
              </option>
            ))}
          </select>
          {selectedSubject && (
            <p className="text-xs text-slate-500 mt-1">
              Showing classes where you teach {selectedSubject}
              {coreSubjectNames.map(n => n.toLowerCase()).includes(selectedSubject.toLowerCase()) && 
                ' (grouped by level for core subjects)'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubjectFilter;