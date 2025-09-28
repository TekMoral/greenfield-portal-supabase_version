import React, { useState, useEffect, useRef } from 'react';
import { getTeacherClassesAndSubjects, getStudentsByTeacherSubjectAndClasses } from '../../../services/supabase/teacherStudentService';

import { submitResult, insertExamResultsBulk, getSubmittedResults } from '../../../services/supabase/studentResultService';
import { useAuth } from '../../../hooks/useAuth';
import useToast from '../../../hooks/useToast';
import ExamResultEntryForm from '../../../components/results/ExamResultEntryForm';
import BulkExamResultUpload from '../../../components/results/BulkExamResultUpload';
import { aggregateSubjects, getClassesForSubject as buildClassesForSubject, expandClassEntryToIds } from '../../../utils/teacherClassSubjectUtils';
import { getSubjectsByDepartment } from '../../../services/supabase/subjectService';
import { useSettings } from '../../../contexts/SettingsContext';


const ExamResults = () => {

  const { user } = useAuth();
  const { showToast } = useToast();
  const { academicYear, currentTerm } = useSettings();
  const normalizeTermToNumber = (t) => {
    const s = String(t || '').toLowerCase();
    if (s.includes('2')) return 2;
    if (s.includes('3')) return 3;
    return 1;
  };
  const parseYearFromAcademic = (val) => {
    const s = String(val || '');
    if (s.includes('/')) {
      const head = parseInt(s.split('/')[0], 10);
      return Number.isFinite(head) ? head : new Date().getFullYear();
    }
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : new Date().getFullYear();
  };

  const [teacherClasses, setTeacherClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [students, setStudents] = useState([]);

  const [submittedResults, setSubmittedResults] = useState(new Set()); // Track submitted students
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('individual');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [coreSubjectNames, setCoreSubjectNames] = useState([]);
  const [existingResultsMap, setExistingResultsMap] = useState({});

  // Helper function to get student full name
  const getStudentName = (student) => {
    if (student.firstName && student.lastName) {
      return `${student.firstName} ${student.lastName}`;
    }
    return student.name || 'Unknown Student';
  };

  const initializedRef = useRef(false);
  useEffect(() => {
    if (!user?.id || initializedRef.current) return;
    initializedRef.current = true;
    fetchTeacherData();
  }, [user?.id]);

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      fetchStudents();
    }
  }, [selectedClass, selectedSubject]);

  // Preload existing submitted results when both subject and students are available
  useEffect(() => {
    const loadExistingSubmitted = async () => {
      if (!selectedSubjectId || !students.length) {
        console.log('🔍 Skipping preload - missing subject or students:', { selectedSubjectId, studentsCount: students.length });
        return;
      }
      
      console.log('🔍 Loading existing submitted results for subject:', selectedSubjectId);
      console.log('📚 Students to check:', students.map(s => ({ id: s.id, name: s.firstName + ' ' + s.surname })));
      
      try {
        const resSubmitted = await getSubmittedResults({ 
          subjectId: selectedSubjectId, 
          status: 'submitted' 
        });
        const resGraded = await getSubmittedResults({
          subjectId: selectedSubjectId,
          status: 'graded'
        });
        
        console.log('📊 getSubmittedResults API response:', { submitted: resSubmitted, graded: resGraded });
        
        const combinedData = (resSubmitted?.success ? (resSubmitted.data || []) : []).concat(resGraded?.success ? (resGraded.data || []) : []);
        if (combinedData.length > 0) {
          const map = {};
          const submittedIds = [];
          const studentIdsSet = new Set(students.map(s => String(s.id)));
          
          combinedData.forEach(r => {
            const sid = String(r.studentId ?? r.student_id);
            if (!studentIdsSet.has(sid)) {
              return;
            }
            console.log('✅ Found submitted result for student:', sid, {
              term: r.term,
              year: r.year,
              status: r.status,
              examScore: r.examScore ?? r.exam_score,
              testScore: r.testScore ?? r.test_score
            });
            if (sid) {
              map[sid] = r;
              submittedIds.push(sid);
            }
          });
          
          console.log('🗺️ Built existingResultsMap:', map);
          console.log('🎯 Submitted student IDs:', submittedIds);
          
          setExistingResultsMap(map);
          
          // Merge into submitted set so rows render as submitted
          if (submittedIds.length) {
            setSubmittedResults(prev => {
              const newSet = new Set([...prev, ...submittedIds]);
              console.log('🔄 Updated submittedResults Set:', Array.from(newSet));
              return newSet;
            });
          }
        } else {
          console.log('❌ No submitted/graded results found:', { resSubmitted, resGraded });
          // Clear existing results if no data
          setExistingResultsMap({});
          setSubmittedResults(new Set());
        }
      } catch (e) {
        console.error('💥 Error preloading submitted results:', e);
      }
    };
    
    loadExistingSubmitted();
  }, [selectedSubjectId, students]); // Depend on both subject and students

  const fetchTeacherData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const res = await getTeacherClassesAndSubjects(user.id);
      const classes = res?.success ? (res.data || []) : (Array.isArray(res) ? res : []);
      setTeacherClasses(classes);

      // Load core subject names for grouping
      let coreNames = [];
      try {
        const coreRes = await getSubjectsByDepartment('core');
        coreNames = Array.isArray(coreRes) ? coreRes.map(s => s.name || s.subjectName || s) : [];
      } catch (_) {
        coreNames = [];
      }
      setCoreSubjectNames(coreNames);

      // Auto-select default subject and class respecting grouping
      if (classes.length > 0) {
        const firstClass = classes[0];
        const firstSubject = firstClass.subjectsTaught && firstClass.subjectsTaught[0];
        if (firstSubject) {
          const subjName = firstSubject.subjectName;
          const subjId = firstSubject.subjectId || '';
          setSelectedSubject(subjName);
          setSelectedSubjectId(subjId);
          const opts = buildClassesForSubject(classes, { subjectName: subjName, subjectId: subjId, coreSubjects: coreNames });
          const initialClassId = opts.some(o => String(o.id) === String(firstClass.id))
            ? firstClass.id
            : (opts[0]?.id || firstClass.id);
          setSelectedClass(initialClassId);
        } else {
          setSelectedClass(firstClass.id);
        }
      }
    } catch (error) {
      console.error('Error fetching teacher data:', error);
      showToast('Failed to load teacher data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!selectedClass || !selectedSubject || !user?.id) {
      console.log('Missing required data for fetchStudents:', { selectedClass, selectedSubject, userId: user?.id });
      return;
    }

    try {
      console.log('Fetching students for:', { selectedClass, selectedSubject, teacherId: user.id });
      
      // Get available classes for the selected subject
      const availableClasses = getClassesForSubject(selectedSubject, selectedSubjectId);
      console.log('Available classes for subject:', availableClasses);
      
      // Find the selected class from available classes (not from teacherClasses directly)
      const selectedClassData = availableClasses.find(c => String(c.id) === String(selectedClass));
      console.log('Selected class data:', selectedClassData);

      if (selectedClassData) {
        const classIds = expandClassEntryToIds(selectedClassData);
        console.log('Expanded class IDs:', classIds);

        const studentsRes = await getStudentsByTeacherSubjectAndClasses(
          user.id,
          selectedSubject,
          classIds
        );
        console.log('Students response:', studentsRes);
        
        // Normalize response to always be an array
        const studentsArray = studentsRes?.success
          ? (studentsRes.data || [])
          : (Array.isArray(studentsRes) ? studentsRes : []);
        
        console.log('Final students array:', studentsArray);
        
        if (Array.isArray(studentsArray)) {
          setStudents(studentsArray);
          console.log('Students set successfully:', studentsArray.length);
        } else {
          console.error('Failed to fetch students:', studentsRes?.error || 'Invalid response');
          setStudents([]);
          showToast('Failed to load students', 'error');
        }
      } else {
        console.error('Selected class not found in available classes');
        setStudents([]);
        showToast('Selected class not found', 'error');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      showToast('Failed to load students', 'error');
      setStudents([]);
    }
  };

  const handleClassChange = (classId) => {
    setSelectedClass(classId);
    setStudents([]);
    setSubmittedResults(new Set());
    setExistingResultsMap({});
  };

  const getAvailableSubjects = () => aggregateSubjects(teacherClasses);

  const getSelectedClassData = () => {
    return teacherClasses.find(c => c.id === selectedClass);
  };

  // Build class options based on selected subject
  const getClassesForSubject = (subjectName, subjectId) => buildClassesForSubject(teacherClasses, { subjectName, subjectId, coreSubjects: coreSubjectNames });

  const handleIndividualResultSubmit = async (resultData) => {
    if (!selectedClass || !selectedSubject) {
      showToast('Please select class and subject', 'error');
      return;
    }

    try {
      setSubmitting(true);
      // Use the same SECURITY DEFINER bulk RPC with a single item so teacher_id is persisted (RLS-compatible)
      const res = await insertExamResultsBulk({
        results: [
          {
            studentId: resultData.studentId,
            term: resultData.term,
            session: resultData.session,
            examScore: resultData.exam_score,
            testScore: resultData.test_score,
            remark: resultData.remark ?? ''
          }
        ],
        subjectId: selectedSubjectId,
        term: resultData.term,
        year: resultData.session,
        teacherId: user.id,
        status: 'submitted'
      });
      if (!res?.success) {
        throw new Error(res?.error || 'Failed to submit result');
      }
      setSubmittedResults(prev => new Set([...prev, String(resultData.studentId)]));
      // Cache as existing to allow prefill if reopened
      setExistingResultsMap(prev => ({
        ...prev,
        [String(resultData.studentId)]: {
          studentId: resultData.studentId,
          term: resultData.term,
          year: resultData.session,
          exam_score: resultData.exam_score,
          test_score: resultData.test_score,
          remark: resultData.remark ?? '',
          status: 'submitted'
        }
      }));
      setShowEntryForm(false);
      setSelectedStudent(null);
      showToast('Result submitted to admin for review', 'success');
    } catch (error) {
      console.error('Error submitting result:', error);
      const msg = (error?.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('duplicate') || msg.includes('23505')) {
        // Gracefully handle duplicates: mark as submitted in UI and close form
        if (resultData?.studentId) {
          setSubmittedResults(prev => new Set([...prev, String(resultData.studentId)]));
          // Cache the attempted submission for prefill
          setExistingResultsMap(prev => ({
            ...prev,
            [String(resultData.studentId)]: {
              studentId: resultData.studentId,
              term: resultData.term,
              year: resultData.session,
              exam_score: resultData.exam_score,
              test_score: resultData.test_score,
              remark: resultData.remark ?? '',
              status: 'submitted'
            }
          }));
        }
        setShowEntryForm(false);
        setSelectedStudent(null);
        showToast('Already submitted to admin for this term/year. Marked as submitted.', 'info');
      } else if (msg.includes('permission')) {
        showToast('Permission denied. Please contact your administrator.', 'error');
      } else if (msg.includes('unavailable')) {
        showToast('Service temporarily unavailable. Please try again later.', 'error');
      } else {
        showToast(`Failed to submit result: ${error.message}`, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkResultSubmit = async (bulkResults) => {
    if (!selectedClass || !selectedSubject) {
      showToast('Please select class and subject', 'error');
      return;
    }

    try {
      setSubmitting(true);

      const classData = getSelectedClassData();
      // Force term/year from global settings when submitting
      const term = normalizeTermToNumber(currentTerm);
      const year = String(parseYearFromAcademic(academicYear));
      // Normalize each row to global session/term to avoid mismatches
      const normalizedBulk = (bulkResults || []).map(r => ({
        ...r,
        term: term,
        session: year,
      }));

      const res = await insertExamResultsBulk({
        results: normalizedBulk,
        subjectId: selectedSubjectId,
        term,
        year,
        teacherId: user.id,
        examId: null,
        status: 'submitted'
      });

      if (!res?.success) {
        throw new Error(res?.error || 'Failed to submit bulk results');
      }

      // Mark all students as submitted (support both manual and CSV shapes)
      const submittedStudentIds = bulkResults
        .map(r => r.studentId ?? r.student_id)
        .filter(Boolean);
      setSubmittedResults(prev => new Set([...prev, ...submittedStudentIds]));
      showToast(`${submittedStudentIds.length} result(s) submitted to admin.`, 'success');
    } catch (error) {
      console.error('Error submitting bulk results:', error);
      const emsg = (error?.message || '').toLowerCase();
      if (emsg.includes('row-level security') || emsg.includes('rls')) {
        showToast('Submission blocked by security policy. Please contact your administrator.', 'error');
      } else if (emsg.includes('already') || emsg.includes('duplicate') || emsg.includes('23505')) {
        // Gracefully handle duplicates: fetch submitted results for this subject/term/year and mark them in UI
        try {
          const termFilter = (() => {
            const n = parseInt(term, 10);
            return Number.isFinite(n) ? n : term;
          })();
          const yearFilter = (() => {
            const m = String(year).match(/\b(20\d{2}|19\d{2})\b/);
            return m ? parseInt(m[1], 10) : (parseInt(year, 10) || new Date().getFullYear());
          })();

          const existing = await getSubmittedResults({
            subjectId: selectedSubjectId,
            term: termFilter,
            year: yearFilter,
            status: 'submitted'
          });

          if (existing?.success) {
            const existingSet = new Set((existing.data || []).map(r => r.studentId ?? r.student_id));
            const attemptedIds = bulkResults.map(r => r.studentId ?? r.student_id).filter(Boolean);
            const markIds = attemptedIds.filter(id => existingSet.has(id));
            if (markIds.length > 0) {
              setSubmittedResults(prev => new Set([...prev, ...markIds]));
            }
            showToast(`Already submitted for ${markIds.length} student(s). Marked as submitted.`, 'info');
          } else {
            showToast('Some results were already submitted. UI updated where possible.', 'info');
          }
        } catch (e) {
          console.warn('Duplicate handling fetch failed:', e);
          showToast('Some results were already submitted.', 'info');
        }
      } else if (emsg.includes('permission')) {
        showToast('Permission denied. Please contact your administrator.', 'error');
      } else if (emsg.includes('unavailable')) {
        showToast('Service temporarily unavailable. Please try again later.', 'error');
      } else {
        showToast(`Failed to submit bulk results: ${error.message}`, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isStudentSubmitted = (studentId) => {
    return submittedResults.has(String(studentId));
  };

  const getResultsStats = () => {
    const total = Array.isArray(students) ? students.length : 0;
    const studentIdsSet = new Set(students.map(s => String(s.id)));

    let submitted = 0;
    let graded = 0;

    studentIdsSet.forEach(id => {
      if (submittedResults.has(String(id))) submitted++;
      if (existingResultsMap[String(id)]?.status === 'graded') graded++;
    });

    return { total, submitted, graded };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const stats = getResultsStats();
  const pending = Math.max(0, (stats.total || 0) - (stats.submitted || 0));
  const completionRate = stats.total ? Math.round(((stats.submitted || 0) / stats.total) * 100) : 0;

  const selectedClassData = getSelectedClassData();

  return (
    <div className="-mx-4 sm:mx-0 space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Submit Exam Results to Admin</h2>
          <p className="text-gray-600 mt-1">Submit exam and test scores for admin review and final grading</p>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-none sm:rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-800">Scoring System</h3>
            <p className="text-sm text-blue-700">
              Submit exam scores (max 50) + test scores (max 30) = 80% of total grade.
              Admin will add assignment (15%) and attendance (5%) scores before publishing.
            </p>
          </div>
        </div>
      </div>


      {/* Class and Subject Selection */}
      <div className="bg-white rounded-none sm:rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select Class and Subject</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a class</option>
              {(selectedSubjectId || selectedSubject ? getClassesForSubject(selectedSubject, selectedSubjectId) : teacherClasses).map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} - {cls.level}
                  {cls.category && cls.category !== 'All Categories' && ` (${cls.category})`}
                  {cls.isGrouped && ' (All Categories)'}
                  {' '}({cls.studentCount} students)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <select
              value={selectedSubjectId || selectedSubject}
              onChange={(e) => {
                const newKey = e.target.value;
                const subj = getAvailableSubjects().find(s => String(s.subjectId) === String(newKey) || String(s.subjectName) === String(newKey));
                const name = subj ? subj.subjectName : '';
                const sid = subj ? (subj.subjectId || '') : '';
                setSelectedSubjectId(sid);
                setSelectedSubject(name);
                const options = getClassesForSubject(name, sid);
                if (!options.some(o => String(o.id) === String(selectedClass))) {
                  setSelectedClass(options.length ? options[0].id : '');
                }
                setStudents([]);
                setSubmittedResults(new Set());
                setExistingResultsMap({});
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a subject</option>
              {getAvailableSubjects().map(subject => (
                <option key={subject.subjectId || subject.subjectName} value={subject.subjectId || subject.subjectName}>
                  {subject.subjectName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Class Info */}
        {selectedClassData && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Class Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Type:</span> {selectedClassData.isGrouped ? 'Grouped Classes' : 'Individual Class'}
              </div>
              <div>
                <span className="font-medium">Level:</span> {selectedClassData.level}
              </div>
              <div>
                <span className="font-medium">Total Students:</span> {selectedClassData.studentCount}
              </div>
            </div>
            {selectedClassData.isGrouped && selectedClassData.individualClasses && (
              <div className="mt-2">
                <span className="text-sm font-medium text-gray-700">Includes classes: </span>
                <span className="text-sm text-gray-600">
                  {selectedClassData.individualClasses.map(c => c.name).join(', ')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {selectedClass && (
        <>
          {/* Mobile: Single consolidated stats card */}
          <div className="md:hidden">
            <div className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900">Results Overview</h3>
                <span className="text-xs text-gray-500" aria-label={`Completion ${completionRate}%`}>{completionRate}% complete</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center p-3 rounded-lg border border-gray-100">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-lg font-semibold text-gray-900">{stats.total}</p>
                  </div>
                </div>

                <div className="flex items-center p-3 rounded-lg border border-gray-100">
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-xs text-gray-500">Submitted</p>
                    <p className="text-lg font-semibold text-gray-900">{stats.submitted}</p>
                  </div>
                </div>

                <div className="flex items-center p-3 rounded-lg border border-gray-100">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-xs text-gray-500">Graded</p>
                    <p className="text-lg font-semibold text-gray-900">{stats.graded}</p>
                  </div>
                </div>

                <div className="flex items-center p-3 rounded-lg border border-gray-100">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-xs text-gray-500">Pending</p>
                    <p className="text-lg font-semibold text-gray-900">{pending}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4" aria-hidden="true">
                <div className="h-2 bg-gray-100 rounded">
                  <div className="h-2 bg-blue-600 rounded" style={{ width: `${completionRate}%` }} />
                </div>
              </div>

              <p className="mt-2 text-xs text-gray-500">Showing current class/subject stats</p>
            </div>
          </div>

          {/* Desktop/Tablet: original 4-card grid */}
          <div className="hidden md:grid grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Submitted</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.submitted}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Graded</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.graded}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.submitted}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-none sm:rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex flex-wrap gap-x-6 gap-y-2 px-4 sm:px-6">
            <button
              onClick={() => setActiveTab('individual')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'individual'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Individual Entry
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'bulk'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Bulk Upload
            </button>

          </nav>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'individual' && selectedClass && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h3 className="text-lg font-medium text-gray-900">Individual Result Entry</h3>
                <button
                  onClick={() => setShowEntryForm(true)}
                  disabled={!selectedSubject}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                  Submit to Admin
                  </button>
              </div>

              <div className="grid gap-4">
                {Array.isArray(students) && students.map(student => {
                  const isSubmitted = isStudentSubmitted(student.id);
                  const studentName = getStudentName(student);
                  const resultStatus = existingResultsMap[String(student.id)]?.status;
                  const isGraded = resultStatus === 'graded';
                  const rowBorderBg = isSubmitted ? (isGraded ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50') : 'border-gray-200 hover:bg-gray-50';
                  const avatarBg = isSubmitted ? (isGraded ? 'bg-green-200' : 'bg-yellow-200') : 'bg-gray-200';
                  const avatarText = isSubmitted ? (isGraded ? 'text-green-800' : 'text-yellow-800') : 'text-gray-600';
                  return (
                    <div
                      key={student.id}
                      className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 border rounded-lg transition-colors ${rowBorderBg}`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${avatarBg}`}>
                          <span className={`text-sm font-medium ${avatarText}`}>
                            {studentName.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{`${student?.firstName || ''} ${student?.surname || ''}`}</p>
                          <p className="text-sm text-gray-600">{student.admissionNumber}</p>
                          <p className="text-xs text-gray-500">{student.className}</p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-4 w-full sm:w-auto">
                        {isSubmitted ? (
                          <div className="text-left sm:text-right">
                            {existingResultsMap[String(student.id)]?.status === 'graded' ? (
                              <>
                                <p className="font-medium text-green-700">Graded by Admin</p>
                                <p className="text-sm text-green-600">Reviewed</p>
                              </>
                            ) : (
                              <>
                                <p className="font-medium text-yellow-700">Submitted to Admin</p>
                                <p className="text-sm text-yellow-600">Pending Admin Review</p>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No result submitted</span>
                        )}
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setShowEntryForm(true);
                          }}
                          disabled={!selectedSubject}
                          className={`w-full sm:w-auto px-3 py-1 rounded text-sm transition-colors ${
                            isSubmitted
                              ? (isGraded ? 'bg-green-100 text-green-700 cursor-default' : 'bg-yellow-100 text-yellow-700 cursor-default')
                              : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                          }`}
                        >
                          {isSubmitted ? 'View Submitted' : 'Submit to Admin'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'bulk' && selectedClass && (
            <BulkExamResultUpload
              students={Array.isArray(students) ? students.filter(student => !isStudentSubmitted(student.id)) : []} // Only show unsubmitted students
              subject={selectedSubject}
              onSubmit={handleBulkResultSubmit}
              submitting={submitting}
              submittedResults={submittedResults}
            />
          )}

          {!selectedClass && (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select Class and Subject</h3>
              <p className="text-gray-600">Please select a class and subject to start submitting results.</p>
            </div>
          )}
        </div>
      </div>

      {/* Individual Result Entry Modal */}
      {showEntryForm && selectedStudent && (
        <ExamResultEntryForm
          student={selectedStudent}
          subject={selectedSubject}
          existingResult={existingResultsMap[String(selectedStudent.id)]}
          onSubmit={handleIndividualResultSubmit}
          onClose={() => {
            setShowEntryForm(false);
            setSelectedStudent(null);
          }}
          submitting={submitting}
        />
      )}
    </div>
  );
};

export default ExamResults;