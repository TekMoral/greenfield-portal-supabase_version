import { useState } from 'react';
import { submitReport, checkReportExists, submitBulkReports } from '../services/reportService';
import { getFullName } from '../utils/nameUtils';
import { getTeacherName, calculateAttendanceRate, calculateAverageScore } from '../utils/reportUtils';

export const useReportSubmission = () => {
  const [submittingReport, setSubmittingReport] = useState(false);
  const [submittingBulkReports, setSubmittingBulkReports] = useState(false);

  const submitReportToAdmin = async ({
    selectedStudent,
    selectedSubject,
    selectedClass,
    selectedTerm,
    selectedAcademicYear,
    attendanceData,
    assignmentSubmissions,
    remarks,
    classes,
    user
  }) => {
    if (!selectedStudent || !selectedSubject || !selectedClass || !user?.uid) {
      alert('Please ensure all required fields are selected');
      return;
    }

    setSubmittingReport(true);
    try {
      // Check if report already exists
      const reportExists = await checkReportExists(
        selectedStudent.id,
        selectedSubject,
        selectedTerm,
        selectedAcademicYear,
        user.uid
      );

      if (reportExists) {
        alert(`A report for this student, subject, term, and academic year already exists.`);
        setSubmittingReport(false);
        return;
      }

      // Calculate metrics
      const attendanceRate = calculateAttendanceRate(attendanceData);
      const averageScore = calculateAverageScore(assignmentSubmissions);
      const teacherName = getTeacherName(user);
      const className = classes.find(c => c.id === selectedClass)?.name || 'Unknown Class';

      // Prepare report data
      const reportData = {
        studentId: selectedStudent.id,
        studentName: getFullName(selectedStudent),
        studentAdmissionNumber: selectedStudent.admissionNumber,
        className: className,
        subjectName: selectedSubject,
        teacherId: user.uid,
        teacherName: teacherName,
        academicYear: selectedAcademicYear,
        term: selectedTerm,
        attendanceRate: attendanceRate,
        averageScore: averageScore,
        totalAssignments: assignmentSubmissions.length,
        submittedAssignments: assignmentSubmissions.filter(sub => sub.submitted).length,
        remarks: remarks || '',
        attendanceData: {
          totalDays: attendanceData.length,
          presentDays: attendanceData.filter(record => 
            record.status === 'present' || record.status === 'late'
          ).length,
          absentDays: attendanceData.length - attendanceData.filter(record => 
            record.status === 'present' || record.status === 'late'
          ).length
        },
        assignmentData: {
          total: assignmentSubmissions.length,
          submitted: assignmentSubmissions.filter(sub => sub.submitted).length,
          averageScore: averageScore
        }
      };

      await submitReport(reportData);
      alert('Report submitted to admin successfully!');
      return true;
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Error submitting report. Please try again.');
      return false;
    } finally {
      setSubmittingReport(false);
    }
  };

  const submitBulkReportsToAdmin = async ({
    selectedClass,
    selectedSubject,
    selectedTerm,
    selectedAcademicYear,
    students,
    classes,
    user,
    fetchAttendanceData,
    fetchAssignmentSubmissions,
    fetchRemarks
  }) => {
    if (!selectedClass || !selectedSubject || !user?.uid || students.length === 0) {
      alert('Please ensure class, subject, and students are selected');
      return;
    }

    setSubmittingBulkReports(true);
    try {
      const teacherName = getTeacherName(user);
      const className = classes.find(c => c.id === selectedClass)?.name || 'Unknown Class';

      // Prepare reports for all students
      const reportsData = await Promise.all(
        students.map(async (student) => {
          try {
            // Fetch data for each student
            const [attendance, submissions, studentRemarks] = await Promise.all([
              fetchAttendanceData(student.id, selectedSubject),
              fetchAssignmentSubmissions(student.id, selectedSubject),
              fetchRemarks(student.id, selectedSubject, selectedClass)
            ]);

            // Calculate metrics
            const attendanceRate = calculateAttendanceRate(attendance);
            const averageScore = calculateAverageScore(submissions);

            return {
              studentId: student.id,
              studentName: getFullName(student),
              studentAdmissionNumber: student.admissionNumber,
              className: className,
              subjectName: selectedSubject,
              teacherId: user.uid,
              teacherName: teacherName,
              academicYear: selectedAcademicYear,
              term: selectedTerm,
              attendanceRate: attendanceRate,
              averageScore: averageScore,
              totalAssignments: submissions.length,
              submittedAssignments: submissions.filter(sub => sub.submitted).length,
              remarks: studentRemarks.remarks || '',
              attendanceData: {
                totalDays: attendance.length,
                presentDays: attendance.filter(record => 
                  record.status === 'present' || record.status === 'late'
                ).length,
                absentDays: attendance.length - attendance.filter(record => 
                  record.status === 'present' || record.status === 'late'
                ).length
              },
              assignmentData: {
                total: submissions.length,
                submitted: submissions.filter(sub => sub.submitted).length,
                averageScore: averageScore
              }
            };
          } catch (error) {
            console.error(`Error preparing report for student ${student.id}:`, error);
            return null;
          }
        })
      );

      // Filter out any null reports
      const validReports = reportsData.filter(report => report !== null);

      if (validReports.length === 0) {
        alert('No valid reports could be prepared. Please try again.');
        return;
      }

      // Submit bulk reports
      const result = await submitBulkReports(validReports);
      
      // Show results
      const message = `Bulk submission completed!\n\nSuccessful: ${result.totalSubmitted}\nFailed: ${result.totalFailed}`;
      
      if (result.totalFailed > 0) {
        const failedStudents = result.failed.map(f => `${f.studentName}: ${f.error}`).join('\n');
        alert(`${message}\n\nFailed submissions:\n${failedStudents}`);
      } else {
        alert(message);
      }

      return true;
    } catch (error) {
      console.error('Error submitting bulk reports:', error);
      alert('Error submitting bulk reports. Please try again.');
      return false;
    } finally {
      setSubmittingBulkReports(false);
    }
  };

  return {
    submittingReport,
    submittingBulkReports,
    submitReportToAdmin,
    submitBulkReportsToAdmin
  };
};