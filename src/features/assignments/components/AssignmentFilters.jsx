import React from 'react';

const AssignmentFilters = ({ subjects = [], selectedSubject = 'all', onChange = () => {} }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
    <label className="text-sm font-medium text-slate-700">Filter by Subject:</label>
    <select
      value={selectedSubject}
      onChange={(e) => onChange(e.target.value)}
      className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full sm:w-auto"
    >
      <option value="all">All Subjects</option>
      {Array.isArray(subjects) && subjects.map((subject) => (
        <option key={subject.subjectName} value={subject.subjectName}>
          {subject.subjectName} ({subject.totalStudents} students)
        </option>
      ))}
    </select>
  </div>
);

export default AssignmentFilters;
