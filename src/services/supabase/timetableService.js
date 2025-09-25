import { supabase } from '../../lib/supabaseClient';

/**
 * Get teacher's timetable
 */
export const getTeacherTimetable = async (teacherId) => {
  try {
    const { data, error } = await supabase
      .from('timetables')
      .select('*')
      .eq('teacherId', teacherId)
      .order('day')
      .order('timeSlot');

    if (error) {
      console.error('Supabase error fetching teacher timetable:', error);
      return { success: false, error: error.message };
    }

    // Sort by day and time slot
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const sortedData = (data || []).sort((a, b) => {
      const dayComparison = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
      if (dayComparison !== 0) return dayComparison;
      
      // Sort by time slot
      return a.timeSlot.localeCompare(b.timeSlot);
    });

    return { success: true, data: sortedData };
  } catch (error) {
    console.error('Error fetching teacher timetable:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get class timetable
 */
export const getClassTimetable = async (classId) => {
  try {
    const { data, error } = await supabase
      .from('timetables')
      .select('*')
      .eq('classId', classId)
      .order('day')
      .order('timeSlot');

    if (error) {
      console.error('Supabase error fetching class timetable:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching class timetable:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get student timetable (based on their class)
 */
export const getStudentTimetable = async (studentId) => {
  try {
    // First get the student's class
    const { data: studentData, error: studentError } = await supabase
      .from('user_profiles')
      .select('class_id')
      .eq('id', studentId)
      .single();

    if (studentError) {
      console.error('Supabase error fetching student class:', studentError);
      return { success: false, error: studentError.message };
    }

    if (!studentData?.class_id) {
      return { success: true, data: [] };
    }

    // Get the class timetable
    return await getClassTimetable(studentData.class_id);
  } catch (error) {
    console.error('Error fetching student timetable:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create or update timetable entry
 */
export const createOrUpdateTimetableEntry = async (timetableData) => {
  try {
    const entryData = {
      ...timetableData,
      updatedAt: new Date().toISOString()
    };

    if (timetableData.id) {
      // Update existing entry
      const { data, error } = await supabase
        .from('timetables')
        .update(entryData)
        .eq('id', timetableData.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error updating timetable entry:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } else {
      // Create new entry
      entryData.createdAt = new Date().toISOString();

      const { data, error } = await supabase
        .from('timetables')
        .insert(entryData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating timetable entry:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    }
  } catch (error) {
    console.error('Error creating/updating timetable entry:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete timetable entry
 */
export const deleteTimetableEntry = async (timetableId) => {
  try {
    const { error } = await supabase
      .from('timetables')
      .delete()
      .eq('id', timetableId);

    if (error) {
      console.error('Supabase error deleting timetable entry:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting timetable entry:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get current class for teacher (based on current time)
 */
export const getCurrentClass = async (teacherId) => {
  try {
    const timetableResult = await getTeacherTimetable(teacherId);
    
    if (!timetableResult.success) {
      return timetableResult;
    }

    const timetable = timetableResult.data;
    const now = new Date();
    const currentDay = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    // Find current class based on time
    const currentClass = timetable.find(entry => {
      if (entry.day !== currentDay) return false;
      
      // Parse time slot (e.g., "8:00 AM - 9:00 AM")
      const [startTime, endTime] = entry.timeSlot.split(' - ');
      const startMinutes = parseTimeToMinutes(startTime);
      const endMinutes = parseTimeToMinutes(endTime);
      
      return currentTime >= startMinutes && currentTime <= endMinutes;
    });

    return { success: true, data: currentClass || null };
  } catch (error) {
    console.error('Error getting current class:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get next class for teacher
 */
export const getNextClass = async (teacherId) => {
  try {
    const timetableResult = await getTeacherTimetable(teacherId);
    
    if (!timetableResult.success) {
      return timetableResult;
    }

    const timetable = timetableResult.data;
    const now = new Date();
    const currentDay = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    // Find next class
    let nextClass = null;
    let minTimeDiff = Infinity;

    timetable.forEach(entry => {
      const [startTime] = entry.timeSlot.split(' - ');
      const startMinutes = parseTimeToMinutes(startTime);
      
      let timeDiff;
      if (entry.day === currentDay && startMinutes > currentTime) {
        // Same day, later time
        timeDiff = startMinutes - currentTime;
      } else {
        // Different day - calculate days difference
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const currentDayIndex = dayOrder.indexOf(currentDay);
        const entryDayIndex = dayOrder.indexOf(entry.day);
        
        if (entryDayIndex > currentDayIndex) {
          // Later in the week
          const daysDiff = entryDayIndex - currentDayIndex;
          timeDiff = (daysDiff * 24 * 60) + startMinutes - currentTime;
        } else if (entryDayIndex < currentDayIndex) {
          // Next week
          const daysDiff = (7 - currentDayIndex) + entryDayIndex;
          timeDiff = (daysDiff * 24 * 60) + startMinutes - currentTime;
        }
      }
      
      if (timeDiff && timeDiff > 0 && timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        nextClass = entry;
      }
    });

    return { success: true, data: nextClass };
  } catch (error) {
    console.error('Error getting next class:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get timetable conflicts for a specific time slot
 */
export const getTimetableConflicts = async (teacherId, classId, day, timeSlot, excludeId = null) => {
  try {
    let query = supabase
      .from('timetables')
      .select('*')
      .eq('day', day)
      .eq('timeSlot', timeSlot);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    // Check for teacher conflicts
    query = query.or(`teacherId.eq.${teacherId},classId.eq.${classId}`);

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error checking timetable conflicts:', error);
      return { success: false, error: error.message };
    }

    const conflicts = {
      teacherConflict: data.filter(entry => entry.teacherId === teacherId),
      classConflict: data.filter(entry => entry.classId === classId)
    };

    return { success: true, data: conflicts };
  } catch (error) {
    console.error('Error checking timetable conflicts:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all timetables (admin view)
 */
export const getAllTimetables = async (filters = {}) => {
  try {
    let query = supabase
      .from('timetables')
      .select(`
        *,
        teacher:user_profiles!teacherId(full_name, email),
        class:classes(name)
      `)
      .order('day')
      .order('timeSlot');

    // Apply filters
    if (filters.teacherId) {
      query = query.eq('teacherId', filters.teacherId);
    }
    if (filters.classId) {
      query = query.eq('classId', filters.classId);
    }
    if (filters.day) {
      query = query.eq('day', filters.day);
    }
    if (filters.subject) {
      query = query.eq('subject', filters.subject);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error fetching all timetables:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching all timetables:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Bulk create/update timetable entries
 */
export const bulkCreateTimetableEntries = async (timetableEntries) => {
  try {
    const results = [];
    
    for (const entry of timetableEntries) {
      const result = await createOrUpdateTimetableEntry(entry);
      results.push({
        success: result.success,
        data: result.data,
        error: result.error,
        originalEntry: entry
      });
    }

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return {
      success: true,
      data: {
        successful: successful.length,
        failed: failed.length,
        results
      }
    };
  } catch (error) {
    console.error('Error bulk creating timetable entries:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get timetable statistics
 */
export const getTimetableStatistics = async () => {
  try {
    const { data, error } = await supabase
      .from('timetables')
      .select('teacherId, classId, day, subject');

    if (error) {
      console.error('Supabase error fetching timetable statistics:', error);
      return { success: false, error: error.message };
    }

    const stats = {
      totalEntries: data.length,
      uniqueTeachers: [...new Set(data.map(t => t.teacherId))].length,
      uniqueClasses: [...new Set(data.map(t => t.classId))].length,
      uniqueSubjects: [...new Set(data.map(t => t.subject))].length,
      byDay: {},
      bySubject: {}
    };

    // Group by day
    data.forEach(entry => {
      if (!stats.byDay[entry.day]) {
        stats.byDay[entry.day] = 0;
      }
      stats.byDay[entry.day]++;
    });

    // Group by subject
    data.forEach(entry => {
      if (!stats.bySubject[entry.subject]) {
        stats.bySubject[entry.subject] = 0;
      }
      stats.bySubject[entry.subject]++;
    });

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error fetching timetable statistics:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Helper function to parse time string to minutes
 */
const parseTimeToMinutes = (timeStr) => {
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  
  let totalMinutes = hours * 60 + minutes;
  
  if (period === 'PM' && hours !== 12) {
    totalMinutes += 12 * 60;
  } else if (period === 'AM' && hours === 12) {
    totalMinutes -= 12 * 60;
  }
  
  return totalMinutes;
};

// Export as service object for easier usage
export const timetableService = {
  getTeacherTimetable,
  getClassTimetable,
  getStudentTimetable,
  createOrUpdateTimetableEntry,
  deleteTimetableEntry,
  getCurrentClass,
  getNextClass,
  getTimetableConflicts,
  getAllTimetables,
  bulkCreateTimetableEntries,
  getTimetableStatistics
};