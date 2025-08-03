import { supabase } from '../../lib/supabaseClient';

// Attendance Service using Supabase
export const attendanceService = {
  // Mark attendance for a student
  async markAttendance(attendanceData) {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .upsert({
          student_id: attendanceData.student_id,
          class_id: attendanceData.class_id,
          subject_id: attendanceData.subject_id,
          teacher_id: attendanceData.teacher_id,
          date: attendanceData.date,
          status: attendanceData.status,
          remarks: attendanceData.remarks
        })
        .select(`
          *,
          students (
            admission_number,
            user_profiles (
              full_name,
              email
            )
          ),
          classes (
            name
          ),
          subjects (
            name,
            code
          )
        `)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error marking attendance:', error);
      return { success: false, error: error.message };
    }
  },

  // Bulk mark attendance for multiple students
  async bulkMarkAttendance(attendanceList) {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .upsert(attendanceList.map(attendance => ({
          student_id: attendance.student_id,
          class_id: attendance.class_id,
          subject_id: attendance.subject_id,
          teacher_id: attendance.teacher_id,
          date: attendance.date,
          status: attendance.status,
          remarks: attendance.remarks
        })))
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error bulk marking attendance:', error);
      return { success: false, error: error.message };
    }
  },

  // Get attendance by date and class
  async getAttendanceByDate(date, classId, subjectId = null) {
    try {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          students (
            admission_number,
            user_profiles (
              full_name,
              email
            )
          ),
          subjects (
            name,
            code
          )
        `)
        .eq('date', date)
        .eq('class_id', classId);

      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }

      const { data, error } = await query.order('students(user_profiles(full_name))', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching attendance by date:', error);
      return { success: false, error: error.message };
    }
  },

  // Get student attendance history
  async getStudentAttendance(studentId, startDate = null, endDate = null) {
    try {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          classes (
            name
          ),
          subjects (
            name,
            code
          )
        `)
        .eq('student_id', studentId);

      if (startDate) {
        query = query.gte('date', startDate);
      }

      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching student attendance:', error);
      return { success: false, error: error.message };
    }
  },

  // Get attendance statistics for a student
  async getStudentAttendanceStats(studentId, startDate = null, endDate = null) {
    try {
      let query = supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentId);

      if (startDate) {
        query = query.gte('date', startDate);
      }

      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = {
        total: data.length,
        present: data.filter(a => a.status === 'present').length,
        absent: data.filter(a => a.status === 'absent').length,
        late: data.filter(a => a.status === 'late').length,
        excused: data.filter(a => a.status === 'excused').length
      };

      stats.attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error fetching student attendance stats:', error);
      return { success: false, error: error.message };
    }
  },

  // Get class attendance summary
  async getClassAttendanceSummary(classId, date) {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('status')
        .eq('class_id', classId)
        .eq('date', date);

      if (error) throw error;

      const summary = {
        total: data.length,
        present: data.filter(a => a.status === 'present').length,
        absent: data.filter(a => a.status === 'absent').length,
        late: data.filter(a => a.status === 'late').length,
        excused: data.filter(a => a.status === 'excused').length
      };

      summary.attendanceRate = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;

      return { success: true, data: summary };
    } catch (error) {
      console.error('Error fetching class attendance summary:', error);
      return { success: false, error: error.message };
    }
  }
};

// Export individual functions for backward compatibility
export const {
  markAttendance,
  bulkMarkAttendance,
  getAttendanceByDate,
  getStudentAttendance,
  getStudentAttendanceStats,
  getClassAttendanceSummary
} = attendanceService;