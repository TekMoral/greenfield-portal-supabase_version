import React, { useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { getTeacherClassesAndSubjects, getStudentsByTeacherSubject } from "../../../services/teacherStudentService";
import { 
  markAttendance, 
  getAttendanceByDate, 
  getAttendanceStats,
  bulkMarkAttendance 
} from "../../../services/attendanceService";
import { getFullName, getInitials } from "../../../utils/nameUtils";

const Attendance = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [existingAttendance, setExistingAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);

  // Fetch teacher's classes
  useEffect(() => {
    const fetchClasses = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const teacherClasses = await getTeacherClassesAndSubjects(user.uid);
        setClasses(teacherClasses);
        
        // Auto-select first class if available
        if (teacherClasses.length > 0) {
          setSelectedClass(teacherClasses[0].id);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [user?.uid]);

  // Get available subjects for selected class
  const getAvailableSubjects = () => {
    if (!selectedClass) return [];
    
    const classData = classes.find(cls => cls.id === selectedClass);
    if (!classData) return [];
    
    return classData.subjectsTaught || [];
  };

  // Fetch students when class and subject are selected
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass || !selectedSubject || !user?.uid) {
        setStudents([]);
        return;
      }

      setLoadingStudents(true);
      try {
        console.log('Fetching students for:', { selectedClass, selectedSubject, teacherId: user.uid });
        
        // Get the selected class data to determine if it's grouped
        const selectedClassData = classes.find(cls => cls.id === selectedClass);
        
        let classStudents = [];
        
        if (selectedClassData?.isGrouped && selectedClassData?.individualClasses) {
          // For grouped classes, get students from all individual classes
          const classIds = selectedClassData.individualClasses.map(cls => cls.id);
          console.log('Fetching students from grouped classes:', classIds);
          
          // Import the function for getting students by multiple class IDs
          const { getStudentsByTeacherSubjectAndClasses } = await import('../../../services/teacherStudentService');
          classStudents = await getStudentsByTeacherSubjectAndClasses(user.uid, selectedSubject, classIds);
        } else {
          // For individual classes, get students normally
          console.log('Fetching students from individual class:', selectedClass);
          const subjectStudents = await getStudentsByTeacherSubject(user.uid, selectedSubject);
          classStudents = subjectStudents.filter(student => student.classId === selectedClass);
        }
        
        console.log('Found students:', classStudents.length);
        setStudents(classStudents);
        
        // Fetch existing attendance for the selected date
        if (classStudents.length > 0) {
          const existingData = await getAttendanceByDate(selectedClass, selectedSubject, selectedDate);
          const attendanceMap = {};
          existingData.forEach(record => {
            attendanceMap[record.studentId] = record.status;
          });
          setExistingAttendance(attendanceMap);
          
          // Initialize attendance state with existing data
          setAttendance(attendanceMap);
        } else {
          setExistingAttendance({});
          setAttendance({});
        }
        
        // Fetch attendance stats
        const statsData = await getAttendanceStats(selectedClass, selectedSubject);
        setStats(statsData);
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
  }, [selectedClass, selectedSubject, selectedDate, user?.uid, classes]);

  const handleAttendanceChange = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleBulkAttendance = (status) => {
    const bulkAttendance = {};
    students.forEach(student => {
      bulkAttendance[student.id] = status;
    });
    setAttendance(bulkAttendance);
  };

  const handleSaveAttendance = async () => {
    if (!selectedClass || !selectedSubject || !selectedDate) {
      alert('Please select class, subject, and date.');
      return;
    }

    const attendanceRecords = students.map(student => ({
      studentId: student.id,
      teacherId: user.uid,
      classId: selectedClass,
      subjectName: selectedSubject,
      date: selectedDate,
      status: attendance[student.id] || 'absent',
      markedAt: new Date().toISOString()
    }));

    setSaving(true);
    try {
      const results = await bulkMarkAttendance(attendanceRecords);
      
      // Update existing attendance
      setExistingAttendance({ ...attendance });
      
      // Refresh stats
      const statsData = await getAttendanceStats(selectedClass, selectedSubject);
      setStats(statsData);
      
      // Check if results contain mock data (permissions issue)
      const hasMockData = results.some(result => result.id.startsWith('mock_'));
      
      if (hasMockData) {
        alert('Attendance saved locally (development mode). Note: This data may not persist due to database permissions.');
      } else {
        alert('Attendance saved successfully!');
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      
      if (error.code === 'permission-denied') {
        alert('Unable to save attendance due to insufficient permissions. Please contact your administrator.');
      } else {
        alert('Failed to save attendance. Please try again.');
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
    return JSON.stringify(attendance) !== JSON.stringify(existingAttendance);
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSubject("");
              }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Choose a class...</option>
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name} ({classItem.studentCount || 0} students)
                </option>
              ))}
            </select>
          </div>

          {selectedClass && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Choose a subject...</option>
                {getAvailableSubjects().map((subject) => (
                  <option key={subject.subjectName} value={subject.subjectName}>
                    {subject.subjectName}
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
            <label className="block text-sm font-medium text-slate-700 mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSubject("");
              }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Choose a class...</option>
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name} ({classItem.studentCount || 0} students)
                </option>
              ))}
            </select>
          </div>

          {selectedClass && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Choose a subject...</option>
                {getAvailableSubjects().map((subject) => (
                  <option key={subject.subjectName} value={subject.subjectName}>
                    {subject.subjectName}
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
      {selectedClass && selectedSubject && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 bg-green-50">
            <div className="space-y-2 sm:flex sm:justify-between sm:items-center sm:space-y-0">
              <div>
                <h2 className="text-base font-semibold text-slate-800 sm:text-lg">
                  Mark Attendance - {new Date(selectedDate).toLocaleDateString()}
                </h2>
                <p className="text-xs text-slate-600 sm:text-sm">
                  {selectedSubject} | {classes.find(c => c.id === selectedClass)?.name} | {students.length} students
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
                  const currentStatus = attendance[student.id] || 'absent';
                  
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
                              currentStatus === 'present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {currentStatus}
                            </span>
                          </div>
                        </div>
                        
                        {/* Attendance Buttons */}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAttendanceChange(student.id, 'present')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                              currentStatus === 'present'
                                ? 'bg-green-600 text-white'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleAttendanceChange(student.id, 'absent')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                              currentStatus === 'absent'
                                ? 'bg-red-600 text-white'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
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
                              onClick={() => handleAttendanceChange(student.id, 'present')}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                currentStatus === 'present'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleAttendanceChange(student.id, 'absent')}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                currentStatus === 'absent'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                            >
                              Absent
                            </button>
                          </div>
                          
                          <div className="text-sm text-slate-600 w-16 text-right">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              currentStatus === 'present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {currentStatus}
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
      {classes.length === 0 && (
        <div className="text-center py-8 sm:py-12">
          <svg className="w-12 h-12 mx-auto text-slate-400 mb-4 sm:w-16 sm:h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-base font-medium text-slate-800 mb-2 sm:text-lg">No Classes Found</h3>
          <p className="text-sm text-slate-600 sm:text-base">You haven't been assigned to any classes yet. Contact your administrator to get started.</p>
        </div>
      )}
    </div>
  );
};

export default Attendance;