export const getGradeColor = (percentage) => {
  if (percentage >= 80) return 'text-green-600';
  if (percentage >= 70) return 'text-blue-600';
  if (percentage >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

export const getTermName = (term) => {
  switch (term) {
    case 1: return '1st Term';
    case 2: return '2nd Term';
    case 3: return '3rd Term';
    default: return `Term ${term}`;
  }
};

export const getTeacherName = (user) => {
  if (!user) return 'Unknown Teacher';

  return user?.name ||
         user.displayName ||
         (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : '') ||
         user.email?.split('@')[0] ||
         'Unknown Teacher';
};

export const calculateAttendanceRate = (attendanceData) => {
  if (attendanceData.length === 0) return 0;

  const presentDays = attendanceData.filter(record =>
    record.status === 'present' || record.status === 'late'
  ).length;

  return Math.round((presentDays / attendanceData.length) * 100);
};

export const calculateAverageScore = (assignmentSubmissions) => {
  if (assignmentSubmissions.length === 0) return 0;

  return Math.round(
    assignmentSubmissions.reduce((sum, sub) => sum + sub.percentage, 0) / assignmentSubmissions.length
  );
};

export const exportReport = () => {
  const printWindow = window.open('', '_blank');
  const reportContent = document.getElementById('report-content');

  if (reportContent && printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Student Progress Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .student-info { margin-bottom: 20px; }
            .grades-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .grades-table th, .grades-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .grades-table th { background-color: #f2f2f2; }
            .summary { margin-top: 20px; }
          </style>
        </head>
        <body>
          ${reportContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
};
