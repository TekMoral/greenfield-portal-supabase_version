import React, { useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { getTeacherTimetable, createOrUpdateTimetableEntry, deleteTimetableEntry } from "../../../services/timetableService";
import { getTeacherClassesAndSubjects } from "../../../services/teacherStudentService";

const Timetable = () => {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    day: '',
    timeSlot: '',
    subject: '',
    classId: '',
    className: ''
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = [
    '8:00 AM - 9:00 AM',
    '9:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:30 AM - 12:30 PM', // Break included
    '12:30 PM - 1:30 PM',
    '1:30 PM - 2:30 PM',
    '2:30 PM - 3:30 PM'
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch teacher's classes and timetable
        const [teacherClasses, teacherTimetable] = await Promise.all([
          getTeacherClassesAndSubjects(user.uid),
          getTeacherTimetable(user.uid)
        ]);
        
        setClasses(teacherClasses);
        setTimetable(teacherTimetable);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.uid]);

  const getTimetableForSlot = (day, timeSlot) => {
    return timetable.find(item => item.day === day && item.timeSlot === timeSlot);
  };

  const getCurrentTimeSlot = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const timeRanges = [
      { start: 8 * 60, end: 9 * 60, slot: '8:00 AM - 9:00 AM' },
      { start: 9 * 60, end: 10 * 60, slot: '9:00 AM - 10:00 AM' },
      { start: 10 * 60, end: 11 * 60, slot: '10:00 AM - 11:00 AM' },
      { start: 11.5 * 60, end: 12.5 * 60, slot: '11:30 AM - 12:30 PM' },
      { start: 12.5 * 60, end: 13.5 * 60, slot: '12:30 PM - 1:30 PM' },
      { start: 13.5 * 60, end: 14.5 * 60, slot: '1:30 PM - 2:30 PM' },
      { start: 14.5 * 60, end: 15.5 * 60, slot: '2:30 PM - 3:30 PM' }
    ];

    return timeRanges.find(range => currentTime >= range.start && currentTime <= range.end)?.slot;
  };

  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const isCurrentClass = (day, timeSlot) => {
    return day === getCurrentDay() && timeSlot === getCurrentTimeSlot();
  };

  const handleAddEntry = () => {
    setNewEntry({
      day: '',
      timeSlot: '',
      subject: '',
      classId: '',
      className: ''
    });
    setShowAddModal(true);
  };

  const handleEditEntry = (entry) => {
    setNewEntry({
      id: entry.id,
      day: entry.day,
      timeSlot: entry.timeSlot,
      subject: entry.subject,
      classId: entry.classId,
      className: entry.className
    });
    setShowAddModal(true);
  };

  const handleSaveEntry = async () => {
    if (!newEntry.day || !newEntry.timeSlot || !newEntry.subject || !newEntry.classId) {
      alert('Please fill in all required fields.');
      return;
    }

    // Check for conflicts (same day and time slot)
    const existingEntry = timetable.find(item => 
      item.day === newEntry.day && 
      item.timeSlot === newEntry.timeSlot && 
      item.id !== newEntry.id
    );

    if (existingEntry) {
      alert('You already have a class scheduled for this day and time slot.');
      return;
    }

    setSaving(true);
    try {
      const entryData = {
        ...newEntry,
        teacherId: user.uid
      };

      const savedEntry = await createOrUpdateTimetableEntry(entryData);
      
      if (newEntry.id) {
        // Update existing entry
        setTimetable(timetable.map(item => 
          item.id === newEntry.id ? savedEntry : item
        ));
      } else {
        // Add new entry
        setTimetable([...timetable, savedEntry]);
      }

      setShowAddModal(false);
      alert('Timetable entry saved successfully!');
    } catch (error) {
      console.error('Error saving timetable entry:', error);
      alert('Failed to save timetable entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this timetable entry?')) {
      return;
    }

    setSaving(true);
    try {
      await deleteTimetableEntry(entryId);
      setTimetable(timetable.filter(item => item.id !== entryId));
      alert('Timetable entry deleted successfully!');
    } catch (error) {
      console.error('Error deleting timetable entry:', error);
      alert('Failed to delete timetable entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getAvailableSubjects = () => {
    const subjects = new Set();
    classes.forEach(classItem => {
      classItem.subjectsTaught?.forEach(subject => {
        subjects.add(subject.subjectName);
      });
    });
    return Array.from(subjects);
  };

  const getClassesForSubject = (subjectName) => {
    const classesForSubject = [];
    
    // Check if the subject is core
    const coreSubjects = [
      'Mathematics', 'English Language', 'Civic Education', 'Basic Science', 
      'Basic Technology', 'Computer Studies', 'Physical and Health Education', 
      'Cultural and Creative Arts', 'Social Studies', 'French', 'Arabic', 
      'Igbo', 'Yoruba', 'Hausa'
    ];
    const isCoreSubject = coreSubjects.includes(subjectName);
    
    classes.forEach(classItem => {
      const hasSubject = classItem.subjectsTaught?.some(subject => subject.subjectName === subjectName);
      if (hasSubject) {
        if (isCoreSubject) {
          // For core subjects, group all classes together (no category separation)
          if (classItem.isGrouped && classItem.individualClasses) {
            // Add the grouped class as a single entity
            classesForSubject.push({
              id: classItem.id,
              name: classItem.name,
              level: classItem.level,
              category: 'All Categories',
              isGrouped: true
            });
          } else {
            // Add regular class
            classesForSubject.push({
              id: classItem.id,
              name: classItem.name,
              level: classItem.level,
              category: classItem.category || 'General'
            });
          }
        } else {
          // For non-core subjects, separate by category
          if (classItem.isGrouped && classItem.individualClasses) {
            // Add individual classes from grouped class
            classItem.individualClasses.forEach(individualClass => {
              classesForSubject.push({
                id: individualClass.id,
                name: individualClass.name,
                level: classItem.level,
                category: individualClass.category
              });
            });
          } else {
            // Add regular class
            classesForSubject.push({
              id: classItem.id,
              name: classItem.name,
              level: classItem.level,
              category: classItem.category
            });
          }
        }
      }
    });
    return classesForSubject;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-6 gap-4">
            {[...Array(42)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">My Timetable</h1>
          <p className="text-slate-600 mt-1">Manage your weekly teaching schedule</p>
        </div>
        <button
          onClick={handleAddEntry}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          Add Class
        </button>
      </div>

      {/* Current Class Highlight */}
      {getCurrentDay() !== 'Saturday' && getCurrentDay() !== 'Sunday' && getCurrentTimeSlot() && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-green-800 mb-2">Current Period</h3>
          <p className="text-sm text-green-700">
            {getCurrentTimeSlot()} - {getCurrentDay()}
          </p>
          {(() => {
            const currentClass = getTimetableForSlot(getCurrentDay(), getCurrentTimeSlot());
            return currentClass ? (
              <p className="text-green-800 font-medium">
                {currentClass.subject} - {currentClass.className}
              </p>
            ) : (
              <p className="text-green-600">Free Period</p>
            );
          })()}
        </div>
      )}

      {/* Desktop Timetable */}
      <div className="hidden lg:block bg-white rounded-lg shadow-md overflow-hidden border border-slate-200">
        <div className="bg-slate-50 p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Weekly Schedule</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-32">
                  Time
                </th>
                {daysOfWeek.map((day) => (
                  <th key={day} className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {timeSlots.map((timeSlot) => (
                <tr key={timeSlot}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900 bg-slate-50">
                    {timeSlot}
                  </td>
                  {daysOfWeek.map((day) => {
                    const classInfo = getTimetableForSlot(day, timeSlot);
                    const isCurrent = isCurrentClass(day, timeSlot);
                    
                    return (
                      <td key={`${day}-${timeSlot}`} className={`px-4 py-4 text-sm ${isCurrent ? 'bg-green-100' : ''}`}>
                        {classInfo ? (
                          <div className={`p-2 rounded-lg border-l-4 relative group ${
                            isCurrent 
                              ? 'border-green-500 bg-green-50' 
                              : 'border-blue-500 bg-blue-50'
                          }`}>
                            <div className="font-semibold text-slate-800">{classInfo.subject}</div>
                            <div className="text-xs text-slate-600">{classInfo.className}</div>
                            
                            {/* Edit/Delete buttons */}
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEditEntry(classInfo)}
                                className="bg-blue-600 text-white p-1 rounded text-xs hover:bg-blue-700 mr-1"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(classInfo.id)}
                                className="bg-red-600 text-white p-1 rounded text-xs hover:bg-red-700"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-slate-400 py-4 hover:bg-slate-50 rounded cursor-pointer"
                               onClick={() => {
                                 setNewEntry({
                                   day,
                                   timeSlot,
                                   subject: '',
                                   classId: '',
                                   className: ''
                                 });
                                 setShowAddModal(true);
                               }}>
                            <span className="text-xs">+ Add Class</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Timetable */}
      <div className="lg:hidden space-y-4">
        {daysOfWeek.map((day) => (
          <div key={day} className="bg-white rounded-lg shadow-md border border-slate-200">
            <div className="bg-slate-50 p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">{day}</h3>
            </div>
            <div className="p-4 space-y-3">
              {timeSlots.map((timeSlot) => {
                const classInfo = getTimetableForSlot(day, timeSlot);
                const isCurrent = isCurrentClass(day, timeSlot);
                
                return (
                  <div key={timeSlot} className={`p-3 rounded-lg border ${
                    isCurrent ? 'border-green-500 bg-green-50' : 'border-slate-200'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-800">{timeSlot}</div>
                        {classInfo ? (
                          <div className="mt-1">
                            <div className="font-semibold text-slate-900">{classInfo.subject}</div>
                            <div className="text-sm text-slate-600">{classInfo.className}</div>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-500 mt-1">Free Period</div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {isCurrent && (
                          <div className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                            Current
                          </div>
                        )}
                        {classInfo ? (
                          <>
                            <button
                              onClick={() => handleEditEntry(classInfo)}
                              className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(classInfo.id)}
                              className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setNewEntry({
                                day,
                                timeSlot,
                                subject: '',
                                classId: '',
                                className: ''
                              });
                              setShowAddModal(true);
                            }}
                            className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                          >
                            Add Class
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="text-2xl font-bold text-slate-800">
            {timetable.length}
          </div>
          <div className="text-sm text-slate-600">Total Classes This Week</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="text-2xl font-bold text-slate-800">
            {[...new Set(timetable.map(item => item.subject))].length}
          </div>
          <div className="text-sm text-slate-600">Subjects Teaching</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-slate-500">
          <div className="text-2xl font-bold text-slate-800">
            {[...new Set(timetable.map(item => item.className))].length}
          </div>
          <div className="text-sm text-slate-600">Different Classes</div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="bg-green-600 text-white p-4 rounded-t-lg">
              <h2 className="text-xl font-bold">
                {newEntry.id ? 'Edit Class' : 'Add New Class'}
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Day</label>
                <select
                  value={newEntry.day}
                  onChange={(e) => setNewEntry({...newEntry, day: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="">Select Day</option>
                  {daysOfWeek.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Time Slot</label>
                <select
                  value={newEntry.timeSlot}
                  onChange={(e) => setNewEntry({...newEntry, timeSlot: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="">Select Time Slot</option>
                  {timeSlots.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
                <select
                  value={newEntry.subject}
                  onChange={(e) => {
                    setNewEntry({
                      ...newEntry, 
                      subject: e.target.value,
                      classId: '',
                      className: ''
                    });
                  }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="">Select Subject</option>
                  {getAvailableSubjects().map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              {newEntry.subject && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Class</label>
                  <select
                    value={newEntry.classId}
                    onChange={(e) => {
                      const selectedClass = getClassesForSubject(newEntry.subject).find(c => c.id === e.target.value);
                      setNewEntry({
                        ...newEntry,
                        classId: e.target.value,
                        className: selectedClass ? selectedClass.name : ''
                      });
                    }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  >
                    <option value="">Select Class</option>
                    {getClassesForSubject(newEntry.subject).map(classItem => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.name} - {classItem.level}
                        {classItem.category && ` (${classItem.category})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="bg-slate-50 px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEntry}
                disabled={saving}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timetable;