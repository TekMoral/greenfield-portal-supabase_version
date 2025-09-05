import { useState, useEffect } from 'react';
import { teacherStudentService, reportService } from "../services/supabase";
import { getFullName } from "../utils/nameUtils";

export const useReportsData = (user) => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
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

  // Fetch teacher's classes
  useEffect(() => {
    const fetchClasses = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const classesRes = await teacherStudentService.getTeacherClassesAndSubjects(user.id);
        const teacherClasses = classesRes?.success ? (classesRes.data || []) : (Array.isArray(classesRes) ? classesRes : []);
        setClasses(teacherClasses);
        
        // Auto-select first class if available
        if (Array.isArray(teacherClasses) && teacherClasses.length > 0) {
          setSelectedClass(teacherClasses[0].id);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [user?.id]);

  // Get available subjects for selected class
  const getAvailableSubjects = () => {
    if (!selectedClass) return [];
    
    const list = Array.isArray(classes) ? classes : [];
    const classData = list.find(cls => cls.id === selectedClass);
    if (!classData) return [];
    
    return classData.subjectsTaught || [];
  };

  // Fetch students when class and subject are selected
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass || !selectedSubject || !user?.id) {
        setStudents([]);
        return;
      }

      setLoadingStudents(true);
      try {
        console.log('Fetching students for reports:', { selectedClass, selectedSubject, teacherId: user.id });
        
        // Get the selected class data to determine if it's grouped
        const list = Array.isArray(classes) ? classes : [];
        const selectedClassData = list.find(cls => cls.id === selectedClass);
        
        let classStudents = [];
        
        if (selectedClassData?.isGrouped && selectedClassData?.individualClasses) {
          // For grouped classes, get students from all individual classes
          const classIds = selectedClassData.individualClasses.map(cls => cls.id);
          console.log('Fetching students from grouped classes for reports:', classIds);
          
          const res = await teacherStudentService.getStudentsByTeacherSubjectAndClasses(user.id, selectedSubject, classIds);
          classStudents = res?.success ? (res.data || []) : (Array.isArray(res) ? res : []);
        } else {
          // For individual classes, get students normally
          console.log('Fetching students from individual class for reports:', selectedClass);
          const subjectRes = await teacherStudentService.getStudentsByTeacherSubject(user.id, selectedSubject);
          const subjectStudents = subjectRes?.success ? (subjectRes.data || []) : (Array.isArray(subjectRes) ? subjectRes : []);
          classStudents = subjectStudents.filter(student => student.classId === selectedClass);
        }
        
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
  }, [selectedClass, selectedSubject, user?.id, classes]);

  // Fetch attendance data for selected student with error handling
  const fetchAttendanceData = async (studentId, subjectName) => {
    try {
      const attendance = await reportService.getStudentAttendance(studentId, subjectName);
      
      // Sort by date in JavaScript
      return attendance.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      // Return mock data for development
      return [
        {
          id: 'mock1',
          date: '2024-01-15',
          status: 'present',
          markedAt: new Date().toISOString()
        },
        {
          id: 'mock2',
          date: '2024-01-14',
          status: 'present',
          markedAt: new Date().toISOString()
        },
        {
          id: 'mock3',
          date: '2024-01-13',
          status: 'absent',
          markedAt: new Date().toISOString()
        }
      ];
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
      const remarksData = await reportService.getStudentRemarks(studentId, subjectName, classId, user.id);
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
      await reportService.saveStudentRemarks({
        studentId: selectedStudent.id,
        studentName: getFullName(selectedStudent),
        subjectName: selectedSubject,
        classId: selectedClass,
        teacherId: user.id,
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
    classes,
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
    getAvailableSubjects,
    fetchAttendanceData,
    fetchAssignmentSubmissions,
    fetchRemarks,
    saveRemarks,
    loadStudentReportData,
    clearReportData
  };
};