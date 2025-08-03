import React from 'react';

const AttendanceSection = ({ attendanceData }) => {
  const presentDays = attendanceData.filter(record => 
    record.status === 'present' || record.status === 'late'
  ).length;

  const attendanceRate = attendanceData.length > 0 
    ? Math.round((presentDays / attendanceData.length) * 100) 
    : 0;

  return (
    <div>
      <h4 className="text-base sm:text-lg font-semibold text-slate-800 mb-3">Attendance Record</h4>
      <div className="bg-slate-50 rounded-lg p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="bg-white rounded-lg p-3 sm:p-4 border">
            <div className="text-xs sm:text-sm text-slate-600">Total Days</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-800">{attendanceData.length}</div>
          </div>
          <div className="bg-white rounded-lg p-3 sm:p-4 border">
            <div className="text-xs sm:text-sm text-slate-600">Present Days</div>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{presentDays}</div>
          </div>
          <div className="bg-white rounded-lg p-3 sm:p-4 border">
            <div className="text-xs sm:text-sm text-slate-600">Attendance Rate</div>
            <div className={`text-xl sm:text-2xl font-bold ${
              attendanceRate >= 80 ? 'text-green-600' : 
              attendanceRate >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {attendanceRate}%
            </div>
          </div>
        </div>
        
        {attendanceData.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300 text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-2 sm:px-4 py-2 text-left">Date</th>
                  <th className="border border-slate-300 px-2 sm:px-4 py-2 text-center">Status</th>
                  <th className="border border-slate-300 px-2 sm:px-4 py-2 text-center">Time Marked</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.slice(0, 10).map((record, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="border border-slate-300 px-2 sm:px-4 py-2">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="border border-slate-300 px-2 sm:px-4 py-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.status === 'present' ? 'bg-green-100 text-green-800' :
                        record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </td>
                    <td className="border border-slate-300 px-2 sm:px-4 py-2 text-center text-xs">
                      {record.markedAt ? new Date(record.markedAt).toLocaleTimeString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {attendanceData.length > 10 && (
              <div className="text-center mt-4 text-sm text-slate-600">
                Showing latest 10 records out of {attendanceData.length} total
              </div>
            )}
          </div>
        )}

        {attendanceData.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-500">No attendance records found for this student.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceSection;