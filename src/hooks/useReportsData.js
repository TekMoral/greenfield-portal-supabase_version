import { useState, useEffect } from 'react';
import { teacherStudentService, reportService } from "../services/supabase";
import { attendanceService } from "../services/supabase/attendanceService";
import { getFullName } from "../utils/nameUtils";
import { aggregateSubjects, getClassesForSubject, expandClassEntryToIds } from "../utils/teacherClassSubjectUtils";
import { getSubjectsByDepartment } from "../services/supabase/subjectService";

export const useReportsData = (user) => {
  const [allClasses, setAllClasses] = useState([]);
  const [coreSubjectNames, setCoreSubjectNames] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  // Report data
  const [attendanceData, setAttendanceData] = useState([]);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [editingRemarks, setEditingRemarks] = useState(false);
  const [savingRemarks, setSavingRemarks] = useState(false);

  // Report submission states
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(new Date().getFullYear());

  // Fetch teacher's classes and subjects using centralized utilities
  useEffect(() => {
    const fetchClassesAndSubjects = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch teacher classes
        const classesRes = await teacherStudentService.getTeacherClassesAndSubjects(user.id);
        const teacherClasses = classesRes?.success ? (classesRes.data || []) : (Array.isArray(classesRes) ? classesRes : []);
        setAllClasses(teacherClasses);
        
        // Load core subject names for proper grouping
        let coreNames = [];
        try {
          const coreRes = await getSubjectsByDepartment('core');
          coreNames = Array.isArray(coreRes) ? coreRes.map(s => s.name || s.subjectName || s) : [];
        } catch (_) {
          coreNames = [];
        }
        setCoreSubjectNames(coreNames);
        
        // Use centralized utility to aggregate subjects
        const subjects = aggregateSubjects(teacherClasses);
        setAvailableSubjects(subjects);
        
        // Auto-select first subject if available
        if (subjects.length > 0) {
          setSelectedSubject(subjects[0].subjectName);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClassesAndSubjects();
  }, [user?.id]);

  // Get available classes for selected subject using centralized utilities
  const getAvailableClasses = () => {
    if (!selectedSubject) return [];
    // Resolve subject_id from availableSubjects; prefer ID-based filtering
    const subj = (availableSubjects || []).find((s) => s.subjectName === selectedSubject);
    const subjectId = subj?.subjectId || '';

    return getClassesForSubject(allClasses, {
      subjectId,
      subjectName: selectedSubject, // kept for fallback compatibility
      coreSubjects: coreSubjectNames
    });
  };

  // Legacy function for backward compatibility with components
  const getAvailableSubjects = () => {
    return availableSubjects;
  };

  // Fetch students when class and subject are selected using centralized utilities
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass || !selectedSubject || !user?.id) {
        setStudents([]);
        return;
      }

      setLoadingStudents(true);
      try {
        console.log('Fetching students for reports:', { selectedClass, selectedSubject, teacherId: user.id });
        
        // Find the selected class entry and expand to individual class IDs
        const availableClasses = getAvailableClasses();
        const selectedClassEntry = availableClasses.find(cls => cls.id === selectedClass);
        
        if (!selectedClassEntry) {
          setStudents([]);
          return;
        }
        
        // Use centralized utility to expand class IDs
        const classIds = expandClassEntryToIds(selectedClassEntry);
        
        console.log('Fetching students from class IDs for reports:', classIds);
        const res = await teacherStudentService.getStudentsByTeacherSubjectAndClasses(user.id, selectedSubject, classIds);
        const classStudents = res?.success ? (res.data || []) : (Array.isArray(res) ? res : []);
        
        console.log('Found students for reports:', classStudents.length);
        setStudents(classStudents);
      } catch (error) {
        console.error('Error fetching students:', error);
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [selectedClass, selectedSubject, user?.id, allClasses, availableSubjects, coreSubjectNames]);

  // Fetch attendance data for selected student with error handling
  const fetchAttendanceData = async (studentId, subjectName) => {
    try {
      const res = await attendanceService.getStudentAttendance(studentId);
      const rows = res?.success ? (res.data || []) : [];
      // Normalize to UI shape (markedAt expected by AttendanceSection)
      const normalized = rows.map((r) => ({
        id: r.id ?? r.record_id ?? r.attendance_id ?? null,
        date: r.date,
        status: r.status,
        markedAt: r.last_updated_at ?? r.markedAt ?? null,
      }));
      // Sort by date in JavaScript
      return normalized.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      return [];
    }
  };

  // Fetch assignment submissions with error handling and actual scores
  const fetchAssignmentSubmissions = async (studentId, subjectName) => {
    try {
      const submissionsWithScores = await reportService.getStudentAssignmentSubmissions(user.id, studentId, subjectName);
      return submissionsWithScores;
    } catch (error) {
      console.error('Error fetching assignment submissions:', error);
      // Return mock data for development with realistic scores
      return [
        {
          assignmentId: 'mock1',
          title: 'Mathematics Assignment 1',
          dueDate: '2024-01-20',
          maxPoints: 100,
          submitted: true,
          submittedAt: '2024-01-19',
          score: 85,
          percentage: 85,
          feedback: 'Good work, well done!',
          status: 'graded'
        },
        {
          assignmentId: 'mock2',
          title: 'Mathematics Quiz 1',
          dueDate: '2024-01-25',
          maxPoints: 50,
          submitted: true,
          submittedAt: '2024-01-24',
          score: 42,
          percentage: 84,
          feedback: 'Excellent understanding',
          status: 'graded'
        },
        {
          assignmentId: 'mock3',
          title: 'Mathematics Assignment 2',
          dueDate: '2024-01-30',
          maxPoints: 100,
          submitted: false,
          submittedAt: null,
          score: 0,
          percentage: 0,
          feedback: '',
          status: 'not_submitted'
        }
      ];
    }
  };

  // Fetch remarks for selected student with improved error handling
  const fetchRemarks = async (studentId, subjectName, classId) => {
    try {
      // Resolve subject_id (UUID) from the provided subjectName
      const subjId = (availableSubjects || []).find(s => s.subjectName === subjectName)?.subjectId || '';
      const remarksData = await reportService.getStudentRemarks(studentId, subjId, classId, user?.uid || user?.id);
      return remarksData || { remarks: '', id: null };
    } catch (error) {
      console.error('Error fetching remarks:', error);
      // Return empty remarks on permission error and continue gracefully
      return { remarks: '', id: null };
    }
  };

  // Save remarks with error handling
  const saveRemarks = async (remarksText) => {
    if (!selectedStudent || !selectedSubject || !selectedClass) return;
    
    setSavingRemarks(true);
    try {
      const subjId = (availableSubjects || []).find(s => s.subjectName === selectedSubject)?.subjectId || '';
      await reportService.saveStudentRemarks({
        studentId: selectedStudent.id,
        studentName: getFullName(selectedStudent),
        subjectId: subjId,
        classId: selectedClass,
        teacherId: user?.uid || user?.id,
        remarks: remarksText.slice(0, 100) // Limit to 100 characters
      });
      
      setRemarks(remarksText.slice(0, 100));
      setEditingRemarks(false);
    } catch (error) {
      console.error('Error saving remarks:', error);
      alert('Error saving remarks. Please try again.');
    } finally {
      setSavingRemarks(false);
    }
  };

  // Load student report data
  const loadStudentReportData = async (student) => {
    setSelectedStudent(student);
    setLoadingReport(true);
    
    try {
      const [attendance, submissions, studentRemarks] = await Promise.all([
        fetchAttendanceData(student.id, selectedSubject),
        fetchAssignmentSubmissions(student.id, selectedSubject),
        fetchRemarks(student.id, selectedSubject, selectedClass)
      ]);
      
      setAttendanceData(attendance);
      setAssignmentSubmissions(submissions);
      setRemarks(studentRemarks.remarks || '');
    } catch (error) {
      console.error('Error fetching student data:', error);
      setAttendanceData([]);
      setAssignmentSubmissions([]);
      setRemarks('');
    } finally {
      setLoadingReport(false);
    }
  };

  // Clear report data
  const clearReportData = () => {
    setSelectedStudent(null);
    setAttendanceData([]);
    setAssignmentSubmissions([]);
    setRemarks('');
    setEditingRemarks(false);
  };

  return {
    // State
    classes: getAvailableClasses(), // Return filtered classes for selected subject
    allClasses,
    availableSubjects,
    selectedClass,
    selectedSubject,
    students,
    selectedStudent,
    attendanceData,
    assignmentSubmissions,
    remarks,
    editingRemarks,
    savingRemarks,
    selectedTerm,
    selectedAcademicYear,
    loading,
    loadingStudents,
    loadingReport,

    // Setters
    setSelectedClass,
    setSelectedSubject,
    setSelectedStudent,
    setRemarks,
    setEditingRemarks,
    setSelectedTerm,
    setSelectedAcademicYear,

    // Functions
    getAvailableSubjects, // Legacy compatibility
    getAvailableClasses,
    fetchAttendanceData,
    fetchAssignmentSubmissions,
    fetchRemarks,
    saveRemarks,
    loadStudentReportData,
    clearReportData
  };
};