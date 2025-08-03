import React from 'react';

const AssignmentSection = ({ assignmentSubmissions, getGradeColor }) => {
  const averageScore = assignmentSubmissions.length > 0 
    ? Math.round(assignmentSubmissions.reduce((sum, sub) => sum + sub.percentage, 0) / assignmentSubmissions.length)
    : 0;

  return (
    <div>
      <h4 className="text-base sm:text-lg font-semibold text-slate-800 mb-3">Assignment Submissions & Scores</h4>
      <div className="bg-slate-50 rounded-lg p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="bg-white rounded-lg p-3 sm:p-4 border">
            <div className="text-xs sm:text-sm text-slate-600">Total Assignments</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-800">{assignmentSubmissions.length}</div>
          </div>
          <div className="bg-white rounded-lg p-3 sm:p-4 border">
            <div className="text-xs sm:text-sm text-slate-600">Submitted</div>
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {assignmentSubmissions.filter(sub => sub.submitted).length}
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 sm:p-4 border">
            <div className="text-xs sm:text-sm text-slate-600">Average Score</div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {averageScore}%
            </div>
          </div>
        </div>

        {assignmentSubmissions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300 text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-2 sm:px-4 py-2 text-left">Assignment</th>
                  <th className="border border-slate-300 px-2 sm:px-4 py-2 text-center">Status</th>
                  <th className="border border-slate-300 px-2 sm:px-4 py-2 text-center">Score</th>
                  <th className="border border-slate-300 px-2 sm:px-4 py-2 text-center">Max Points</th>
                  <th className="border border-slate-300 px-2 sm:px-4 py-2 text-center">Percentage</th>
                  <th className="border border-slate-300 px-2 sm:px-4 py-2 text-center">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {assignmentSubmissions.map((submission, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="border border-slate-300 px-2 sm:px-4 py-2 font-medium">
                      {submission.title}
                    </td>
                    <td className="border border-slate-300 px-2 sm:px-4 py-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        submission.submitted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {submission.submitted ? 'Submitted' : 'Not Submitted'}
                      </span>
                    </td>
                    <td className="border border-slate-300 px-2 sm:px-4 py-2 text-center font-bold">
                      {submission.score}
                    </td>
                    <td className="border border-slate-300 px-2 sm:px-4 py-2 text-center">
                      {submission.maxPoints}
                    </td>
                    <td className={`border border-slate-300 px-2 sm:px-4 py-2 text-center font-bold ${getGradeColor(submission.percentage)}`}>
                      {submission.percentage}%
                    </td>
                    <td className="border border-slate-300 px-2 sm:px-4 py-2 text-center text-xs">
                      {submission.dueDate ? new Date(submission.dueDate).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {assignmentSubmissions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-500">No assignments found for this subject.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentSection;