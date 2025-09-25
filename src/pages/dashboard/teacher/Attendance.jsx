import React, { useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { getTeacherClassesAndSubjects, getTeacherStudentList } from "../../../services/supabase/teacherStudentService";
import {
  markAttendance,
  getAttendanceByDate,
  getClassAttendanceSummary,
  bulkMarkAttendance
} from "../../../services/supabase/attendanceService";
import { getFullName, getInitials } from "../../../utils/nameUtils";
import { aggregateSubjects, getClassesForSubject, expandClassEntryToIds } from "../../../utils/teacherClassSubjectUtils";
import { getSubjectsByDepartment } from "../../../services/supabase/subjectService";
import useToast from "../../../hooks/useToast";

const Attendance = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [allClasses, setAllClasses] = useState([]);
  const [coreSubjectNames, setCoreSubjectNames] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [existingAttendance, setExistingAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);

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
        const res = await getTeacherClassesAndSubjects(user.id);
        const teacherClasses = res?.success ? (res.data || []) : (Array.isArray(res) ? res : []);
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
    
    return getClassesForSubject(allClasses, {
      subjectName: selectedSubject,
      coreSubjects: coreSubjectNames
    });
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
        console.log('Fetching students for class:', { selectedClass, selectedSubject, teacherId: user.id });
        
        // Load all teacher students once and filter by selected class IDs
        const res = await getTeacherStudentList(user.id);
        const allStudents = res?.success ? (res.data || []) : (Array.isArray(res) ? res : []);
        
        // Find the selected class entry and expand to individual class IDs
        const availableClasses = getAvailableClasses();
        const selectedClassEntry = availableClasses.find(cls => cls.id === selectedClass);
        
        if (!selectedClassEntry) {
          setStudents([]);
          return;
        }
        
        // Use centralized utility to expand class IDs
        const classIds = expandClassEntryToIds(selectedClassEntry);
        const classStudents = (allStudents || []).filter((student) => 
          classIds.includes(student.classId)
        );
        
        console.log('Found students:', classStudents.length);
        setStudents(classStudents);
        
        // Get subject ID for attendance queries
        const subjectEntry = availableSubjects.find(s => s.subjectName === selectedSubject);
        const subjectId = subjectEntry?.subjectId || '';
        
        // Fetch existing attendance for the selected date
        if (classStudents.length > 0) {
          try {
            const existingResult = await getAttendanceByDate(selectedDate, selectedClass, subjectId);
            const existingData = existingResult.success ? existingResult.data : [];
            const attendanceMap = {};
            existingData.forEach(record => {
              attendanceMap[record.student_id] = record.status;
            });
            setExistingAttendance(attendanceMap);
            
            // Initialize as neutral (no pre-selected statuses)
            setAttendance({});
          } catch (error) {
            console.error('Error fetching existing attendance:', error);
            setExistingAttendance({});
            setAttendance({});
          }
        } else {
          setExistingAttendance({});
          setAttendance({});
        }
        
        // Fetch attendance stats
        try {
          const statsResult = await getClassAttendanceSummary(selectedClass, selectedDate);
          if (statsResult.success) {
            setStats({
              totalDays: 1, // For current date
              averageAttendance: statsResult.data.attendanceRate,
              presentToday: statsResult.data.present,
              absentToday: statsResult.data.absent,
              studentStats: {} // We'll need to implement this separately if needed
            });
          }
        } catch (error) {
          console.error('Error fetching attendance stats:', error);
          setStats(null);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        setStudents([]);
        setExistingAttendance({});
        setAttendance({});
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [selectedClass, selectedSubject, selectedDate, user?.id, allClasses, availableSubjects, coreSubjectNames]);

  const handleAttendanceChange = (studentId, status) => {
    // Immutable after save: don't allow changes for already-saved entries
    if (existingAttendance[studentId]) return;
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleBulkAttendance = (status) => {
    // Apply only to students not already saved (immutable after save)
    setAttendance(prev => {
      const next = { ...prev };
      students.forEach(student => {
        if (!existingAttendance[student.id]) {
          next[student.id] = status;
        }
      });
      return next;
    });
  };

  const handleSaveAttendance = async () => {
    if (!selectedClass || !selectedSubject || !selectedDate) {
      showToast('Please select class, subject, and date.', 'error');
      return;
    }

    // Get subject ID
    const subjectEntry = availableSubjects.find(s => s.subjectName === selectedSubject);
    const subjectId = subjectEntry?.subjectId || '';

    // Build only changed records to speed up saving
    const byId = new Map(students.map(s => [s.id, s]));
    const attendanceRecords = Object.entries(attendance)
      .filter(([sid, st]) => !existingAttendance[sid] && (st === 'present' || st === 'absent'))
      .map(([sid, st]) => {
        const s = byId.get(sid);
        return {
          student_id: sid,
          teacher_id: user.id,
          class_id: s?.classId,
          subject_id: subjectId,
          date: selectedDate,
          status: st,
          remarks: null,
        };
      });

    if (attendanceRecords.length === 0) {
      showToast('No changes to save.', 'info');
      return;
    }

    setSaving(true);
    try {
      const result = await bulkMarkAttendance(attendanceRecords);
      
      if (result.success) {
        // Merge newly saved statuses into existing and lock them
        setExistingAttendance(prev => ({
          ...prev,
          ...Object.fromEntries(attendanceRecords.map(r => [r.student_id, r.status]))
        }));
        // Clear saved entries from staged attendance
        setAttendance(prev => {
          const next = { ...prev };
          attendanceRecords.forEach(r => { delete next[r.student_id]; });
          return next;
        });
        
        // Refresh stats
        try {
          const statsResult = await getClassAttendanceSummary(selectedClass, selectedDate);
          if (statsResult.success) {
            setStats({
              totalDays: 1,
              averageAttendance: statsResult.data.attendanceRate,
              presentToday: statsResult.data.present,
              absentToday: statsResult.data.absent,
              studentStats: {}
            });
          }
        } catch (error) {
          console.error('Error refreshing stats:', error);
        }
        
        showToast('Attendance saved successfully!', 'success');
      } else {
        throw new Error(result.error || 'Failed to save attendance');
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      
      if (error.message.includes('permission') || error.message.includes('denied')) {
        showToast('Unable to save attendance due to insufficient permissions. Please contact your administrator.', 'error');
      } else {
        showToast('Failed to save attendance. Please try again.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const getAttendanceStatsForStudent = (studentId) => {
    if (!stats || !stats.studentStats) return null;
    return stats.studentStats[studentId];
  };

  const hasChanges = () => {
    // There are changes if there's any staged present/absent for a student not yet saved
    return Object.entries(attendance).some(([id, st]) => !existingAttendance[id] && (st === 'present' || st === 'absent'));
  };

  if (loading) {
    return (
      <div className="p-4 animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-48"></div>
        <div className="space-y-3">
          <div className="h-10 bg-slate-200 rounded"></div>
          <div className="h-10 bg-slate-200 rounded"></div>
          <div className="h-10 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header - Mobile First */}
      <div className="space-y-2">
        <h1 className="text-xl font-bold text-slate-800 sm:text-2xl lg:text-3xl">
          Attendance Management
        </h1>
        <p className="text-sm text-slate-600 sm:text-base">
          Mark and track student attendance
        </p>
      </div>

      {/* Filters - Mobile First */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <h2 className="text-base font-semibold text-slate-800 mb-3 sm:text-lg">
          Select Class & Subject
        </h2>
        
        {/* Mobile: Stacked Layout */}
        <div className="space-y-3 sm:hidden">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedClass("");
              }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Choose a subject...</option>
              {availableSubjects.map((subject) => (
                <option key={subject.subjectName} value={subject.subjectName}>
                  {subject.subjectName}
                </option>
              ))}
            </select>
          </div>

          {selectedSubject && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Choose a class...</option>
                {getAvailableClasses().map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name} ({classItem.studentCount || 0} students)
                    {classItem.isGrouped && ' - Grouped'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {selectedClass && selectedSubject && (
            <button
              onClick={handleSaveAttendance}
              disabled={saving || !hasChanges()}
              className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          )}
        </div>

        {/* Desktop: Grid Layout */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedClass("");
              }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Choose a subject...</option>
              {availableSubjects.map((subject) => (
                <option key={subject.subjectName} value={subject.subjectName}>
                  {subject.subjectName}
                </option>
              ))}
            </select>
          </div>

          {selectedSubject && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Choose a class...</option>
                {getAvailableClasses().map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name} ({classItem.studentCount || 0} students)
                    {classItem.isGrouped && ' - Grouped'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {selectedClass && selectedSubject && (
            <div className="flex items-end">
              <button
                onClick={handleSaveAttendance}
                disabled={saving || !hasChanges()}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Attendance Stats - Mobile First */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-green-500 sm:p-4">
            <div className="text-lg font-bold text-slate-800 sm:text-2xl">{stats.totalDays || 0}</div>
            <div className="text-xs text-slate-600 sm:text-sm">Total Days</div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-blue-500 sm:p-4">
            <div className="text-lg font-bold text-slate-800 sm:text-2xl">{stats.averageAttendance || 0}%</div>
            <div className="text-xs text-slate-600 sm:text-sm">Average</div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-yellow-500 sm:p-4">
            <div className="text-lg font-bold text-slate-800 sm:text-2xl">{stats.presentToday || 0}</div>
            <div className="text-xs text-slate-600 sm:text-sm">Present Today</div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-red-500 sm:p-4">
            <div className="text-lg font-bold text-slate-800 sm:text-2xl">{stats.absentToday || 0}</div>
            <div className="text-xs text-slate-600 sm:text-sm">Absent Today</div>
          </div>
        </div>
      )}

      {/* Attendance Interface - Mobile First */}
      {selectedClass && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 bg-green-50">
            <div className="space-y-2 sm:flex sm:justify-between sm:items-center sm:space-y-0">
              <div>
                <h2 className="text-base font-semibold text-slate-800 sm:text-lg">
                  Mark Attendance - {new Date(selectedDate).toLocaleDateString()}
                </h2>
                <p className="text-xs text-slate-600 sm:text-sm">
                  {selectedSubject} | {getAvailableClasses().find(c => c.id === selectedClass)?.name} | {students.length} students
                </p>
              </div>
              
              {/* Bulk Actions - Mobile: Stacked, Desktop: Side by side */}
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                <button
                  onClick={() => handleBulkAttendance('present')}
                  className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-xs font-medium sm:text-sm"
                >
                  Mark All Present
                </button>
                <button
                  onClick={() => handleBulkAttendance('absent')}
                  className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-xs font-medium sm:text-sm"
                >
                  Mark All Absent
                </button>
              </div>
            </div>
          </div>

          {/* Student List */}
          <div className="p-4">
            {loadingStudents ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 sm:h-12 sm:w-12"></div>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 text-sm sm:text-base">No students found for this class and subject.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {students.map((student) => {
                  const studentStats = getAttendanceStatsForStudent(student.id);
                  const lockedStatus = existingAttendance[student.id];
                  const currentStatus = lockedStatus || attendance[student.id] || 'neutral';
                  const isLocked = Boolean(lockedStatus);
                  
                  return (
                    <div key={student.id} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-colors">
                      {/* Mobile Layout */}
                      <div className="sm:hidden space-y-3">
                        {/* Student Info */}
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            {student.profileImageUrl ? (
                              <img 
                                src={student.profileImageUrl} 
                                alt={getFullName(student)}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-green-600 font-semibold text-sm">
                                {getInitials(student)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-800 text-sm truncate">{getFullName(student)}</h3>
                            <p className="text-xs text-slate-600">ID: {student.admissionNumber}</p>
                            {studentStats && (
                              <p className="text-xs text-slate-500">
                                {studentStats.attendancePercentage}% ({studentStats.presentDays}/{studentStats.totalDays})
                              </p>
                            )}
                          </div>
                          {/* Status Badge */}
                          <div>
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              currentStatus === 'present'
                                ? 'bg-green-100 text-green-800'
                                : currentStatus === 'absent'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {currentStatus === 'neutral' ? '—' : currentStatus}
                            </span>
                          </div>
                        </div>
                        
                        {/* Attendance Buttons */}
                        <div className="flex space-x-2">
                          <button
                            disabled={isLocked}
                            onClick={() => handleAttendanceChange(student.id, 'present')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                              currentStatus === 'present'
                                ? 'bg-green-600 text-white'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            Present
                          </button>
                          <button
                            disabled={isLocked}
                            onClick={() => handleAttendanceChange(student.id, 'absent')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                              currentStatus === 'absent'
                                ? 'bg-red-600 text-white'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            Absent
                          </button>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden sm:flex sm:items-center sm:justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            {student.profileImageUrl ? (
                              <img 
                                src={student.profileImageUrl} 
                                alt={getFullName(student)}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-green-600 font-semibold text-sm">
                                {getInitials(student)}
                              </span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">{getFullName(student)}</h3>
                            <p className="text-sm text-slate-600">ID: {student.admissionNumber}</p>
                            {studentStats && (
                              <p className="text-xs text-slate-500">
                                Attendance: {studentStats.attendancePercentage}% 
                                ({studentStats.presentDays}/{studentStats.totalDays} days)
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="flex space-x-2">
                            <button
                              disabled={isLocked}
                              onClick={() => handleAttendanceChange(student.id, 'present')}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                currentStatus === 'present'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              Present
                            </button>
                            <button
                              disabled={isLocked}
                              onClick={() => handleAttendanceChange(student.id, 'absent')}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                currentStatus === 'absent'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              Absent
                            </button>
                          </div>
                          
                          <div className="text-sm text-slate-600 w-16 text-right">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              currentStatus === 'present'
                                ? 'bg-green-100 text-green-800'
                                : currentStatus === 'absent'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {currentStatus === 'neutral' ? '—' : currentStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {availableSubjects.length === 0 && (
        <div className="text-center py-8 sm:py-12">
          <svg className="w-12 h-12 mx-auto text-slate-400 mb-4 sm:w-16 sm:h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-base font-medium text-slate-800 mb-2 sm:text-lg">No Subjects Found</h3>
          <p className="text-sm text-slate-600 sm:text-base">You haven't been assigned to teach any subjects yet. Contact your administrator to get started.</p>
        </div>
      )}
    </div>
  );
};

export default Attendance;