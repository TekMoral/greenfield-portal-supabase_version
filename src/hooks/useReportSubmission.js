import { useState } from 'react';
import { checkReportExists, teacherUpsertSubjectReport } from '../services/supabase/reportService';
import { supabase } from '../lib/supabaseClient';
import { getFullName } from '../utils/nameUtils';
import { getTeacherName, calculateAttendanceRate, calculateAverageScore } from '../utils/reportUtils';

const isValidUUID = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

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
      // Resolve subject_id from subjects table
      const { data: subjRow, error: subjErr } = await supabase
        .from('subjects')
        .select('id')
        .eq('name', selectedSubject)
        .limit(1)
        .single();
      if (subjErr || !subjRow?.id) {
        alert('Unable to find subject. Please refresh and try again.');
        setSubmittingReport(false);
        return;
      }
      const subjectId = subjRow.id;

      // Check if report already exists by subject_id
      const existsRes = await checkReportExists(
        selectedStudent.id,
        subjectId,
        selectedTerm,
        selectedAcademicYear,
        user.uid
      );

      if (existsRes?.success && existsRes.data?.exists && !existsRes.data?.canResubmit) {
        alert('A report for this student, subject, term, and academic year already exists.');
        setSubmittingReport(false);
        return;
      }

      // Calculate metrics
      const attendanceRate = calculateAttendanceRate(attendanceData);
      const averageScore = calculateAverageScore(assignmentSubmissions);
      const teacherName = getTeacherName(user);
      const className = classes.find(c => c.id === selectedClass)?.name || 'Unknown Class';

      // RPC payload (snake_case, minimal fields per table design)
      const payload = {
        p_student_id: selectedStudent.id,
        p_subject_id: subjectId,
        p_class_id: isValidUUID(selectedClass) ? selectedClass : null,
        p_term: selectedTerm,
        p_academic_year: Number(selectedAcademicYear),
        p_total_assignments: assignmentSubmissions.length,
        p_submitted_assignments: assignmentSubmissions.filter(sub => sub.submitted).length,
        p_average_score: averageScore,
        p_remarks: remarks || ''
      };

      const upsertRes = await teacherUpsertSubjectReport(payload);
      if (!upsertRes?.success) {
        console.error('Upsert RPC error:', upsertRes?.error);
        alert('Failed to submit report. Please try again.');
        setSubmittingReport(false);
        return false;
      }
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
                  record.status === 'present'
                ).length,
                absentDays: attendance.length - attendance.filter(record => 
                  record.status === 'present'
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

      // Resolve subject_id once
      const { data: subjRow, error: subjErr } = await supabase
        .from('subjects')
        .select('id')
        .eq('name', selectedSubject)
        .limit(1)
        .single();
      if (subjErr || !subjRow?.id) {
        alert('Unable to find subject. Please refresh and try again.');
        setSubmittingBulkReports(false);
        return;
      }
      const subjectId = subjRow.id;

      // Submit bulk via RPC per student
      let totalSubmitted = 0;
      let totalFailed = 0;
      const failed = [];

      for (const student of validReports.map(r => ({ id: r.studentId, admissionNumber: r.studentAdmissionNumber, name: r.studentName }))) {
        try {
          // Recompute metrics from the prepared report in validReports
          const original = reportsData.find(x => x && x.studentId === student.id);
          const averageScore = original?.averageScore ?? 0;
          const totalAssignments = original?.totalAssignments ?? 0;
          const submittedAssignments = original?.submittedAssignments ?? 0;
          const teacherRemark = original?.remarks || '';

          const payload = {
            p_student_id: student.id,
            p_subject_id: subjectId,
            p_class_id: isValidUUID(selectedClass) ? selectedClass : null,
            p_term: selectedTerm,
            p_academic_year: Number(selectedAcademicYear),
            p_total_assignments: totalAssignments,
            p_submitted_assignments: submittedAssignments,
            p_average_score: averageScore,
            p_remarks: teacherRemark,
          };

          const res = await teacherUpsertSubjectReport(payload);
          if (res?.success) totalSubmitted += 1; else {
            totalFailed += 1;
            failed.push({ studentName: student.name, error: res?.error || 'Unknown error' });
          }
        } catch (e) {
          totalFailed += 1;
          failed.push({ studentName: student.name, error: e?.message || 'Unknown error' });
        }
      }

      // Show results
      const message = `Bulk submission completed!\n\nSuccessful: ${totalSubmitted}\nFailed: ${totalFailed}`;
      
      if (totalFailed > 0) {
        const failedStudents = failed.map(f => `${f.studentName}: ${f.error}`).join('\n');
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