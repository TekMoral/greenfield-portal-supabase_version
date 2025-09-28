import React from 'react';
import { getFullName, getInitials } from '../../../../utils/nameUtils';

// Subject selector grid
export const SubjectSelector = ({ subjects = [], selectedSubject, onSelect }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-slate-200">
      <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-4">Select Subject</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {subjects.map((subject) => (
          <button
            key={subject.subjectName}
            onClick={() => onSelect?.(subject.subjectName)}
            className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 text-left ${
              selectedSubject === subject.subjectName
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="font-semibold text-sm sm:text-base">{subject.subjectName}</div>
            <div className="text-xs sm:text-sm text-slate-600 mt-1">
              {subject.totalStudents} students across {subject.classes.length} class{subject.classes.length !== 1 ? 'es' : ''}
            </div>
            <div className="text-xs text-slate-500 mt-2 line-clamp-2">
              Classes: {subject.classes.map((c) => c.className).join(', ')}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Filters: search + class dropdown
export const StudentsFilters = ({
  searchTerm,
  onSearchTermChange,
  selectedClass,
  onClassChange,
  classOptions = [],
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-slate-200">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Search Students</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, admission number, or email..."
              value={searchTerm}
              onChange={(e) => onSearchTermChange?.(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <svg
              className="w-4 sm:w-5 h-4 sm:h-5 text-slate-400 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Filter by Class</label>
          <select
            value={selectedClass}
            onChange={(e) => onClassChange?.(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="all">All Classes</option>
            {classOptions.map((classItem) => {
              const classId = classItem.classId || classItem.id;
              const className = classItem.className || classItem.name;
              const displayName = classItem.isGrouped 
                ? `${className} (Grouped - ${classItem.individualClasses?.length || 0} classes)`
                : `${className} - ${classItem.level}${classItem.category ? ` (${classItem.category})` : ''}`;
              
              return (
                <option key={classId} value={classId}>
                  {displayName}
                </option>
              );
            })}
          </select>
          {classOptions.some(c => c.isGrouped) && (
            <p className="text-xs text-slate-500 mt-1">
              Grouped classes show students from all categories for that level
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Students list - Desktop table
export const StudentsTable = ({ students = [], selectedSubject, onOpenStudent }) => {
  return (
    <div className="hidden lg:block overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Class</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Subject Type</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {students.map((student) => (
            <tr key={student.id} className="hover:bg-slate-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-4">
                    {student.profileImageUrl ? (
                      <img
                        src={student.profileImageUrl}
                        alt={getFullName(student)}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-green-600 font-semibold">{getInitials(student)}</span>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{getFullName(student)}</div>
                    <div className="text-sm text-slate-500">{student.admissionNumber}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-slate-900">{student.className}</div>
                <div className="text-sm text-slate-500">
                  {student.classLevel}
                  {student.classCategory && ` (${student.classCategory})`}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {student.classCategory ? (
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                    String(student.classCategory).toLowerCase() === 'science' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                    String(student.classCategory).toLowerCase() === 'art' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                    String(student.classCategory).toLowerCase() === 'commercial' ? 'bg-slate-100 text-slate-800 border-slate-200' :
                    'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    {student.classCategory}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-slate-900">{student.email}</div>
                <div className="text-sm text-slate-500">{student.phoneNumber || 'No phone'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    student.subjectType === 'core'
                      ? 'bg-slate-100 text-slate-800'
                      : student.subjectType === 'Junior'
                      ? 'bg-green-100 text-green-800'
                      : student.subjectType === 'Science'
                      ? 'bg-green-100 text-green-800'
                      : student.subjectType === 'Art'
                      ? 'bg-green-100 text-green-800'
                      : student.subjectType === 'Commercial'
                      ? 'bg-slate-100 text-slate-800'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {student.subjectType || 'Unknown'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onOpenStudent?.(student)}
                  className="text-green-600 hover:text-green-900 hover:bg-green-50 px-3 py-1 rounded-lg transition-colors"
                >
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Students list - Mobile cards
export const StudentsMobileCards = ({ students = [], onOpenStudent }) => {
  return (
    <div className="block lg:hidden">
      <div className="divide-y divide-slate-200">
        {students.map((student) => (
          <div key={student.id} className="p-4 hover:bg-slate-50">
            <div className="flex items-start space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                {student.profileImageUrl ? (
                  <img
                    src={student.profileImageUrl}
                    alt={getFullName(student)}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-green-600 font-semibold text-sm">{getInitials(student)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-slate-900 truncate">{getFullName(student)}</h4>
                    <p className="text-xs text-slate-600">{student.admissionNumber}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {student.className} - {student.classLevel}
                      {student.classCategory && ` (${student.classCategory})`}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {student.classCategory && (
                        <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                          String(student.classCategory).toLowerCase() === 'science' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          String(student.classCategory).toLowerCase() === 'art' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                          String(student.classCategory).toLowerCase() === 'commercial' ? 'bg-slate-100 text-slate-800 border-slate-200' :
                          'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          {student.classCategory}
                        </span>
                      )}
                      {student.subjectType && (
                        <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                          String(student.subjectType).toLowerCase() === 'core' ? 'bg-slate-50 text-slate-800 border-slate-200' :
                          'bg-green-50 text-green-800 border-green-200'
                        }`}>
                          {student.subjectType}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenStudent?.(student)}
                    className="text-green-600 hover:text-green-900 hover:bg-green-50 px-2 py-1 rounded text-xs font-medium transition-colors ml-2"
                  >
                    View
                  </button>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  <div>{student.email}</div>
                  <div>{student.phoneNumber || 'No phone'}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Student details modal
export const StudentDetailsModal = ({ student, onClose, onViewAssignments, onViewGrades }) => {
  if (!student) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="bg-green-600 text-white p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
              <div className="w-12 sm:w-16 h-12 sm:h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                {student.profileImageUrl ? (
                  <img
                    src={student.profileImageUrl}
                    alt={getFullName(student)}
                    className="w-12 sm:w-16 h-12 sm:h-16 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-lg sm:text-xl">{getInitials(student)}</span>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold truncate">{getFullName(student)}</h2>
                <p className="text-green-100 text-sm sm:text-base">{student.admissionNumber}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:text-green-200 transition-colors ml-4 flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3">Contact Information</h3>
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-slate-600 text-sm">Full Name:</span>
                    <span className="font-medium text-sm">{getFullName(student)}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-slate-600 text-sm">Email:</span>
                    <span className="font-medium text-sm break-all">{student.email}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-slate-600 text-sm">Phone:</span>
                    <span className="font-medium text-sm">{student.phoneNumber || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3">Academic Information</h3>
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-slate-600 text-sm">Admission Number:</span>
                    <span className="font-medium text-sm">{student.admissionNumber}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-slate-600 text-sm">Class:</span>
                    <span className="font-medium text-sm">{student.className}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-slate-600 text-sm">Level:</span>
                    <span className="font-medium text-sm">{student.classLevel}</span>
                  </div>
                  {student.classCategory && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-slate-600 text-sm">Category:</span>
                      <span className="font-medium text-sm">{student.classCategory}</span>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-slate-600 text-sm">Subject Type:</span>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full w-fit ${
                        student.subjectType === 'core'
                          ? 'bg-slate-100 text-slate-800'
                          : student.subjectType === 'Junior'
                          ? 'bg-green-100 text-green-800'
                          : student.subjectType === 'Science'
                          ? 'bg-green-100 text-green-800'
                          : student.subjectType === 'Art'
                          ? 'bg-green-100 text-green-800'
                          : student.subjectType === 'Commercial'
                          ? 'bg-slate-100 text-slate-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {student.subjectType || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => onViewAssignments?.(student)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">View Assignments</button>
              <button onClick={() => onViewGrades?.(student)} className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium">View Grades</button>
                          </div>
          </div>
        </div>

        <div className="bg-slate-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200">
          <div className="flex justify-end">
            <button onClick={onClose} className="bg-slate-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm sm:text-base">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Assignments modal (presentation only)
export const AssignmentsModal = ({ open, student, subject, loading, assignments = [], onClose }) => {
  if (!open || !student) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="bg-green-600 text-white p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-bold">{getFullName(student)} - Assignments</h3>
              <p className="text-green-100 text-sm sm:text-base">{subject}</p>
            </div>
            <button onClick={onClose} className="text-white hover:text-green-200 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-400 text-4xl mb-3">📝</div>
              <h3 className="text-lg font-medium text-slate-800 mb-2">No Assignments Found</h3>
              <p className="text-slate-600">No assignments have been created for {subject} yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-slate-800">{assignment.title}</h4>
                      <p className="text-sm text-slate-600 mt-1">{assignment.description}</p>
                      <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500">
                        <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                        <span>Max Points: {assignment.maxPoints}</span>
                        <span className={assignment.submitted ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {assignment.submitted ? 'Submitted' : 'Not Submitted'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          assignment.submissionStatus === 'graded'
                            ? 'bg-green-100 text-green-800'
                            : assignment.submissionStatus === 'submitted'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {assignment.submissionStatus === 'graded'
                          ? 'Graded'
                          : assignment.submissionStatus === 'submitted'
                          ? 'Pending Review'
                          : 'Not Submitted'}
                      </span>
                      {assignment.grade !== undefined && (
                        <div className="text-right">
                          <div className="text-lg font-bold text-slate-800">{assignment.grade}/{assignment.maxPoints}</div>
                          <div className="text-sm font-medium">
                            {Math.round((assignment.grade / assignment.maxPoints) * 100)}%
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {assignment.feedback && (
                    <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                      <div className="text-sm font-medium text-blue-800 mb-1">Teacher Feedback:</div>
                      <div className="text-sm text-blue-700">{assignment.feedback}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Grades modal (presentation only)
export const GradesModal = ({ open, student, subject, loading, grades = [], getGradeColor = () => 'text-slate-600', onClose }) => {
  if (!open || !student) return null;
  const avg = grades.length ? Math.round(grades.reduce((sum, g) => sum + g.percentage, 0) / grades.length) : 0;
  const totalPoints = grades.reduce((sum, g) => sum + g.grade, 0);
  const totalMax = grades.reduce((sum, g) => sum + g.maxPoints, 0);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="bg-slate-600 text-white p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-bold">{getFullName(student)} - Grades</h3>
              <p className="text-slate-100 text-sm sm:text-base">{subject}</p>
            </div>
            <button onClick={onClose} className="text-white hover:text-slate-200 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-500"></div>
            </div>
          ) : grades.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-400 text-4xl mb-3">📊</div>
              <h3 className="text-lg font-medium text-slate-800 mb-2">No Grades Found</h3>
              <p className="text-slate-600">No graded assignments found for this student in {subject}.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-slate-800 mb-3">Grade Summary</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-3 border">
                    <div className="text-sm text-slate-600">Total Assignments</div>
                    <div className="text-2xl font-bold text-slate-800">{grades.length}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border">
                    <div className="text-sm text-slate-600">Average Grade</div>
                    <div className={`text-2xl font-bold ${getGradeColor(avg)}`}>{avg}%</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border">
                    <div className="text-sm text-slate-600">Total Points</div>
                    <div className="text-2xl font-bold text-slate-800">{totalPoints}/{totalMax}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-slate-800">Individual Grades</h4>
                {grades.map((grade) => (
                  <div key={grade.assignmentId} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <h5 className="text-base font-semibold text-slate-800">{grade.assignmentTitle}</h5>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
                          <span>Submitted: {new Date(grade.submittedAt).toLocaleDateString()}</span>
                          {grade.gradedAt && <span>Graded: {new Date(grade.gradedAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-800">{grade.grade}/{grade.maxPoints}</div>
                        <div className={`text-lg font-medium ${getGradeColor(grade.percentage)}`}>{grade.percentage}%</div>
                      </div>
                    </div>
                    {grade.feedback && (
                      <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                        <div className="text-sm font-medium text-blue-800 mb-1">Teacher Feedback:</div>
                        <div className="text-sm text-blue-700">{grade.feedback}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Message modal (presentation only)
// Simple reusable Form wrapper
const Form = ({ onSubmit, className = '', children }) => (
  <form onSubmit={onSubmit} className={className}>
    {children}
  </form>
);

// Create Assignment modal (uses Form, not form)
export const CreateAssignmentModal = ({ open, subjectName, subjects = [], classOptions = [], defaultClassId = '', form, onFormChange, creating, onCreate, onClose }) => {
  if (!open) return null;
  const classes = Array.isArray(classOptions) ? classOptions : [];
  const teacherSubjects = Array.isArray(subjects) ? subjects : [];
  const derivedClasses = (() => {
    const selected = (form.subjectName || form.subject || '').trim();
    const subjMeta = teacherSubjects.find(s => (s.subjectName || s.name) === selected);
    const isCore = !!subjMeta?.isCore;

    const categoryOrder = { 'all categories': 0, science: 1, art: 2, commercial: 3 };
    const getLevelRank = (c) => {
      const level = (c.level || '').toLowerCase();
      const name = (c.className || c.name || '').toLowerCase();
      if (level.includes('junior') || name.includes('jss')) return 0;
      if (level.includes('senior') || name.includes('sss')) return 1;
      return 2; // unknown levels last
    };
    const getGradeNumber = (c) => {
      const name = (c.className || c.name || '');
      const m = name.match(/(jss|sss)\s*(\d+)/i);
      if (m) return parseInt(m[2], 10);
      const m2 = name.match(/(\d+)/);
      return m2 ? parseInt(m2[1], 10) : 999;
    };
    const getCategoryRank = (c) => {
      const cat = String(c.category || '').toLowerCase();
      return categoryOrder[cat] ?? 9;
    };
    const compareClasses = (a, b) => {
      const la = getLevelRank(a), lb = getLevelRank(b);
      if (la !== lb) return la - lb;
      const ga = getGradeNumber(a), gb = getGradeNumber(b);
      if (ga !== gb) return ga - gb;
      const ca = getCategoryRank(a), cb = getCategoryRank(b);
      if (ca !== cb) return ca - cb;
      const na = (a.className || a.name || '').toLowerCase();
      const nb = (b.className || b.name || '').toLowerCase();
      return na.localeCompare(nb);
    };

    if (!selected) return [...classes].sort(compareClasses);
    const subj = teacherSubjects.find(s => s.subjectName === selected || s.name === selected);
    const raw = subj?.classes || classes;

    if (!isCore) {
      return [...raw].sort(compareClasses);
    }

    // For core subjects, show grouped base-level options per level (JSS 1, JSS 2, SSS 1, ...)
    const baseKey = (name) => {
      const rawName = String(name || '').toUpperCase().trim().replace(/\s+/g, ' ');
      // Strip trailing category labels
      const stripped = rawName.replace(/\s+(SCIENCE|ARTS?|COMMERCIAL)$/, '');
      // Match common senior/junior patterns
      let m = stripped.match(/^(JSS|JS|JUNIOR( SECONDARY)?)\s*(\d+)/i);
      if (m) return `JSS ${m[3]}`;
      m = stripped.match(/^(SSS|SS|SENIOR( SECONDARY)?)\s*(\d+)/i);
      if (m) return `SSS ${m[3]}`;
      // Fallback: try to extract the first number and infer level by presence of SSS/JSS
      const num = (stripped.match(/\b(\d)\b/) || [])[1];
      if (/JSS|JUNIOR/.test(stripped) && num) return `JSS ${num}`;
      if (/SSS|SENIOR/.test(stripped) && num) return `SSS ${num}`;
      return stripped; // final fallback
    };

    const groups = new Map();
    for (const c of raw) {
      const key = baseKey(c.className || c.name);
      if (!groups.has(key)) {
        groups.set(key, {
          id: `${key.replace(/\s+/g,'_')}_GROUPED`,
          name: key,
          level: c.level,
          category: 'All Categories',
          isGrouped: true,
          individualClasses: [],
        });
      }
      const g = groups.get(key);
      // Deduplicate individualClasses by id
      const icId = String(c.classId || c.id);
      if (!g.individualClasses.some(ic => String(ic.id) === icId)) {
        g.individualClasses.push({ id: icId, name: c.className || c.name, category: c.category });
      }
    }

    return Array.from(groups.values()).sort(compareClasses);
  })();

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const idOf = (c) => String(c.classId || c.id);
      const byId = new Map(derivedClasses.map(c => [idOf(c), c]));
      const selected = Array.isArray(form.classIds) ? form.classIds.map(String) : [];
      const out = new Set();
      const tryExpandGrouped = (gid) => {
        const guess = derivedClasses.find(c => c.isGrouped && (String(c.id) === gid));
        if (guess && Array.isArray(guess.individualClasses)) {
          guess.individualClasses.forEach(ic => {
            const cid = String(ic.id || '').trim();
            if (cid) out.add(cid);
          });
          return true;
        }
        return false;
      };
      selected.forEach((id) => {
        const entry = byId.get(id);
        if (entry && entry.isGrouped && Array.isArray(entry.individualClasses)) {
          entry.individualClasses.forEach((ic) => {
            const cid = String(ic.id || '').trim();
            if (cid) out.add(cid);
          });
        } else if (String(id).endsWith('_GROUPED')) {
          tryExpandGrouped(id);
        } else {
          const cid = String(id || '').trim();
          if (cid && !cid.endsWith('_GROUPED')) out.add(cid);
        }
      });
      const unique = Array.from(out);
      const payloadOverride = { ...form, classIds: unique };
      // Update local form for UI consistency
      onFormChange?.(payloadOverride);
      // Call onCreate with explicit expanded payload to avoid relying on async state
      if (typeof onCreate === 'function') {
        // Prefer passing the expanded form to the creator
        const maybePromise = onCreate(payloadOverride);
        // If the consumer ignores the argument, it will still work (they use current state)
        if (maybePromise && typeof maybePromise.then === 'function') {
          await maybePromise;
        }
        return;
      }
    } catch (_) {}
    onCreate?.();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-green-600 text-white p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-bold">Create Assignment</h3>
              <p className="text-green-100 text-sm sm:text-base">{subjectName || 'Select Subject'}</p>
            </div>
            <button onClick={onClose} className="text-white hover:text-green-200 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          </div>
          
          <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          <form id="create-assignment-form" onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
              <input
                type="text"
                value={form.title || ''}
                onChange={(e) => onFormChange?.({ ...form, title: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="e.g., Algebra Homework Week 3"
                required
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
              <select
                value={form.subjectName || ''}
                onChange={(e) => {
                  const subjName = e.target.value;
                  const subj = teacherSubjects.find(s => (s.subjectName || s.name) === subjName);
                  onFormChange?.({ ...form, subjectName: subjName, subjectId: subj?.subjectId, classId: '', classIds: [] });
                }}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              >
                <option value="">Select Subject</option>
                {teacherSubjects.map((s) => (
                  <option key={s.subjectName || s.name} value={s.subjectName || s.name}>
                    {s.subjectName || s.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Only subjects you teach are listed.</p>
            </div>

            {/* Class (filtered by subject) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Classes</label>
              <div className="max-h-48 overflow-auto border rounded-lg p-2 space-y-1">
                {derivedClasses.length === 0 ? (
                  <div className="text-xs text-slate-500 px-2 py-1">No classes available for the selected subject.</div>
                ) : (
                  derivedClasses.map((c) => {
                    const id = String(c.classId || c.id);
                    const checked = Array.isArray(form.classIds) && form.classIds.map(String).includes(id);
                    return (
                      <label key={id} className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const curr = Array.isArray(form.classIds) ? form.classIds.map(String) : [];
                            let next;
                            if (e.target.checked) next = [...new Set([...curr, id])];
                            else next = curr.filter((x) => x !== id);
                            onFormChange?.({ ...form, classIds: next });
                          }}
                        />
                        <span className="flex-1">
                          {(c.className || c.name)}{c.level ? ` - ${c.level}` : ''}{(c.isGrouped ? '' : (c.category ? ` (${c.category})` : ''))}
                        </span>
                        {typeof c.studentCount === 'number' && (
                          <span className="text-xs text-slate-500">{c.studentCount}</span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">Select one or more classes you teach for this subject.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Due Date</label>
              <input
                type="date"
                value={form.dueDate || ''}
                onChange={(e) => onFormChange?.({ ...form, dueDate: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Assignment Type</label>
              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="assignmentType"
                    checked={(form.type || 'theory') === 'theory'}
                    onChange={() => onFormChange?.({ ...form, type: 'theory' })}
                  />
                  Theory
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="assignmentType"
                    checked={(form.type || 'theory') === 'objective'}
                    onChange={() => onFormChange?.({ ...form, type: 'objective' })}
                  />
                  Objective
                </label>
              </div>
              <p className="text-xs text-slate-500 mt-1">Set total marks (maximum 50). You can clear and type your own value.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Total Marks</label>
              <input
                type="number"
                min={1}
                max={50}
                placeholder="e.g., 20 (max 50)"
                value={(form.totalMarks === '' || form.totalMarks === undefined || form.totalMarks === null) ? '' : form.totalMarks}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    onFormChange?.({ ...form, totalMarks: '' });
                  } else {
                    let n = Number(val);
                    if (!Number.isFinite(n)) {
                      onFormChange?.({ ...form, totalMarks: '' });
                    } else {
                      if (n > 50) n = 50;
                      if (n < 1) n = 1;
                      onFormChange?.({ ...form, totalMarks: n });
                    }
                  }
                }}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Highest allowed is 50.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
              <textarea
                value={form.description || ''}
                onChange={(e) => onFormChange?.({ ...form, description: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                rows={5}
                placeholder="Provide instructions and details..."
                required
              />
            </div>

            </form>
        </div>
        <div className="bg-slate-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-assignment-form"
              disabled={creating}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Assignment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const MessageModal = ({ open, student, subject, form, onFormChange, sending, onSend, onClose }) => {
  if (!open || !student) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="bg-blue-600 text-white p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-bold">Send Message to {getFullName(student)}</h3>
              <p className="text-blue-100 text-sm sm:text-base">{student.email}</p>
            </div>
            <button onClick={onClose} className="text-white hover:text-blue-200 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <form onSubmit={(e) => { e.preventDefault(); onSend?.(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => onFormChange?.({ ...form, subject: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter message subject..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => onFormChange?.({ ...form, priority: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low Priority</option>
                <option value="normal">Normal Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
              <textarea
                value={form.message}
                onChange={(e) => onFormChange?.({ ...form, message: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="6"
                placeholder="Type your message here..."
                required
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="submit"
                disabled={sending}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Send Message'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
